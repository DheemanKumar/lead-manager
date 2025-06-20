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
  submitted_by TEXT,
  resume_path TEXT,
  status TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
