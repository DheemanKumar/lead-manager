-- PostgreSQL schema migration for Railway

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  employee_id TEXT UNIQUE,
  password TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  earning INTEGER DEFAULT 0
);

-- Leads table
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
  downloded BOOLEAN DEFAULT FALSE,
  copy BOOLEAN DEFAULT FALSE,
  eligibility BOOLEAN DEFAULT true,
  status TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
