// frontend/login.js
// Listen for the login form submission
document.getElementById('loginForm').addEventListener('submit', async function(event) {
  event.preventDefault(); // Prevent page refresh
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
      const response = await fetch('http://localhost:3000/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
      });
      if (response.ok) {
          const data = await response.json();
          localStorage.setItem('token', data.token); // Store token
          alert('Login successful');
          window.location.href = 'dashboard.html'; // Redirect to dashboard
      } else {
          alert('Login failed');
      }
  } catch (error) {
      alert('Error: ' + error.message);
  }
});