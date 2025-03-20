// Get the form by its ID
const registerForm = document.getElementById('registerForm');

// Run this when the form is submitted
registerForm.addEventListener('submit', function(event) {
    // Stop the page from refreshing
    event.preventDefault();

    // Get what the user typed
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Show an alert with the details (just for now)
    alert('Username: ' + username + ' Email: ' + email + ' Password: ' + password);
});