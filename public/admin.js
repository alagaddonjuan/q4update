document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    let globalAdminData = {};

    const mainContentContainer = document.getElementById('main-admin-content');
    const logoutButton = document.getElementById('logout-link');
    
    // --- Event Listeners ---
    if(logoutButton) {
        logoutButton.addEventListener('click', (e) => { e.preventDefault(); localStorage.removeItem('authToken'); window.location.href = '/login.html'; });
    }

    mainContentContainer.addEventListener('click', async (event) => {
        const target = event.target;
        if (target.matches('.edit-client-btn')) {
            const clientId = target.dataset.clientId;
            openEditModal(parseInt(clientId));
        }
        if (target.matches('.approve-btn')) {
            const clientId = target.dataset.clientId;
            handleUpdateClientStatus(clientId, 'active');
        }
        if (target.matches('.reject-btn')) {
            const clientId = target.dataset.clientId;
            handleUpdateClientStatus(clientId, 'suspended');
        }
        if (target.matches('.edit-prices-btn')) {
            const tierId = target.dataset.tierId;
            const tierName = target.dataset.tierName;
            openEditPricesModal(tierId, tierName);
        }
        if (target.matches('.view-session-details-link')) {
            event.preventDefault();
            const sessionId = event.target.dataset.sessionId;
            showSessionDetails(sessionId);
        }
    });

    // --- Core Data Fetching ---
    async function fetchAllAdminData() {
        try {
            const [clientsResponse, logsResponse, statsResponse, tiersResponse] = await Promise.all([
                fetch('/api/admin/clients', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/admin/logs', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/admin/pricing-tiers', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (!clientsResponse.ok || !logsResponse.ok || !statsResponse.ok || !tiersResponse.ok) {
                throw new Error('Could not fetch all admin data.');
            }
            
            globalAdminData.clients = await clientsResponse.json();
            const logs = await logsResponse.json();
            globalAdminData.stats = await statsResponse.json();
            globalAdminData.tiers = await tiersResponse.json();
            globalAdminData.smsLogs = logs.smsLogs;
            globalAdminData.airtimeLogs = logs.airtimeLogs;
            globalAdminData.ussdLogs = logs.ussdLogs;
            globalAdminData.transactions = logs.transactions;
            
            renderAdminDashboard();
        } catch (error) {
            console.error('Admin dashboard error:', error);
            mainContentContainer.innerHTML = `<p class="text-danger">Failed to load admin dashboard. Please try again.</p>`;
        }
    }

    // --- Main Render Function ---
    function renderAdminDashboard() {
        if (!globalAdminData.stats) return;
        const stats = globalAdminData.stats;
        mainContentContainer.innerHTML = `
            <div class="d-sm-flex align-items-center justify-content-between mb-4">
                <h1 class="h3 mb-0 text-gray-800">Admin Dashboard</h1>
            </div>
            <div class="row">
                <div class="col-xl-4 col-md-6 mb-4"><div class="card border-left-primary shadow h-100 py-2"><div class="card-body"><div class="row no-gutters align-items-center"><div class="col mr-2"><div class="text-xs font-weight-bold text-primary text-uppercase mb-1">Total Clients</div><div class="h5 mb-0 font-weight-bold text-gray-800">${stats.clientCount}</div></div><div class="col-auto"><i class="fas fa-users fa-2x text-gray-300"></i></div></div></div></div></div>
                <div class="col-xl-4 col-md-6 mb-4"><div class="card border-left-success shadow h-100 py-2"><div class="card-body"><div class="row no-gutters align-items-center"><div class="col mr-2"><div class="text-xs font-weight-bold text-success text-uppercase mb-1">Total Tokens Purchased</div><div class="h5 mb-0 font-weight-bold text-gray-800">${stats.tokensPurchased}</div></div><div class="col-auto"><i class="fas fa-coins fa-2x text-gray-300"></i></div></div></div></div></div>
                <div class="col-xl-4 col-md-6 mb-4"><div class="card border-left-info shadow h-100 py-2"><div class="card-body"><div class="row no-gutters align-items-center"><div class="col mr-2"><div class="text-xs font-weight-bold text-info text-uppercase mb-1">Total SMS Sent</div><div class="h5 mb-0 font-weight-bold text-gray-800">${stats.smsSentCount}</div></div><div class="col-auto"><i class="fas fa-comments fa-2x text-gray-300"></i></div></div></div></div></div>
            </div>
            <div class="row">
            <div class="col-lg-6">
                </div>
            <div class="col-lg-6">
                <div class="card shadow mb-4">
                    <div class="card-header py-3"><h6 class="m-0 font-weight-bold text-primary">Send Announcement</h6></div>
                    <div class="card-body">
                        <form id="announcement-form">
                            <div class="form-group"><label>Subject</label><input type="text" id="announcement-subject" class="form-control" required></div>
                            <div class="form-group"><label>Message</label><textarea id="announcement-message" class="form-control" rows="5" required></textarea></div>
                            <button type="submit" class="btn btn-info">Send to All Clients</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
            <div class="row">
                <div class="col-lg-6">
                    <div class="card shadow mb-4"><div class="card-header py-3"><h6 class="m-0 font-weight-bold text-primary">Top-Up Client Wallet</h6></div>
                        <div class="card-body">
                            <form id="topup-form">
                                <div class="form-group"><label>Client ID</label><input type="number" id="clientId" class="form-control" required></div>
                                <div class="form-group"><label>Number of Tokens</label><input type="number" id="amount" class="form-control" required></div>
                                <button type="submit" class="btn btn-primary">Add Credit</button>
                            </form>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="card shadow mb-4">
                        <div class="card-header py-3"><h6 class="m-0 font-weight-bold text-primary">Manual Transaction</h6></div>
                        <div class="card-body">
                            <form id="manual-transaction-form">
                                <div class="form-group"><label>Client ID</label><input type="number" id="manual-clientId" class="form-control" required></div>
                                <div class="form-group"><label>Transaction Type</label><select id="manual-type" class="form-control"><option value="credit">Credit (Add Tokens)</option><option value="debit">Debit (Remove Tokens)</option></select></div>
                                <div class="form-group"><label>Amount (in Tokens)</label><input type="number" id="manual-amount" class="form-control" required></div>
                                <div class="form-group"><label>Reason / Notes</label><input type="text" id="manual-reason" class="form-control" required></div>
                                <button type="submit" class="btn btn-warning">Process Transaction</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-lg-6">
                     <div class="card shadow mb-4">
                        <div class="card-header py-3"><h6 class="m-0 font-weight-bold text-primary">Manage Pricing Tiers</h6></div>
                        <div class="card-body">
                            <div class="table-responsive"><table class="table table-bordered" id="pricing-tiers-table">
                                <thead><tr><th>Tier Name</th><th>Actions</th></tr></thead>
                                <tbody></tbody>
                            </table></div>
                            <hr>
                            <form id="add-tier-form" class="form-inline">
                                <div class="form-group mr-3 flex-grow-1"><input type="text" id="new-tier-name" class="form-control w-100" placeholder="New Tier Name" required></div>
                                <button type="submit" class="btn btn-success">Create</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card shadow mb-4"><div class="card-header py-3"><h6 class="m-0 font-weight-bold text-primary">Registered Clients</h6></div>
                <div class="card-body"><div class="table-responsive"><table class="table table-bordered" id="clients-table">
                    <thead><tr><th>ID</th><th>Name</th><th>Token Balance</th><th>Status</th><th>Admin</th><th>Registered</th><th>Actions</th></tr></thead>
                    <tbody></tbody>
                </table></div></div>
            </div>

            <div class="card shadow mb-4"><div class="card-header py-3"><h6 class="m-0 font-weight-bold text-primary">All Usage & Transaction Logs</h6></div>
                <div class="card-body">
                    <h5>Payment Transactions</h5><div class="table-responsive"><table class="table table-bordered" id="all-transactions-table"><thead><tr><th>Client</th><th>Amount (NGN)</th><th>Tokens</th><th>Gateway</th><th>Status</th><th>Notes</th><th>Date</th></tr></thead><tbody></tbody></table></div>
                    <h5 class="mt-4">SMS Logs</h5><div class="table-responsive"><table class="table table-bordered" id="all-sms-table"><thead><tr><th>Client</th><th>Status</th><th>Cost</th><th>Date</th></tr></thead><tbody></tbody></table></div>
                    <h5 class="mt-4">Airtime Logs</h5><div class="table-responsive"><table class="table table-bordered" id="all-airtime-table"><thead><tr><th>Client</th><th>Phone</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody></tbody></table></div>
                    <h5 class="mt-4">USSD Logs</h5><div class="table-responsive"><table class="table table-bordered" id="all-ussd-table"><thead><tr><th>Client</th><th>Phone</th><th>Final Input</th><th>Cost (NGN)</th><th>Session ID</th><th>Date</th></tr></thead><tbody></tbody></table></div>
                </div>
            </div>
            
        `;
        
        document.getElementById('topup-form').addEventListener('submit', handleTopupSubmit);
        document.getElementById('manual-transaction-form').addEventListener('submit', handleManualTransaction);
        document.getElementById('announcement-form').addEventListener('submit', handleAnnouncementSubmit);
        
        populateClientsTable(globalAdminData.clients);
        populateTransactionsTable(globalAdminData.transactions);
        populateSmsLogsTable(globalAdminData.smsLogs);
        populateAirtimeLogsTable(globalAdminData.airtimeLogs);
        populateUssdLogsTable(globalAdminData.ussdLogs);
        initializePricingTiers();
    }

    function initializePricingTiers() {
        populatePricingTiersTable();
        const addTierForm = document.getElementById('add-tier-form');
        if (addTierForm) {
            addTierForm.addEventListener('submit', handleAddTier);
        }
    }

    async function populatePricingTiersTable() {
        const tableBody = document.querySelector('#pricing-tiers-table tbody');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        globalAdminData.tiers.forEach(tier => {
            tableBody.innerHTML += `
                <tr>
                    <td>${tier.tier_name}</td>
                    <td><button class="btn btn-sm btn-info edit-prices-btn" data-tier-id="${tier.id}" data-tier-name="${tier.tier_name}">Edit Prices</button></td>
                </tr>
            `;
        });
    }

    async function handleAddTier(event) {
        event.preventDefault();
        const tierNameInput = document.getElementById('new-tier-name');
        const tierName = tierNameInput.value;
        if (!tierName) return;

        try {
            const response = await fetch('/api/admin/pricing-tiers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ tier_name: tierName })
            });
            if (!response.ok) throw new Error('Failed to create tier');
            tierNameInput.value = '';
            fetchAllAdminData(); // Refresh all data to get the new tier
        } catch (error) {
            alert(error.message);
        }
    }
    
    async function openEditPricesModal(tierId, tierName) {
        try {
            const pricesResponse = await fetch(`/api/admin/pricing-tiers/${tierId}/prices`, { headers: { 'Authorization': `Bearer ${token}` } });
            const prices = await pricesResponse.json();
            const smsPrice = prices.find(p => p.service_name === 'SMS')?.price || 10;
            const ussdMultiplier = prices.find(p => p.service_name === 'USSD')?.price || 3;
            
            const modal = document.getElementById('edit-prices-modal');
            modal.innerHTML = `
                <div class="modal-dialog" role="document">
                    <div class="modal-content">
                        <div class="modal-header"><h5 class="modal-title">Edit Prices for ${tierName}</h5><button class="close" type="button" data-dismiss="modal"><span>×</span></button></div>
                        <form id="edit-prices-form" data-tier-id="${tierId}">
                            <div class="modal-body">
                                <div class="form-group"><label>SMS Price (in Tokens)</label><input type="number" step="0.01" id="edit-sms-price" class="form-control" value="${smsPrice}" required></div>
                                <div class="form-group"><label>USSD Cost Multiplier (e.g., 3 for 3x)</label><input type="number" step="0.1" id="edit-ussd-multiplier" class="form-control" value="${ussdMultiplier}" required></div>
                            </div>
                            <div class="modal-footer">
                                <button class="btn btn-secondary" type="button" data-dismiss="modal">Cancel</button>
                                <button class="btn btn-primary" type="submit">Save Prices</button>
                            </div>
                        </form>
                    </div>
                </div>`;
            $('#edit-prices-modal').modal('show');
            document.getElementById('edit-prices-form').addEventListener('submit', handleUpdatePrices);
        } catch (error) {
            console.error('Error opening edit prices modal:', error);
        }
    }
    
    async function handleUpdatePrices(event) {
        event.preventDefault();
        const tierId = event.target.dataset.tierId;
        const sms_price = document.getElementById('edit-sms-price').value;
        const ussd_multiplier = document.getElementById('edit-ussd-multiplier').value;
        
        try {
            await fetch(`/api/admin/pricing-tiers/${tierId}/prices`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ sms_price, ussd_multiplier })
            });
            $('#edit-prices-modal').modal('hide');
            alert('Prices updated successfully!');
        } catch (error) {
            alert('Failed to update prices.');
        }
    }

    async function openEditModal(clientId) {
        const client = globalAdminData.clients.find(c => c.id === clientId);
        if (client) {
            document.getElementById('edit-clientId').value = client.id;
            document.getElementById('edit-name').value = client.name;
            document.getElementById('edit-ussd_code').value = client.ussd_code || '';
            document.getElementById('edit-sender_id').value = client.sender_id || '';
            
            const tierDropdown = document.getElementById('edit-pricing-tier');
            tierDropdown.innerHTML = '<option value="null">-- Standard (None) --</option>';
            globalAdminData.tiers.forEach(tier => {
                tierDropdown.innerHTML += `<option value="${tier.id}">${tier.tier_name}</option>`;
            });
            
            tierDropdown.value = client.pricing_tier_id || 'null';
            $('#edit-client-modal').modal('show');
            document.getElementById('edit-client-form').addEventListener('submit', handleClientUpdate);
        }
    }

    async function handleClientUpdate(event) {
        event.preventDefault();
        const form = event.target;
        const clientId = form.querySelector('#edit-clientId').value;
        const name = form.querySelector('#edit-name').value;
        const ussd_code = form.querySelector('#edit-ussd_code').value;
        const sender_id = form.querySelector('#edit-sender_id').value;
        const tierId = form.querySelector('#edit-pricing-tier').value;

        try {
            await fetch(`/api/admin/clients/${clientId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                body: JSON.stringify({ name, ussd_code, sender_id })
            });
            await fetch(`/api/admin/clients/${clientId}/assign-tier`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ tierId })
            });
            
            $('#edit-client-modal').modal('hide');
            fetchAllAdminData();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }
    
    async function handleUpdateClientStatus(clientId, newStatus) {
        const action = newStatus === 'active' ? 'approve' : 'suspend';
        if (!confirm(`Are you sure you want to ${action} this client?`)) return;
        
        try {
            const response = await fetch(`/api/admin/clients/${clientId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            alert(result.message);
            fetchAllAdminData();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    async function handleTopupSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const clientId = form.querySelector('#clientId').value;
        const amount = form.querySelector('#amount').value;
        try {
            const response = await fetch('/api/admin/topup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ clientId, amount })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            alert(result.message);
            form.reset();
            fetchAllAdminData();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }
    
    async function handleManualTransaction(event) {
        event.preventDefault();
        const form = event.target;
        const clientId = form.querySelector('#manual-clientId').value;
        const amount = form.querySelector('#manual-amount').value;
        const type = form.querySelector('#manual-type').value;
        const reason = form.querySelector('#manual-reason').value;

        if (!confirm(`Are you sure you want to ${type} ${amount} tokens for client ID ${clientId}?`)) {
            return;
        }

        try {
            const response = await fetch('/api/admin/transactions/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ clientId, amount, type, reason })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            
            alert(result.message);
            form.reset();
            fetchAllAdminData(); // Refresh all data on the page
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }

async function handleAnnouncementSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const subject = form.querySelector('#announcement-subject').value;
    const message = form.querySelector('#announcement-message').value;

    if (!confirm(`Are you sure you want to send this announcement to all clients?`)) {
        return;
    }

    try {
        const response = await fetch('/api/admin/announcements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ subject, message })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        
        alert(result.message);
        form.reset();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

    function populateClientsTable(clients) {
        const tableBody = document.querySelector('#clients-table tbody');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        clients.forEach(client => {
            let actions = '';
            if (client.status === 'pending') {
                actions = `<button class="btn btn-sm btn-success approve-btn" data-client-id="${client.id}">Approve</button> <button class="btn btn-sm btn-danger reject-btn" data-client-id="${client.id}">Reject</button>`;
            } else {
                actions = `<button class="btn btn-sm btn-primary edit-client-btn" data-client-id="${client.id}">Edit</button>`;
            }
            const statusClass = client.status === 'active' ? 'text-success' : (client.status === 'pending' ? 'text-warning' : 'text-danger');
            tableBody.innerHTML += `<tr><td>${client.id}</td><td>${client.name}</td><td>${client.token_balance}</td><td><span class="font-weight-bold ${statusClass}">${client.status}</span></td><td>${client.is_admin ? 'Yes' : 'No'}</td><td>${new Date(client.created_at).toLocaleString()}</td><td>${actions}</td></tr>`;
        });
    }

    function populateTransactionsTable(transactions) {
        const tableBody = document.querySelector('#all-transactions-table tbody');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        if (!transactions || transactions.length === 0) { 
            tableBody.innerHTML = '<tr><td colspan="7">No transactions found.</td></tr>'; 
            return; 
        }
        transactions.forEach(tx => {
            tableBody.innerHTML += `<tr>
                <td>${tx.client_name}</td>
                <td>₦${parseFloat(tx.amount).toFixed(2)}</td>
                <td>${tx.tokens_purchased}</td>
                <td>${tx.gateway}</td>
                <td>${tx.status}</td>
                <td>${tx.notes || ''}</td>
                <td>${new Date(tx.created_at).toLocaleString()}</td>
            </tr>`;
        });
    }
    
    function populateSmsLogsTable(logs) {
        const tableBody = document.querySelector('#all-sms-table tbody');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        if (!logs || logs.length === 0) { 
            tableBody.innerHTML = '<tr><td colspan="4">No SMS logs found.</td></tr>'; 
            return; 
        }
        logs.forEach(log => {
            tableBody.innerHTML += `<tr><td>${log.client_name}</td><td>${log.status}</td><td>${log.cost}</td><td>${new Date(log.logged_at).toLocaleString()}</td></tr>`;
        });
    }
    
    function populateAirtimeLogsTable(logs) {
        const tableBody = document.querySelector('#all-airtime-table tbody');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        if (!logs || logs.length === 0) { 
            tableBody.innerHTML = '<tr><td colspan="5">No Airtime logs found.</td></tr>'; 
            return; 
        }
        logs.forEach(log => {
            tableBody.innerHTML += `<tr><td>${log.client_name}</td><td>${log.phone_number}</td><td>${log.amount}</td><td>${log.status}</td><td>${new Date(log.logged_at).toLocaleString()}</td></tr>`;
        });
    }
    
    function populateUssdLogsTable(logs) {
        const tableBody = document.querySelector('#all-ussd-table tbody');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        if (!logs || logs.length === 0) { 
            tableBody.innerHTML = '<tr><td colspan="6">No USSD logs found.</td></tr>'; 
            return; 
        }
        logs.forEach(log => {
            const clientPrice = log.client_price ? `₦${parseFloat(log.client_price).toFixed(2)}` : '₦0.00';
            tableBody.innerHTML += `<tr><td>${log.client_name}</td><td>${log.phone_number}</td><td>${log.final_user_string || ''}</td><td>${clientPrice}</td><td>${log.session_id}</td><td>${log.logged_at ? new Date(log.logged_at).toLocaleString() : 'N/A'}</td></tr>`;
        });
    }
    
    function showSessionDetails(sessionId) {
        // This function can be implemented later for detailed session viewing
        alert(`Session details for: ${sessionId}`);
    }
    
    // --- Initial Load ---
    fetchAllAdminData();
});