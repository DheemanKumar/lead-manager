// controllers/earningController.js
const { pool } = require('../models/db');

// Calculate and return earning breakdown for an employee
const earningBreakdown = async (req, res) => {
  if (!req.user || !req.user.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const employeeEmail = req.user.email;
  try {
    // Get user info
    const userRes = await pool.query('SELECT name, employee_id FROM users WHERE email = $1', [employeeEmail]);
    const user = userRes.rows[0] || {};
    // Get all leads for the user
    const leadsRes = await pool.query('SELECT name, status, eligibility, copy FROM leads WHERE submitted_by = $1', [employeeEmail]);
    let totalEarning = 0;
    let joinedCount = 0;
    const leadDetails = leadsRes.rows.map(lead => {
      let earning = 0;
      switch ((lead.status || '').toLowerCase()) {
        case 'qualified lead':
        case 'submitted':
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
    res.json({
      email: employeeEmail,
      user_name: user.name,
      employee_id: user.employee_id,
      leads: leadDetails,
      totalEarning,
      bonus,
      finalEarning
    });
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
    // Get all leads grouped by submitted_by
    const leadsRes = await pool.query(`
      SELECT l.submitted_by, u.name as user_name, u.employee_id , l.name, l.status, l.eligibility, l.copy
      FROM leads l
      LEFT JOIN users u ON l.submitted_by = u.email
      WHERE u.is_admin = false
    `);
    // Group by submitted_by
    const grouped = {};
    for (const lead of leadsRes.rows) {
      if (!grouped[lead.submitted_by]) {
        grouped[lead.submitted_by] = {
          submitted_by: lead.submitted_by,
          user_name: lead.user_name,
          employee_id: lead.employee_id,
          leads: [],
          totalEarning: 0,
          joinedCount: 0
        };
      }
      let earning = 0;
      switch ((lead.status || '').toLowerCase()) {
        case 'qualified lead':
        case 'submitted':
        case 'review stage':
          if (lead.eligibility && !lead.copy) earning = 50;
          break;
        case 'shortlisted':
          earning = 1000;
          break;
        case 'joined':
          earning = 5000;
          grouped[lead.submitted_by].joinedCount++;
          break;
        case 'rejected':
        default:
          earning = 0;
      }
      grouped[lead.submitted_by].totalEarning += earning;
      grouped[lead.submitted_by].leads.push({
        name: lead.name,
        status: lead.status,
        eligibility: lead.eligibility,
        copy: lead.copy,
        earning
      });
    }
    // Add bonus and final earning
    const employees = Object.values(grouped).map(emp => {
      const bonus = Math.floor(emp.joinedCount / 5) * 10000;
      return {
        submitted_by: emp.submitted_by,
        user_name: emp.user_name,
        employee_id: emp.employee_id,
        leads: emp.leads,
        totalEarning: emp.totalEarning,
        bonus,
        finalEarning: emp.totalEarning + bonus
      };
    });
    res.json({ employees });
  } catch (err) {
    console.error('DB error in allEmployeesEarnings:', err);
    return res.status(500).json({ error: 'Database error' });
  }
};

module.exports = { earningBreakdown, allEmployeesEarnings };
