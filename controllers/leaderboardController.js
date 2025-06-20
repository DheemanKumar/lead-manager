// Handles leaderboard logic only
const { pool } = require('../models/db');

// List all candidate names with the number of leads they have filled, in descending order
const getLeaderboard = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT users.name, COUNT(leads.id) as lead_count
      FROM leads
      JOIN users ON leads.submitted_by = users.email
      GROUP BY users.id
      ORDER BY lead_count DESC
    `);
    res.json({ leaderboard: result.rows });
  } catch (err) {
    console.error('Leaderboard getLeaderboard DB error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
};

module.exports = { getLeaderboard };
