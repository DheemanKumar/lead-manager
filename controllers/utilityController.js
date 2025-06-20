// Handles utility endpoints: download-db and debug-data

const { pool } = require('../models/db');

// Download DB endpoint is not relevant for PostgreSQL on Railway, so we can skip it or return a message
const downloadDb = (req, res) => {
  res.status(400).json({ error: 'Direct DB download not supported on Railway/PostgreSQL' });
};

// Debug route to list all users and leads
const debugData = async (req, res) => {
  try {
    const usersRes = await pool.query('SELECT * FROM users');
    const leadsRes = await pool.query('SELECT * FROM leads');
    res.json({ users: usersRes.rows, leads: leadsRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'DB error (users/leads)' });
  }
};

module.exports = { downloadDb, debugData };
