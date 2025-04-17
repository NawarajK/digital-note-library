// backend/server.js

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const port = 3000;

// Middleware setup
app.use(cors({
  origin: 'http://127.0.0.1:5500' // Allow Live Server origin
}));
app.use(bodyParser.json()); // Parse JSON requests
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded images

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Store images in 'uploads' folder
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique filename with timestamp
    }
});
const upload = multer({ storage });

// MongoDB connection string
const uri = 'mongodb+srv://nawarazzkarki:YU07P4btRD8p1e5w@cluster0.ufsui.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(uri, { tls: true }); // Explicitly enable TLS for Atlas

client.connect()
  .then(() => {
    console.log('Connected to MongoDB');
    const db = client.db('digital_note_library');
    const usersCollection = db.collection('users');
    const notesCollection = db.collection('notes');

    // Middleware to verify JWT token
    const verifyToken = (req, res, next) => {
      const token = req.headers['authorization']?.split(' ')[1];
      if (!token) return res.status(401).send('No token provided');
      jwt.verify(token, 'my_secret_key', (err, decoded) => {
        if (err) return res.status(401).send('Invalid token');
        req.userId = decoded.userId;
        next();
      });
    };

    // Register route
    app.post('/register', async (req, res) => {
      console.log('Register request received:', req.body);
      const { username, email, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      try {
        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
          return res.status(400).send('Email already exists');
        }
        await usersCollection.insertOne({ username, email, password: hashedPassword });
        res.status(201).send('User registered');
      } catch (error) {
        res.status(500).send('Error registering user');
      }
    });

    // Login route
    app.post('/login', async (req, res) => {
      console.log('Login request received:', req.body);
      const { email, password } = req.body;
      const user = await usersCollection.findOne({ email });
      if (!user) {
        return res.status(400).send('User not found');
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).send('Invalid password');
      }
      const token = jwt.sign({ userId: user._id }, 'my_secret_key', { expiresIn: '1h' });
      res.json({ token });
    });

    // Get all notes for the logged-in user
    app.get('/notes', verifyToken, async (req, res) => {
      try {
        const notes = await notesCollection.find({ userId: new ObjectId(req.userId) }).toArray();
        res.json(notes);
      } catch (error) {
        res.status(500).send('Error fetching notes');
      }
    });

    // Create a new note with optional image upload
    app.post('/notes', verifyToken, upload.single('image'), async (req, res) => {
      const { title, content } = req.body;
      const image = req.file ? `/uploads/${req.file.filename}` : null;
      try {
        const result = await notesCollection.insertOne({
          userId: new ObjectId(req.userId),
          title,
          content,
          image,
          createdAt: new Date()
        });
        res.status(201).json({ _id: result.insertedId, title, content, image });
      } catch (error) {
        res.status(500).send('Error creating note');
      }
    });

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
  });