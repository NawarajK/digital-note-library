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

    // Get elements from the page
    const notesList = document.getElementById('notesList'); // The list where notes will be shown
    const modal = document.getElementById('noteModal'); // The pop-up for creating/editing notes
    const detailModal = document.getElementById('noteDetailModal'); // The pop-up for viewing note details
    const closeModal = document.querySelector('#noteModal .close'); // The button to close the create/edit pop-up
    const closeDetailModal = document.querySelector('#noteDetailModal .close'); // The button to close the details pop-up
    const seeMoreBtn = document.getElementById('seeMoreBtn'); // Button to show more notes
    const seeLessBtn = document.getElementById('seeLessBtn'); // Button to show fewer notes
    const imageInput = document.getElementById('image'); // Input field for uploading an image
    const removeImageBtn = document.getElementById('removeImageBtn'); // Button to remove an uploaded image
    let editingNoteId = null; // Keep track of the note being edited (null if creating a new note)
    let allNotes = []; // Store all notes fetched from the server
    let displayedNotesCount = 0; // Track how many notes are currently shown
    const notesPerPage = 5; // Number of notes to show at a time
    let hasExistingImage = false; // Track if the note being edited has an image

    // Show the elements in the console for debugging
    console.log('notesList:', notesList);
    console.log('modal:', modal);
    console.log('detailModal:', detailModal);
    console.log('closeModal:', closeModal);
    console.log('closeDetailModal:', closeDetailModal);

    // Function to get and apply the user’s theme (light or dark)
    async function applyUserTheme() {
        console.log('Applying user theme...'); // Show a message
        try {
            // Get the user’s profile from the server to find their theme
            const response = await fetch(`http://localhost:3000/profile?cb=${Date.now()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`, // Send the user’s token
                    'Cache-Control': 'no-cache' // Prevent using old data
                }
            });
            console.log('Profile fetch response status:', response.status); // Show the server response
            if (response.ok) {
                // If the request worked, apply the theme
                const user = await response.json(); // Get the user’s info
                console.log('User profile fetched:', user); // Show the user’s info
                const theme = user.theme || 'light'; // Use the user’s theme or default to light
                console.log('Theme to apply:', theme); // Show the theme
                document.body.classList.remove('light', 'dark'); // Remove any existing theme
                document.body.classList.add(theme); // Add the user’s theme
                console.log(`Applied theme: ${theme}`); // Show a success message
                console.log('Body classes after applying theme:', document.body.classList.toString()); // Show the updated theme
            } else {
                // If the request failed, use the default light theme
                console.error('Failed to fetch user profile for theme, status:', response.status);
                const errorData = await response.json();
                console.error('Error details:', errorData);
                document.body.classList.remove('dark');
                document.body.classList.add('light');
                console.log('Applied default light theme due to fetch failure');
            }
        } catch (error) {
            // If there’s an error, use the default light theme
            console.error('Error fetching user profile for theme:', error);
            document.body.classList.remove('dark');
            document.body.classList.add('light');
            console.log('Applied default light theme due to error');
        }
    }

    // Apply the user’s theme when the page loads
    await applyUserTheme();

    // Function to get notes from the server
    async function fetchNotes(categoryFilter = '') {
        console.log('Fetching notes with category filter:', categoryFilter); // Show the category filter
        try {
            // Send a request to the server to get the user’s notes
            const response = await fetch('http://localhost:3000/notes', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}` // Send the user’s token
                }
            });
            if (!response.ok) {
                // If the request fails, show an error
                throw new Error('Failed to fetch notes: ' + response.statusText);
            }
            const notes = await response.json(); // Get the notes from the server
            console.log('Notes received from server:', notes); // Show the notes
            // Return all notes or only those in the selected category
            return categoryFilter ? notes.filter(note => note.category === categoryFilter) : notes;
        } catch (error) {
            // If there’s an error, show it and return an empty list
            console.error('Error fetching notes:', error);
            return [];
        }
    }

    // Function to load and display notes
    async function loadNotes(categoryFilter = '') {
        allNotes = await fetchNotes(categoryFilter); // Get the notes
        displayedNotesCount = 0; // Reset the number of displayed notes
        notesList.innerHTML = ''; // Clear the current list of notes
        displayNextNotes(); // Show the first batch of notes
    }

    // Function to shorten text if it’s too long
    function truncateText(text, maxLength) {
        if (text.length > maxLength) {
            return text.substring(0, maxLength) + '...'; // Cut the text and add "..." if too long
        }
        return text; // Return the text as is if short enough
    }

    // Function to create a note element to display on the page
    function createNoteElement(note) {
        const li = document.createElement('li'); // Create a list item for the note
        li.setAttribute('data-id', note._id); // Add the note’s ID to the element

        const previewDiv = document.createElement('div'); // Create a div to show the note preview
        previewDiv.className = 'note-preview'; // Add a class for styling

        const title = document.createElement('strong'); // Create a bold element for the title
        title.textContent = note.title; // Set the note’s title
        previewDiv.appendChild(title); // Add the title to the preview

        const content = document.createElement('div'); // Create a div for the content
        content.className = 'content'; // Add a class for styling
        content.textContent = truncateText(note.content, 50); // Show a short version of the content
        previewDiv.appendChild(content); // Add the content to the preview

        li.appendChild(previewDiv); // Add the preview to the list item

        // Add a click event to show the note details when clicked
        li.addEventListener('click', (e) => {
            e.preventDefault(); // Stop any default action
            if (e.target.tagName !== 'BUTTON') { // Only show details if not clicking a button
                showNoteDetails(note); // Show the note’s full details
            }
        });

        // Create an Edit button
        const editBtn = document.createElement('button'); // Create a button
        editBtn.textContent = 'Edit'; // Set the button text
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Stop the click from affecting other elements
            e.preventDefault(); // Stop any default action
            editNote(note._id, note.title, note.content, note.category, note.image); // Open the edit form
        });
        previewDiv.appendChild(editBtn); // Add the Edit button to the preview

        // Create a Delete button
        const deleteBtn = document.createElement('button'); // Create a button
        deleteBtn.textContent = 'Delete'; // Set the button text
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Stop the click from affecting other elements
            e.preventDefault(); // Stop any default action
            deleteNote(note._id); // Delete the note
        });
        previewDiv.appendChild(deleteBtn); // Add the Delete button to the preview

        return li; // Return the finished note element
    }

    // Function to show or hide the "See More" and "See Less" buttons
    function updatePaginationButtons() {
        seeMoreBtn.style.display = displayedNotesCount < allNotes.length ? 'block' : 'none'; // Show "See More" if there are more notes
        seeLessBtn.style.display = displayedNotesCount > notesPerPage ? 'block' : 'none'; // Show "See Less" if more than 5 notes are shown
    }

    // Function to display the next batch of notes
    function displayNextNotes() {
        const start = displayedNotesCount; // Start from the current number of displayed notes
        const end = Math.min(start + notesPerPage, allNotes.length); // End at 5 more notes or the total number of notes
        const notesToDisplay = allNotes.slice(start, end); // Get the notes to show

        console.log('Displaying notes from index', start, 'to', end, ':', notesToDisplay); // Show which notes are being displayed

        // Add each note to the list
        notesToDisplay.forEach(note => {
            const noteElement = createNoteElement(note); // Create the note element
            notesList.appendChild(noteElement); // Add it to the list
        });

        displayedNotesCount = end; // Update the number of displayed notes
        updatePaginationButtons(); // Update the buttons
    }

    // Function to show fewer notes
    function displayPreviousNotes() {
        const newCount = Math.max(displayedNotesCount - notesPerPage, notesPerPage); // Show at least 5 notes
        displayedNotesCount = newCount; // Update the number of displayed notes

        notesList.innerHTML = ''; // Clear the current list
        const notesToDisplay = allNotes.slice(0, displayedNotesCount); // Get the notes to show
        console.log('Displaying previous notes from index 0 to', displayedNotesCount, ':', notesToDisplay); // Show which notes are being displayed

        // Add each note to the list
        notesToDisplay.forEach(note => {
            const noteElement = createNoteElement(note); // Create the note element
            notesList.appendChild(noteElement); // Add it to the list
        });

        updatePaginationButtons(); // Update the buttons
    }

    // Function to show the details of a note in a pop-up
    function showNoteDetails(note) {
        document.getElementById('detailTitle').textContent = note.title; // Show the note’s title
        document.getElementById('detailCategory').textContent = note.category || 'Uncategorized'; // Show the note’s category
        document.getElementById('detailCreatedAt').textContent = new Date(note.createdAt).toLocaleString(); // Show when the note was created
        document.getElementById('detailContent').textContent = note.content; // Show the note’s content

        // Show the note’s image if it has one
        const detailImage = document.getElementById('detailImage'); // Get the image area
        detailImage.innerHTML = ''; // Clear any existing image
        if (note.image) { // If the note has an image
            const img = document.createElement('img'); // Create an image element
            img.src = `http://localhost:3000${note.image}`; // Set the image source
            detailImage.appendChild(img); // Add the image to the pop-up
        }

        // Set up the Edit and Delete buttons in the pop-up
        const editNoteBtn = document.getElementById('editNoteBtn'); // Get the Edit button
        const deleteNoteBtn = document.getElementById('deleteNoteBtn'); // Get the Delete button

        // Replace the buttons to avoid duplicate event listeners
        const editClone = editNoteBtn.cloneNode(true); // Make a copy of the Edit button
        const deleteClone = deleteNoteBtn.cloneNode(true); // Make a copy of the Delete button
        editNoteBtn.parentNode.replaceChild(editClone, editNoteBtn); // Replace the old Edit button
        deleteNoteBtn.parentNode.replaceChild(deleteClone, deleteNoteBtn); // Replace the old Delete button

        // Add a click event to the Edit button
        editClone.addEventListener('click', (e) => {
            e.stopPropagation(); // Stop the click from affecting other elements
            e.preventDefault(); // Stop any default action
            detailModal.style.display = 'none'; // Hide the details pop-up
            editNote(note._id, note.title, note.content, note.category, note.image); // Open the edit form
        });

        // Add a click event to the Delete button
        deleteClone.addEventListener('click', (e) => {
            e.stopPropagation(); // Stop the click from affecting other elements
            e.preventDefault(); // Stop any default action
            deleteNote(note._id); // Delete the note
            detailModal.style.display = 'none'; // Hide the details pop-up
        });

        detailModal.style.display = 'block'; // Show the details pop-up
    }

    // Load the notes when the page opens
    loadNotes();

    // Function to open the form for creating a new note
    window.createNote = function() {
        console.log('createNote function called'); // Show a message
        editingNoteId = null; // Set to null because this is a new note
        hasExistingImage = false; // Reset the image flag for a new note
        const form = document.getElementById('noteForm'); // Get the form
        if (form) {
            // Reset the form for a new note
            form.reset(); // Clear all fields
            document.getElementById('category').value = 'Uncategorized'; // Set the default category
            imageInput.value = ''; // Clear the image input
            removeImageBtn.style.display = 'none'; // Hide the remove image button
        } else {
            console.error('Note form not found'); // Show an error if the form is missing
            return;
        }
        if (modal) {
            modal.style.display = 'block'; // Show the form pop-up
        } else {
            console.error('Modal element not found'); // Show an error if the pop-up is missing
        }
    };

    // Function to open the form for editing a note
    function editNote(noteId, currentTitle, currentContent, currentCategory, currentImage) {
        console.log('editNote function called for note:', noteId); // Show a message
        editingNoteId = noteId; // Set the ID of the note being edited
        document.getElementById('title').value = currentTitle; // Fill in the title
        document.getElementById('content').value = currentContent; // Fill in the content
        document.getElementById('category').value = currentCategory || 'Uncategorized'; // Fill in the category
        imageInput.value = ''; // Clear the image input
        hasExistingImage = !!currentImage; // Set to true if the note has an image
        removeImageBtn.style.display = hasExistingImage ? 'block' : 'none'; // Show the remove image button if there’s an image

        if (modal) {
            modal.style.display = 'block'; // Show the form pop-up
        } else {
            console.error('Modal element not found'); // Show an error if the pop-up is missing
        }
    }

    // Function to delete a note
    async function deleteNote(noteId) {
        // Ask the user to confirm deletion
        if (!confirm("Are you sure you want to delete this note?")) {
            return; // Stop if the user cancels
        }

        try {
            // Send a request to the server to delete the note
            const response = await fetch(`http://localhost:3000/notes/${noteId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`, // Send the user’s token
                    'Accept': 'application/json' // Expect a JSON response
                }
            });
            console.log('Delete response status:', response.status); // Show the server response
            if (response.ok) {
                // If the deletion worked, update the page
                allNotes = allNotes.filter(note => note._id !== noteId); // Remove the note from the list
                const noteElement = document.querySelector(`li[data-id="${noteId}"]`); // Find the note on the page
                if (noteElement) {
                    noteElement.remove(); // Remove the note from the page
                    displayedNotesCount = Math.min(displayedNotesCount, allNotes.length); // Update the displayed count
                    updatePaginationButtons(); // Update the buttons
                }
                console.log('Note deleted successfully:', noteId); // Show a success message
            } else {
                // If the deletion failed, show an error
                const errorData = await response.json();
                console.error('Failed to delete note:', errorData);
                alert('Failed to delete note: ' + (errorData.error || 'Unknown error'));
            }
        } catch (error) {
            // If there’s an error, show it
            console.error('Error deleting note:', error);
            alert('Error deleting note: ' + error.message);
        }
    }

    // Show the remove image button when an image is selected
    imageInput.addEventListener('change', (e) => {
        e.stopPropagation(); // Stop the event from affecting other elements
        e.preventDefault(); // Stop any default action
        if (imageInput.files.length > 0) { // If an image is selected
            removeImageBtn.style.display = 'block'; // Show the remove image button
        } else {
            removeImageBtn.style.display = hasExistingImage ? 'block' : 'none'; // Show the button if there’s an existing image
        }
    });

    // Clear the image input when the remove image button is clicked
    removeImageBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Stop the event from affecting other elements
        e.preventDefault(); // Stop any default action
        imageInput.value = ''; // Clear the image input
        hasExistingImage = false; // Reset the image flag
        removeImageBtn.style.display = 'none'; // Hide the remove image button
    });

    // Handle saving a note when the form is submitted
    const noteForm = document.getElementById('noteForm'); // Get the note form
    if (noteForm) {
        noteForm.addEventListener('submit', async function(event) {
            event.preventDefault(); // Stop the form from submitting normally
            event.stopPropagation(); // Stop the event from affecting other elements
            console.log('Note form submitted'); // Show a message
            const title = document.getElementById('title').value; // Get the title
            const content = document.getElementById('content').value; // Get the content
            const category = document.getElementById('category').value; // Get the category
            const image = imageInput.files[0]; // Get the uploaded image (if any)
            const shouldRemoveImage = !image && !hasExistingImage && editingNoteId; // Remove the image if no new image and X was clicked

            const formData = new FormData(); // Create a form data object to send to the server
            formData.append('title', title); // Add the title
            formData.append('content', content); // Add the content
            formData.append('category', category); // Add the category
            if (image) {
                console.log('New image selected:', image); // Show a message if there’s an image
                formData.append('image', image); // Add the image
            } else if (shouldRemoveImage) {
                console.log('Removing existing image'); // Show a message if removing the image
                formData.append('removeImage', 'true'); // Tell the server to remove the image
            } else {
                console.log('No new image selected, keeping existing image'); // Show a message if keeping the image
            }

            // Decide the URL and method based on whether we’re editing or creating a note
            const url = editingNoteId ? `http://localhost:3000/notes/${editingNoteId}` : 'http://localhost:3000/notes';
            const method = editingNoteId ? 'PUT' : 'POST';
            const headers = editingNoteId && !image && !shouldRemoveImage ? {
                'Authorization': `Bearer ${token}`, // Send the user’s token
                'Content-Type': 'application/json', // Send as JSON if no image
                'Accept': 'application/json' // Expect a JSON response
            } : {
                'Authorization': `Bearer ${token}`, // Send the user’s token
                'Accept': 'application/json' // Expect a JSON response
            };
            const body = editingNoteId && !image && !shouldRemoveImage ? JSON.stringify({ title, content, category }) : formData;

            try {
                // Send the note to the server
                const response = await fetch(url, {
                    method: method,
                    headers: headers,
                    body: body
                });
                console.log('Save response status:', response.status); // Show the server response
                if (response.ok) {
                    // If the save worked, update the page
                    const updatedNote = await response.json(); // Get the updated note
                    console.log('Note saved successfully:', updatedNote); // Show a success message
                    modal.style.display = 'none'; // Hide the form pop-up

                    // Update the list of notes on the page
                    if (method === 'POST') {
                        // If it’s a new note, add it to the top of the list
                        allNotes.unshift(updatedNote); // Add the new note to the start of the list
                        const categoryFilter = document.getElementById('categoryFilter').value; // Get the current category filter
                        if (!categoryFilter || updatedNote.category === categoryFilter) { // If the note matches the filter
                            const noteElement = createNoteElement(updatedNote); // Create the note element
                            notesList.insertBefore(noteElement, notesList.firstChild); // Add it to the top of the list
                            displayedNotesCount = Math.min(displayedNotesCount + 1, allNotes.length); // Update the displayed count
                            updatePaginationButtons(); // Update the buttons
                        }
                    } else {
                        // If it’s an edited note, update the existing note
                        const noteIndex = allNotes.findIndex(note => note._id === updatedNote._id); // Find the note in the list
                        if (noteIndex !== -1) {
                            allNotes[noteIndex] = updatedNote; // Update the note in the list
                            const noteElement = document.querySelector(`li[data-id="${updatedNote._id}"]`); // Find the note on the page
                            if (noteElement) {
                                const categoryFilter = document.getElementById('categoryFilter').value; // Get the current category filter
                                if (!categoryFilter || updatedNote.category === categoryFilter) { // If the note matches the filter
                                    const newNoteElement = createNoteElement(updatedNote); // Create the updated note element
                                    notesList.replaceChild(newNoteElement, noteElement); // Replace the old note with the updated one
                                } else {
                                    noteElement.remove(); // Remove the note if it no longer matches the filter
                                    displayedNotesCount = Math.min(displayedNotesCount, allNotes.length); // Update the displayed count
                                    updatePaginationButtons(); // Update the buttons
                                }
                            }
                        }
                    }
                } else {
                    // If the save failed, show an error
                    const errorData = await response.json();
                    console.error('Failed to save note:', errorData);
                    alert('Failed to save note: ' + (errorData.error || 'Unknown error'));
                }
            } catch (error) {
                // If there’s an error, show it
                console.error('Error saving note:', error);
                alert('Error saving note: ' + error.message);
            }
        });
    } else {
        console.error('Note form not found on page load'); // Show an error if the form is missing
    }

    // Handle searching for notes
    const searchBar = document.getElementById('searchBar'); // Get the search bar
    if (searchBar) {
        searchBar.addEventListener('input', async (e) => {
            e.stopPropagation(); // Stop the event from affecting other elements
            e.preventDefault(); // Stop any default action
            const query = e.target.value.trim(); // Get the search term
            if (query.length < 1) { // If the search term is empty, show all notes
                loadNotes(document.getElementById('categoryFilter').value); // Load notes with the current category filter
                return;
            }
            try {
                // Send a request to the server to search for notes
                const res = await fetch(`http://localhost:3000/notes/search?q=${encodeURIComponent(query)}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) {
                    throw new Error('Failed to search notes'); // Show an error if the request fails
                }
                const notes = await res.json(); // Get the matching notes
                const categoryFilter = document.getElementById('categoryFilter').value; // Get the current category filter
                allNotes = categoryFilter ? notes.filter(note => note.category === categoryFilter) : notes; // Apply the category filter
                displayedNotesCount = 0; // Reset the displayed count
                notesList.innerHTML = ''; // Clear the current list
                displayNextNotes(); // Show the matching notes
            } catch (err) {
                // If there’s an error, show it
                console.error('Error searching notes:', err);
                alert('Error searching notes: ' + err.message);
            }
        });
    } else {
        console.error('Search bar not found'); // Show an error if the search bar is missing
    }

    // Handle filtering notes by category
    const categoryFilter = document.getElementById('categoryFilter'); // Get the category dropdown
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            e.stopPropagation(); // Stop the event from affecting other elements
            e.preventDefault(); // Stop any default action
            const selectedCategory = categoryFilter.value; // Get the selected category
            loadNotes(selectedCategory); // Load notes for the selected category
        });
    } else {
        console.error('Category filter not found'); // Show an error if the category dropdown is missing
    }

    // Show more notes when the "See More" button is clicked
    seeMoreBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Stop the event from affecting other elements
        e.preventDefault(); // Stop any default action
        displayNextNotes(); // Show the next batch of notes
    });

    // Show fewer notes when the "See Less" button is clicked
    seeLessBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Stop the event from affecting other elements
        e.preventDefault(); // Stop any default action
        displayPreviousNotes(); // Show fewer notes
    });

    // Handle logging out
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

    // Close the create/edit pop-up when the close button is clicked
    if (closeModal) {
        closeModal.onclick = (e) => {
            e.stopPropagation(); // Stop the event from affecting other elements
            e.preventDefault(); // Stop any default action
            modal.style.display = 'none'; // Hide the pop-up
        };
    } else {
        console.error('Close modal element not found'); // Show an error if the close button is missing
    }

    // Close the details pop-up when the close button is clicked
    if (closeDetailModal) {
        closeDetailModal.onclick = (e) => {
            e.stopPropagation(); // Stop the event from affecting other elements
            e.preventDefault(); // Stop any default action
            detailModal.style.display = 'none'; // Hide the pop-up
        };
    } else {
        console.error('Close detail modal element not found'); // Show an error if the close button is missing
    }
});