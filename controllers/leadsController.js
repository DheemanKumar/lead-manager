const { db } = require('../models/db');
const path = require('path');
const checkResume = require('../utils/checkResume');

// Handles new lead submission (protected)
const submitLead = (req, res) => {
  const { candidate_id, name, mobile, email } = req.body;
  const requiredFields = ['candidate_id', 'name', 'mobile', 'email'];
  const missingFields = requiredFields.filter(f => !req.body[f] && !(f === 'resume' && req.file));
  if (missingFields.length > 0) {
    console.error('Missing fields:', missingFields);
    return res.status(400).json({ error: `Missing required field(s): ${missingFields.join(', ')}` });
  }
  if (!req.user || !req.user.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const submitted_by = req.user.email;
  const resume = req.file;

  let resume_path = null;
  if (resume) {
    resume_path = path.join('uploads', resume.filename);
  }
  // Check resume for BTech/MTech if uploaded
  if (resume_path) {
    return checkResume(resume_path, (isEligible, errorMsg) => {
      if (!isEligible) {
        console.error('Resume not eligible:', errorMsg);
        return res.status(400).json({ error: errorMsg || 'Candidate not eligible' });
      }
      // Save lead if eligible
      saveLead();
    });
  } else {
    saveLead();
  }

  function saveLead() {
    db.get('SELECT id FROM leads WHERE mobile = ? OR email = ?', [mobile, email], (err, row) => {
      if (err) {
        console.error('Lead check DB error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (row) {
        return res.status(409).json({ error: 'Lead already exists with this mobile number or email' });
      }
      db.run(
        'INSERT INTO leads (candidate_id, name, mobile, email, submitted_by, resume_path, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [candidate_id, name, mobile, email, submitted_by, resume_path, 'qualified lead'],
        function (err) {
          if (err) {
            console.error('Insert lead DB error:', err);
            return res.status(500).json({ error: 'Database error' });
          }
          db.get('SELECT id FROM users WHERE email = ?', [submitted_by], (err, user) => {
            if (err) {
              console.error('Earnings user DB error:', err);
            }
            if (!err && user) {
              db.run('INSERT INTO earnings (user_id, amount) VALUES (?, ?)', [user.id, 10]);
            }
          });
          res.status(201).json({ message: 'Lead submitted successfully', status: 'qualified lead' });
        }
      );
    });
  }
};

// Dashboard: get all qualified leads submitted by the user
const getDashboard = (req, res) => {
  if (!req.user || !req.user.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  db.all('SELECT name, mobile, email, resume_path, status FROM leads WHERE submitted_by = ?', [req.user.email], (err, leads) => {
    if (err) {
      console.error('Dashboard DB error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ count: leads.length, leads });
  });
};

module.exports = { submitLead, getDashboard };
