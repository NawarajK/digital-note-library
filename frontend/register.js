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

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
      registerForm.addEventListener('submit', async function(event) {
          event.preventDefault();
          console.log('Register form submitted');

          const username = document.getElementById('username').value;
          const email = document.getElementById('email').value;
          const password = document.getElementById('password').value;
          const confirmPassword = document.getElementById('confirmPassword').value;

          // Validate that passwords match
          if (password !== confirmPassword) {
              alert('Passwords do not match. Please try again.');
              return;
          }

          try {
              const response = await fetch('http://localhost:3000/register', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ username, email, password })
              });

              if (response.ok) {
                  alert('Registration successful! Please log in.');
                  window.location.href = 'login.html';
              } else {
                  const errorData = await response.json();
                  alert(errorData.error || 'Registration failed');
              }
          } catch (error) {
              console.error('Error during registration:', error);
              alert('Error during registration: ' + error.message);
          }
      });
  } else {
      console.error('Register form not found');
  }

  const showPasswordCheckbox = document.getElementById('showPassword');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  if (showPasswordCheckbox && passwordInput && confirmPasswordInput) {
      showPasswordCheckbox.addEventListener('change', function() {
          const type = this.checked ? 'text' : 'password';
          passwordInput.type = type;
          confirmPasswordInput.type = type;
          console.log('Show Password toggled, new type:', type);
      });
  } else {
      console.error('Show password checkbox, password input, or confirm password input not found');
  }
});