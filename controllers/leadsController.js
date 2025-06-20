const { pool } = require('../models/db');
const path = require('path');
const checkResume = require('../utils/checkResume');
const archiver = require('archiver');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'resumes';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Handles new lead submission (protected)
const submitLead = async (req, res) => {
  const { name, mobile, email } = req.body;
  if (!req.user || !req.user.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const submitted_by = req.user.email;
  const resume = req.file;
  let resume_path = null;
  // 1. If resume is uploaded, check qualification BEFORE saving to DB
  if (resume) {
    const os = require('os');
    const fs = require('fs');
    const ext = path.extname(resume.originalname) || '.pdf';
    const safeEmail = email.replace(/[^a-zA-Z0-9@.]/g, '_');
    const tempPath = path.join(os.tmpdir(), `${Date.now()}_${safeEmail}${ext}`);
    fs.writeFileSync(tempPath, resume.buffer);
    return checkResume(tempPath, async (isEligible, errorMsg) => {
      fs.unlinkSync(tempPath);
      if (!isEligible) {
        return res.status(400).json({ error: errorMsg || 'Candidate not eligible' });
      }
      // If qualified, upload to Supabase
      let data, error;
      const supabasePath = `resumes/${safeEmail}${ext}`;
      try {
        ({ data, error } = await supabase.storage.from(SUPABASE_BUCKET).upload(supabasePath, resume.buffer, {
          contentType: resume.mimetype,
          upsert: true
        }));
      } catch (e) {
        return res.status(500).json({ error: 'Failed to upload resume to storage (exception)' });
      }
      if (error || !data || !data.path) {
        return res.status(500).json({ error: 'Failed to upload resume to storage' });
      }
      resume_path = data.path;
      await saveLead();
    });
  } else {
    await saveLead();
  }

  async function saveLead() {
    // Check for duplicate
    const dup = await pool.query('SELECT id FROM leads WHERE mobile = $1 OR email = $2', [mobile, email]);
    if (dup.rows.length > 0) {
      return res.status(409).json({ error: 'Lead already exists with this mobile number or email' });
    }
    // Insert lead
    await pool.query(
      'INSERT INTO leads (name, mobile, email, submitted_by, resume_path, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [name, mobile, email, submitted_by, resume_path, 'qualified lead']
    );
    // Recalculate earning
    const leadsRes = await pool.query('SELECT status FROM leads WHERE submitted_by = $1', [submitted_by]);
    let totalEarning = 0;
    let joinedCount = 0;
    leadsRes.rows.forEach(l => {
      switch ((l.status || '').toLowerCase()) {
        case 'qualified lead':
        case 'review stage':
          totalEarning += 50;
          break;
        case 'shortlisted':
          totalEarning += 1000;
          break;
        case 'joined':
          totalEarning += 5000;
          joinedCount++;
          break;
        case 'rejected':
        default:
          break;
      }
    });
    const bonus = Math.floor(joinedCount / 5) * 10000;
    const finalEarning = totalEarning + bonus;
    await pool.query('UPDATE users SET earning = $1 WHERE email = $2', [finalEarning, submitted_by]);
    const userInfoRes = await pool.query('SELECT id, name, email, employee_id, earning FROM users WHERE email = $1', [submitted_by]);
    const userInfo = userInfoRes.rows[0];
    res.status(201).json({
      message: 'Lead submitted successfully',
      status: 'qualified lead',
      user: userInfo
    });
  }
};

// Dashboard: get all qualified leads submitted by the user
const getDashboard = async (req, res) => {
  if (!req.user || !req.user.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const leadsRes = await pool.query('SELECT name, mobile, email, resume_path, status FROM leads WHERE submitted_by = $1', [req.user.email]);
    const leads = leadsRes.rows;
    const filteredLeads = leads.filter(l => l.status && l.status.toLowerCase() !== 'rejected');
    const userInfoRes = await pool.query('SELECT id, name, email, employee_id, earning FROM users WHERE email = $1', [req.user.email]);
    const userInfo = userInfoRes.rows[0];
    if (!userInfo) {
      return res.json({ count: filteredLeads.length, leads: filteredLeads });
    }
    res.json({ count: filteredLeads.length, leads: filteredLeads, user: userInfo });
  } catch (err) {
    console.error('Dashboard DB error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
};

// Admin download resume by lead id (returns Supabase path)
const adminDownloadResume = async (req, res) => {
  const leadId = req.params.id;
  try {
    const result = await pool.query('SELECT resume_path FROM leads WHERE id = $1', [leadId]);
    const row = result.rows[0];
    if (!row || !row.resume_path) {
      return res.status(404).json({ error: 'Resume not found for this lead' });
    }
    // Optionally, generate a signed/public URL from Supabase here
    res.json({ resume_path: row.resume_path });
  } catch (err) {
    console.error('DB error in adminDownloadResume:', err);
    return res.status(500).json({ error: 'Database error' });
  }
};

// Admin download all resumes as a zip
const adminDownloadAllResumes = (req, res) => {
  db.all('SELECT id, resume_path FROM leads WHERE resume_path IS NOT NULL', [], (err, rows) => {
    if (err) {
      console.error('DB error in adminDownloadAllResumes:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'No resumes found' });
    }
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="all_resumes.zip"');
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);
    rows.forEach(row => {
      const filePath = path.resolve(__dirname, '..', row.resume_path);
      const fileName = row.resume_path.split('/').pop();
      archive.file(filePath, { name: fileName });
    });
    archive.finalize();
  });
};

// Admin update lead status
const adminUpdateStatus = (req, res) => {
  const leadId = req.params.id;
  const state = parseInt(req.params.state, 10);
  let status;
  switch (state) {
    case 1:
      status = 'review stage';
      break;
    case 2:
      status = 'shortlisted';
      break;
    case 3:
      status = 'joined';
      break;
    case 0:
      status = 'rejected';
      break;
    default:
      return res.status(400).json({ error: 'Invalid state value' });
  }
  db.run('UPDATE leads SET status = ? WHERE id = ?', [status, leadId], function (err) {
    if (err) {
      console.error('Error updating lead status:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    // After updating status, recalculate and update the user's earning
    db.get('SELECT submitted_by FROM leads WHERE id = ?', [leadId], (err2, lead) => {
      if (err2 || !lead) {
        return res.json({ message: `Lead status updated to '${status}', but could not update user earning` });
      }
      const employeeEmail = lead.submitted_by;
      db.all('SELECT status FROM leads WHERE submitted_by = ?', [employeeEmail], (err3, leads) => {
        if (err3) {
          return res.json({ message: `Lead status updated to '${status}', but could not update user earning` });
        }
        let totalEarning = 0;
        let joinedCount = 0;
        leads.forEach(l => {
          switch ((l.status || '').toLowerCase()) {
            case 'qualified lead':
            case 'review stage':
              totalEarning += 50;
              break;
            case 'shortlisted':
              totalEarning += 1000;
              break;
            case 'joined':
              totalEarning += 5000;
              joinedCount++;
              break;
            case 'rejected':
            default:
              break;
          }
        });
        const bonus = Math.floor(joinedCount / 5) * 10000;
        const finalEarning = totalEarning + bonus;
        db.run('UPDATE users SET earning = ? WHERE email = ?', [finalEarning, employeeEmail], err4 => {
          if (err4) {
            return res.json({ message: `Lead status updated to '${status}', but could not update user earning` });
          }
          res.json({ message: `Lead status updated to '${status}' and user earning updated` });
        });
      });
    });
  });
};

// Admin: get all leads
const adminGetAllLeads = async (req, res) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const result = await pool.query('SELECT * FROM leads');
    res.json({ count: result.rows.length, leads: result.rows });
  } catch (err) {
    console.error('Admin getAllLeads DB error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
};

module.exports = {
  submitLead,
  getDashboard,
  adminDownloadResume,
  adminDownloadAllResumes,
  adminUpdateStatus,
  adminGetAllLeads
};
