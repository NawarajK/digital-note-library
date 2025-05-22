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

    const notesList = document.getElementById('notesList');
    const modal = document.getElementById('noteModal');
    const detailModal = document.getElementById('noteDetailModal');
    const closeModal = document.querySelector('#noteModal .close');
    const closeDetailModal = document.querySelector('#noteDetailModal .close');
    const seeMoreBtn = document.getElementById('seeMoreBtn');
    const seeLessBtn = document.getElementById('seeLessBtn');
    const imageInput = document.getElementById('image');
    const removeImageBtn = document.getElementById('removeImageBtn');
    let editingNoteId = null;
    let allNotes = []; // Store all notes fetched from the server
    let displayedNotesCount = 0; // Track how many notes are currently displayed
    const notesPerPage = 5; // Number of notes to display per "page"
    let hasExistingImage = false; // Track if the note being edited has an image

    console.log('notesList:', notesList);
    console.log('modal:', modal);
    console.log('detailModal:', detailModal);
    console.log('closeModal:', closeModal);
    console.log('closeDetailModal:', closeDetailModal);

    // Fetch and apply the user's theme
    async function applyUserTheme() {
        console.log('Applying user theme...');
        try {
            // Add a cache-busting query parameter
            const response = await fetch(`http://localhost:3000/profile?cb=${Date.now()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache' // Additional cache prevention
                }
            });
            console.log('Profile fetch response status:', response.status);
            if (response.ok) {
                const user = await response.json();
                console.log('User profile fetched:', user);
                const theme = user.theme || 'light';
                console.log('Theme to apply:', theme);
                document.body.classList.remove('light', 'dark');
                document.body.classList.add(theme);
                console.log(`Applied theme: ${theme}`);
                console.log('Body classes after applying theme:', document.body.classList.toString());
            } else {
                console.error('Failed to fetch user profile for theme, status:', response.status);
                const errorData = await response.json();
                console.error('Error details:', errorData);
                document.body.classList.remove('dark');
                document.body.classList.add('light');
                console.log('Applied default light theme due to fetch failure');
            }
        } catch (error) {
            console.error('Error fetching user profile for theme:', error);
            document.body.classList.remove('dark');
            document.body.classList.add('light');
            console.log('Applied default light theme due to error');
        }
    }

    // Apply the theme on page load
    await applyUserTheme();

    async function fetchNotes(categoryFilter = '') {
        console.log('Fetching notes with category filter:', categoryFilter);
        try {
            const response = await fetch('http://localhost:3000/notes', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch notes: ' + response.statusText);
            }
            const notes = await response.json();
            console.log('Notes received from server:', notes);
            return categoryFilter ? notes.filter(note => note.category === categoryFilter) : notes;
        } catch (error) {
            console.error('Error fetching notes:', error);
            return [];
        }
    }

    async function loadNotes(categoryFilter = '') {
        allNotes = await fetchNotes(categoryFilter);
        displayedNotesCount = 0; // Reset the displayed count
        notesList.innerHTML = ''; // Clear the current list
        displayNextNotes(); // Display the first batch of notes
    }

    function truncateText(text, maxLength) {
        if (text.length > maxLength) {
            return text.substring(0, maxLength) + '...';
        }
        return text;
    }

    function createNoteElement(note) {
        const li = document.createElement('li');
        li.setAttribute('data-id', note._id);

        const previewDiv = document.createElement('div');
        previewDiv.className = 'note-preview';

        const title = document.createElement('strong');
        title.textContent = note.title;
        previewDiv.appendChild(title);

        const content = document.createElement('div');
        content.className = 'content';
        content.textContent = truncateText(note.content, 50);
        previewDiv.appendChild(content);

        li.appendChild(previewDiv);

        li.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent any default behavior
            if (e.target.tagName !== 'BUTTON') {
                showNoteDetails(note);
            }
        });

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault(); // Prevent any default behavior
            editNote(note._id, note.title, note.content, note.category, note.image);
        });
        previewDiv.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault(); // Prevent any default behavior
            deleteNote(note._id);
        });
        previewDiv.appendChild(deleteBtn);

        return li;
    }

    function updatePaginationButtons() {
        seeMoreBtn.style.display = displayedNotesCount < allNotes.length ? 'block' : 'none';
        seeLessBtn.style.display = displayedNotesCount > notesPerPage ? 'block' : 'none';
    }

    function displayNextNotes() {
        const start = displayedNotesCount;
        const end = Math.min(start + notesPerPage, allNotes.length);
        const notesToDisplay = allNotes.slice(start, end);

        console.log('Displaying notes from index', start, 'to', end, ':', notesToDisplay);

        notesToDisplay.forEach(note => {
            const noteElement = createNoteElement(note);
            notesList.appendChild(noteElement);
        });

        displayedNotesCount = end;
        updatePaginationButtons();
    }

    function displayPreviousNotes() {
        const newCount = Math.max(displayedNotesCount - notesPerPage, notesPerPage);
        displayedNotesCount = newCount;

        notesList.innerHTML = ''; // Clear the current list
        const notesToDisplay = allNotes.slice(0, displayedNotesCount);
        console.log('Displaying previous notes from index 0 to', displayedNotesCount, ':', notesToDisplay);

        notesToDisplay.forEach(note => {
            const noteElement = createNoteElement(note);
            notesList.appendChild(noteElement);
        });

        updatePaginationButtons();
    }

    function showNoteDetails(note) {
        document.getElementById('detailTitle').textContent = note.title;
        document.getElementById('detailCategory').textContent = note.category || 'Uncategorized';
        document.getElementById('detailCreatedAt').textContent = new Date(note.createdAt).toLocaleString();
        document.getElementById('detailContent').textContent = note.content;

        const detailImage = document.getElementById('detailImage');
        detailImage.innerHTML = '';
        if (note.image) {
            const img = document.createElement('img');
            img.src = `http://localhost:3000${note.image}`;
            detailImage.appendChild(img);
        }

        const editNoteBtn = document.getElementById('editNoteBtn');
        const deleteNoteBtn = document.getElementById('deleteNoteBtn');

        const editClone = editNoteBtn.cloneNode(true);
        const deleteClone = deleteNoteBtn.cloneNode(true);
        editNoteBtn.parentNode.replaceChild(editClone, editNoteBtn);
        deleteNoteBtn.parentNode.replaceChild(deleteClone, deleteNoteBtn);

        editClone.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault(); // Prevent any default behavior
            detailModal.style.display = 'none';
            editNote(note._id, note.title, note.content, note.category, note.image);
        });

        deleteClone.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault(); // Prevent any default behavior
            deleteNote(note._id);
            detailModal.style.display = 'none';
        });

        detailModal.style.display = 'block';
    }

    loadNotes();

    window.createNote = function() {
        console.log('createNote function called');
        editingNoteId = null;
        hasExistingImage = false; // Reset for new note
        const form = document.getElementById('noteForm');
        if (form) {
            form.reset();
            document.getElementById('category').value = 'Uncategorized';
            imageInput.value = ''; // Clear the file input
            removeImageBtn.style.display = 'none'; // Hide the X button
        } else {
            console.error('Note form not found');
            return;
        }
        if (modal) {
            modal.style.display = 'block';
        } else {
            console.error('Modal element not found');
        }
    };

    function editNote(noteId, currentTitle, currentContent, currentCategory, currentImage) {
        console.log('editNote function called for note:', noteId);
        editingNoteId = noteId;
        document.getElementById('title').value = currentTitle;
        document.getElementById('content').value = currentContent;
        document.getElementById('category').value = currentCategory || 'Uncategorized';
        imageInput.value = ''; // Clear the file input
        hasExistingImage = !!currentImage; // Set to true if there's an existing image
        removeImageBtn.style.display = hasExistingImage ? 'block' : 'none'; // Show X button if there's an image

        if (modal) {
            modal.style.display = 'block';
        } else {
            console.error('Modal element not found');
        }
    }

    async function deleteNote(noteId) {
        if (!confirm("Are you sure you want to delete this note?")) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/notes/${noteId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json' // Ensure the response is JSON
                }
            });
            console.log('Delete response status:', response.status);
            if (response.ok) {
                // Remove the note from the allNotes array
                allNotes = allNotes.filter(note => note._id !== noteId);
                // Remove the note element from the DOM
                const noteElement = document.querySelector(`li[data-id="${noteId}"]`);
                if (noteElement) {
                    noteElement.remove();
                    displayedNotesCount = Math.min(displayedNotesCount, allNotes.length);
                    updatePaginationButtons();
                }
                console.log('Note deleted successfully:', noteId);
            } else {
                const errorData = await response.json();
                console.error('Failed to delete note:', errorData);
                alert('Failed to delete note: ' + (errorData.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error deleting note:', error);
            alert('Error deleting note: ' + error.message);
        }
    }

    // Handle image input change to show the X button when a file is selected
    imageInput.addEventListener('change', (e) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent any default behavior
        if (imageInput.files.length > 0) {
            removeImageBtn.style.display = 'block';
        } else {
            removeImageBtn.style.display = hasExistingImage ? 'block' : 'none';
        }
    });

    // Handle the X button click to remove the image
    removeImageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent any default behavior
        imageInput.value = ''; // Clear the file input
        hasExistingImage = false; // Reset existing image flag
        removeImageBtn.style.display = 'none'; // Hide the X button
    });

    const noteForm = document.getElementById('noteForm');
    if (noteForm) {
        noteForm.addEventListener('submit', async function(event) {
            event.preventDefault(); // Prevent default form submission
            event.stopPropagation(); // Stop any event propagation
            console.log('Note form submitted');
            const title = document.getElementById('title').value;
            const content = document.getElementById('content').value;
            const category = document.getElementById('category').value;
            const image = imageInput.files[0];
            const shouldRemoveImage = !image && !hasExistingImage && editingNoteId; // Remove image if X was clicked and no new image selected

            const formData = new FormData();
            formData.append('title', title);
            formData.append('content', content);
            formData.append('category', category);
            if (image) {
                console.log('New image selected:', image);
                formData.append('image', image);
            } else if (shouldRemoveImage) {
                console.log('Removing existing image');
                formData.append('removeImage', 'true'); // Indicate to backend to remove the image
            } else {
                console.log('No new image selected, keeping existing image');
            }

            const url = editingNoteId ? `http://localhost:3000/notes/${editingNoteId}` : 'http://localhost:3000/notes';
            const method = editingNoteId ? 'PUT' : 'POST';
            const headers = editingNoteId && !image && !shouldRemoveImage ? {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json' // Ensure the response is JSON
            } : {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json' // Ensure the response is JSON
            };
            const body = editingNoteId && !image && !shouldRemoveImage ? JSON.stringify({ title, content, category }) : formData;

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: headers,
                    body: body
                });
                console.log('Save response status:', response.status);
                if (response.ok) {
                    const updatedNote = await response.json();
                    console.log('Note saved successfully:', updatedNote);
                    modal.style.display = 'none';

                    // Update the allNotes array and DOM dynamically
                    if (method === 'POST') {
                        // Add new note to the beginning of allNotes (since it's sorted by createdAt descending)
                        allNotes.unshift(updatedNote);
                        // If the new note matches the current category filter, add it to the DOM
                        const categoryFilter = document.getElementById('categoryFilter').value;
                        if (!categoryFilter || updatedNote.category === categoryFilter) {
                            const noteElement = createNoteElement(updatedNote);
                            notesList.insertBefore(noteElement, notesList.firstChild);
                            displayedNotesCount = Math.min(displayedNotesCount + 1, allNotes.length);
                            updatePaginationButtons();
                        }
                    } else {
                        // Update existing note in allNotes
                        const noteIndex = allNotes.findIndex(note => note._id === updatedNote._id);
                        if (noteIndex !== -1) {
                            allNotes[noteIndex] = updatedNote;
                            // Update the note element in the DOM if it's currently displayed
                            const noteElement = document.querySelector(`li[data-id="${updatedNote._id}"]`);
                            if (noteElement) {
                                const categoryFilter = document.getElementById('categoryFilter').value;
                                if (!categoryFilter || updatedNote.category === categoryFilter) {
                                    const newNoteElement = createNoteElement(updatedNote);
                                    notesList.replaceChild(newNoteElement, noteElement);
                                } else {
                                    noteElement.remove();
                                    displayedNotesCount = Math.min(displayedNotesCount, allNotes.length);
                                    updatePaginationButtons();
                                }
                            }
                        }
                    }
                } else {
                    const errorData = await response.json();
                    console.error('Failed to save note:', errorData);
                    alert('Failed to save note: ' + (errorData.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error saving note:', error);
                alert('Error saving note: ' + error.message);
            }
        });
    } else {
        console.error('Note form not found on page load');
    }

    const searchBar = document.getElementById('searchBar');
    if (searchBar) {
        searchBar.addEventListener('input', async (e) => {
            e.stopPropagation();
            e.preventDefault(); // Prevent any default behavior
            const query = e.target.value.trim();
            if (query.length < 1) {
                loadNotes(document.getElementById('categoryFilter').value);
                return;
            }
            try {
                const res = await fetch(`http://localhost:3000/notes/search?q=${encodeURIComponent(query)}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) {
                    throw new Error('Failed to search notes');
                }
                const notes = await res.json();
                const categoryFilter = document.getElementById('categoryFilter').value;
                allNotes = categoryFilter ? notes.filter(note => note.category === categoryFilter) : notes;
                displayedNotesCount = 0;
                notesList.innerHTML = '';
                displayNextNotes();
            } catch (err) {
                console.error('Error searching notes:', err);
                alert('Error searching notes: ' + err.message);
            }
        });
    } else {
        console.error('Search bar not found');
    }

    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            e.stopPropagation();
            e.preventDefault(); // Prevent any default behavior
            const selectedCategory = categoryFilter.value;
            loadNotes(selectedCategory);
        });
    } else {
        console.error('Category filter not found');
    }

    seeMoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent any default behavior
        displayNextNotes();
    });

    seeLessBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent any default behavior
        displayPreviousNotes();
    });

    const logoutButton = document.getElementById('logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault(); // Prevent any default behavior
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

    if (closeModal) {
        closeModal.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault(); // Prevent any default behavior
            modal.style.display = 'none';
        };
    } else {
        console.error('Close modal element not found');
    }

    if (closeDetailModal) {
        closeDetailModal.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault(); // Prevent any default behavior
            detailModal.style.display = 'none';
        };
    } else {
        console.error('Close detail modal element not found');
    }
});