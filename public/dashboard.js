document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    let globalData = {};

    // --- Template-specific elements ---
    const mainContentContainer = document.querySelector('#content .container-fluid');
    const userNameSpan = document.getElementById('user-name-display');
    const logoutButton = document.getElementById('logout-link');
    
    // --- Navigation Links ---
    const navDashboard = document.getElementById('nav-dashboard-link');
    const navServices = document.getElementById('nav-services-link');
    const navUssd = document.getElementById('nav-ussd-link');
    const navBilling = document.getElementById('nav-billing-link');
    const navProfile = document.getElementById('top-bar-profile-link');
    const navMenuBuilder = document.getElementById('nav-menu-builder-link');
    const navTeam = document.getElementById('nav-team-link');

    // --- IP Management Functions (MOVED UP) ---
    async function populateApiKeysTable() {
        const tableBody = document.querySelector('#api-keys-table tbody');
        if (!tableBody) return;
        try {
            const response = await fetch('/api/keys', { headers: { 'Authorization': `Bearer ${token}` }});
            const keys = await response.json();
            
            tableBody.innerHTML = '';
            keys.forEach(key => {
                tableBody.innerHTML += `
                    <tr>
                        <td>${key.key_name}</td>
                        <td>...${key.api_key.slice(-8)}</td>
                        <td>${new Date(key.created_at).toLocaleDateString()}</td>
                        <td>
                            <button class="btn btn-sm btn-info manage-ips-btn" data-key-id="${key.id}" data-ips="${key.whitelisted_ips || ''}">Manage IPs</button>
                            <button class="btn btn-sm btn-danger delete-key-btn" data-key-id="${key.id}">Delete</button>
                        </td>
                    </tr>
                `;
            });
        } catch (error) {
            console.error(error);
        }
    }

    async function handleAddKey(event) {
        event.preventDefault();
        const keyNameInput = document.getElementById('new-key-name');
        try {
            const response = await fetch('/api/keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ key_name: keyNameInput.value })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            
            alert(`New Key Generated: ${result.newKey.api_key}\nPlease save this key now. You will not be able to see it again.`);
            keyNameInput.value = '';
            populateApiKeysTable();
        } catch (error) {
            alert('Error creating key: ' + error.message);
        }
    }

    async function handleDeleteKey(keyId) {
        if (!confirm('Are you sure you want to delete this key? This cannot be undone.')) return;
        try {
            await fetch(`/api/keys/${keyId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            populateApiKeysTable();
        } catch (error) {
            alert('Error deleting key.');
        }
    }

    function openManageIpsModal(keyId, currentIps) {
        document.getElementById('edit-key-id').value = keyId;
        document.getElementById('whitelisted-ips-textarea').value = currentIps;
        $('#manage-ips-modal').modal('show');
    }

    async function handleUpdateIpWhitelist(event) {
        event.preventDefault();
        const keyId = document.getElementById('edit-key-id').value;
        const whitelisted_ips = document.getElementById('whitelisted-ips-textarea').value;

        try {
            const response = await fetch(`/api/keys/${keyId}/ips`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ whitelisted_ips })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            
            alert(result.message);
            $('#manage-ips-modal').modal('hide');
            populateApiKeysTable(); // Refresh the table to show updated data
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    async function handleExport(logType) {
        try {
            const response = await fetch(`/api/export/${logType}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error(`Failed to export ${logType} logs.`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `${logType}_logs.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

        } catch (error) {
            alert(error.message);
        }
    }

    // --- Core Data Fetching ---
    async function fetchAllData() {
        try {
            const response = await fetch('/api/dashboard', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Session expired');
            globalData = await response.json();
            
            if (userNameSpan && globalData.client) {
                userNameSpan.textContent = globalData.client.name;
            }
            
            renderDashboardView(); // This will now also call renderCharts
        } catch (error) {
            console.error('Dashboard fetch error:', error);
            localStorage.removeItem('authToken');
            window.location.href = '/login.html';
        }
    }

    // --- RENDER FUNCTIONS FOR EACH VIEW ---

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
                        <div class="col mr-2">
                            <div class="text-xs font-weight-bold text-warning text-uppercase mb-1">Total USSD Cost</div>
                            <div class="h5 mb-0 font-weight-bold text-gray-800">₦${parseFloat(stats.totalUssdCostNaira).toFixed(2)}</div>
                        </div>
                        <div class="col-auto"><i class="fas fa-hashtag fa-2x text-gray-300"></i></div>
                    </div></div></div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-xl-12">
                    <div class="card shadow mb-4">
                        <div class="card-header py-3">
                            <h6 class="m-0 font-weight-bold text-primary">Usage Overview (Last 7 Days)</h6>
                        </div>
                        <div class="card-body">
                            <div class="chart-area" style="height: 320px;">
                                <canvas id="usageAreaChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        renderCharts();
    }
    
    async function renderCharts() {
        const chartContainer = document.getElementById('usageAreaChart');
        if (!chartContainer) return;

        try {
            const response = await fetch('/api/charts', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Could not fetch chart data.');
            
            const chartData = await response.json();
            
            // --- DEBUGGING LINE ---
            console.log("Data received for chart:", JSON.stringify(chartData, null, 2));
            // --------------------
            
            const ctx = chartContainer.getContext('2d');
            
            if (window.myUsageChart) {
                window.myUsageChart.destroy();
            }

            window.myUsageChart = new Chart(ctx, {
                type: 'line',
                data: chartData,
                options: {
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });

        } catch (error) {
            console.error("Chart rendering error:", error);
            const chartArea = document.querySelector('.chart-area');
            if(chartArea) chartArea.innerHTML = '<p class="text-danger">Could not load chart data.</p>';
        }
    }

    function renderServicesView() {
        mainContentContainer.innerHTML = `
            <h1 class="h3 mb-2 text-gray-800">Services</h1>
            <div class="row">
                <div class="col-lg-6">
                    <div class="card shadow mb-4">
                        <div class="card-header py-3"><h6 class="m-0 font-weight-bold text-primary">Send SMS</h6></div>
                        <div class="card-body">
                            <form id="sms-form">
                                <div class="form-group">
                                    <label>Recipient Numbers (one per line)</label>
                                    <textarea id="smsTo" class="form-control" rows="5" required></textarea>
                                </div>
                                <div class="form-group">
                                    <label>Message</label>
                                    <textarea id="smsMessage" class="form-control" rows="3" required></textarea>
                                </div>
                                <button type="submit" class="btn btn-primary">Send SMS</button>
                            </form>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="card shadow mb-4">
                        <div class="card-header py-3"><h6 class="m-0 font-weight-bold text-primary">Send Airtime</h6></div>
                        <div class="card-body">
                            <form id="airtime-form">
                                <div class="form-group">
                                    <label>Phone Number</label>
                                    <input type="text" id="airtimeTo" class="form-control" required>
                                </div>
                                <div class="form-group">
                                    <label>Amount (NGN)</label>
                                    <input type="number" id="airtimeAmount" class="form-control" required>
                                </div>
                                <button type="submit" class="btn btn-primary">Send Airtime</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card shadow mb-4">
                <div class="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                    <h6 class="m-0 font-weight-bold text-primary">Usage Logs</h6>
                </div>
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h5>SMS Logs</h5>
                        <button class="btn btn-sm btn-primary" id="export-sms-btn">Export CSV</button>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-bordered" id="sms-usage-table">
                             <thead><tr><th>Date</th><th>Status</th><th>Cost</th></tr></thead>
                             <tbody></tbody>
                        </table>
                    </div>
                    <hr>
                    <div class="d-flex justify-content-between align-items-center mt-4 mb-2">
                        <h5>Airtime Logs</h5>
                        <button class="btn btn-sm btn-primary" id="export-airtime-btn">Export CSV</button>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-bordered" id="airtime-usage-table">
                            <thead><tr><th>Date</th><th>Phone Number</th><th>Amount</th><th>Status</th></tr></thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        initializeServicesView();
    }

    function renderUssdView() {
        const ussdCode = globalData.client?.ussd_code || "None Assigned";
        mainContentContainer.innerHTML = `
            <h1 class="h3 mb-2 text-gray-800">USSD Service</h1>
            <div class="card shadow mb-4"><div class="card-header py-3"><h6 class="m-0 font-weight-bold text-primary">Your Assigned USSD Code</h6></div><div class="card-body"><p>Your active USSD code is: <strong>${ussdCode}</strong></p></div></div>
            <div class="card shadow mb-4">
                <div class="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                    <h6 class="m-0 font-weight-bold text-primary">USSD Usage Logs</h6>
                    <button class="btn btn-sm btn-primary" id="export-ussd-btn">Export CSV</button>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-bordered" id="ussd-usage-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Phone Number</th>
                                    <th>Final Input</th>
                                    <th>Status</th>
                                    <th>Cost (NGN)</th> 
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        initializeUssdView();
    }

    function renderBillingView() {
        mainContentContainer.innerHTML = `
            <h1 class="h3 mb-2 text-gray-800">Billing & Top-Up</h1>
            <div class="row">
                <div class="col-lg-6"><div class="card shadow mb-4"><div class="card-header py-3"><h6 class="m-0 font-weight-bold text-primary">Buy Tokens</h6></div><div class="card-body">
                    <form id="buy-tokens-form">
                        <div class="form-group"><label>Amount (NGN)</label><input type="number" id="amount" class="form-control" placeholder="1000" required min="100"></div>
                        <div role="group">
                            <button type="button" id="paystack-btn" class="btn btn-primary">Pay with Paystack</button>
                            <button type="button" id="squad-btn" class="btn btn-secondary">Pay with Q4 Payment</button>
                        </div>
                    </form>
                </div></div></div>
                <div class="col-lg-6"><div class="card shadow mb-4"><div class="card-header py-3"><h6 class="m-0 font-weight-bold text-primary">Conversion Rate</h6></div><div class="card-body"><p>Your price is currently <strong>1 Token</strong> for every <strong>₦1.00</strong>.</p><p><em>Example: ₦1000 = 1000 Tokens</em></p></div></div></div>
            </div>
            <div class="card shadow mb-4"><div class="card-header py-3"><h6 class="m-0 font-weight-bold text-primary">Your Transaction History</h6></div><div class="card-body"><div class="table-responsive"><table class="table table-bordered" id="transactions-table">
                <thead><tr><th>Date</th><th>Reference</th><th>Amount (NGN)</th><th>Tokens</th><th>Status</th></tr></thead><tbody></tbody>
            </table></div></div></div>`;
        initializeBillingView();
    }

    function renderProfileView() {
        mainContentContainer.innerHTML = `
            <h1 class="h3 mb-2 text-gray-800">Your Profile</h1>
            <div class="row">
                <div class="col-lg-6">
                    <div class="card shadow mb-4">
                        <div class="card-header py-3"><h6 class="m-0 font-weight-bold text-primary">Update Information</h6></div>
                        <div class="card-body">
                            <form id="profile-form">
                                <div class="form-group">
                                    <label>Company Name</label>
                                    <input type="text" id="profile-name" class="form-control" required>
                                </div>
                                <button type="submit" class="btn btn-primary">Update Name</button>
                            </form>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="card shadow mb-4">
                        <div class="card-header py-3"><h6 class="m-0 font-weight-bold text-primary">Change Password</h6></div>
                        <div class="card-body">
                            <form id="password-form">
                                <div class="form-group"><label>New Password</label><input type="password" id="profile-password" class="form-control" required></div>
                                <div class="form-group"><label>Confirm New Password</label><input type="password" id="profile-confirm-password" class="form-control" required></div>
                                <button type="submit" class="btn btn-primary">Change Password</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card shadow mb-4">
                <div class="card-header py-3"><h6 class="m-0 font-weight-bold text-primary">API Key Management</h6></div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-bordered" id="api-keys-table">
                            <thead><tr><th>Name</th><th>Key (Partial)</th><th>Created</th><th>Actions</th></tr></thead>
                            <tbody></tbody>
                        </table>
                    </div>
                    <hr>
                    <form id="add-key-form" class="form-inline">
                        <div class="form-group mr-3"><label class="mr-2">New Key Name</label><input type="text" id="new-key-name" class="form-control" placeholder="Production Server" required></div>
                        <button type="submit" class="btn btn-primary">Generate New Key</button>
                    </form>
                </div>
            </div>

            <div class="card shadow mb-4">
                <div class="card-header py-3"><h6 class="m-0 font-weight-bold text-primary">Two-Factor Authentication (2FA)</h6></div>
                <div class="card-body" id="2fa-section"></div>
            </div>
        `;
        initializeProfileView();
    }

    function initializeProfileView() {
        // Initialize Update Info and Change Password forms
        document.getElementById('profile-name').value = globalData.client.name;
        document.getElementById('profile-form').addEventListener('submit', handleProfileUpdate);
        document.getElementById('password-form').addEventListener('submit', handlePasswordUpdate);

        // This now includes the new "Manage IPs" logic
        populateApiKeysTable();
        document.getElementById('add-key-form').addEventListener('submit', handleAddKey);
        
        const apiKeyTable = document.querySelector('#api-keys-table');
        if (apiKeyTable) {
            apiKeyTable.addEventListener('click', (event) => {
                if (event.target.classList.contains('delete-key-btn')) {
                    handleDeleteKey(event.target.dataset.keyId);
                }
                if (event.target.classList.contains('manage-ips-btn')) {
                    openManageIpsModal(event.target.dataset.keyId, event.target.dataset.ips);
                }
            });
        }

        render2FASection();
    }

    function renderTeamView() {
        mainContentContainer.innerHTML = `
            <h1 class="h3 mb-2 text-gray-800">Team Management</h1>
            <div class="row">
                <div class="col-lg-8">
                    <div class="card shadow mb-4">
                        <div class="card-header py-3"><h6 class="m-0 font-weight-bold text-primary">Team Members</h6></div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered" id="team-members-table">
                                    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
                                    <tbody></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-4">
                    <div class="card shadow mb-4">
                        <div class="card-header py-3"><h6 class="m-0 font-weight-bold text-primary">Invite New Member</h6></div>
                        <div class="card-body">
                            <form id="invite-form">
                                <div class="form-group">
                                    <label for="invite-email">Email Address</label>
                                    <input type="email" id="invite-email" class="form-control" required>
                                </div>
                                <div class="form-group">
                                    <label for="invite-role">Role</label>
                                    <select id="invite-role" class="form-control" required></select>
                                </div>
                                <button type="submit" class="btn btn-primary">Send Invitation</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
        initializeTeamView();
    }

    // --- Initializers ---
    function initializeServicesView() {
        document.getElementById('sms-form').addEventListener('submit', handleSmsSubmit);
        document.getElementById('airtime-form').addEventListener('submit', handleAirtimeSubmit);
        document.getElementById('export-sms-btn').addEventListener('click', () => handleExport('sms'));
        document.getElementById('export-airtime-btn').addEventListener('click', () => handleExport('airtime'));
        
        populateSmsLogs();
        populateAirtimeLogs();
    }

    // FIXED: Remove duplicate populateUssdLogs call
    function initializeUssdView() {
        document.getElementById('export-ussd-btn').addEventListener('click', () => handleExport('ussd'));
        populateUssdLogs(); // Only one call now
    }

    // FIXED: Remove unrelated USSD code from billing view
    function initializeBillingView() {
        document.getElementById('paystack-btn').addEventListener('click', handlePaymentInit);
        document.getElementById('squad-btn').addEventListener('click', handleSquadInit);
        populateTransactionsTable();
    }
    
    function initializeTeamView() {
        populateRolesDropdown(); 
        populateTeamMembersTable();
        document.getElementById('invite-form').addEventListener('submit', handleInviteSubmit);
    }
    
    function render2FASection() {
        const container = document.getElementById('2fa-section');
        if (globalData.client.is_2fa_enabled) {
            container.innerHTML = `<p class="text-success">Two-Factor Authentication is currently enabled on your account.</p>`;
        } else {
            container.innerHTML = `<p>Add an extra layer of security to your account.</p><button id="enable-2fa-btn" class="btn btn-primary">Enable 2FA</button><div id="qr-code-container" style="display:none; margin-top: 1rem;"><p>1. Scan this QR code with your authenticator app.</p><canvas id="qr-code-canvas"></canvas><p class="mt-3">2. Enter the 6-digit code from your app to verify.</p><form id="verify-2fa-form" class="form-inline"><input type="text" id="2fa-token" class="form-control mb-2 mr-sm-2" placeholder="123456" required><button type="submit" class="btn btn-success mb-2">Verify & Activate</button></form></div>`;
            document.getElementById('enable-2fa-btn').addEventListener('click', handle2FAGenerate);
        }
    }

    function renderMenuBuilderView() {
        mainContentContainer.innerHTML = `
            <h1 class="h3 mb-2 text-gray-800">USSD Menu Builder</h1>
            <p class="mb-4">Here you can create and manage your USSD menus.</p>
            <div class="card shadow mb-4">
                <div class="card-header py-3"><h6 class="m-0 font-weight-bold text-primary">Your Menus</h6></div>
                <div class="card-body"><div class="table-responsive"><table class="table table-bordered" id="menus-table">
                    <thead><tr><th>Menu Name</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody></tbody>
                </table></div></div>
            </div>`;
        populateMenusTable();
    }

    // --- Handlers & Populators ---
    async function handle2FAGenerate() {
        try {
            const response = await fetch('/api/2fa/generate', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Could not start 2FA setup.');
            const data = await response.json();
            document.getElementById('qr-code-container').style.display = 'block';
            document.getElementById('enable-2fa-btn').style.display = 'none';
            const canvas = document.getElementById('qr-code-canvas');
            QRCode.toCanvas(canvas, data.otpauth_url, function (error) { if (error) console.error(error); });
            document.getElementById('verify-2fa-form').addEventListener('submit', handle2FAVerify);
        } catch (error) { alert('Error: ' + error.message); }
    }

    async function handle2FAVerify(event) {
        event.preventDefault();
        const token2FA = document.getElementById('2fa-token').value;
        try {
            const response = await fetch('/api/2fa/verify', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ token: token2FA }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            alert('2FA has been enabled successfully!');
            await fetchAllData();
            renderProfileView();
        } catch (error) { alert('Error: ' + error.message); }
    }
    
    async function handleSmsSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const to = document.getElementById('smsTo').value;
        const message = document.getElementById('smsMessage').value;
        try {
            const response = await fetch('/api/sendsms', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ to, message }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to send SMS');
            alert('SMS sent successfully!');
            form.reset();
            fetchAllData().then(populateSmsLogs);
        } catch (error) { alert(`Error: ${error.message}`); }
    }

    async function handleAirtimeSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const phoneNumber = document.getElementById('airtimeTo').value;
        const amount = document.getElementById('airtimeAmount').value;
        try {
            const response = await fetch('/api/sendairtime', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ phoneNumber, amount }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to send Airtime');
            alert('Airtime sent successfully!');
            form.reset();
            fetchAllData().then(populateAirtimeLogs);
        } catch (error) { alert(`Error: ${error.message}`); }
    }

    async function handlePaymentInit() {
        const amount = document.getElementById('amount').value;
        try {
            const response = await fetch('/api/billing/initialize', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ amount }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            window.location.href = result.authorization_url;
        } catch (error) { alert(`Error: ${error.message}`); }
    }

    async function handleSquadInit() {
        if (typeof Squad === 'undefined') { return alert('Payment gateway is still loading. Please try again in a moment.'); }
        const amount = document.getElementById('amount').value;
        try {
            const response = await fetch('/api/billing/squad/initialize', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ amount }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            const squad = new Squad({
                onClose: () => console.log("Widget closed."),
                onSuccess: () => { alert('Payment successful! Your account will be credited shortly.'); window.location.reload(); },
                key: data.publicKey, email: data.email, amount: data.amount, currency_code: 'NGN', transaction_ref: data.reference,
                customer_name: globalData.client.name,
            });
            squad.setup();
            squad.open();
        } catch (error) { alert(`Error: ${error.message}`); }
    }

    async function populateRolesDropdown() {
        const roleSelect = document.getElementById('invite-role');
        if (!roleSelect) return;

        try {
            const response = await fetch('/api/team/roles', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Could not fetch roles.');
            
            const roles = await response.json();
            roleSelect.innerHTML = ''; // Clear existing options
            roles.forEach(role => {
                const option = document.createElement('option');
                option.value = role.id;
                option.textContent = role.role_name;
                roleSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error populating roles:', error);
        }
    }

    async function populateTeamMembersTable() {
        const tableBody = document.getElementById('team-members-table')?.querySelector('tbody');
        if (!tableBody) return;

        try {
            const response = await fetch('/api/team/members', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Could not fetch team members.');

            const members = await response.json();
            tableBody.innerHTML = ''; // Clear existing rows
            if (members.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="4">No team members found.</td></tr>';
                return;
            }
            
            members.forEach(member => {
                const statusClass = member.status === 'active' ? 'text-success' : 'text-warning';
                tableBody.innerHTML += `
                    <tr>
                        <td>${member.name}</td>
                        <td>${member.email}</td>
                        <td>${member.role_name}</td>
                        <td><span class="${statusClass}">${member.status}</span></td>
                    </tr>
                `;
            });
        } catch (error) {
            console.error('Error populating team members:', error);
            tableBody.innerHTML = '<tr><td colspan="4">Could not load team members.</td></tr>';
        }
    }

    async function handleInviteSubmit(event) {
        event.preventDefault();
        const email = document.getElementById('invite-email').value;
        const role_id = document.getElementById('invite-role').value;

        try {
            const response = await fetch('/api/team/invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email, role_id })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            
            alert(result.message);
            document.getElementById('invite-form').reset();
            populateTeamMembersTable(); // Refresh the table

        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    async function handleProfileUpdate(event) {
        event.preventDefault();
        const name = document.getElementById('profile-name').value;
        try {
            const response = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ name }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            alert('Name updated successfully!');
            fetchAllData();
        } catch (error) { alert(`Error: ${error.message}`); }
    }

    async function handlePasswordUpdate(event) {
        event.preventDefault();
        const password = document.getElementById('profile-password').value;
        const confirmPassword = document.getElementById('profile-confirm-password').value;
        if (password !== confirmPassword) { return alert('Passwords do not match.'); }
        try {
            const response = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ password }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            alert('Password changed successfully!');
            event.target.reset();
        } catch (error) { alert(`Error: ${error.message}`); }
    }

    async function populateMenusTable() {
        const tableBody = document.querySelector('#menus-table tbody');
        try {
            const response = await fetch('/api/ussd/menus', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Could not fetch menus.');
            const menus = await response.json();
            tableBody.innerHTML = '';
            if (menus.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="3">You have not created any menus yet.</td></tr>';
            } else {
                menus.forEach(menu => {
                    tableBody.innerHTML += `<tr><td>${menu.menu_name}</td><td>${menu.is_active ? '<span class="text-success">Active</span>' : 'Inactive'}</td><td><a href="/edit-menu.html?id=${menu.id}" class="btn btn-sm btn-info">Edit</a><button class="btn btn-sm btn-success set-active-btn" data-menu-id="${menu.id}">Set Active</button></td></tr>`;
                });
            }
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="3">Error loading menus: ${error.message}</td></tr>`;
        }
    }

    async function handleSetActiveMenu(menuId) {
        try {
            const response = await fetch('/api/ussd/menus/set-active', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ menuId }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            alert(result.message);
            renderMenuBuilderView();
        } catch (error) { alert('Error: ' + error.message); }
    }

    function populateSmsLogs() {
        const tableBody = document.querySelector('#sms-usage-table tbody');
        if(!tableBody) return;
        tableBody.innerHTML = '';
        if (!globalData.sms_logs || globalData.sms_logs.length === 0) { tableBody.innerHTML = '<tr><td colspan="3">No SMS usage found.</td></tr>'; return; }
        globalData.sms_logs.forEach(log => { tableBody.innerHTML += `<tr><td>${new Date(log.logged_at).toLocaleString()}</td><td>${log.status}</td><td>${log.cost}</td></tr>`; });
    }

    function populateAirtimeLogs() {
        const tableBody = document.querySelector('#airtime-usage-table tbody');
        if(!tableBody) return;
        tableBody.innerHTML = '';
        if (!globalData.airtime_logs || globalData.airtime_logs.length === 0) { tableBody.innerHTML = '<tr><td colspan="4">No Airtime usage found.</td></tr>'; return; }
        globalData.airtime_logs.forEach(log => { tableBody.innerHTML += `<tr><td>${new Date(log.logged_at).toLocaleString()}</td><td>${log.phone_number}</td><td>${log.amount}</td><td>${log.status}</td></tr>`; });
    }

    function populateUssdLogs() {
        const tableBody = document.querySelector('#ussd-usage-table tbody');
        if(!tableBody) return;
        tableBody.innerHTML = '';
        if (!globalData.ussd_logs || globalData.ussd_logs.length === 0) { 
            tableBody.innerHTML = '<tr><td colspan="5">No USSD usage found.</td></tr>'; 
            return; 
        }
        globalData.ussd_logs.forEach(log => {
            const clientPriceNaira = log.client_price ? `₦${parseFloat(log.client_price).toFixed(2)}` : '₦0.00';
            tableBody.innerHTML += `<tr><td>${new Date(log.logged_at).toLocaleString()}</td><td>${log.phone_number}</td><td>${log.final_user_string || '-'}</td><td>${log.status}</td><td>${clientPriceNaira}</td></tr>`; 
        });
    }

    function populateTransactionsTable() {
        const tableBody = document.querySelector('#transactions-table tbody');
        if(!tableBody) return;
        tableBody.innerHTML = '';
        if (!globalData.transactions || globalData.transactions.length === 0) { tableBody.innerHTML = '<tr><td colspan="5">No transactions found.</td></tr>'; return; }
        globalData.transactions.forEach(tx => { tableBody.innerHTML += `<tr><td>${new Date(tx.created_at).toLocaleString()}</td><td>${tx.reference}</td><td>₦${parseFloat(tx.amount).toFixed(2)}</td><td>${tx.tokens_purchased}</td><td>${tx.status}</td></tr>`; });
    }

    // --- EVENT LISTENERS for navigation ---
    mainContentContainer.addEventListener('click', (event) => {
        if (event.target.matches('.set-active-btn')) {
            const menuId = event.target.dataset.menuId;
            handleSetActiveMenu(menuId);
        }
    });
    logoutButton.addEventListener('click', (e) => { e.preventDefault(); localStorage.removeItem('authToken'); window.location.href = '/login.html'; });
    navDashboard.addEventListener('click', (e) => { e.preventDefault(); renderDashboardView(); });
    navServices.addEventListener('click', (e) => { e.preventDefault(); renderServicesView(); });
    navUssd.addEventListener('click', (e) => { e.preventDefault(); renderUssdView(); });
    navBilling.addEventListener('click', (e) => { e.preventDefault(); renderBillingView(); });
    navProfile.addEventListener('click', (e) => { e.preventDefault(); renderProfileView(); });
    if(navMenuBuilder) navMenuBuilder.addEventListener('click', (e) => { e.preventDefault(); renderMenuBuilderView(); });
    navTeam.addEventListener('click', (e) => {e.preventDefault();renderTeamView();
});
    
    // --- Initial Load ---
    fetchAllData();
});