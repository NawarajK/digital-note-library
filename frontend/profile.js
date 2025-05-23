// Wait for the page to fully load before running the code
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM fully loaded and parsed'); // Show a message when the page is ready

    // Get the user’s login token from storage
    let token; // Variable to store the user’s login token
    try {
        token = localStorage.getItem('token'); // Try to get the token from browser storage
    } catch (error) {
        // If there’s an error getting the token, show an error and redirect to login
        console.error('Error accessing localStorage:', error);
        alert('Storage access is restricted. Please disable incognito mode or check browser settings.');
        window.location.href = 'login.html'; // Send user to the login page
        return; // Stop the code here
    }

    // If no token is found, redirect to the login page
    if (!token) {
        console.log('No token found, redirecting to login');
        window.location.href = 'login.html'; // Send user to the login page
        return; // Stop the code here
    }

    console.log('Token found:', token); // Show a message if the token is found

    // Function to get and display the user’s profile details
    async function loadProfile() {
        try {
            // Send a request to the server to get the user’s profile
            const response = await fetch('http://localhost:3000/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}` // Send the user’s token
                }
            });
            console.log('Profile fetch response status:', response.status); // Show the server response
            if (response.ok) {
                // If the request worked, show the user’s details
                const user = await response.json(); // Get the user’s info
                console.log('Profile loaded:', user); // Show the user’s info

                // Show the username on the page
                const usernameElement = document.getElementById('username'); // Get the username area
                if (usernameElement) {
                    usernameElement.textContent = user.username; // Show the username
                } else {
                    console.error('Username element not found'); // Show an error if the area is missing
                }

                // Show the email on the page
                const emailElement = document.getElementById('email'); // Get the email area
                if (emailElement) {
                    emailElement.textContent = user.email; // Show the email
                } else {
                    console.error('Email element not found'); // Show an error if the area is missing
                }

                // Set the theme dropdown to the user’s current theme
                const theme = user.theme || 'light'; // Use the user’s theme or default to light
                const themeSelect = document.getElementById('theme'); // Get the theme dropdown
                if (themeSelect) {
                    themeSelect.value = theme; // Set the dropdown to the user’s theme
                } else {
                    console.error('Theme select element not found'); // Show an error if the dropdown is missing
                }

                // Apply the user’s theme to the page
                document.body.classList.remove('light', 'dark'); // Remove any existing theme
                document.body.classList.add(theme); // Add the user’s theme
                console.log(`Applied theme on profile page: ${theme}`); // Show a success message
                console.log('Body classes after applying theme:', document.body.classList.toString()); // Show the updated theme
            } else {
                // If the request failed, handle the error
                const errorData = await response.json(); // Get the error details
                console.error('Failed to load profile:', errorData); // Show the error
                if (response.status === 401 || response.status === 403) {
                    // If the token is invalid or expired, redirect to login
                    console.log('Unauthorized or invalid token, prompting to log in');
                    alert('Your session has expired. Please log in again.');
                    localStorage.removeItem('token'); // Remove the token
                    window.location.href = 'login.html'; // Send user to the login page
                } else {
                    // If there’s another error, show it but don’t redirect
                    alert('Failed to load profile: ' + (errorData.error || 'Unknown error'));
                }
            }
        } catch (error) {
            // If there’s an error, show it but don’t redirect
            console.error('Error loading profile:', error);
            alert('Error loading profile: ' + error.message + '. Please try again.');
        }
    }

    // Load the user’s profile when the page opens
    await loadProfile();

    // Handle changing the theme when the user selects a new one
    const themeSelect = document.getElementById('theme'); // Get the theme dropdown
    if (themeSelect) {
        themeSelect.addEventListener('change', async function() {
            const newTheme = this.value; // Get the new theme (light or dark)
            console.log('Theme change initiated, new theme:', newTheme); // Show a message
            try {
                // Send the new theme to the server to save it
                const response = await fetch('http://localhost:3000/profile/theme', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json', // Send the data as JSON
                        'Authorization': `Bearer ${token}` // Send the user’s token
                    },
                    body: JSON.stringify({ theme: newTheme }) // Send the new theme
                });
                console.log('Theme update response status:', response.status); // Show the server response
                if (response.ok) {
                    // If the update worked, apply the new theme
                    const responseData = await response.json(); // Get the response
                    console.log('Theme update response:', responseData); // Show the response
                    document.body.classList.remove('light', 'dark'); // Remove the old theme
                    document.body.classList.add(newTheme); // Add the new theme
                    console.log(`Theme applied on profile page: ${newTheme}`); // Show a success message
                    console.log('Body classes after applying theme:', document.body.classList.toString()); // Show the updated theme

                    // Check the updated profile to confirm the theme change
                    const profileResponse = await fetch('http://localhost:3000/profile', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}` // Send the user’s token
                        }
                    });
                    if (profileResponse.ok) {
                        // If the profile fetch worked, show the updated profile
                        const updatedUser = await profileResponse.json();
                        console.log('Profile after theme update:', updatedUser); // Show the updated profile
                    } else {
                        // If the profile fetch failed, handle the error
                        console.error('Failed to fetch profile after theme update, status:', profileResponse.status);
                        const errorData = await profileResponse.json();
                        console.error('Error details:', errorData);
                        if (profileResponse.status === 401 || profileResponse.status === 403) {
                            // If the token is invalid, redirect to login
                            alert('Your session has expired. Please log in again.');
                            localStorage.removeItem('token'); // Remove the token
                            window.location.href = 'login.html'; // Send user to the login page
                        }
                    }
                } else {
                    // If the theme update failed, handle the error
                    const errorData = await response.json(); // Get the error details
                    console.error('Failed to update theme:', errorData); // Show the error
                    if (response.status === 401 || response.status === 403) {
                        // If the token is invalid, redirect to login
                        alert('Your session has expired. Please log in again.');
                        localStorage.removeItem('token'); // Remove the token
                        window.location.href = 'login.html'; // Send user to the login page
                    } else {
                        // If there’s another error, show it
                        alert('Failed to update theme: ' + (errorData.error || 'Unknown error'));
                    }
                }
            } catch (error) {
                // If there’s an error, show it
                console.error('Error updating theme:', error);
                alert('Error updating theme: ' + error.message);
            }
        });
    } else {
        console.error('Theme select element not found'); // Show an error if the dropdown is missing
    }

    // Handle logging out when the user clicks the logout button
    const logoutButton = document.getElementById('logout'); // Get the logout button
    if (logoutButton) {
        logoutButton.addEventListener('click', function(e) {
            e.stopPropagation(); // Stop the event from affecting other elements
            e.preventDefault(); // Stop any default action
            try {
                localStorage.removeItem('token'); // Remove the user’s token
                document.body.classList.remove('dark'); // Remove the dark theme
                document.body.classList.add('light'); // Set the light theme
                console.log('Theme set to light on logout'); // Show a message
            } catch (error) {
                console.error('Error removing token from localStorage:', error); // Show an error if token removal fails
            }
            window.location.href = 'login.html'; // Redirect to the login page
        });
    } else {
        console.error('Logout button not found'); // Show an error if the logout button is missing
    }
});