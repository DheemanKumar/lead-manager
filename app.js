// Express app setup

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const leadRoutes = require('./routes/leadRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure /tmp/uploads exists (for Railway/Render)
const uploadsDir = '/tmp/uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Route to download the SQLite DB file
app.get('/api/download-db', (req, res) => {
  const dbPath = process.env.DB_PATH || '/tmp/database.sqlite';
  if (fs.existsSync(dbPath)) {
    res.download(dbPath, 'database.sqlite', err => {
      if (err) {
        console.error('DB download error:', err);
        res.status(500).json({ error: 'Could not download database' });
      }
    });
  } else {
    res.status(404).json({ error: 'Database file not found' });
  }
});

// Middleware, routes, etc. will be added here

module.exports = app;
