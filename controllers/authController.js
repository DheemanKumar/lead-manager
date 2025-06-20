const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../models/db');
const dotenv = require('dotenv');
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

// Unified signup for user and admin (PostgreSQL)
const signup = async (req, res) => {
  const { name, email, employee_id, password, is_admin } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const empId = is_admin ? (employee_id || 'admin') : employee_id;
  if (!empId) {
    return res.status(400).json({ error: 'Employee ID is required' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (name, email, employee_id, password, is_admin) VALUES ($1, $2, $3, $4, $5)',
      [name, email, empId, hash, !!is_admin]
    );
    res.status(201).json({ message: is_admin ? 'Admin registered successfully' : 'User registered successfully' });
  } catch (err) {
    console.error('Signup DB error:', err);
    if (err.code === '23505') { // unique_violation
      if (err.detail && err.detail.includes('email')) {
        return res.status(409).json({ error: 'Email already exists' });
      }
      if (err.detail && err.detail.includes('employee_id')) {
        return res.status(409).json({ error: 'Employee ID already exists' });
      }
    }
    return res.status(500).json({ error: 'Database error' });
  }
};

// Unified login for user and admin (PostgreSQL)
const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, employee_id: user.employee_id, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, is_admin: !!user.is_admin });
  } catch (err) {
    console.error('Login DB error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
};

module.exports = { signup, login };
