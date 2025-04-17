// frontend/dashboard.js
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Fetch notes from the server
    fetch('http://localhost:3000/notes', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(notes => {
        const notesList = document.getElementById('notesList');
        notes.forEach(note => {
            const li = document.createElement('li');
            li.textContent = `${note.title}: ${note.content}`;
            if (note.image) {
                const img = document.createElement('img');
                img.src = `http://localhost:3000${note.image}`; // Use full backend URL
                img.style.maxWidth = '100px';
                li.appendChild(img);
            }
            notesList.appendChild(li);
        });
    })
    .catch(error => console.error('Error fetching notes:', error));

    // Handle note creation
    document.getElementById('noteForm').addEventListener('submit', function(event) {
        event.preventDefault();
        const title = document.getElementById('title').value;
        const content = document.getElementById('content').value;
        const image = document.getElementById('image').files[0];

        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        if (image) {
            formData.append('image', image);
        }

        fetch('http://localhost:3000/notes', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        })
        .then(response => response.json())
        .then(note => {
            const notesList = document.getElementById('notesList');
            const li = document.createElement('li');
            li.textContent = `${note.title}: ${note.content}`;
            if (note.image) {
                const img = document.createElement('img');
                img.src = `http://localhost:3000${note.image}`; // Use full backend URL
                img.style.maxWidth = '100px';
                li.appendChild(img);
            }
            notesList.appendChild(li);
        })
        .catch(error => console.error('Error creating note:', error));
    });
});