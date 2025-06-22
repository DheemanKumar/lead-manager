const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../models/db');
const dotenv = require('dotenv');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

// Helper: Generate random 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000);
}

// Helper: Send OTP email
async function sendOtpEmail(email, otp) {
  // Configure your SMTP or use Ethereal for testing
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
      user: process.env.SMTP_USER || 'your_ethereal_user',
      pass: process.env.SMTP_PASS || 'your_ethereal_pass',
    },
  });
  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'noreply@example.com',
    to: email,
    subject: 'Your OTP for Registration',
    text: `Your OTP is: ${otp}`
  });
}

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

// Signup with OTP (store in pending_users)
const signupWithOtp = async (req, res) => {
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
    const otp = generateOTP();
    const token = crypto.randomBytes(24).toString('hex');
    await pool.query(
      'INSERT INTO pending_users (name, email, employee_id, password, is_admin, otp, request_time) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
      [name, email, empId, hash, !!is_admin, otp]
    );
    await sendOtpEmail(email, otp);
    res.status(201).json({ message: 'OTP sent to email', token });
  } catch (err) {
    console.error('Signup OTP DB error:', err);
    if (err.code === '23505') {
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

// OTP verification API
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP required' });
  }
  try {
    const result = await pool.query('SELECT * FROM pending_users WHERE email = $1', [email]);
    const pending = result.rows[0];
    if (!pending) return res.status(404).json({ error: 'No pending registration for this email' });
    if (parseInt(otp, 10) !== pending.otp) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }
    // Move to users table
    await pool.query(
      'INSERT INTO users (name, email, employee_id, password, is_admin) VALUES ($1, $2, $3, $4, $5)',
      [pending.name, pending.email, pending.employee_id, pending.password, pending.is_admin]
    );
    await pool.query('DELETE FROM pending_users WHERE email = $1', [email]);
    res.json({ message: 'Registration complete. You can now log in.' });
  } catch (err) {
    console.error('OTP verification DB error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
};

module.exports = { signup, login, signupWithOtp, verifyOtp };
