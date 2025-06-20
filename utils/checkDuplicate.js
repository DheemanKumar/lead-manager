const { pool } = require('../models/db');

// Checks for duplicate candidate_id, mobile, or email (not resume)
async function checkDuplicate(candidateId, mobile, email, callback) {
  try {
    const result = await pool.query(
      'SELECT candidate_id, mobile, email FROM leads WHERE candidate_id = $1 OR mobile = $2 OR email = $3',
      [candidateId, mobile, email]
    );
    const row = result.rows[0];
    if (!row) return callback(null);
    if (row.candidate_id === candidateId) return callback('candidate_id');
    if (row.mobile === mobile) return callback('mobile');
    if (row.email === email) return callback('email');
    return callback(null);
  } catch (err) {
    return callback(null);
  }
}

module.exports = checkDuplicate;
