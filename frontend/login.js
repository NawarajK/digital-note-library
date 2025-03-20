// Get the form by its ID
const loginForm = document.getElementById('loginForm');

// Run this when the form is submitted
loginForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    alert('Email: ' + email + ' Password: ' + password);
});