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

  // Function to get character codes of a string for debugging
  function getCharCodes(str) {
      return Array.from(str).map(char => char.charCodeAt(0)).join(', ');
  }

  // Function to normalize a string by trimming and removing non-printable characters
  function normalizeString(str) {
      return str.trim().replace(/[\r\n]+/g, ''); // Trim whitespace and remove newlines
  }

  // Variables to store the latest password values
  let latestPassword = '';
  let latestConfirmPassword = '';

  // Get the password input fields
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');

  // Add input event listeners to capture the latest values in real-time
  if (passwordInput) {
      passwordInput.addEventListener('input', function() {
          latestPassword = normalizeString(this.value);
          console.log('Password input updated:', latestPassword);
      });
  } else {
      console.error('Password input not found');
  }

  if (confirmPasswordInput) {
      confirmPasswordInput.addEventListener('input', function() {
          latestConfirmPassword = normalizeString(this.value);
          console.log('Confirm Password input updated:', latestConfirmPassword);
      });
  } else {
      console.error('Confirm Password input not found');
  }

  // Handle the registration form submission
  const registerForm = document.getElementById('registerForm'); // Get the registration form
  if (registerForm) {
      registerForm.addEventListener('submit', async function(event) {
          event.preventDefault(); // Stop the form from submitting normally
          console.log('Register form submitted'); // Show a message

          // Add a small delay to ensure input values are fully updated
          await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms

          // Get the user’s details from the form
          const username = document.getElementById('username').value; // Get the username
          const email = document.getElementById('email').value; // Get the email
          const password = passwordInput ? normalizeString(passwordInput.value) : latestPassword; // Use the input value or fallback
          const confirmPassword = confirmPasswordInput ? normalizeString(confirmPasswordInput.value) : latestConfirmPassword; // Use the input value or fallback

          // Enhanced debugging: log the values, lengths, and character codes
          console.log('Password at submission:', password);
          console.log('Confirm Password at submission:', confirmPassword);
          console.log('Latest Password (from input event):', latestPassword);
          console.log('Latest Confirm Password (from input event):', latestConfirmPassword);
          console.log('Password length:', password.length);
          console.log('Confirm Password length:', confirmPassword.length);
          console.log('Password character codes:', getCharCodes(password));
          console.log('Confirm Password character codes:', getCharCodes(confirmPassword));
          console.log('Are passwords equal?', password === confirmPassword);

          // Check if the passwords match
          if (password !== confirmPassword) {
              alert('Passwords do not match. Please try again.'); // Show an error if passwords don’t match
              return; // Stop the function
          }

          // Additional check: ensure passwords are not empty
          if (password === '') {
              alert('Password cannot be empty. Please enter a valid password.'); // Show an error if password is empty
              return; // Stop the function
          }

          try {
              // Send the registration details to the server
              const response = await fetch('http://localhost:3000/register', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json' // Send the data as JSON
                  },
                  body: JSON.stringify({ username, email, password }) // Send the username, email, and normalized password
              });

              if (response.ok) {
                  // If the registration worked, redirect to the login page
                  alert('Registration successful! Please log in.'); // Show a success message
                  window.location.href = 'login.html'; // Redirect to the login page
              } else {
                  // If the registration failed, show an error message
                  const errorData = await response.json(); // Get the error details
                  alert(errorData.error || 'Registration failed'); // Show the error to the user
              }
          } catch (error) {
              // If there’s an error, show it to the user
              console.error('Error during registration:', error);
              alert('Error during registration: ' + error.message);
          }
      });
  } else {
      console.error('Register form not found'); // Show an error if the form is missing
  }

  // Handle the "Show Password" checkbox
  const showPasswordCheckbox = document.getElementById('showPassword'); // Get the checkbox
  if (showPasswordCheckbox && passwordInput && confirmPasswordInput) {
      showPasswordCheckbox.addEventListener('change', function() {
          // Show or hide the passwords when the checkbox is clicked
          const type = this.checked ? 'text' : 'password'; // Show the passwords if checked, hide if unchecked
          passwordInput.type = type; // Change the password field type
          confirmPasswordInput.type = type; // Change the confirm password field type
          console.log('Show Password toggled, new type:', type); // Show a message
      });
  } else {
      console.error('Show password checkbox, password input, or confirm password input not found'); // Show an error if elements are missing
  }
});