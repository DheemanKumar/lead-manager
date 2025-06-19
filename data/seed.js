// Loads candidate_master.csv into the database

const fs = require('fs');
const path = require('path');
const { db } = require('../models/db');

const csvPath = path.resolve(__dirname, 'candidate_master.csv');

fs.readFile(csvPath, 'utf8', (err, data) => {
  if (err) throw err;
  const lines = data.split('\n');
  for (let i = 1; i < lines.length; i++) { // skip header
    const cols = lines[i].split(',');
    if (cols.length < 3) continue;
    const [candidate_id, name, email] = cols;
    db.run('INSERT OR IGNORE INTO leads (candidate_id, submitted_by, resume_path) VALUES (?, ?, ?)', [candidate_id, name, null]);
  }
  console.log('Seed complete');
});
