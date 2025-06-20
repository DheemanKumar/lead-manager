// Express app setup

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const leadRoutes = require('./routes/leadRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const utilityRoutes = require('./routes/utilityRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const earningRoutes = require('./routes/earningRoutes');
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
app.use('/api/dashboard', dashboardRoutes); // Mount dashboard routes at /api/dashboard
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api', utilityRoutes);
app.use('/api/earning', earningRoutes);

// Middleware, routes, etc. will be added here

module.exports = app;
