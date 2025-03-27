const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const port = 3000;

// Enable CORS for all routes
app.use(cors({
  origin: 'http://127.0.0.1:5500' // Allow only Live Server origin
}));
app.use(bodyParser.json());

const uri = 'mongodb+srv://nawarazzkarki:YU07P4btRD8p1e5w@cluster0.ufsui.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(uri);

client.connect()
  .then(() => {
    console.log('Connected to MongoDB');
    const db = client.db('digital_note_library');
    const usersCollection = db.collection('users');

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

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
  });