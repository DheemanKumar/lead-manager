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
    text: `Your OTP is for nxtwave referal system is : ${otp}`
  });
}

// Unified signup for user and admin (PostgreSQL)
// const signup = async (req, res) => {
//   const { name, email, employee_id, password, is_admin } = req.body;
//   if (!name || !email || !password) {
//     return res.status(400).json({ error: 'All fields are required' });
//   }
//   const empId = employee_id;
//   if (!empId) {
//     return res.status(400).json({ error: 'Employee ID is required' });
//   }
//   try {
//     const hash = await bcrypt.hash(password, 10);
//     await pool.query(
//       'INSERT INTO users (name, email, employee_id, password, is_admin) VALUES ($1, $2, $3, $4, $5)',
//       [name, email, empId, hash, !!is_admin]
//     );
//     res.status(201).json({ message: is_admin ? 'Admin registered successfully' : 'User registered successfully' });
//   } catch (err) {
//     console.error('Signup DB error:', err);
//     if (err.code === '23505') { // unique_violation
//       if (err.detail && err.detail.includes('email')) {
//         return res.status(409).json({ error: 'Email already exists' });
//       }
//       if (err.detail && err.detail.includes('employee_id')) {
//         return res.status(409).json({ error: 'Employee ID already exists' });
//       }
//     }
//     return res.status(500).json({ error: 'Database error' });
//   }
// };

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

// Signup with OTP (store in pending_users) - user only, no admin allowed
const signupWithOtp = async (req, res) => {
  const { name, email, employee_id, password, is_admin } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const empId = employee_id;
  if (!empId) {
    return res.status(400).json({ error: 'Employee ID is required' });
  }
  if (is_admin) {
    return res.status(403).json({ error: 'Admin signup is not allowed via this endpoint' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const token = crypto.randomBytes(24).toString('hex');
    await pool.query(
      'INSERT INTO pending_users (name, email, employee_id, password, is_admin, otp, request_time) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
      [name, email, empId, hash, false, otp]
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

// Create admin API: only an admin can promote another user to admin by employee_id
const createAdmin = async (req, res) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const { employee_id } = req.body;
  if (!employee_id) {
    return res.status(400).json({ error: 'Employee ID is required' });
  }
  try {
    // Check if user exists
    const userRes = await pool.query('SELECT * FROM users WHERE employee_id = $1', [employee_id]);
    if (!userRes.rows[0]) {
      return res.status(404).json({ error: 'User with this employee ID not found' });
    }
    // Promote to admin
    await pool.query('UPDATE users SET is_admin = true WHERE employee_id = $1', [employee_id]);
    res.json({ message: 'User promoted to admin successfully' });
  } catch (err) {
    console.error('Create admin error:', err);
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

// Logout API: instructs client to remove JWT token
const logout = (req, res) => {
  // For stateless JWT, logout is handled on the client by removing the token
  // Optionally, you can instruct the client to remove the token (e.g., clear cookie/localStorage)
  res.json({ message: 'Logged out successfully. Please remove the token from your client.' });
};

// Forgot Password API
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!userRes.rows[0]) return res.status(404).json({ error: 'No user with this email' });
    const otp = generateOTP();
    const token = crypto.randomBytes(24).toString('hex');
    // Store OTP and token in a temp table or upsert into pending_users
    await pool.query(
      `INSERT INTO pending_users (name, email, employee_id, password, is_admin, otp, request_time)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (email) DO UPDATE SET otp = $6, request_time = NOW()`,
      [userRes.rows[0].name, email, userRes.rows[0].employee_id, userRes.rows[0].password, userRes.rows[0].is_admin, otp]
    );
    await sendOtpEmail(email, otp);
    res.json({ message: 'OTP sent to email', token });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
};

// Verify OTP for password reset
const verifyForgotOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });
  try {
    const result = await pool.query('SELECT * FROM pending_users WHERE email = $1', [email]);
    const pending = result.rows[0];
    if (!pending) return res.status(404).json({ error: 'No OTP request for this email' });
    if (parseInt(otp, 10) !== pending.otp) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }
    // Generate a new token for password reset
    const resetToken = crypto.randomBytes(24).toString('hex');
    // Optionally, store this token in pending_users (not strictly needed for stateless, but for extra security)
    await pool.query('UPDATE pending_users SET request_time = NOW() WHERE email = $1', [email]);
    res.json({ message: 'OTP verified. You can now reset your password.', resetToken });
  } catch (err) {
    console.error('Verify forgot OTP error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
};

// Reset Password API
const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) return res.status(400).json({ error: 'Email and new password required' });
  try {
    const pending = await pool.query('SELECT * FROM pending_users WHERE email = $1', [email]);
    if (!pending.rows[0]) return res.status(404).json({ error: 'No OTP verification found for this email' });
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hash, email]);
    await pool.query('DELETE FROM pending_users WHERE email = $1', [email]);
    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
};

module.exports = { signup, login, signupWithOtp, verifyOtp, logout, forgotPassword, verifyForgotOtp, resetPassword, createAdmin };
