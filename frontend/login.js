// Wait for the page to fully load before running the code
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM fully loaded and parsed'); // Show a message when the page is ready

    // Function to get and apply the user’s theme (light or dark)
    async function applyUserTheme() {
        const token = localStorage.getItem('token'); // Get the user’s login token from storage
        if (!token) {
            // If there’s no token (user not logged in), use the light theme
            document.body.classList.remove('dark'); // Remove the dark theme
            document.body.classList.add('light'); // Add the light theme
            console.log('No token found, applied default light theme'); // Show a message
            return; // Stop the function
        }

        try {
            // Try to get the user’s profile from the server to find their theme
            const response = await fetch('http://localhost:3000/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}` // Send the user’s token
                }
            });
            if (response.ok) {
                // If the request worked, apply the user’s theme
                const user = await response.json(); // Get the user’s info
                const theme = user.theme || 'light'; // Use the user’s theme or default to light
                document.body.classList.remove('light', 'dark'); // Remove any existing theme
                document.body.classList.add(theme); // Add the user’s theme
                console.log(`Applied theme: ${theme}`); // Show a success message
            } else {
                // If the request failed, use the default light theme
                console.error('Failed to fetch user profile for theme');
                document.body.classList.remove('dark'); // Remove the dark theme
                document.body.classList.add('light'); // Add the light theme
            }
        } catch (error) {
            // If there’s an error, use the default light theme
            console.error('Error fetching user profile for theme:', error);
            document.body.classList.remove('dark'); // Remove the dark theme
            document.body.classList.add('light'); // Add the light theme
        }
    }

    // Apply the user’s theme when the page loads
    await applyUserTheme();

    // Handle the login form submission
    const loginForm = document.getElementById('loginForm'); // Get the login form
    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault(); // Stop the form from submitting normally
            console.log('Login form submitted'); // Show a message
            const email = document.getElementById('email').value; // Get the email from the form
            const password = document.getElementById('password').value; // Get the password from the form

            try {
                // Send the login details to the server
                const response = await fetch('http://localhost:3000/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json' // Send the data as JSON
                    },
                    body: JSON.stringify({ email, password }) // Send the email and password
                });

                if (response.ok) {
                    // If the login worked, save the token and redirect to the dashboard
                    const data = await response.json(); // Get the response from the server
                    try {
                        localStorage.setItem('token', data.token); // Save the login token in storage
                    } catch (error) {
                        console.error('Error saving token to localStorage:', error); // Show an error if saving fails
                    }
                    window.location.href = 'dashboard.html'; // Redirect to the dashboard page
                } else {
                    // If the login failed, show an error message
                    const errorData = await response.json(); // Get the error details
                    alert(errorData.error || 'Login failed'); // Show the error to the user
                }
            } catch (error) {
                // If there’s an error, show it to the user
                console.error('Error during login:', error);
                alert('Error during login: ' + error.message);
            }
        });
    } else {
        console.error('Login form not found'); // Show an error if the form is missing
    }

    // Handle the "Show Password" checkbox
    const showPasswordCheckbox = document.getElementById('showPassword'); // Get the checkbox
    const passwordInput = document.getElementById('password'); // Get the password input field
    if (showPasswordCheckbox && passwordInput) {
        showPasswordCheckbox.addEventListener('change', function() {
            // Show or hide the password when the checkbox is clicked
            passwordInput.type = this.checked ? 'text' : 'password'; // Show the password if checked, hide if unchecked
        });
    } else {
        console.error('Show password checkbox or password input not found'); // Show an error if elements are missing
    }
});