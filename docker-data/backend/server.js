const express = require('express');
const cors = require('cors'); // Import cors
const sqlite3 = require('sqlite3').verbose(); // Use verbose for more detailed error messages
const crypto = require('crypto'); // For hashing passwords
const path = require('path');
const jwt = require('jsonwebtoken'); // Import jsonwebtoken

const app = express();
const port = process.env.PORT || 3001; // Port for the backend server
const JWT_SECRET = require('crypto').randomBytes(32).toString('hex'); // Dynamically generate JWT secret on server start

// Database path (assuming server.js is in docker-data/backend, and DB is in docker-data/data)
const dbPath = path.resolve(__dirname, '../data/home_server.db');

app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Middleware to parse JSON bodies

// Function to hash password in the same way as setup.py
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Basic root route
app.get('/', (req, res) => {
  res.send('Hello from the Express Backend!');
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', message: 'Backend is healthy' });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error("Error opening database:", err.message);
      return res.status(500).json({ error: 'Database connection error' });
    }
  });

  const sql = `SELECT hashed_password, is_admin FROM users WHERE username = ?`;

  db.get(sql, [username], (err, row) => {
    if (err) {
      console.error("Database query error:", err.message);
      db.close();
      return res.status(500).json({ error: 'Error querying the database' });
    }

    if (!row) {
      db.close();
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const hashedPasswordFromDb = row.hashed_password;
    const isAdmin = row.is_admin;
    const hashedProvidedPassword = hashPassword(password);

    if (hashedProvidedPassword === hashedPasswordFromDb) {
      db.close();
      const token = jwt.sign({ username: username, isAdmin: isAdmin }, JWT_SECRET, { expiresIn: '1h' }); 
      res.json({ 
        success: true, 
        message: 'Login successful', 
        user: { username, isAdmin },
        token: token 
      });
    } else {
      db.close();
      res.status(401).json({ error: 'Invalid username or password' });
    }
  });
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
}); 
