// Express app setup

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const leadRoutes = require('./routes/leadRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Middleware, routes, etc. will be added here

module.exports = app;
