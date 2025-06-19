const fs = require('fs');
const path = require('path');
const csvPath = path.resolve(__dirname, '../data/candidate_master.csv');
const { db } = require('../models/db');

// Checks for duplicate candidate_id, mobile, or email (not resume)
function checkDuplicate(candidateId, mobile, email, callback) {
  db.get(
    'SELECT candidate_id, mobile, email FROM leads WHERE candidate_id = ? OR mobile = ? OR email = ?',
    [candidateId, mobile, email],
    (err, row) => {
      if (err || !row) return callback(null);
      if (row.candidate_id === candidateId) return callback('candidate_id');
      if (row.mobile === mobile) return callback('mobile');
      if (row.email === email) return callback('email');
      return callback(null);
    }
  );
}

module.exports = checkDuplicate;
