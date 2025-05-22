const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = 3000;
const secretKey = 'your-secret-key'; // In production, use an environment variable

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// MongoDB Connection
async function connectToMongoDB() {
    try {
        await mongoose.connect('mongodb+srv://nawarazzkarki:YU07P4btRD8p1e5w@cluster0.ufsui.mongodb.net/digital-note-library?retryWrites=true&w=majority', {
            serverSelectionTimeoutMS: 5000 // Timeout after 5 seconds if connection fails
        });
        console.log('Connected to MongoDB Atlas');
    } catch (err) {
        console.error('Failed to connect to MongoDB Atlas:', err);
        process.exit(1); // Exit the process if MongoDB connection fails
    }
}

// Schemas
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    theme: { type: String, default: 'light' }
});

const noteSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, default: 'Uncategorized' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    image: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Note = mongoose.model('Note', noteSchema);

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.log('No token provided in request');
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, secretKey);
        req.user = decoded;
        console.log('Token verified, user ID:', req.user.id);
        next();
    } catch (error) {
        console.error('Invalid token:', error);
        res.status(403).json({ error: 'Invalid token.' });
    }
};

// Routes

// Register
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            console.log('User already exists:', { email, username });
            return res.status(400).json({ error: 'User with this email or username already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, email, password: hashedPassword });
        await user.save();
        console.log('User registered:', { username, email });

        res.status(201).json({ message: 'User registered successfully.' });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ error: 'Error during registration.' });
    }
});

// Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found for email:', email);
            return res.status(400).json({ error: 'Invalid email or password.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Password mismatch for email:', email);
            return res.status(400).json({ error: 'Invalid email or password.' });
        }

        const token = jwt.sign({ id: user._id }, secretKey, { expiresIn: '1h' });
        console.log('User logged in, token generated:', { userId: user._id });
        res.json({ token });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Error during login.' });
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

// Start the server only after MongoDB connection is established
connectToMongoDB().then(() => {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
});