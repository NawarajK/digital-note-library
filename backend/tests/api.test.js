const request = require('supertest');
  const mongoose = require('mongoose');
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const app = require('../server'); // Path to server.js from tests folder

  describe('Digital Note Library API Tests', () => {
    let token;
    let mongoServer;

    // Setup: Start in-memory MongoDB and connect Mongoose
    beforeAll(async () => {
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      await mongoose.connect(uri);

      // Register a test user with unique credentials
      const uniqueUsername = `testuser_${Date.now()}`;
      const uniqueEmail = `test_${Date.now()}@example.com`;
      await request(app)
        .post('/register')
        .send({
          username: uniqueUsername,
          email: uniqueEmail,
          password: 'password123',
          confirmPassword: 'password123'
        });

      // Login to get token
      const loginRes = await request(app)
        .post('/login')
        .send({
          email: uniqueEmail,
          password: 'password123'
        });
      token = loginRes.body.token;
    }, 30000); // Timeout of 30 seconds

    // Cleanup: Stop in-memory MongoDB and close Mongoose connection
    afterAll(async () => {
      await mongoose.connection.close();
      await mongoServer.stop();
    });

    // User Registration Tests
    describe('User Registration API', () => {
      it('should register a new user with valid inputs', async () => {
        const uniqueUsername = `newuser_${Date.now()}`;
        const uniqueEmail = `newuser_${Date.now()}@example.com`;
        const res = await request(app)
          .post('/register')
          .send({
            username: uniqueUsername,
            email: uniqueEmail,
            password: 'password123',
            confirmPassword: 'password123'
          });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('message', 'User registered successfully.');
      }, 10000); // Timeout of 10 seconds

      it('should not register with empty username', async () => {
        const res = await request(app)
          .post('/register')
          .send({
            username: '',
            email: `emptyuser_${Date.now()}@example.com`,
            password: 'password123',
            confirmPassword: 'password123'
          });
        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('error', 'Username is required.');
      }, 10000); // Timeout of 10 seconds

      it('should not register with very long username', async () => {
        const longUsername = 'a'.repeat(101); // Exceeds max length of 100
        const res = await request(app)
          .post('/register')
          .send({
            username: longUsername,
            email: `longuser_${Date.now()}@example.com`,
            password: 'password123',
            confirmPassword: 'password123'
          });
        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('error', 'Username cannot exceed 100 characters.');
      }, 10000); // Timeout of 10 seconds

      it('should not register with mismatched passwords', async () => {
        const res = await request(app)
          .post('/register')
          .send({
            username: `mismatchuser_${Date.now()}`,
            email: `mismatch_${Date.now()}@example.com`,
            password: 'password123',
            confirmPassword: 'password456'
          });
        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('error', 'Passwords do not match.');
      }, 10000); // Timeout of 10 seconds
    });

    // Note Creation Tests
    describe('Note Creation API', () => {
      it('should create a note with valid inputs', async () => {
        const res = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'Test Note',
            content: 'This is a test note',
            category: 'Test'
          });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('_id');
      }, 10000); // Timeout of 10 seconds

      it('should not create a note with empty title', async () => {
        const res = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: '',
            content: 'This is a test note',
            category: 'Test'
          });
        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('error', 'Title is required.');
      }, 10000); // Timeout of 10 seconds

      it('should not create a note with very long title', async () => {
        const longTitle = 'a'.repeat(101); // Exceeds max length of 100
        const res = await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: longTitle,
            content: 'This is a test note',
            category: 'Test'
          });
        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('error', 'Title cannot exceed 100 characters.');
      }, 10000); // Timeout of 10 seconds
    });

    // Search Functionality Tests
    describe('Search API', () => {
      it('should return notes for a valid search query', async () => {
        await request(app)
          .post('/notes')
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'Search Test Note',
            content: 'This is a note for search testing',
            category: 'Test'
          });

        const res = await request(app)
          .get('/notes/search?q=search')
          .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toBeGreaterThan(0);
      }, 10000); // Timeout of 10 seconds

      it('should return no results for an empty search query', async () => {
        const res = await request(app)
          .get('/notes/search?q=')
          .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('error', 'Search query is required.');
      }, 10000); // Timeout of 10 seconds
    });
  });