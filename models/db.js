// SQLite setup and table creation

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../data/database.sqlite');
const db = new sqlite3.Database(dbPath);

// Table creation logic here
function initDB() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      employee_id TEXT,
      password TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER,
      name TEXT,
      mobile TEXT,
      email TEXT,
      submitted_by TEXT,
      resume_path TEXT,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS earnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      amount INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  });
}

module.exports = { db, initDB };
