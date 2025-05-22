document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM fully loaded and parsed');

    let token;
    try {
        token = localStorage.getItem('token');
    } catch (error) {
        console.error('Error accessing localStorage:', error);
        alert('Storage access is restricted. Please disable incognito mode or check browser settings.');
        window.location.href = 'login.html';
        return;
    }

    if (!token) {
        console.log('No token found, redirecting to login');
        window.location.href = 'login.html';
        return;
    }

    console.log('Token found:', token);

    // Fetch and display user profile
    async function loadProfile() {
        try {
            const response = await fetch('http://localhost:3000/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('Profile fetch response status:', response.status);
            if (response.ok) {
                const user = await response.json();
                console.log('Profile loaded:', user);
                const usernameElement = document.getElementById('username');
                const emailElement = document.getElementById('email');
                const themeSelect = document.getElementById('theme');

                if (usernameElement) {
                    usernameElement.textContent = user.username;
                } else {
                    console.error('Username element not found');
                }

                if (emailElement) {
                    emailElement.textContent = user.email;
                } else {
                    console.error('Email element not found');
                }

                const theme = user.theme || 'light';
                if (themeSelect) {
                    themeSelect.value = theme;
                } else {
                    console.error('Theme select element not found');
                }

                document.body.classList.remove('light', 'dark');
                document.body.classList.add(theme);
                console.log(`Applied theme on profile page: ${theme}`);
                console.log('Body classes after applying theme:', document.body.classList.toString());
            } else {
                const errorData = await response.json();
                console.error('Failed to load profile:', errorData);
                if (response.status === 401 || response.status === 403) {
                    console.log('Unauthorized or invalid token, prompting to log in');
                    alert('Your session has expired. Please log in again.');
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                } else {
                    alert('Failed to load profile: ' + (errorData.error || 'Unknown error'));
                    // Do not redirect, allow debugging
                }
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            alert('Error loading profile: ' + error.message + '. Please try again.');
            // Do not redirect, allow debugging
        }
    }

    await loadProfile();

    // Handle theme change
    const themeSelect = document.getElementById('theme');
    if (themeSelect) {
        themeSelect.addEventListener('change', async function() {
            const newTheme = this.value;
            console.log('Theme change initiated, new theme:', newTheme);
            try {
                const response = await fetch('http://localhost:3000/profile/theme', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ theme: newTheme })
                });
                console.log('Theme update response status:', response.status);
                if (response.ok) {
                    const responseData = await response.json();
                    console.log('Theme update response:', responseData);
                    document.body.classList.remove('light', 'dark');
                    document.body.classList.add(newTheme);
                    console.log(`Theme applied on profile page: ${newTheme}`);
                    console.log('Body classes after applying theme:', document.body.classList.toString());
                    // Fetch the profile again to confirm the update
                    const profileResponse = await fetch('http://localhost:3000/profile', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (profileResponse.ok) {
                        const updatedUser = await profileResponse.json();
                        console.log('Profile after theme update:', updatedUser);
                    } else {
                        console.error('Failed to fetch profile after theme update, status:', profileResponse.status);
                        const errorData = await profileResponse.json();
                        console.error('Error details:', errorData);
                        if (profileResponse.status === 401 || profileResponse.status === 403) {
                            alert('Your session has expired. Please log in again.');
                            localStorage.removeItem('token');
                            window.location.href = 'login.html';
                        }
                    }
                } else {
                    const errorData = await response.json();
                    console.error('Failed to update theme:', errorData);
                    if (response.status === 401 || response.status === 403) {
                        alert('Your session has expired. Please log in again.');
                        localStorage.removeItem('token');
                        window.location.href = 'login.html';
                    } else {
                        alert('Failed to update theme: ' + (errorData.error || 'Unknown error'));
                    }
                }
            } catch (error) {
                console.error('Error updating theme:', error);
                alert('Error updating theme: ' + error.message);
            }
        });
    } else {
        console.error('Theme select element not found');
    }

    // Handle logout
    const logoutButton = document.getElementById('logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            try {
                localStorage.removeItem('token');
                // Explicitly set the light theme on logout
                document.body.classList.remove('dark');
                document.body.classList.add('light');
                console.log('Theme set to light on logout');
            } catch (error) {
                console.error('Error removing token from localStorage:', error);
            }
            window.location.href = 'login.html';
        });
    } else {
        console.error('Logout button not found');
    }
});