// Bring in tools we need for the server
const express = require('express'); // Tool to create the server
const mongoose = require('mongoose'); // Tool to connect to MongoDB database
const jwt = require('jsonwebtoken'); // Tool to create and check user login tokens
const bcrypt = require('bcryptjs'); // Tool to scramble passwords for safety
const multer = require('multer'); // Tool to handle file uploads (like images)
const path = require('path'); // Tool to work with file paths
const fs = require('fs'); // Tool to work with the file system (like creating folders)
const cors = require('cors'); // Tool to let the server talk to the frontend

// Create the server and set the port number
const app = express(); // Start the server
const port = 3000; // The port number where the server will run
const secretKey = 'your-secret-key'; // A secret key for making login tokens (should be hidden in a real app)

// Set up the server to handle requests properly
app.use(cors()); // Let the server talk to the frontend
app.use(express.json()); // Understand JSON data sent to the server
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files (like images) from the "uploads" folder

// Set up how to handle file uploads with Multer
const storage = multer.diskStorage({
    // Decide where to save the uploaded files
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads'); // Path to the "uploads" folder
        if (!fs.existsSync(uploadPath)) { // Check if the folder exists
            fs.mkdirSync(uploadPath); // Create the folder if it doesn’t exist
        }
        cb(null, uploadPath); // Tell Multer to save files in the "uploads" folder
    },
    // Decide the name of the uploaded file
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Name the file with the current time + original file extension
    }
});

const upload = multer({ storage: storage }); // Set up Multer with the storage settings

// Function to connect to the MongoDB database
async function connectToMongoDB() {
    try {
        // Try to connect to the MongoDB database using the provided link
        await mongoose.connect('mongodb+srv://nawarazzkarki:YU07P4btRD8p1e5w@cluster0.ufsui.mongodb.net/digital-note-library?retryWrites=true&w=majority', {
            serverSelectionTimeoutMS: 5000 // Wait 5 seconds before giving up on connecting
        });
        console.log('Connected to MongoDB Atlas'); // Show a message if connected successfully
    } catch (err) {
        // If connection fails, show an error and stop the server
        console.error('Failed to connect to MongoDB Atlas:', err);
        process.exit(1); // Stop the server if it can’t connect
    }
}

// Define the structure for users in the database
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, maxlength: 100 }, // Username: must be unique, required, max 100 characters
    email: { type: String, required: true, unique: true }, // Email: must be unique, required
    password: { type: String, required: true }, // Password: required
    theme: { type: String, default: 'light' } // Theme: defaults to "light" if not set
});

// Define the structure for notes in the database
const noteSchema = new mongoose.Schema({
    title: { type: String, required: true, maxlength: 100 }, // Title: required, max 100 characters
    content: { type: String, required: true }, // Content: required
    category: { type: String, default: 'Uncategorized' }, // Category: defaults to "Uncategorized" if not set
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // User ID: links to the user who owns the note, required
    image: { type: String, default: null }, // Image: stores the path to an uploaded image, defaults to null
    createdAt: { type: Date, default: Date.now } // Created At: records when the note was made, defaults to now
});

// Create models to work with users and notes in the database
const User = mongoose.model('User', userSchema); // Model for users
const Note = mongoose.model('Note', noteSchema); // Model for notes

// Function to check if a user is logged in by verifying their token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization']; // Get the token from the request header
    const token = authHeader && authHeader.split(' ')[1]; // Extract the token (comes as "Bearer <token>")

    // If no token is provided, send an error
    if (!token) {
        console.log('No token provided in request'); // Log the issue
        return res.status(401).json({ error: 'Access denied. No token provided.' }); // Send error message
    }

    try {
        // Check if the token is valid
        const decoded = jwt.verify(token, secretKey); // Verify the token using the secret key
        req.user = decoded; // Add the user info (like user ID) to the request
        console.log('Token verified, user ID:', req.user.id); // Log success
        next(); // Move to the next step (the actual route)
    } catch (error) {
        // If the token is invalid, send an error
        console.error('Invalid token:', error); // Log the error
        res.status(403).json({ error: 'Invalid token.' }); // Send error message
    }
};

// Routes (the different things users can do)

// Route to register a new user
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body; // Get user details from the request

    // Validate inputs
    if (!username || username.trim() === '') { // If username is empty
        console.log('Validation failed: Username is required'); // Log the issue
        return res.status(400).json({ error: 'Username is required.' }); // Send error
    }
    if (username.length > 100) { // If username is too long
        console.log('Validation failed: Username exceeds 100 characters'); // Log the issue
        return res.status(400).json({ error: 'Username cannot exceed 100 characters.' }); // Send error
    }
    if (!email || email.trim() === '') { // If email is empty
        console.log('Validation failed: Email is required'); // Log the issue
        return res.status(400).json({ error: 'Email is required.' }); // Send error
    }
    if (!password || password.trim() === '') { // If password is empty
        console.log('Validation failed: Password is required'); // Log the issue
        return res.status(400).json({ error: 'Password is required.' }); // Send error
    }

    try {
        // Check if the user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] }); // Look for user by email or username
        if (existingUser) { // If user exists
            console.log('User already exists:', { email, username }); // Log the issue
            return res.status(400).json({ error: 'User with this email or username already exists.' }); // Send error
        }

        // Create a new user
        const hashedPassword = await bcrypt.hash(password, 10); // Scramble the password for safety
        const user = new User({ username, email, password: hashedPassword }); // Create a new user
        await user.save(); // Save the user to the database
        console.log('User registered:', { username, email }); // Log success

        res.status(201).json({ message: 'User registered successfully.' }); // Send success message
    } catch (error) {
        // If something goes wrong, send an error
        console.error('Error during registration:', error); // Log the error
        res.status(500).json({ error: 'Error during registration.' }); // Send error message
    }
});

// Route to log in a user
app.post('/login', async (req, res) => {
    const { email, password } = req.body; // Get login details from the request

    try {
        // Check if the user exists
        const user = await User.findOne({ email }); // Look for user by email
        if (!user) { // If user not found
            console.log('User not found for email:', email); // Log the issue
            return res.status(400).json({ error: 'Invalid email or password.' }); // Send error
        }

        // Check if the password is correct
        const isMatch = await bcrypt.compare(password, user.password); // Compare the password with the scrambled one
        if (!isMatch) { // If password is wrong
            console.log('Password mismatch for email:', email); // Log the issue
            return res.status(400).json({ error: 'Invalid email or password.' }); // Send error
        }

        // Create a login token for the user
        const token = jwt.sign({ id: user._id }, secretKey, { expiresIn: '24h' }); // Make a token that lasts 24 hours
        console.log('User logged in, token generated:', { userId: user._id }); // Log success
        res.json({ token }); // Send the token to the user
    } catch (error) {
        // If something goes wrong, send an error
        console.error('Error during login:', error); // Log the error
        res.status(500).json({ error: 'Error during login.' }); // Send error message
    }
});

// Get user profile
app.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            console.log('User not found for ID:', req.user.id);
            return res.status(404).json({ error: 'User not found.' });
        }
        console.log('Returning user profile for ID:', req.user.id, 'Profile:', user.toObject());
        res.json(user);
    } catch (error) {
        console.error('Error fetching profile for user ID:', req.user.id, 'Error:', error);
        res.status(500).json({ error: 'Error fetching profile.' });
    }
});

// Update user theme
app.put('/profile/theme', authenticateToken, async (req, res) => {
    const { theme } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            console.log('User not found for ID:', req.user.id);
            return res.status(404).json({ error: 'User not found.' });
        }

        user.theme = theme;
        await user.save();
        console.log('Updated user theme for ID:', req.user.id, 'New theme:', theme, 'User after update:', user.toObject());

        const updatedUser = await User.findById(req.user.id).select('-password');
        console.log('Verified user after theme update for ID:', req.user.id, 'Profile:', updatedUser.toObject());

        res.json({ message: 'Theme updated successfully.' });
    } catch (error) {
        console.error('Error updating theme for user ID:', req.user.id, 'Error:', error);
        res.status(500).json({ error: 'Error updating theme.' });
    }
});

// Create a note
app.post('/notes', authenticateToken, upload.single('image'), async (req, res) => {
    const { title, content, category } = req.body;
    const userId = req.user.id;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    // Validate inputs
    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Title is required.' });
    }
    if (title.length > 100) {
        return res.status(400).json({ error: 'Title cannot exceed 100 characters.' });
    }
    if (!content || content.trim() === '') {
        return res.status(400).json({ error: 'Content is required.' });
    }

    try {
        const note = new Note({ title, content, category, userId, image });
        await note.save();
        console.log('Note created:', note);
        res.status(201).json(note);
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ error: 'Error creating note.' });
    }
});

// Get all notes for the user
app.get('/notes', authenticateToken, async (req, res) => {
    try {
        const notes = await Note.find({ userId: req.user.id }).sort({ createdAt: -1 });
        console.log('Notes fetched for user:', req.user.id, 'Total notes:', notes.length);
        res.json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ error: 'Error fetching notes.' });
    }
});

// Update a note
app.put('/notes/:id', authenticateToken, upload.single('image'), async (req, res) => {
    const { title, content, category, removeImage } = req.body;
    const noteId = req.params.id;
    const userId = req.user.id;

    try {
        const note = await Note.findOne({ _id: noteId, userId });
        if (!note) {
            return res.status(404).json({ error: 'Note not found.' });
        }

        // Validate inputs if provided
        if (title && title.trim() === '') {
            return res.status(400).json({ error: 'Title is required.' });
        }
        if (title && title.length > 100) {
            return res.status(400).json({ error: 'Title cannot exceed 100 characters.' });
        }
        if (content && content.trim() === '') {
            return res.status(400).json({ error: 'Content is required.' });
        }

        note.title = title || note.title;
        note.content = content || note.content;
        note.category = category || note.category;

        if (req.file) {
            if (note.image) {
                const oldImagePath = path.join(__dirname, note.image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            note.image = `/uploads/${req.file.filename}`;
        } else if (removeImage === 'true') {
            if (note.image) {
                const oldImagePath = path.join(__dirname, note.image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            note.image = null;
        }

        await note.save();
        console.log('Note updated:', note);
        res.json(note);
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ error: 'Error updating note.' });
    }
});

// Delete a note
app.delete('/notes/:id', authenticateToken, async (req, res) => {
    const noteId = req.params.id;
    const userId = req.user.id;

    try {
        const note = await Note.findOne({ _id: noteId, userId });
        if (!note) {
            return res.status(404).json({ error: 'Note not found.' });
        }

        if (note.image) {
            const imagePath = path.join(__dirname, note.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await note.deleteOne();
        res.json({ message: 'Note deleted successfully.' });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ error: 'Error deleting note.' });
    }
});

// Search notes
app.get('/notes/search', authenticateToken, async (req, res) => {
    const query = req.query.q;
    const userId = req.user.id;

    if (!query) {
        return res.status(400).json({ error: 'Search query is required.' });
    }

    try {
        const notes = await Note.find({
            userId,
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { content: { $regex: query, $options: 'i' } }
            ]
        }).sort({ createdAt: -1 });

        res.json(notes);
    } catch (error) {
        console.error('Error searching notes:', error);
        res.status(500).json({ error: 'Error searching notes.' });
    }
});

// Start the server only if this file is run directly (not imported for testing)
if (require.main === module) {
    connectToMongoDB().then(() => { // Connect to the database first
        app.listen(port, () => { // Start the server
            console.log(`Server running on port ${port}`); // Show a message when the server starts
        });
    });
}

// Make the app available for testing
module.exports = app; // Export the app for use in tests