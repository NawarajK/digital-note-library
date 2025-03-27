document.getElementById('registerForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    console.log('Sending to server:', { username, email, password });
    try {
      const response = await fetch('http://localhost:3000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      console.log('Response status:', response.status);
      if (response.ok) {
        alert('Registration successful');
        window.location.href = 'login.html';
      } else {
        const errorText = await response.text();
        alert('Registration failed: ' + errorText);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      alert('Error: ' + error.message);
    }
  });