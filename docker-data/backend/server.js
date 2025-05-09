const express = require('express');
const cors = require('cors'); // Import cors
const sqlite3 = require('sqlite3').verbose(); // Use verbose for more detailed error messages
const crypto = require('crypto'); // For hashing passwords
const path = require('path');
const jwt = require('jsonwebtoken'); // Import jsonwebtoken
const fetch = require('node-fetch'); // Added for Ollama
const { exec, spawn } = require('child_process'); // Added for Ollama
const { promisify } = require('util'); // Added for Ollama

const execAsync = promisify(exec); // Added for Ollama

const app = express();
const port = process.env.PORT || 3001; // Port for the backend server
// Ensure JWT_SECRET is defined. It's good that it's dynamically generated on start for development,
// but for production, you'd want this to be a persistent environment variable.
const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(32).toString('hex');
if (process.env.NODE_ENV !== 'production' && JWT_SECRET === require('crypto').randomBytes(32).toString('hex')) {
  console.warn("JWT_SECRET is dynamically generated. For production, set a persistent JWT_SECRET environment variable.");
}

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434'; // Added for Ollama
let ollamaProcess = null; // Added for Ollama service management

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

// --- Ollama API Routes ---
// Initially, all Ollama routes will be admin-only. This will be refined later with specific Ollama roles.

// Helper function to check Ollama service status
const checkOllamaServiceStatus = async () => {
  try {
    const response = await fetch(OLLAMA_API_URL);
    // Ollama's base URL usually returns a string "Ollama is running"
    if (response.ok) {
      const text = await response.text();
      return text.trim() === "Ollama is running";
    }
    return false;
  } catch (error) {
    return false;
  }
};

// GET Ollama service status
app.get('/api/ollama/service/status', authenticateJWT, authorizeAdmin, async (req, res) => {
  const isRunning = await checkOllamaServiceStatus();
  if (isRunning) {
    res.json({ status: 'RUNNING', message: 'Ollama service is running.' });
  } else if (ollamaProcess) {
    res.json({ status: 'STARTING_OR_ERROR', message: 'Ollama service was started by the backend but might not be healthy or is still initializing.' });
  }
  else {
    res.json({ status: 'STOPPED', message: 'Ollama service is not running or not reachable.' });
  }
});

// POST to start Ollama service
app.post('/api/ollama/service/start', authenticateJWT, authorizeAdmin, async (req, res) => {
  if (ollamaProcess || await checkOllamaServiceStatus()) {
    return res.status(400).json({ message: 'Ollama service is already running or an attempt was made to start it.' });
  }
  try {
    // Assuming 'ollama serve' is the command and it's in PATH
    // For production, consider using a more robust process manager or full paths.
    const child = spawn('ollama', ['serve'], { detached: true, stdio: 'ignore' });
    child.unref(); // Allow parent to exit independently
    ollamaProcess = child; // Store the child process reference

    // It takes a moment for Ollama to start. We won't wait for it here.
    // The status endpoint can be polled.
    res.status(202).json({ message: 'Ollama service starting... Check status endpoint.' });

    child.on('error', (err) => {
      console.error('Failed to start Ollama process:', err);
      ollamaProcess = null; // Clear the reference if start fails
    });

    child.on('exit', (code, signal) => {
      console.log(`Ollama process exited with code ${code} and signal ${signal}`);
      ollamaProcess = null; // Clear the reference
    });

  } catch (error) {
    console.error('Error starting Ollama service:', error);
    res.status(500).json({ error: 'Failed to start Ollama service', details: error.message });
  }
});

// POST to stop Ollama service
app.post('/api/ollama/service/stop', authenticateJWT, authorizeAdmin, async (req, res) => {
  if (ollamaProcess) {
    try {
      const killed = ollamaProcess.kill(); // Sends SIGTERM
      if (killed) {
        ollamaProcess = null;
        res.json({ message: 'Ollama service stop signal sent.' });
      } else {
        res.status(500).json({ message: 'Failed to send stop signal to Ollama service (it might have already exited).' });
      }
    } catch (error) {
      console.error('Error stopping Ollama service:', error);
      ollamaProcess = null; // Assume it's gone if error occurs
      res.status(500).json({ error: 'Error stopping Ollama service', details: error.message });
    }
  } else {
     // If ollamaProcess is null, try to kill by command if running externally
     // This is a bit riskier and platform-dependent.
     // For now, we only stop processes started by this backend instance.
     const isRunning = await checkOllamaServiceStatus();
     if (isRunning) {
        return res.status(400).json({ message: 'Ollama service appears to be running but was not started by this backend instance. Manual stop might be required or use `ollama` CLI.' });
     }
    res.status(404).json({ message: 'Ollama service not managed by this backend instance or already stopped.' });
  }
});


// GET list of available models (equivalent to /api/tags in ollama)
app.get('/api/ollama/models', authenticateJWT, authorizeAdmin, async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_API_URL}/api/tags`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.statusText}. ${errorText}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching Ollama models:', error);
    res.status(500).json({ error: 'Failed to fetch Ollama models', details: error.message });
  }
});

// POST to pull a new model
app.post('/api/ollama/pull', authenticateJWT, authorizeAdmin, async (req, res) => {
  try {
    const { modelName } = req.body;
    if (!modelName) {
      return res.status(400).json({ error: 'modelName is required' });
    }

    // Check if Ollama service is running
    if (!await checkOllamaServiceStatus()) {
      return res.status(503).json({ error: 'Ollama service is not running. Please start it first.' });
    }
    
    // Start the pull process using 'ollama pull <modelName>'
    const pullProcess = exec(`ollama pull ${modelName}`);
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // For Nginx, if used

    pullProcess.stdout.on('data', (data) => {
      res.write(`data: ${JSON.stringify({ type: 'progress', data: data.toString() })}\n\n`);
    });

    pullProcess.stderr.on('data', (data) => {
      // Ollama often sends progress on stderr, then a final status.
      // We'll treat all stderr as progress for now, actual errors will be on 'close' with non-zero code.
      res.write(`data: ${JSON.stringify({ type: 'progress', data: data.toString() })}\n\n`);
    });

    pullProcess.on('close', (code) => {
      if (code === 0) {
        res.write(`data: ${JSON.stringify({ type: 'complete', data: 'Model pulled successfully' })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ type: 'error', data: `Failed to pull model. Exit code: ${code}` })}\n\n`);
      }
      res.end();
    });

    pullProcess.on('error', (err) => {
      console.error('Error executing ollama pull:', err);
      // If headers not sent, send error status
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to start model pull process', details: err.message });
      } else {
      // If headers already sent (streaming started), try to send an error event and end.
        res.write(`data: ${JSON.stringify({ type: 'error', data: `Failed to start model pull process: ${err.message}` })}\n\n`);
        res.end();
      }
    });

  } catch (error) {
    console.error('Error in /api/ollama/pull:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Server error during model pull setup', details: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', data: `Server error: ${error.message}` })}\n\n`);
      res.end();
    }
  }
});

// POST to get model info (equivalent to /api/show in ollama)
app.post('/api/ollama/show', authenticateJWT, authorizeAdmin, async (req, res) => {
  try {
    const { name } = req.body; // Ollama's /api/show expects 'name' in body
    if (!name) {
      return res.status(400).json({ error: 'Model name is required in the request body' });
    }

    if (!await checkOllamaServiceStatus()) {
      return res.status(503).json({ error: 'Ollama service is not running. Please start it first.' });
    }

    const response = await fetch(`${OLLAMA_API_URL}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const responseBody = await response.text(); // Read as text first for better error diagnosis
    if (!response.ok) {
      throw new Error(`Ollama API error (${response.status}): ${response.statusText}. ${responseBody}`);
    }
    res.json(JSON.parse(responseBody));
  } catch (error) {
    console.error('Error fetching Ollama model info:', error);
    res.status(500).json({ error: 'Failed to fetch model info', details: error.message });
  }
});

// DELETE a model
app.delete('/api/ollama/delete/:name', authenticateJWT, authorizeAdmin, async (req, res) => {
  try {
    const modelName = req.params.name;
    if (!modelName) {
      return res.status(400).json({ error: 'Model name parameter is required' });
    }

    if (!await checkOllamaServiceStatus()) {
      return res.status(503).json({ error: 'Ollama service is not running. Please start it first.' });
    }

    // Ollama's own API for delete is HTTP DELETE /api/delete with { "name": "modelname" } in body.
    // Using exec `ollama rm` is simpler if direct API access is problematic or for consistency with pull.
    const { stdout, stderr } = await execAsync(`ollama rm ${modelName}`);
    if (stderr && !stderr.toLowerCase().includes("deleted")) { // Check stderr for actual errors
        // Sometimes 'ollama rm' outputs to stderr on success. Filter for common success messages.
        // A more robust check might be needed depending on `ollama rm` output variations.
        if (!stdout.toLowerCase().includes("deleted") && !stderr.toLowerCase().includes("successfully")) {
             console.warn(`Ollama rm stderr for ${modelName}: ${stderr}`);
             // Decide if this stderr content constitutes an error or just a warning/info.
             // For now, if stdout also doesn't confirm, treat as potential issue.
        }
    }
    res.json({ message: `Model '${modelName}' deletion process initiated.`, stdout, stderr });
  } catch (error) {
    console.error('Error deleting Ollama model:', error);
    // error.stderr often contains useful info from the command
    res.status(500).json({ error: 'Failed to delete model', details: error.message, stderr: error.stderr, stdout: error.stdout });
  }
});

// POST proxy for Ollama chat, with streaming
app.post('/api/ollama/chat', authenticateJWT, authorizeAdmin, async (req, res) => {
  try {
    if (!req.body.model) {
      return res.status(400).json({ error: 'Model name is required' });
    }
    if (!req.body.messages) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    if (!await checkOllamaServiceStatus()) {
      return res.status(503).json({ error: 'Ollama service is not running. Please start it first.' });
    }

    const ollamaResponse = await fetch(`${OLLAMA_API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: req.body.model,
        messages: req.body.messages,
        stream: true, // Force stream true for this endpoint's behavior
        options: req.body.options || { // Allow passing options or use defaults
          temperature: 0.7,
          top_k: 40,
          top_p: 0.9,
        }
      }),
    });

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      throw new Error(`Ollama API error: ${ollamaResponse.statusText}. ${errorText}`);
    }

    res.setHeader('Content-Type', 'text/event-stream'); // Changed from text/plain for Server-Sent Events
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // For Nginx, if used

    ollamaResponse.body.on('data', chunk => {
      // Raw Ollama stream sends multiple JSON objects, newline-separated.
      // Each needs to be individually parsed and processed.
      const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          // Send the whole JSON object for the client to handle
          res.write(`data: ${JSON.stringify(parsed)}\n\n`); 
        } catch (e) {
          console.error('Error parsing chunk from Ollama stream:', e, 'Chunk:', line);
          // Optionally send an error event to the client
          res.write(`data: ${JSON.stringify({ error: "Error parsing stream data", details: line})}\n\n`);
        }
      }
    });

    ollamaResponse.body.on('end', () => {
      res.write(`data: ${JSON.stringify({ type: 'done', message: 'Stream ended' })}\n\n`);
      res.end();
    });

    ollamaResponse.body.on('error', error => {
      console.error('Ollama stream error:', error);
      // If headers not sent, Express will handle it. If sent, try to send an error event.
      if (res.headersSent) {
        try {
            res.write(`data: ${JSON.stringify({ type: 'error', error: 'Stream error occurred on backend', details: error.message })}\n\n`);
            res.end();
        } catch (e) {
            console.error("Error writing stream error to client:", e);
        }
      } else {
         // If we haven't sent headers, we can still send a normal HTTP error.
         // However, this path might be less common if the initial fetch succeeded.
         res.status(500).json({ error: 'Stream error occurred' });
      }
    });

  } catch (error) {
    console.error('Error in /api/ollama/chat proxy:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to proxy chat to Ollama', details: error.message });
    } else {
        // This case should ideally not happen if errors are caught before streaming starts.
        // If it does, it implies an error after headers were sent but before stream events were set up.
        try {
            res.write(`data: ${JSON.stringify({ type: 'error', error: 'Critical error in chat proxy', details: error.message })}\n\n`);
            res.end();
        } catch (e) {
             console.error("Error writing critical proxy error to client:", e);
        }
    }
  }
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
  console.log(`JWT_SECRET (for debugging development only, DO NOT log in prod): ${JWT_SECRET}`);
}); 
