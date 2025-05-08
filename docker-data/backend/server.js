const express = require('express');
const cors = require('cors'); // Import cors
const sqlite3 = require('sqlite3').verbose(); // Use verbose for more detailed error messages
const crypto = require('crypto'); // For hashing passwords
const path = require('path');
const jwt = require('jsonwebtoken'); // Import jsonwebtoken

const app = express();
const port = process.env.PORT || 3001; // Port for the backend server
// Ensure JWT_SECRET is defined. It's good that it's dynamically generated on start for development,
// but for production, you'd want this to be a persistent environment variable.
const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(32).toString('hex');
if (process.env.NODE_ENV !== 'production' && JWT_SECRET === require('crypto').randomBytes(32).toString('hex')) {
  console.warn("JWT_SECRET is dynamically generated. For production, set a persistent JWT_SECRET environment variable.");
}

// Database path (assuming server.js is in docker-data/backend, and DB is in docker-data/data)
const dbPath = path.resolve(__dirname, '../data/home_server.db');

app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Middleware to parse JSON bodies

// Function to hash password in the same way as setup.py
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// --- Authentication Middleware ---
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Expecting "Bearer TOKEN"
    if (!token) {
      return res.status(401).json({ error: 'Access token is missing or malformed' });
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ error: 'Token expired' });
        }
        console.error("JWT Verification Error:", err.message);
        return res.status(403).json({ error: 'Invalid token' }); // Forbidden
      }
      req.user = user; // Add user payload to request object
      next();
    });
  } else {
    res.status(401).json({ error: 'Authorization header is missing' }); // Unauthorized
  }
};

// --- Authorization Middleware (Admin Check) ---
const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden: Administrator access required' }); // Forbidden
  }
};

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
      console.error("Login DB open error:", err.message);
      return res.status(500).json({ error: 'Database connection error' });
    }
  });

  const sql = `SELECT id, username, hashed_password, is_admin FROM users WHERE username = ?`;

  db.get(sql, [username], (err, row) => {
    if (err) {
      console.error("Login DB query error:", err.message);
      db.close();
      return res.status(500).json({ error: 'Error querying the database' });
    }

    if (!row) {
      db.close();
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const hashedProvidedPassword = hashPassword(password);
    if (hashedProvidedPassword === row.hashed_password) {
      const tokenPayload = {
        userId: row.id, // Add userId to token
        username: row.username,
        isAdmin: !!row.is_admin // Ensure boolean
      };
      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });
      db.close();
      res.json({
        success: true,
        message: 'Login successful',
        user: { username: row.username, isAdmin: !!row.is_admin },
        token: token
      });
    } else {
      db.close();
      res.status(401).json({ error: 'Invalid username or password' });
    }
  });
});

// --- User CRUD Routes ---

// GET all users (Admin only)
app.get('/api/users', authenticateJWT, authorizeAdmin, (req, res) => {
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error("GET /api/users - DB open error:", err.message);
      return res.status(500).json({ error: 'Database connection error' });
    }
  });

  // Select all users, excluding the hashed_password for security
  const sql = `SELECT id, username, email, is_admin, created_at FROM users ORDER BY created_at DESC`;
  // Note: `created_at` is assumed from frontend display, but not in current schema. Adding it now.
  // If `created_at` is not in your schema, remove it from the SELECT or add it to the schema.
  // For now, I will assume it should be added and proceed.

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("GET /api/users - DB query error:", err.message);
      db.close();
      return res.status(500).json({ error: 'Error querying the database for users' });
    }
    db.close();
    res.json(rows.map(user => ({ ...user, isAdmin: !!user.is_admin }))); // Ensure isAdmin is boolean
  });
});

// POST a new user (Admin only)
app.post('/api/users', authenticateJWT, authorizeAdmin, (req, res) => {
  const { username, email, password, isAdmin } = req.body;

  // Basic validation
  if (!username || !password) { // Email is optional for now based on schema (TEXT UNIQUE, not NOT NULL)
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (typeof isAdmin !== 'boolean') {
    return res.status(400).json({ error: 'isAdmin field must be a boolean' });
  }
  // Add more validation as needed (e.g., password complexity, email format if not null)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email format." });
  }

  const hashedPassword = hashPassword(password);

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error("POST /api/users - DB open error:", err.message);
      return res.status(500).json({ error: 'Database connection error' });
    }
  });

  const sql = `INSERT INTO users (username, email, hashed_password, is_admin) VALUES (?, ?, ?, ?)`
  // is_admin from request body will be 0 or 1, matching schema after boolean conversion
  db.run(sql, [username, email || null, hashedPassword, isAdmin ? 1 : 0], function(err) { // Use function() to get this.lastID
    if (err) {
      console.error("POST /api/users - DB insert error:", err.message);
      db.close();
      if (err.message.includes('UNIQUE constraint failed: users.username')) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      if (email && err.message.includes('UNIQUE constraint failed: users.email')) {
        return res.status(409).json({ error: 'Email already exists' });
      }
      return res.status(500).json({ error: 'Failed to create user' });
    }
    const newUserId = this.lastID;
    db.close();
    res.status(201).json({
      id: newUserId,
      username,
      email: email || null,
      isAdmin,
      message: 'User created successfully'
    });
  });
});

// PUT update an existing user (Admin only)
// Note: This endpoint does not handle password changes by admin for simplicity.
// Password changes should ideally be a separate, more secure flow, or a user self-service option.
app.put('/api/users/:id', authenticateJWT, authorizeAdmin, (req, res) => {
  const userId = req.params.id;
  const { username, email, isAdmin } = req.body;

  // Basic validation
  if (!username && typeof email === 'undefined' && typeof isAdmin === 'undefined') {
    return res.status(400).json({ error: 'No fields provided for update.' });
  }
  if (username && username.length < 3) { // Example: min length for username
      return res.status(400).json({ error: "Username must be at least 3 characters."})
  }
  if (typeof isAdmin !== 'undefined' && typeof isAdmin !== 'boolean') {
    return res.status(400).json({ error: 'isAdmin field must be a boolean if provided' });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format if provided." });
  }

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error("PUT /api/users/:id - DB open error:", err.message);
      return res.status(500).json({ error: 'Database connection error' });
    }
  });

  // Dynamically build the SET part of the SQL query
  const fieldsToUpdate = {};
  if (typeof username !== 'undefined') fieldsToUpdate.username = username;
  if (typeof email !== 'undefined') fieldsToUpdate.email = email === '' ? null : email; // Allow clearing email
  if (typeof isAdmin !== 'undefined') fieldsToUpdate.is_admin = isAdmin ? 1 : 0;

  if (Object.keys(fieldsToUpdate).length === 0) {
    db.close();
    return res.status(400).json({ error: 'No valid fields to update provided.'});
  }

  const setClauses = Object.keys(fieldsToUpdate).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(fieldsToUpdate), userId];

  const sql = `UPDATE users SET ${setClauses} WHERE id = ?`;

  db.run(sql, values, function(err) {
    if (err) {
      console.error("PUT /api/users/:id - DB update error:", err.message);
      db.close();
      if (err.message.includes('UNIQUE constraint failed: users.username')) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      if (email && err.message.includes('UNIQUE constraint failed: users.email')) {
        return res.status(409).json({ error: 'Email already exists' });
      }
      return res.status(500).json({ error: 'Failed to update user' });
    }
    if (this.changes === 0) {
      db.close();
      return res.status(404).json({ error: 'User not found or no changes made' });
    }
    db.close();
    // Fetch the updated user to return it (optional, or just return success)
    // For now, just success:
    res.json({ id: userId, ...fieldsToUpdate, message: 'User updated successfully' }); 
    // Convert is_admin back to boolean if needed for the response
    // if (fieldsToUpdate.hasOwnProperty('is_admin')) {
    //   fieldsToUpdate.isAdmin = !!fieldsToUpdate.is_admin;
    //   delete fieldsToUpdate.is_admin;
    // }
    // res.json({ id: userId, ...fieldsToUpdate, message: 'User updated successfully' }); 
  });
});

// DELETE a user (Admin only)
app.delete('/api/users/:id', authenticateJWT, authorizeAdmin, (req, res) => {
  const userIdToDelete = req.params.id;
  const requestingUserId = req.user.userId; // Get ID of admin making the request from JWT

  if (parseInt(userIdToDelete, 10) === requestingUserId) {
    return res.status(403).json({ error: 'Admins cannot delete their own account through this endpoint.' });
  }

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error("DELETE /api/users/:id - DB open error:", err.message);
      return res.status(500).json({ error: 'Database connection error' });
    }
  });

  const sql = `DELETE FROM users WHERE id = ?`;
  db.run(sql, [userIdToDelete], function(err) {
    if (err) {
      console.error("DELETE /api/users/:id - DB delete error:", err.message);
      db.close();
      return res.status(500).json({ error: 'Failed to delete user' });
    }
    if (this.changes === 0) {
      db.close();
      return res.status(404).json({ error: 'User not found' });
    }
    db.close();
    res.status(200).json({ message: 'User deleted successfully' }); // Or res.sendStatus(204) for No Content
  });
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
  console.log(`JWT_SECRET (for debugging development only, DO NOT log in prod): ${JWT_SECRET}`);
}); 
