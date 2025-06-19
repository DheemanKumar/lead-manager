const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../models/db');
const dotenv = require('dotenv');
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

// Handles signup and login logic
const signup = (req, res) => {
  const { name, email, employee_id, password } = req.body;
  if (!name || !email || !employee_id || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.status(500).json({ error: 'Error hashing password' });
    db.run(
      'INSERT INTO users (name, email, employee_id, password) VALUES (?, ?, ?, ?)',
      [name, email, employee_id, hash],
      function (err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ error: 'Email already exists' });
          }
          return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json({ message: 'User registered successfully' });
      }
    );
  });
};

const login = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    bcrypt.compare(password, user.password, (err, result) => {
      if (err) return res.status(500).json({ error: 'Error checking password' });
      if (!result) return res.status(401).json({ error: 'Invalid credentials' });
      const token = jwt.sign({ id: user.id, name: user.name, email: user.email, employee_id: user.employee_id }, JWT_SECRET, { expiresIn: '1d' });
      res.json({ token });
    });
  });
};

module.exports = { signup, login };
