document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM fully loaded and parsed');

    // Fetch and apply the user's theme if logged in
    async function applyUserTheme() {
        const token = localStorage.getItem('token');
        if (!token) {
            // Explicitly set light theme if not logged in
            document.body.classList.remove('dark');
            document.body.classList.add('light');
            console.log('No token found, applied default light theme');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const user = await response.json();
                const theme = user.theme || 'light';
                document.body.classList.remove('light', 'dark');
                document.body.classList.add(theme);
                console.log(`Applied theme: ${theme}`);
            } else {
                console.error('Failed to fetch user profile for theme');
                document.body.classList.remove('dark');
                document.body.classList.add('light'); // Default to light theme
            }
        } catch (error) {
            console.error('Error fetching user profile for theme:', error);
            document.body.classList.remove('dark');
            document.body.classList.add('light'); // Default to light theme
        }
    }

    // Apply the theme on page load
    await applyUserTheme();

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            console.log('Login form submitted');
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('http://localhost:3000/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                if (response.ok) {
                    const data = await response.json();
                    try {
                        localStorage.setItem('token', data.token);
                    } catch (error) {
                        console.error('Error saving token to localStorage:', error);
                    }
                    window.location.href = 'dashboard.html';
                } else {
                    const errorData = await response.json();
                    alert(errorData.error || 'Login failed');
                }
            } catch (error) {
                console.error('Error during login:', error);
                alert('Error during login: ' + error.message);
            }
        });
    } else {
        console.error('Login form not found');
    }

    const showPasswordCheckbox = document.getElementById('showPassword');
    const passwordInput = document.getElementById('password');
    if (showPasswordCheckbox && passwordInput) {
        showPasswordCheckbox.addEventListener('change', function() {
            passwordInput.type = this.checked ? 'text' : 'password';
        });
    } else {
        console.error('Show password checkbox or password input not found');
    }
});