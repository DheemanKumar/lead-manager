// Handles earnings and leaderboard logic

const { db } = require('../models/db');

// Get top users by earnings
const getTop = (req, res) => {
  db.all(`SELECT users.username, SUM(earnings.amount) as total_earnings
          FROM earnings
          JOIN users ON earnings.user_id = users.id
          GROUP BY users.id
          ORDER BY total_earnings DESC
          LIMIT 10`, [], (err, rows) => {
    if (err) {
      console.error('Leaderboard getTop DB error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ leaderboard: rows });
  });
};

// List all candidate names with the number of leads they have filled, in descending order
const getLeaderboard = (req, res) => {
  db.all(`SELECT users.name, COUNT(leads.id) as lead_count
          FROM leads
          JOIN users ON leads.submitted_by = users.email
          GROUP BY users.id
          ORDER BY lead_count DESC`, [], (err, rows) => {
    if (err) {
      console.error('Leaderboard getLeaderboard DB error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ leaderboard: rows });
  });
};

module.exports = { getTop, getLeaderboard };
