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

// Danger: Delete/reset schema (admin only)
const resetSchema = async (req, res) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    // Drop and recreate tables
    await pool.query('DROP TABLE IF EXISTS leads CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      employee_id TEXT UNIQUE,
      password TEXT,
      is_admin BOOLEAN DEFAULT FALSE,
      earning INTEGER DEFAULT 0
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
  name TEXT,
  mobile TEXT,
  email TEXT,
  degree TEXT,
  course TEXT,
  college TEXT,
  year_of_passing TEXT,
  submitted_by TEXT,
  resume_path TEXT,
  copy BOOLEAN DEFAULT FALSE,
  eligibility BOOLEAN DEFAULT true,
  status TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    res.json({ message: 'Database schema reset successfully.' });
  } catch (err) {
    console.error('Error resetting schema:', err);
    res.status(500).json({ error: 'Failed to reset schema.' });
  }
};

// Danger: Update schema (admin only)
const updateSchema = async (req, res) => {
    // POST /api/update-schema.    use at your own risk
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    // Example: Add a new column to leads table if not exists
    await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT`);
    // Example: Add a new column to users table if not exists
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP`);
    res.json({ message: 'Schema updated successfully.' });
  } catch (err) {
    console.error('Error updating schema:', err);
    res.status(500).json({ error: 'Failed to update schema.' });
  }
};

module.exports = { downloadDb, debugData, resetSchema, updateSchema };
