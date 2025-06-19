const { db } = require('../models/db');

// List all leads submitted by the logged-in user
const getUserLeads = (req, res) => {
  if (!req.user || !req.user.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  db.all('SELECT * FROM leads WHERE submitted_by = ?', [req.user.email], (err, leads) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ count: leads.length, leads });
  });
};

module.exports = { getUserLeads };
