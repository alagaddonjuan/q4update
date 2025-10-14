require('dotenv').config();
const express = require('express');
const { knex, setupDatabase } = require('./database');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const paystack = require('paystack-api')(process.env.PAYSTACK_SECRET_KEY);
const nodemailer = require('nodemailer');
const speakeasy = require('speakeasy');
const axios = require('axios');

const createResetEmailTemplate = (resetUrl, logoUrl) => {
    return `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{width:100%;max-width:600px;margin:20px auto;padding:20px;border:1px solid #ddd;border-radius:5px}.header{text-align:center;margin-bottom:20px}.button{display:inline-block;padding:12px 24px;background-color:#007bff;color:#fff;text-decoration:none;border-radius:5px}.footer{margin-top:20px;font-size:.8em;text-align:center;color:#777}</style></head><body><div class="container"><div class="header"><img src="${logoUrl}" alt="Q4I Comms Logo" style="width:150px"></div><h2>Password Reset Request</h2><p>You requested a password reset. Click the button below to set a new password. This link is valid for one hour.</p><p style="text-align:center"><a href="${resetUrl}" class="button">Reset Your Password</a></p><p>If you did not request a password reset, please ignore this email.</p><div class="footer"><p>&copy; ${new Date().getFullYear()} Q4I Comms. All rights reserved.</p></div></div></body></html>`;
};

const NGN_TO_TOKEN_RATE = 1;
const SMS_TOKEN_COST = 10;
const USSD_INTERVAL_TOKEN_COST = 20;
const options = { apiKey: process.env.AT_API_KEY, username: process.env.AT_USERNAME };
const africastalking = require('africastalking')(options);

setupDatabase();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.sendStatus(401); // Unauthorized
    }

    try {
        // First, try to verify the token as a JWT (for logged-in browser users)
        const user = jwt.verify(token, process.env.JWT_SECRET);
        req.user = user;
        return next();
    } catch (jwtError) {
        // If JWT verification fails, it might be an API key. Let's check the database.
        try {
            const apiKeyEntry = await knex('api_keys')
                .join('clients', 'api_keys.client_id', 'clients.id')
                .where('api_keys.api_key', token)
                .select('clients.id', 'clients.name', 'clients.is_admin', 'api_keys.whitelisted_ips') // <-- Get the whitelisted IPs
                .first();

            if (apiKeyEntry) {
                // --- NEW IP WHITELISTING LOGIC ---
                if (apiKeyEntry.whitelisted_ips) {
                    const allowedIps = apiKeyEntry.whitelisted_ips.split(',').map(ip => ip.trim());
                    const requestIp = req.ip;

                    if (!allowedIps.includes(requestIp)) {
                        console.warn(`Blocked API request from unauthorized IP: ${requestIp}`);
                        return res.status(403).json({ error: 'IP address not authorized.' }); // Forbidden
                    }
                }
                // --- END OF NEW LOGIC ---

                req.user = {
                    id: apiKeyEntry.id,
                    name: apiKeyEntry.name,
                    isAdmin: apiKeyEntry.is_admin
                };
                return next();
            }
            
            // If it's not a valid JWT and not a valid API key, it's forbidden
            return res.sendStatus(403);

        } catch (dbError) {
            console.error("API key authentication error:", dbError);
            return res.sendStatus(500);
        }
    }
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        res.status(403).json({ error: 'Forbidden: Requires admin access.' });
    }
};

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'landing.html')); });

app.post('/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    
    await knex.transaction(async (trx) => {
        try {
            const userCountResult = await trx('clients').count('id as count').first();
            const userCount = userCountResult ? userCountResult.count : 0;
            const isAdmin = userCount === 0;
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Note: We no longer set a status here. It defaults to 'pending'.
            // The first user (admin) will need to be manually set to 'active' in the database.
            const [insertedClient] = await trx('clients')
                .insert({ name, email, password: hashedPassword, is_admin: isAdmin })
                .returning(['id', 'name']);
            
            const [team] = await trx('teams')
                .insert({ client_id: insertedClient.id, team_name: `${insertedClient.name}'s Team` })
                .returning('id');

            const adminRole = await trx('roles').where({ role_name: 'Admin' }).first();
            await trx('team_members').insert({
                team_id: team.id,
                client_id: insertedClient.id,
                role_id: adminRole.id,
                status: 'active'
            });

            await trx('api_keys').insert({
                client_id: insertedClient.id,
                key_name: 'Default Key',
                api_key: crypto.randomBytes(16).toString('hex')
            });

            console.log(`New client registered (pending approval): ${insertedClient.name}`);
            res.status(201).json({ message: 'Registration successful! Your account is pending approval.' });

        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'A user with this email already exists.' });
            }
            console.error('Registration error:', error);
            res.status(500).json({ error: 'An error occurred during registration.' });
            throw error; 
        }
    });
});

app.post('/api/team/invite', authenticateToken, async (req, res) => {
    const { email, role_id } = req.body;
    const inviterId = req.user.id;

    if (!email || !role_id) {
        return res.status(400).json({ error: 'Email and Role are required.' });
    }

    await knex.transaction(async (trx) => {
        try {
            // 1. Find the inviter's team
            const team = await trx('teams').where({ client_id: inviterId }).first();
            if (!team) {
                return res.status(404).json({ error: 'Inviter team not found.' });
            }

            // 2. Check if the invited user already exists
            let invitedClient = await trx('clients').where({ email }).first();

            if (!invitedClient) {
                // If user doesn't exist, create a placeholder account
                const placeholderPassword = crypto.randomBytes(16).toString('hex');
                const hashedPassword = await bcrypt.hash(placeholderPassword, 10);
                const [newClient] = await trx('clients')
                    .insert({ name: 'Invited User', email, password: hashedPassword })
                    .returning('id');
                invitedClient = { id: newClient.id };
            }

            // 3. Check if an invitation already exists
            const existingMember = await trx('team_members')
                .where({ team_id: team.id, client_id: invitedClient.id })
                .first();

            if (existingMember) {
                return res.status(409).json({ error: 'This user is already a member of the team.' });
            }

            // 4. Create the invitation
            const invitationToken = crypto.randomBytes(32).toString('hex');
            await trx('team_members').insert({
                team_id: team.id,
                client_id: invitedClient.id,
                role_id,
                status: 'pending',
                invitation_token: invitationToken
            });

            // 5. Send invitation email (similar to password reset)
            const invitationUrl = `${process.env.APP_URL}/accept-invite.html?token=${invitationToken}`;
            // You can create a new email template for this
            console.log(`Invitation for ${email} sent. URL: ${invitationUrl}`);
            
            // TODO: Send actual email with nodemailer
            // await transporter.sendMail({ ... });

            res.status(200).json({ message: `Invitation sent to ${email}.` });

        } catch (error) {
            console.error('Invite member error:', error);
            res.status(500).json({ error: 'Failed to send invitation.' });
            throw error; // Rollback transaction
        }
    });
});

app.get('/api/team/roles', authenticateToken, async (req, res) => {
    try {
        const roles = await knex('roles').select('id', 'role_name');
        res.status(200).json(roles);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ error: 'Could not fetch roles.' });
    }
});

app.get('/api/team/members', authenticateToken, async (req, res) => {
    const ownerId = req.user.id;
    try {
        const team = await knex('teams').where({ client_id: ownerId }).first();
        if (!team) {
            return res.status(404).json({ error: 'Team not found.' });
        }

        const members = await knex('team_members')
            .join('clients', 'team_members.client_id', '=', 'clients.id')
            .join('roles', 'team_members.role_id', '=', 'roles.id')
            .where('team_members.team_id', team.id)
            .select(
                'clients.name',
                'clients.email',
                'roles.role_name',
                'team_members.status'
            );

        res.status(200).json(members);
    } catch (error) {
        console.error('Error fetching team members:', error);
        res.status(500).json({ error: 'Could not fetch team members.' });
    }
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    try {
        const client = await knex('clients').where({ email }).first();
        if (!client || !(await bcrypt.compare(password, client.password))) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        
        // --- NEW STATUS CHECK ---
        if (client.status === 'pending') {
            return res.status(403).json({ error: 'Your account is pending approval from an administrator.' });
        }
        if (client.status === 'suspended') {
            return res.status(403).json({ error: 'Your account has been suspended.' });
        }
        // --- END OF STATUS CHECK ---

        if (client.is_2fa_enabled) {
            const tempToken = jwt.sign({ id: client.id, name: client.name, two_factor_authenticated: false }, process.env.JWT_SECRET, { expiresIn: '5m' });
            return res.status(200).json({ two_factor_required: true, temp_token: tempToken });
        }
        const token = jwt.sign({ id: client.id, name: client.name, isAdmin: client.is_admin, two_factor_authenticated: true }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ message: 'Login successful!', token, isAdmin: client.is_admin });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

app.post('/auth/2fa/verify-login', authenticateToken, async (req, res) => {
    const { token: twoFaToken } = req.body;
    const clientId = req.user.id;
    if (!twoFaToken) return res.status(400).json({ error: '2FA token is required.' });
    try {
        const client = await knex('clients').where({ id: clientId }).first();
        const isVerified = speakeasy.totp.verify({
            secret: client.two_fa_secret,
            encoding: 'base32',
            token: twoFaToken,
            window: 1
        });
        if (isVerified) {
            const finalToken = jwt.sign({ id: client.id, name: client.name, isAdmin: client.is_admin, two_factor_authenticated: true }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.status(200).json({ message: 'Login successful!', token: finalToken, isAdmin: client.is_admin });
        } else {
            res.status(401).json({ error: 'Invalid 2FA token.' });
        }
    } catch (error) {
        console.error('2FA verify login error:', error);
        res.status(500).json({ error: 'An internal error occurred.' });
    }
});

app.post('/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const client = await knex('clients').where({ email }).first();
        if (!client) {
            return res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });
        }
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expires = new Date();
        expires.setHours(expires.getHours() + 1);
        await knex('clients').where({ id: client.id }).update({ password_reset_token: resetToken, password_reset_expires: expires });
        const resetUrl = `${process.env.APP_URL}/reset-password.html?token=${resetToken}`;
        const logoUrl = `${process.env.APP_URL}/theme/img/logo-white.png`;
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: true,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
        await transporter.sendMail({
            from: `"Q4I Comms Support" <support@q4globalltd.com>`,
            to: client.email,
            subject: 'Your Password Reset Link',
            html: createResetEmailTemplate(resetUrl, logoUrl)
        });
        res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'An internal error occurred.' });
    }
});

app.post('/auth/reset-password', async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) {
        return res.status(400).json({ error: 'Token and a new password are required.' });
    }
    try {
        const client = await knex('clients').where({ password_reset_token: token }).andWhere('password_reset_expires', '>', new Date()).first();
        if (!client) {
            return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await knex('clients').where({ id: client.id }).update({
            password: hashedPassword, password_reset_token: null, password_reset_expires: null
        });
        res.status(200).json({ message: 'Your password has been successfully reset. Please log in.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'An internal error occurred.' });
    }
});

// --- CLIENT API ROUTES ---
app.get('/api/dashboard', authenticateToken, async (req, res) => {
    try {
        const clientId = req.user.id;
        const smsCountResult = await knex('sms_logs').where({ client_id: clientId }).count('id as count').first();
        const airtimeCountResult = await knex('airtime_logs').where({ client_id: clientId }).count('id as count').first();
        const ussdCostSumResult = await knex('ussd_logs').where({ client_id: clientId }).sum('client_price as total').first();
        
        const stats = {
            totalSmsSent: smsCountResult.count || 0,
            totalAirtimeSent: airtimeCountResult.count || 0,
            // THIS VARIABLE NAME IS NOW CLEARER
            totalUssdCostNaira: ussdCostSumResult.total || 0 
        };
        
        const [client, sms_logs, airtime_logs, ussd_logs, transactions, api_keys] = await Promise.all([
            knex('clients').where({ id: clientId }).first(),
            knex('sms_logs').where({ client_id: clientId }).orderBy('logged_at', 'desc').limit(5),
            knex('airtime_logs').where({ client_id: clientId }).orderBy('logged_at', 'desc').limit(5),
            knex('ussd_logs').where({ client_id: clientId }).orderBy('logged_at', 'desc').limit(5),
            knex('transactions').where({ client_id: clientId }).orderBy('created_at', 'desc').limit(5),
            knex('api_keys').where({ client_id: clientId }).orderBy('created_at', 'desc')
        ]);

        if (!client) return res.status(404).json({ error: 'Client not found.' });
        res.status(200).json({ client, stats, sms_logs, airtime_logs, ussd_logs, transactions, api_keys });
    } catch (error) {
        console.error('Dashboard data error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

// PUT (update) the IP whitelist for a specific key
app.put('/api/keys/:id/ips', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { whitelisted_ips } = req.body;
    const clientId = req.user.id;

    try {
        const key = await knex('api_keys').where({ id, client_id: clientId }).first();
        if (!key) {
            return res.status(404).json({ error: 'API key not found or you do not have permission to edit it.' });
        }

        await knex('api_keys').where({ id }).update({ whitelisted_ips });
        
        res.status(200).json({ message: 'IP whitelist updated successfully.' });
    } catch (error) {
        console.error("Error updating IP whitelist:", error);
        res.status(500).json({ error: 'Failed to update IP whitelist.' });
    }
});

// in public/dashboard.js

function renderDashboardView() {
    if (!globalData.client || !globalData.stats) return;
    const balance = globalData.client.token_balance;
    const stats = globalData.stats;
    
    mainContentContainer.innerHTML = `
        <div class="d-sm-flex align-items-center justify-content-between mb-4">
            <h1 class="h3 mb-0 text-gray-800">Dashboard</h1>
        </div>
        
        <div class="row">
            <div class="col-xl-3 col-md-6 mb-4">
                <div class="card border-left-primary shadow h-100 py-2"><div class="card-body"><div class="row no-gutters align-items-center">
                    <div class="col mr-2"><div class="text-xs font-weight-bold text-primary text-uppercase mb-1">Token Balance</div><div class="h5 mb-0 font-weight-bold text-gray-800">${balance} Tokens</div></div>
                    <div class="col-auto"><i class="fas fa-coins fa-2x text-gray-300"></i></div>
                </div></div></div>
            </div>
            <div class="col-xl-3 col-md-6 mb-4">
                <div class="card border-left-success shadow h-100 py-2"><div class="card-body"><div class="row no-gutters align-items-center">
                    <div class="col mr-2"><div class="text-xs font-weight-bold text-success text-uppercase mb-1">Total SMS Sent</div><div class="h5 mb-0 font-weight-bold text-gray-800">${stats.totalSmsSent}</div></div>
                    <div class="col-auto"><i class="fas fa-comments fa-2x text-gray-300"></i></div>
                </div></div></div>
            </div>
            <div class="col-xl-3 col-md-6 mb-4">
                <div class="card border-left-info shadow h-100 py-2"><div class="card-body"><div class="row no-gutters align-items-center">
                    <div class="col mr-2"><div class="text-xs font-weight-bold text-info text-uppercase mb-1">Total Airtime Sent</div><div class="h5 mb-0 font-weight-bold text-gray-800">${stats.totalAirtimeSent}</div></div>
                    <div class="col-auto"><i class="fas fa-mobile-alt fa-2x text-gray-300"></i></div>
                </div></div></div>
            </div>
            
            <div class="col-xl-3 col-md-6 mb-4">
                <div class="card border-left-warning shadow h-100 py-2"><div class="card-body"><div class="row no-gutters align-items-center">
                    <div class="col mr-2"><div class="text-xs font-weight-bold text-warning text-uppercase mb-1">Total USSD Cost</div><div class="h5 mb-0 font-weight-bold text-gray-800">₦${parseFloat(stats.totalUssdCostNaira).toFixed(2)}</div></div>
                    <div class="col-auto"><i class="fas fa-hashtag fa-2x text-gray-300"></i></div>
                </div></div></div>
            </div>
        </div>
    `;
    // We no longer need to call renderCharts() from here
}

app.get('/api/charts', authenticateToken, async (req, res) => {
    const clientId = req.user.id;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    try {
        const smsLogs = await knex('sms_logs').where('client_id', clientId).andWhere('logged_at', '>=', sevenDaysAgo).groupByRaw('DATE(logged_at)').select(knex.raw('DATE(logged_at) as date'), knex.raw('count(*) as count'));
        const airtimeLogs = await knex('airtime_logs').where('client_id', clientId).andWhere('logged_at', '>=', sevenDaysAgo).groupByRaw('DATE(logged_at)').select(knex.raw('DATE(logged_at) as date'), knex.raw('count(*) as count'));
        // --- NEW: Fetch USSD Logs ---
        const ussdLogs = await knex('ussd_logs').where('client_id', clientId).andWhere('logged_at', '>=', sevenDaysAgo).groupByRaw('DATE(logged_at)').select(knex.raw('DATE(logged_at) as date'), knex.raw('count(*) as count'));
        
        const labels = [];
        const smsData = [];
        const airtimeData = [];
        const ussdData = []; // --- NEW ---

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateString = d.toISOString().split('T')[0];
            labels.push(dateString);

            const smsDayData = smsLogs.find(log => log.date && new Date(log.date).toISOString().split('T')[0] === dateString);
            smsData.push(smsDayData ? smsDayData.count : 0);

            const airtimeDayData = airtimeLogs.find(log => log.date && new Date(log.date).toISOString().split('T')[0] === dateString);
            airtimeData.push(airtimeDayData ? airtimeDayData.count : 0);
            
            // --- NEW: Process USSD Data ---
            const ussdDayData = ussdLogs.find(log => log.date && new Date(log.date).toISOString().split('T')[0] === dateString);
            ussdData.push(ussdDayData ? ussdDayData.count : 0);
        }

        res.json({
            labels: labels,
            datasets: [
                { label: "SMS Sent", data: smsData, borderColor: 'rgba(78, 115, 223, 1)', tension: 0.3 },
                { label: "Airtime Sent", data: airtimeData, borderColor: 'rgba(28, 200, 138, 1)', tension: 0.3 },
                // --- NEW: Add USSD Dataset ---
                { label: "USSD Sessions", data: ussdData, borderColor: 'rgba(246, 194, 62, 1)', tension: 0.3 }
            ]
        });

    } catch (error) {
        console.error("Chart data error:", error);
        res.status(500).json({ error: "Failed to retrieve chart data." });
    }
});

// GET all API keys for a client
app.get('/api/keys', authenticateToken, async (req, res) => {
    try {
        const keys = await knex('api_keys').where({ client_id: req.user.id });
        res.json(keys);
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch API keys.' });
    }
});

// POST (create) a new API key
app.post('/api/keys', authenticateToken, async (req, res) => {
    const { key_name } = req.body;
    if (!key_name) {
        return res.status(400).json({ error: 'A name for the key is required.' });
    }
    try {
        const newKey = {
            client_id: req.user.id,
            key_name,
            api_key: crypto.randomBytes(16).toString('hex')
        };
        await knex('api_keys').insert(newKey);
        res.status(201).json({ message: 'API key created successfully!', newKey });
    } catch (error) {
        res.status(500).json({ error: 'Could not create API key.' });
    }
});

// DELETE an API key
app.delete('/api/keys/:id', authenticateToken, async (req, res) => {
    try {
        await knex('api_keys').where({ id: req.params.id, client_id: req.user.id }).del();
        res.json({ message: 'API key deleted successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Could not delete API key.' });
    }
});


app.get('/api/ussd/menus', authenticateToken, async (req, res) => {
    const clientId = req.user.id;
    try {
        const menus = await knex('ussd_menus').where({ client_id: clientId });
        res.status(200).json(menus);
    } catch (error) {
        console.error("Error fetching USSD menus:", error);
        res.status(500).json({ error: "Could not fetch USSD menus." });
    }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
    const clientId = req.user.id;
    const { name, password } = req.body;
    if (!name && !password) {
        return res.status(400).json({ error: 'At least a name or password is required.' });
    }
    try {
        const updateData = {};
        if (name) updateData.name = name;
        if (password) updateData.password = await bcrypt.hash(password, 10);
        await knex('clients').where({ id: clientId }).update(updateData);
        res.status(200).json({ message: 'Profile updated successfully.' });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

app.post('/api/ussd/menus/set-active', authenticateToken, async (req, res) => {
    const { menuId } = req.body;
    const clientId = req.user.id;

    try {
        await knex.transaction(async (trx) => {
            // First, set all menus for this client to inactive
            await trx('ussd_menus').where({ client_id: clientId }).update({ is_active: false });

            // Then, set the selected menu to active
            await trx('ussd_menus').where({ id: menuId, client_id: clientId }).update({ is_active: true });
        });
        
        res.status(200).json({ message: 'Menu has been set as active.' });
    } catch (error) {
        console.error("Error setting active menu:", error);
        res.status(500).json({ error: 'Failed to set active menu.' });
    }
});

    // GET all items for a specific menu
app.get('/api/ussd/menus/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const clientId = req.user.id;
    try {
        const menu = await knex('ussd_menus').where({ id, client_id: clientId }).first();
        if (!menu) {
            return res.status(404).json({ error: 'Menu not found.' });
        }
        const items = await knex('ussd_menu_items').where({ menu_id: id }).orderBy('id');
        res.status(200).json({ menu, items });
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch menu details.' });
    }
});

// POST a new item to a menu
app.post('/api/ussd/menus/:id/items', authenticateToken, async (req, res) => {
    const { id: menuId } = req.params;
    const { parent_item_id, option_trigger, response_type, response_text } = req.body;

    try {
        const newItem = {
            menu_id: menuId,
            parent_item_id: parent_item_id || null,
            option_trigger,
            response_type,
            response_text
        };
        await knex('ussd_menu_items').insert(newItem);
        res.status(201).json({ message: 'Menu item added successfully.' });
    } catch (error) {
        console.error("Error adding menu item:", error);
        res.status(500).json({ error: 'Could not add menu item.' });
    }
});

// PUT (update) an existing menu item
app.put('/api/ussd/menus/items/:itemId', authenticateToken, async (req, res) => {
    const { itemId } = req.params;
    const { option_trigger, response_type, response_text } = req.body;
    try {
        await knex('ussd_menu_items').where({ id: itemId }).update({
            option_trigger,
            response_type,
            response_text
        });
        res.status(200).json({ message: 'Menu item updated successfully.' });
    } catch (error) {
        console.error("Error updating menu item:", error);
        res.status(500).json({ error: 'Could not update menu item.' });
    }
});

// DELETE a menu item
app.delete('/api/ussd/menus/items/:itemId', authenticateToken, async (req, res) => {
    const { itemId } = req.params;
    try {
        // This will also delete child items due to the ON DELETE CASCADE rule in the database
        await knex('ussd_menu_items').where({ id: itemId }).del();
        res.status(200).json({ message: 'Menu item and its children deleted successfully.' });
    } catch (error) {
        console.error("Error deleting menu item:", error);
        res.status(500).json({ error: 'Could not delete menu item.' });
    }
});

app.post('/api/2fa/generate', authenticateToken, async (req, res) => {
    const clientId = req.user.id;
    try {
        const secret = speakeasy.generateSecret({ name: `Q4I Comms (${req.user.name})` });
        await knex('clients').where({ id: clientId }).update({ two_fa_secret: secret.base32 });
        res.json({ secret: secret.base32, otpauth_url: secret.otpauth_url });
    } catch (error) {
        console.error("2FA generation error:", error);
        res.status(500).json({ error: "Could not generate 2FA secret." });
    }
});

app.post('/api/2fa/verify', authenticateToken, async (req, res) => {
    const { token } = req.body;
    const clientId = req.user.id;
    try {
        const client = await knex('clients').where({ id: clientId }).first();
        const isVerified = speakeasy.totp.verify({
            secret: client.two_fa_secret,
            encoding: 'base32',
            token: token
        });
        if (isVerified) {
            await knex('clients').where({ id: clientId }).update({ is_2fa_enabled: true });
            res.json({ message: '2FA enabled successfully!' });
        } else {
            res.status(400).json({ error: 'Invalid 2FA token. Please try again.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Could not verify 2FA token.' });
    }
});

app.post('/api/billing/initialize', authenticateToken, async (req, res) => {
    const clientId = req.user.id;
    const { amount } = req.body;
    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'A valid amount is required.' });
    }
    try {
        const client = await knex('clients').where({ id: clientId }).first();
        const reference = crypto.randomBytes(16).toString('hex');
        const tokensPurchased = Math.floor(amount * NGN_TO_TOKEN_RATE);
        await knex('transactions').insert({
            client_id: clientId, gateway: 'paystack', reference, amount, tokens_purchased: tokensPurchased, status: 'Pending'
        });
        const paystackResponse = await paystack.transaction.initialize({
            email: client.email, amount: amount * 100, reference, currency: 'NGN', callback_url: `${process.env.APP_URL}/dashboard.html`
        });
        res.status(200).json(paystackResponse.data);
    } catch (error) {
        console.error("Payment initialization error:", error);
        res.status(500).json({ error: "Failed to start payment process." });
    }
});

app.post('/api/billing/squad/initialize', authenticateToken, async (req, res) => {
    const clientId = req.user.id;
    const { amount } = req.body;
    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'A valid amount is required.' });
    }
    try {
        const client = await knex('clients').where({ id: clientId }).first();
        const reference = crypto.randomBytes(16).toString('hex');
        const tokensPurchased = Math.floor(amount * NGN_TO_TOKEN_RATE);
        await knex('transactions').insert({
            client_id: clientId, gateway: 'squad', reference, amount, tokens_purchased: tokensPurchased, status: 'Pending'
        });
        res.status(200).json({
            amount: amount * 100, email: client.email, reference, publicKey: process.env.SQUAD_PUBLIC_KEY, customer_name: client.name
        });
    } catch (error) {
        console.error("Squad payment initialization error:", error);
        res.status(500).json({ error: "Failed to start payment process." });
    }
});

app.post('/api/sendsms', authenticateToken, async (req, res) => {
    const clientId = req.user.id;
    const { to, message } = req.body;
    const recipientList = to.split('\n').map(num => num.trim()).filter(num => num);

    if (recipientList.length === 0) {
        return res.status(400).json({ error: 'Please provide at least one valid recipient number.' });
    }

    try {
        const client = await knex('clients').where({ id: clientId }).first();
        let smsCost = SMS_TOKEN_COST; // Default cost

        if (client.pricing_tier_id) {
            const tierPrice = await knex('service_prices')
                .where({ pricing_tier_id: client.pricing_tier_id, service_name: 'SMS' })
                .first();
            if (tierPrice) {
                smsCost = tierPrice.price;
            }
        }

        const totalTokenCost = recipientList.length * smsCost;
        if (client.token_balance < totalTokenCost) {
            return res.status(402).json({ error: `Insufficient token balance. You need ${totalTokenCost} tokens but have ${client.token_balance}.` });
        }
        
        if (!client.sender_id) {
            return res.status(400).json({ error: 'No Sender ID has been configured for your account.' });
        }

        const toCommaSeparated = recipientList.join(',');
        const result = await africastalking.SMS.send({ to: toCommaSeparated, message, from: client.sender_id });
        
        const successfulRecipients = result.SMSMessageData.Recipients.filter(r => r.statusCode === 101);
        if (successfulRecipients.length > 0) {
            await knex('clients').where({ id: clientId }).decrement('token_balance', totalTokenCost);
            const logs = successfulRecipients.map(recipient => ({
                client_id: clientId,
                message_id: recipient.messageId,
                cost: recipient.cost,
                status: recipient.status
            }));
            await knex('sms_logs').insert(logs);
        }

        res.status(200).json(result);
    } catch (error) {
        console.error('Bulk SMS sending error:', error.message);
        res.status(500).json({ error: 'An internal server error occurred while sending SMS.' });
    }
});

app.post('/api/sendairtime', authenticateToken, async (req, res) => {
    const clientId = req.user.id;
    const { phoneNumber, amount } = req.body;
    if (!phoneNumber || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid phoneNumber and a positive amount are required.' });
    }
    try {
        const client = await knex('clients').where({ id: clientId }).first();
        const tokenCost = Math.ceil(amount * NGN_TO_TOKEN_RATE);
        if (client.token_balance < tokenCost) {
            return res.status(402).json({ error: `Insufficient token balance.` });
        }
        const options = { recipients: [{ phoneNumber, currencyCode: 'NGN', amount }] };
        const result = await africastalking.AIRTIME.send(options);
        if (result && result.responses && result.responses.length > 0) {
            const response = result.responses[0];
            if (response.status === 'Sent' || response.status === 'Success') {
                await knex('clients').where({ id: clientId }).decrement('token_balance', tokenCost);
                await knex('airtime_logs').insert({
                    client_id: clientId, phone_number: phoneNumber, amount: `NGN ${amount}`, request_id: response.requestId, status: response.status
                });
                console.log(`Airtime sent and client ${clientId} billed ${tokenCost} tokens.`);
            }
        }
        res.status(200).json(result);
    } catch (error) {
        console.error('Airtime sending error:', error.message);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

// A helper function to convert JSON data to CSV format
function jsonToCsv(items) {
    if (items.length === 0) {
        return "";
    }
    const header = Object.keys(items[0]).join(',');
    const rows = items.map(item => {
        return Object.values(item).map(value => {
            // Handle commas and quotes in values
            const escaped = ('' + value).replace(/"/g, '""');
            return `"${escaped}"`;
        }).join(',');
    });
    return [header, ...rows].join('\n');
}

// Export SMS Logs
app.get('/api/export/sms', authenticateToken, async (req, res) => {
    try {
        const smsLogs = await knex('sms_logs')
            .where({ client_id: req.user.id })
            .orderBy('logged_at', 'desc');
        
        const csv = jsonToCsv(smsLogs);
        res.header('Content-Type', 'text/csv');
        res.attachment('sms_logs.csv');
        res.send(csv);
    } catch (error) {
        res.status(500).json({ error: 'Failed to export SMS logs.' });
    }
});

// Export Airtime Logs
app.get('/api/export/airtime', authenticateToken, async (req, res) => {
    try {
        const airtimeLogs = await knex('airtime_logs')
            .where({ client_id: req.user.id })
            .orderBy('logged_at', 'desc');

        const csv = jsonToCsv(airtimeLogs);
        res.header('Content-Type', 'text/csv');
        res.attachment('airtime_logs.csv');
        res.send(csv);
    } catch (error) {
        res.status(500).json({ error: 'Failed to export Airtime logs.' });
    }
});

app.get('/api/export/ussd', authenticateToken, async (req, res) => {
    try {
        const ussdLogs = await knex('ussd_logs')
            .where({ client_id: req.user.id })
            .select(
                'logged_at',
                'session_id',
                'phone_number',
                'final_user_string',
                'duration_seconds',
                'client_price', // This is now in Naira
                'status'
            )
            .orderBy('logged_at', 'desc');
        
        const csv = jsonToCsv(ussdLogs);
        res.header('Content-Type', 'text/csv');
        res.attachment('ussd_logs.csv');
        res.send(csv);
    } catch (error) {
        res.status(500).json({ error: 'Failed to export USSD logs.' });
    }
});

// --- WEBHOOK ROUTE ---
app.post('/billing/webhook', async (req, res) => {
    console.log("RAW WEBHOOK DATA:", JSON.stringify(req.body, null, 2));
    const event = req.body;
    let reference = null;
    if (event.event === 'charge.success' && event.data) {
        reference = event.data.reference;
    } else if (event.Event === 'charge.success' && event.Body) {
        reference = event.Body.transaction_ref;
    }
    if (reference) {
        try {
            await knex.transaction(async (trx) => {
                const transaction = await trx('transactions').where({ reference, status: 'Pending' }).first();
                if (transaction) {
                    await trx('transactions').where({ id: transaction.id }).update({ status: 'Success' });
                    await trx('clients').where({ id: transaction.client_id }).increment('token_balance', transaction.tokens_purchased);
                    console.log(`Tokens credited for transaction: ${reference}`);
                }
            });
        } catch (error) {
            console.error("Webhook processing error:", error);
        }
    }
    res.sendStatus(200);
});

app.post('/ussd_callback', async (req, res) => {
    const { sessionId, phoneNumber, text, serviceCode, networkCode } = req.body;
    
    const externalApiUrl = 'https://api.modernlotterynigeria.com/9999/bettingW/ussd/callback';

    try {
        // --- THIS IS THE FIX ---
        // If this is the first request of a new session, create a log entry first.
        if (text === '') {
            // Find which of your clients this USSD code belongs to.
            const client = await knex('clients').where({ ussd_code: serviceCode }).first();
            if (client) {
                await knex('ussd_logs').insert({
                    client_id: client.id,
                    session_id: sessionId,
                    phone_number: phoneNumber,
                    network_code: networkCode,
                    status: 'Pending' // Set the initial status
                });
            }
        }
        // --- END OF FIX ---

        const params = new URLSearchParams();
        params.append('sessionId', sessionId);
        params.append('phoneNumber', phoneNumber);
        params.append('text', text);
        params.append('serviceCode', serviceCode);
        
        const apiResponse = await axios.post(externalApiUrl, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const responseText = apiResponse.data;
        console.log(`Forwarding response to user: ${responseText}`);
        
        res.set('Content-Type', 'text/plain');
        res.send(responseText);

    } catch (error) {
        console.error('Error in USSD callback proxy:', error.message);
        res.send('END An error occurred. Please try again later.');
    }
});

app.post('/ussd_events_callback', async (req, res) => {
    const { sessionId, status, durationInSeconds, cost } = req.body;
    console.log("USSD EVENT NOTIFICATION:", JSON.stringify(req.body, null, 2));
    res.status(200).send('Event received.');

    // --- THE FIX: We now process any notification that has a session ID and a cost. ---
    if (!sessionId || !cost) {
        console.log(`Ignoring notification for session ${sessionId} because it has no cost.`);
        return;
    }

    try {
        await knex.transaction(async (trx) => {
            // Find the log entry that is still marked as 'Pending'
            const logEntry = await trx('ussd_logs')
                .join('clients', 'ussd_logs.client_id', '=', 'clients.id')
                .where('ussd_logs.session_id', sessionId)
                .select('ussd_logs.*', 'clients.pricing_tier_id')
                .first();

            // If the session is already processed or doesn't exist, do nothing.
            if (!logEntry || logEntry.status !== 'Pending') {
                console.log(`Session ${sessionId} already processed or not found. Skipping.`);
                return;
            }

            // --- Billing Logic ---
            const sessionCostNaira = parseFloat(cost.replace(/[^0-9.]/g, ''));
            let clientPriceNaira = sessionCostNaira * 3; // Default 3x markup

            if (logEntry.pricing_tier_id) {
                const tierPrice = await trx('service_prices')
                    .where({ pricing_tier_id: logEntry.pricing_tier_id, service_name: 'USSD' })
                    .first();
                if (tierPrice) {
                    clientPriceNaira = sessionCostNaira * tierPrice.price;
                }
            }

            const tokensToDeduct = Math.ceil(clientPriceNaira);
            const duration = parseInt(durationInSeconds, 10) || 0;
            
            // Update the log with the final details from the notification
            await trx('ussd_logs')
                .where({ session_id: sessionId })
                .update({
                    duration_seconds: duration,
                    session_cost: cost,
                    client_price: clientPriceNaira,
                    status: status // Use the status from the AT notification (e.g., "Incomplete", "Failed", "Success")
                });

            // Deduct the cost from the client's balance
            await trx('clients')
                .where({ id: logEntry.client_id })
                .decrement('token_balance', tokensToDeduct);
            
            console.log(`USSD session ${sessionId} (Status: ${status}) BILLED ${clientPriceNaira.toFixed(2)} NGN (${tokensToDeduct} tokens) to client ${logEntry.client_id}.`);
        });
    } catch (error) {
        console.error(`Error processing USSD event for session ${sessionId}:`, error);
    }
});

// --- ADMIN ROUTES ---
app.get('/api/admin/clients', authenticateToken, isAdmin, async (req, res) => {
    try {
        const clients = await knex('clients').select(
            'id', 'name', 'email', 'status', 'is_admin', 'created_at', 'token_balance' // <-- Added token_balance
        );
        res.status(200).json(clients);
    } catch (error) {
        console.error('Admin fetch clients error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

app.post('/api/admin/topup', authenticateToken, isAdmin, async (req, res) => {
    const { clientId, amount } = req.body;
    if (!clientId || !amount || amount <= 0) return res.status(400).json({ error: 'Valid clientId and a positive amount are required.' });
    try {
        await knex('clients').where({ id: clientId }).increment('token_balance', amount);
        res.status(200).json({ message: `Successfully topped up client ${clientId} with ${amount} tokens.` });
    } catch (error) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

app.put('/api/admin/clients/:clientId', authenticateToken, isAdmin, async (req, res) => {
    const { clientId } = req.params;
    const { name, ussd_code, sender_id } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (ussd_code !== undefined) updateData.ussd_code = ussd_code;
    if (sender_id !== undefined) updateData.sender_id = sender_id;
    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'At least one field to update is required.' });
    }
    try {
        const updatedCount = await knex('clients').where({ id: clientId }).update(updateData);
        if (updatedCount === 0) return res.status(404).json({ error: 'Client not found.' });
        res.status(200).json({ message: 'Client updated successfully.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'This USSD code is already assigned to another client.' });
        }
        console.error('Update client error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

app.get('/api/admin/logs', authenticateToken, isAdmin, async (req, res) => {
    try {
        const [smsLogs, airtimeLogs, ussdLogs, transactions] = await Promise.all([
            knex('sms_logs').join('clients', 'sms_logs.client_id', '=', 'clients.id').select('sms_logs.*', 'clients.name as client_name'),
            knex('airtime_logs').join('clients', 'airtime_logs.client_id', '=', 'clients.id').select('airtime_logs.*', 'clients.name as client_name'),
            knex('ussd_logs').join('clients', 'ussd_logs.client_id', '=', 'clients.id').select('ussd_logs.*', 'clients.name as client_name'),
            knex('transactions').join('clients', 'transactions.client_id', '=', 'clients.id').select('transactions.*', 'clients.name as client_name')
        ]);
        res.status(200).json({ smsLogs, airtimeLogs, ussdLogs, transactions });
    } catch (error) {
        console.error('Admin fetch logs error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

app.get('/api/admin/stats', authenticateToken, isAdmin, async (req, res) => {
    try {
        const totalClientsResult = await knex('clients').count('id as count').first();
        const totalTokensResult = await knex('transactions').where({ status: 'Success' }).sum('tokens_purchased as total').first();
        const totalSmsResult = await knex('sms_logs').count('id as count').first();
        const stats = {
            clientCount: totalClientsResult.count || 0,
            tokensPurchased: totalTokensResult.total || 0,
            smsSentCount: totalSmsResult.count || 0
        };
        res.status(200).json(stats);
    } catch (error) {
        console.error('Admin fetch stats error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

app.put('/api/admin/clients/:clientId/status', authenticateToken, isAdmin, async (req, res) => {
    const { clientId } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'suspended'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status provided.' });
    }

    try {
        const updatedCount = await knex('clients')
            .where({ id: clientId })
            .update({ status });

        if (updatedCount === 0) {
            return res.status(404).json({ error: 'Client not found.' });
        }
        
        res.status(200).json({ message: `Client status updated to ${status}.` });
    } catch (error) {
        console.error("Error updating client status:", error);
        res.status(500).json({ error: 'Failed to update client status.' });
    }
});

app.put('/api/admin/clients/:clientId/status', authenticateToken, isAdmin, async (req, res) => {
    const { clientId } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'suspended'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status provided.' });
    }

    try {
        const updatedCount = await knex('clients')
            .where({ id: clientId })
            .update({ status });

        if (updatedCount === 0) {
            return res.status(404).json({ error: 'Client not found.' });
        }
        
        res.status(200).json({ message: `Client status updated to ${status}.` });
    } catch (error) {
        console.error("Error updating client status:", error);
        res.status(500).json({ error: 'Failed to update client status.' });
    }
});

app.get('/api/admin/pricing-tiers', authenticateToken, isAdmin, async (req, res) => {
    try {
        const tiers = await knex('pricing_tiers').select('*');
        res.status(200).json(tiers);
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch pricing tiers.' });
    }
});

// POST a new pricing tier
app.post('/api/admin/pricing-tiers', authenticateToken, isAdmin, async (req, res) => {
    const { tier_name } = req.body;
    if (!tier_name) {
        return res.status(400).json({ error: 'Tier name is required.' });
    }
    try {
        const [newTier] = await knex('pricing_tiers').insert({ tier_name }).returning('*');
        // Create default prices for the new tier
        await knex('service_prices').insert([
            { pricing_tier_id: newTier.id, service_name: 'SMS', price: 10 }, // Default 10 tokens
            { pricing_tier_id: newTier.id, service_name: 'USSD', price: 3 }  // Default 3x markup
        ]);
        res.status(201).json(newTier);
    } catch (error) {
        res.status(500).json({ error: 'Could not create pricing tier.' });
    }
});

// GET prices for a specific tier
app.get('/api/admin/pricing-tiers/:id/prices', authenticateToken, isAdmin, async (req, res) => {
    try {
        const prices = await knex('service_prices').where({ pricing_tier_id: req.params.id });
        res.status(200).json(prices);
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch service prices.' });
    }
});

// UPDATE prices for a specific tier
app.put('/api/admin/pricing-tiers/:id/prices', authenticateToken, isAdmin, async (req, res) => {
    const { sms_price, ussd_multiplier } = req.body;
    try {
        await knex('service_prices')
            .where({ pricing_tier_id: req.params.id, service_name: 'SMS' })
            .update({ price: sms_price });
        
        await knex('service_prices')
            .where({ pricing_tier_id: req.params.id, service_name: 'USSD' })
            .update({ price: ussd_multiplier });

        res.status(200).json({ message: 'Prices updated successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Could not update prices.' });
    }
});

// UPDATE a client's assigned pricing tier
app.put('/api/admin/clients/:clientId/assign-tier', authenticateToken, isAdmin, async (req, res) => {
    const { clientId } = req.params;
    const { tierId } = req.body;
    try {
        await knex('clients')
            .where({ id: clientId })
            .update({ pricing_tier_id: tierId === 'null' ? null : tierId });
        res.status(200).json({ message: 'Client assigned to new pricing tier.' });
    } catch (error) {
        res.status(500).json({ error: 'Could not assign pricing tier.' });
    }
});

app.post('/api/admin/transactions/manual', authenticateToken, isAdmin, async (req, res) => {
    const { clientId, amount, type, reason } = req.body;

    if (!clientId || !amount || !type || !reason) {
        return res.status(400).json({ error: 'Client ID, amount, type, and reason are required.' });
    }
    if (type !== 'credit' && type !== 'debit') {
        return res.status(400).json({ error: 'Invalid transaction type. Use "credit" or "debit".' });
    }

    const transactionAmount = parseInt(amount, 10);
    if (isNaN(transactionAmount) || transactionAmount <= 0) {
        return res.status(400).json({ error: 'Invalid amount.' });
    }

    await knex.transaction(async (trx) => {
        try {
            const client = await trx('clients').where({ id: clientId }).first();
            if (!client) {
                return res.status(404).json({ error: 'Client not found.' });
            }

            // For debits, ensure client has enough tokens
            if (type === 'debit' && client.token_balance < transactionAmount) {
                return res.status(400).json({ error: 'Client has insufficient token balance for this debit.' });
            }

            // Create a record in the transactions table
            const reference = `manual_${crypto.randomBytes(12).toString('hex')}`;
            await trx('transactions').insert({
                client_id: clientId,
                reference: reference,
                amount: type === 'credit' ? transactionAmount : -transactionAmount, // Store as a negative value for debits
                tokens_purchased: transactionAmount,
                status: 'Success',
                gateway: `manual_${type}`,
                notes: reason // You might want to add a 'notes' column to your transactions table for this
            });

            // Update the client's token balance
            if (type === 'credit') {
                await trx('clients').where({ id: clientId }).increment('token_balance', transactionAmount);
            } else { // debit
                await trx('clients').where({ id: clientId }).decrement('token_balance', transactionAmount);
            }

            res.status(200).json({ message: `Successfully processed manual ${type} of ${transactionAmount} tokens for client ${clientId}.` });

        } catch (error) {
            console.error('Manual transaction error:', error);
            res.status(500).json({ error: 'An internal server error occurred.' });
            throw error; // Rollback the transaction
        }
    });
});

app.post('/api/admin/announcements', authenticateToken, isAdmin, async (req, res) => {
    const { subject, message } = req.body;

    if (!subject || !message) {
        return res.status(400).json({ error: 'Subject and message are required.' });
    }

    try {
        const clients = await knex('clients').select('email', 'name');
        if (clients.length === 0) {
            return res.status(200).json({ message: 'No clients to send announcements to.' });
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        
        // --- NEW, IMPROVED HTML EMAIL TEMPLATE ---
        const createAnnouncementEmail = (clientName, messageContent, logoUrl) => {
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { width: 100%; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                        .header { text-align: center; margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
                        .content { margin-top: 20px; }
                        .footer { margin-top: 20px; font-size: 0.8em; text-align: center; color: #777; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <img src="${logoUrl}" alt="Q4I Comms Logo" style="max-width: 150px;">
                        </div>
                        <div class="content">
                            <h3>Hi ${clientName},</h3>
                            <p>${messageContent.replace(/\n/g, '<br>')}</p>
                            <p>Thank you for using our platform.</p>
                            <p>Best regards,<br>The Q4I Comms Team</p>
                        </div>
                        <div class="footer">
                            <p>&copy; ${new Date().getFullYear()} Q4I Comms. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>`;
        };

        const logoUrl = `${process.env.APP_URL}/theme/img/logo-white.png`; // Make sure this path is correct

        for (const client of clients) {
            const emailHtml = createAnnouncementEmail(client.name, message, logoUrl);
            await transporter.sendMail({
                from: `"Q4I Comms" <${process.env.SMTP_USER}>`,
                to: client.email,
                subject: subject,
                html: emailHtml,
            });
        }

        res.status(200).json({ message: `Announcement sent to ${clients.length} clients.` });

    } catch (error) {
        console.error("Error sending announcement:", error);
        res.status(500).json({ error: 'Failed to send announcement.' });
    }
});



// --- Server Start ---
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));