// PostgreSQL setup for Railway/production
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false
});

// Table creation logic for PostgreSQL
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      employee_id TEXT UNIQUE,
      password TEXT,
      is_admin BOOLEAN DEFAULT FALSE,
      earning INTEGER DEFAULT 0
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
  name TEXT,
  mobile TEXT,
  email TEXT,
  degree TEXT,
  course TEXT,
  college TEXT,
  year_of_passing TEXT,
  submitted_by TEXT,
  resume_path TEXT,
  copy BOOLEAN DEFAULT FALSE,
  eligibility BOOLEAN DEFAULT true,
  status TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

module.exports = { pool, initDB };
