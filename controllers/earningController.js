// controllers/earningController.js
const { pool } = require('../models/db');

// Calculate and return earning breakdown for an employee
const earningBreakdown = async (req, res) => {
  if (!req.user || !req.user.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const employeeEmail = req.user.email;
  try {
    // Get all leads for the user
    const leadsRes = await pool.query('SELECT name, status, eligibility, copy FROM leads WHERE submitted_by = $1', [employeeEmail]);
    let totalEarning = 0;
    let joinedCount = 0;
    const leadDetails = leadsRes.rows.map(lead => {
      let earning = 0;
      switch ((lead.status || '').toLowerCase()) {
        case 'qualified lead':
        case 'review stage':
          if (lead.eligibility && !lead.copy) earning = 50;
          break;
        case 'shortlisted':
          earning = 1000;
          break;
        case 'joined':
          earning = 5000;
          joinedCount++;
          break;
        case 'rejected':
        default:
          earning = 0;
      }
      totalEarning += earning;
      return { name: lead.name, status: lead.status, eligibility: lead.eligibility, copy: lead.copy, earning };
    });
    // Bonus: +10,000 for every 5th joined
    const bonus = Math.floor(joinedCount / 5) * 10000;
    const finalEarning = totalEarning + bonus;
    await pool.query('UPDATE users SET earning = $1 WHERE email = $2', [finalEarning, employeeEmail]);
    res.json({ leads: leadDetails, totalEarning, bonus, finalEarning });
  } catch (err) {
    console.error('Earning breakdown DB error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
};

// List all employees with their earnings (admin only)
const allEmployeesEarnings = async (req, res) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const usersRes = await pool.query('SELECT id, name, email, employee_id, earning FROM users WHERE is_admin = false');
    res.json({ employees: usersRes.rows });
  } catch (err) {
    console.error('DB error in allEmployeesEarnings:', err);
    return res.status(500).json({ error: 'Database error' });
  }
};

module.exports = { earningBreakdown, allEmployeesEarnings };
