# Lead System Backend API Documentation

## Overview
This backend provides APIs for user authentication, lead submission, resume qualification, and leaderboard features. All endpoints (except signup/login) require JWT authentication via the `Authorization` header.

---

## Authentication

### 1. Sign Up
- **Endpoint:** `POST /api/auth/signup`
- **Input (JSON):**
  ```json
  {
    "name": "Alice Smith",
    "email": "alice@company.com",
    "employee_id": "EMP001",
    "password": "yourpassword"
  }
  ```
- **Output (JSON):**
  - Success: `{ "message": "User registered successfully" }`
  - Error: `{ "error": "Email already exists" }`

### 2. Login
- **Endpoint:** `POST /api/auth/login`
- **Input (JSON):**
  ```json
  {
    "email": "alice@company.com",
    "password": "yourpassword"
  }
  ```
- **Output (JSON):**
  - Success: `{ "token": "<jwt_token>" }`
  - Error: `{ "error": "Invalid credentials" }`

---

## Leads

### 3. Submit Lead
- **Endpoint:** `POST /api/leads/`
- **Headers:**
  - `Authorization: Bearer <jwt_token>`
- **Input (form-data):**
  - `candidate_id` (Text)
  - `name` (Text)
  - `mobile` (Text)
  - `email` (Text)
  - `resume` (File, PDF)
- **Output (JSON):**
  - Success:
    ```json
    { "message": "Lead submitted successfully", "status": "qualified lead" }
    ```
  - Duplicate:
    ```json
    { "error": "Lead already exists with this mobile number or email" }
    ```
  - Not eligible (resume):
    ```json
    { "error": "Candidate not eligible: MTech not found in resume" }
    ```
  - Missing fields:
    ```json
    { "error": "Missing required field(s): name, mobile" }
    ```

#### Resume Qualification
- The resume PDF must mention one of these (case-insensitive):
  - `M.Tech`
  - `MTech`
  - `M. Tech.`
  - `Master of Technology`
  - `MTech (CSE)` / `MTech (ECE)` / `MTech (AI)`
  - `M.Tech in Computer Science`
  - `M.Tech (Specialization)`
- Otherwise, the lead is rejected as not eligible.

---

### 4. Get User Dashboard (All Leads)
- **Endpoint:** `GET /api/leads/dashboard`
- **Headers:**
  - `Authorization: Bearer <jwt_token>`
- **Output (JSON):**
  ```json
  {
    "count": 2,
    "leads": [
      {
        "name": "Bob Candidate",
        "mobile": "9876543210",
        "email": "bob@email.com",
        "resume_path": "uploads/resume.pdf",
        "status": "qualified lead"
      },
      ...
    ]
  }
  ```

---

## Leaderboard

### 5. Get Leaderboard
- **Endpoint:** `GET /api/leaderboard/`
- **Output (JSON):**
  ```json
  {
    "leaderboard": [
      { "name": "Alice Smith", "lead_count": 5 },
      { "name": "Bob Jones", "lead_count": 3 }
    ]
  }
  ```

---

## Error Handling
- All errors are returned as JSON: `{ "error": "<error message>" }`
- Missing or invalid JWT returns 401/403 errors.

---

## Notes
- All endpoints except signup/login require a valid JWT in the `Authorization` header.
- Resume files are stored in the `uploads/` directory.
- Only leads with unique mobile and email are accepted.
- Only resumes mentioning MTech (with allowed variations) are accepted as qualified leads.

---

For any questions or issues, contact the backend maintainer.
