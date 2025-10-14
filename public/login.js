document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const twoFaForm = document.getElementById('2fa-form'); // We need to add this form to login.html
    let tempToken = '';

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            if (result.two_factor_required) {
                // Show the 2FA form, hide the login form
                loginForm.style.display = 'none';
                twoFaForm.style.display = 'block';
                tempToken = result.temp_token; // Store the temporary token
            } else {
                // Normal login
                localStorage.setItem('authToken', result.token);
                window.location.href = result.isAdmin ? '/admin.html' : '/dashboard.html';
            }
        } catch (error) {
            alert(`Login Failed: ${error.message}`);
        }
    });

    twoFaForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const twoFaToken = document.getElementById('2fa-token-input').value;
        try {
            const response = await fetch('/auth/2fa/verify-login', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tempToken}` // Use the temporary token for auth
                },
                body: JSON.stringify({ token: twoFaToken }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            // 2FA successful, now we have the final token
            localStorage.setItem('authToken', result.token);
            window.location.href = result.isAdmin ? '/admin.html' : '/dashboard.html';
        } catch (error) {
            alert(`2FA Verification Failed: ${error.message}`);
        }
    });
});