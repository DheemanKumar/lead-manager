const { pool } = require('../models/db');
const path = require('path');
const archiver = require('archiver');
const { createClient } = require('@supabase/supabase-js');
const checkResume = require('../utils/checkResume');

// Initialize Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'resumes';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Handles new lead submission (protected)
const submitLead = async (req, res) => {
  const { name, mobile, email, degree, course, college, year_of_passing } = req.body;
  if (!req.user || !req.user.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  console.log('Received lead submission:', req.body);
  console.log('File received:', req.file ? req.file.originalname : 'No file uploaded');
  // Check for all required fields including resume
  const missing = {
    name: !name,
    mobile: !mobile,
    email: !email,
    degree: !degree,
    course: !course,
    college: !college,
    year_of_passing: !year_of_passing,
    resume: !req.file
  };
  const anyMissing = Object.values(missing).some(v => v);
  if (anyMissing) {
    return res.status(400).json({
      message: 'Data insufficient: All fields and resume are required.',
      ...missing
    });
  }
  const submitted_by = req.user.email;
  const resume = req.file;
  let resume_path = null;
  let resumeStatus = 'need review';
  let resumeCheckResult = false;
  if (resume) {
    // Optionally upload to Supabase if needed
    const ext = path.extname(resume.originalname) || '.pdf';
    const safeEmail = email.replace(/[^a-zA-Z0-9@.]/g, '_');
    const supabasePath = `resumes/${safeEmail}${ext}`;
    try {
      const { data, error } = await supabase.storage.from(process.env.SUPABASE_BUCKET || 'resumes').upload(supabasePath, resume.buffer, {
        contentType: resume.mimetype,
        upsert: true
      });
      if (!error && data && data.path) {
        resume_path = data.path;
        // Save buffer to a temp file for checkResume
        const fs = require('fs');
        const os = require('os');
        const tempPath = path.join(os.tmpdir(), `${safeEmail}_${Date.now()}${ext}`);
        fs.writeFileSync(tempPath, resume.buffer);
        // Delegate all resume validation to checkResume.js
        await new Promise((resolve) => {
          checkResume(tempPath, (result) => {
            resumeCheckResult = result;
            resumeStatus = result ? 'submited' : 'need review';
            resolve();
          });
        });
        fs.unlinkSync(tempPath);
      }
    } catch (e) {
      // Ignore upload errors for now
    }
  }

  // Check for duplicate email/mobile
  let emailCopy = false;
  let contactCopy = false;
  const dup = await pool.query('SELECT email, mobile FROM leads WHERE email = $1 OR mobile = $2', [email, mobile]);
  dup.rows.forEach(row => {
    if (row.email === email) emailCopy = true;
    if (row.mobile === mobile) contactCopy = true;
  });

  // Check degree and course eligibility
  let degreeEligible = false;
  let courseEligible = false;
  if (degree && degree.trim().toLowerCase() === 'mtech') {
    degreeEligible = true;
    const allowedCourses = ['cse', 'it', 'machine learning'];
    if (course && allowedCourses.includes(course.trim().toLowerCase())) {
      courseEligible = true;
    }
  }

  // Set eligibility as per schema
  const eligibility = degreeEligible && courseEligible;
  const copy = emailCopy || contactCopy;

  // Save the lead in all cases
  await pool.query(
    `INSERT INTO leads (name, mobile, email, degree, course, college, year_of_passing, submitted_by, resume_path, downloded, copy, eligibility, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [name, mobile, email, degree, course, college, year_of_passing, submitted_by, resume_path, false, copy, eligibility, resumeStatus]
  );

  // If eligible and not a copy, add 50 to user's earning
  if (eligibility && !copy) {
    await pool.query('UPDATE users SET earning = earning + 50 WHERE email = $1', [submitted_by]);
  }

  // Return the required message
  res.json({
    email_copy: emailCopy,
    contact_copy: contactCopy,
    degree: degreeEligible,
    course: courseEligible,
    resume_check: resumeCheckResult,
    status: resumeStatus
  });
};

// Dashboard: get all qualified leads submitted by the user (with pagination)
const getDashboard = async (req, res) => {
  if (!req.user || !req.user.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    // Pagination params
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    // Get total count
    const countRes = await pool.query('SELECT COUNT(*) FROM leads WHERE submitted_by = $1', [req.user.email]);
    const totalLeads = parseInt(countRes.rows[0].count, 10);

    // Get paginated leads
    const leadsRes = await pool.query('SELECT * FROM leads WHERE submitted_by = $1 ORDER BY id DESC LIMIT $2 OFFSET $3', [req.user.email, limit, offset]);
    const leads = leadsRes.rows;

    // Calculate lead types
    const validLeads = leads.filter(l => l.copy === false && l.eligibility === true).length;
    const reviewStage = leads.filter(l => l.status && l.status.toLowerCase() === 'review stage').length;
    const shortlisted = leads.filter(l => l.status && l.status.toLowerCase() === 'shortlisted').length;
    const joined = leads.filter(l => l.status && l.status.toLowerCase() === 'joined').length;
    const userInfoRes = await pool.query('SELECT id, name, email, employee_id, earning FROM users WHERE email = $1', [req.user.email]);
    const userInfo = userInfoRes.rows[0];
    res.json({
      total_leads: totalLeads,
      valid_leads: validLeads,
      review_stage: reviewStage,
      shortlisted: shortlisted,
      joined: joined,
      leads,
      user: userInfo,
      page,
      limit,
      total_pages: Math.ceil(totalLeads / limit)
    });
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
    // Mark the lead as downloaded
    await pool.query('UPDATE leads SET downloded = true WHERE id = $1', [leadId]);
    // Optionally, generate a signed/public URL from Supabase here
    res.json({ resume_path: row.resume_path });
  } catch (err) {
    console.error('DB error in adminDownloadResume:', err);
    return res.status(500).json({ error: 'Database error' });
  }
};

// Admin download all resumes as a zip (and mark all as downloaded)
const adminDownloadAllResumes = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, resume_path FROM leads WHERE resume_path IS NOT NULL');
    const rows = result.rows;
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'No resumes found' });
    }
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="all_resumes.zip"');
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);
    for (const row of rows) {
      const filePath = path.resolve(__dirname, '..', row.resume_path);
      const fileName = row.resume_path.split('/').pop();
      archive.file(filePath, { name: fileName });
    }
    archive.finalize();
    // Mark all these leads as downloaded
    const ids = rows.map(r => r.id);
    if (ids.length > 0) {
      await pool.query('UPDATE leads SET downloded = true WHERE id = ANY($1)', [ids]);
    }
  } catch (err) {
    console.error('DB error in adminDownloadAllResumes:', err);
    return res.status(500).json({ error: 'Database error' });
  }
};

// Admin download only resumes that are not yet downloaded
const adminDownloadNewResume = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, resume_path FROM leads WHERE resume_path IS NOT NULL AND downloded = false');
    const rows = result.rows;
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'No new resumes to download' });
    }
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="new_resumes.zip"');
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);
    for (const row of rows) {
      const filePath = path.resolve(__dirname, '..', row.resume_path);
      const fileName = row.resume_path.split('/').pop();
      archive.file(filePath, { name: fileName });
    }
    archive.finalize();
    // Mark all these leads as downloaded
    const ids = rows.map(r => r.id);
    if (ids.length > 0) {
      await pool.query('UPDATE leads SET downloded = true WHERE id = ANY($1)', [ids]);
    }
  } catch (err) {
    console.error('DB error in adminDownloadNewResume:', err);
    return res.status(500).json({ error: 'Database error' });
  }
};

// Admin update lead status (PostgreSQL version)
const adminUpdateStatus = async (req, res) => {
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
  try {
    const updateRes = await pool.query('UPDATE leads SET status = $1 WHERE id = $2 RETURNING submitted_by', [status, leadId]);
    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    const employeeEmail = updateRes.rows[0].submitted_by;
    // Recalculate and update the user's earning
    const leadsRes = await pool.query('SELECT status FROM leads WHERE submitted_by = $1', [employeeEmail]);
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
    await pool.query('UPDATE users SET earning = $1 WHERE email = $2', [finalEarning, employeeEmail]);
    res.json({ message: `Lead status updated to '${status}' and user earning updated` });
  } catch (err) {
    console.error('Error updating lead status:', err);
    return res.status(500).json({ error: 'Database error' });
  }
};

// Admin: get all leads (with pagination)
const adminGetAllLeads = async (req, res) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    // Pagination params
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    // Get total count
    const countRes = await pool.query('SELECT COUNT(*) FROM leads');
    const totalLeads = parseInt(countRes.rows[0].count, 10);

    // Get paginated leads
    const result = await pool.query('SELECT * FROM leads ORDER BY id DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({
      count: totalLeads,
      leads: result.rows,
      page,
      limit,
      total_pages: Math.ceil(totalLeads / limit)
    });
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
  adminDownloadNewResume,
  adminUpdateStatus,
  adminGetAllLeads
};
