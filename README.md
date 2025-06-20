# Lead System Backend API Documentation

## Overview
This backend provides APIs for user authentication, lead submission, resume qualification, earnings, and leaderboard features. All endpoints (except signup/login) require JWT authentication via the `Authorization` header.

---

## Authentication

### 1. Sign Up (User or Admin)
- **Endpoint:** `POST /api/auth/signup`
- **Input (JSON):**
  ```json
  {
    "name": "Alice Smith",
    "email": "alice@company.com",
    "employee_id": "EMP001", // required for users, optional for admin
    "password": "yourpassword",
    "is_admin": false // set to true for admin registration
  }
  ```
- **Output (JSON):**
  - Success: `{ "message": "User registered successfully" }` or `{ "message": "Admin registered successfully" }`
  - Error: `{ "error": "Email already exists" }`

### 2. Login (User or Admin)
- **Endpoint:** `POST /api/auth/login`
- **Input (JSON):**
  ```json
  {
    "email": "alice@company.com",
    "password": "yourpassword"
  }
  ```
- **Output (JSON):**
  - Success: `{ "token": "<jwt_token>", "is_admin": true/false }`
  - Error: `{ "error": "Invalid credentials" }`

---

## Leads

### 5. Submit Lead
- **Endpoint:** `POST /api/leads/`
- **Headers:**
  - `Authorization: Bearer <jwt_token>`
- **Input (form-data):**
  - `name` (Text)
  - `mobile` (Text)
  - `email` (Text)
  - `resume` (File, PDF)
- **Output (JSON):**
  - Success:
    ```json
    {
      "message": "Lead submitted successfully",
      "status": "qualified lead",
      "user": {
        "id": 1,
        "name": "Alice Smith",
        "email": "alice@company.com",
        "employee_id": "EMP001",
        "earning": 15050
      }
    }
    ```
  - Duplicate: `{ "error": "Lead already exists with this mobile number or email" }`
  - Not eligible (resume): `{ "error": "Candidate not eligible: MTech not found in resume" }`
  - Missing fields: `{ "error": "Missing required field(s): name, mobile" }`

#### Resume Qualification
- The resume PDF must mention one of these (case-insensitive):
  - `M.Tech`, `MTech`, `M. Tech.`, `Master of Technology`, `MTech (CSE)`, `MTech (ECE)`, `MTech (AI)`, `M.Tech in Computer Science`, `M.Tech (Specialization)`
- Otherwise, the lead is rejected as not eligible.

### 6. Get User Dashboard (All Leads)
- **Endpoint:** `GET /api/leads/dashboard`
- **Headers:**
  - `Authorization: Bearer <jwt_token>`
- **Output (JSON):**
  ```json
  {
    "qualifiedLeadsCount": 2,
    "leads": [
      {
        "name": "Bob Candidate",
        "mobile": "9876543210",
        "email": "bob@email.com",
        "resume_path": "uploads/bob@email.com.pdf",
        "status": "qualified lead"
      },
      ...
    ],
    "user": {
      "id": 1,
      "name": "Alice Smith",
      "email": "alice@company.com",
      "employee_id": "EMP001",
      "earning": 15050
    }
  }
  ```

### 7. Admin: Get All Leads
- **Endpoint:** `GET /api/leads/admin/leads`
- **Headers:**
  - `Authorization: Bearer <admin_jwt_token>`
- **Output (JSON):**
  ```json
  {
    "count": 10,
    "leads": [
      {
        "id": 1,
        "name": "Bob Candidate",
        "mobile": "9876543210",
        "email": "bob@email.com",
        "resume_path": "uploads/bob@email.com.pdf",
        "status": "qualified lead",
        "submitted_by": "alice@company.com"
      },
      ...
    ]
  }
  ```

### 8. Admin: Download Resume by Lead ID
- **Endpoint:** `GET /api/leads/admin/download/:id`
- **Headers:**
  - `Authorization: Bearer <admin_jwt_token>`
- **Output:**
  - Downloads the resume PDF for the given lead ID.

### 9. Admin: Download All Resumes (ZIP)
- **Endpoint:** `GET /api/leads/admin/downloadall`
- **Headers:**
  - `Authorization: Bearer <admin_jwt_token>`
- **Output:**
  - Downloads a ZIP file containing all resumes.

### 10. Admin: Update Lead Status
- **Endpoint:** `POST /api/leads/admin/updatestatus/:id/:state`
- **Headers:**
  - `Authorization: Bearer <admin_jwt_token>`
- **Path Params:**
  - `id`: Lead ID
  - `state`: Status code (0 = rejected, 1 = review stage, 2 = shortlisted, 3 = joined)
- **Output (JSON):**
  - Success: `{ "message": "Lead status updated to 'joined'" }`
  - Error: `{ "error": "Lead not found" }`

---

## Earnings

### 11. Get Earning Breakdown (Employee)
- **Endpoint:** `GET /api/earning/breakdown`
- **Headers:**
  - `Authorization: Bearer <jwt_token>`
- **Output (JSON):**
  ```json
  {
    "leads": [
      { "name": "Bob Candidate", "status": "qualified lead", "earning": 50 },
      { "name": "Jane Smith", "status": "joined", "earning": 5000 }
    ],
    "totalEarning": 5050,
    "bonus": 10000,
    "finalEarning": 15050
  }
  ```
- **Earning Calculation:**
  - Qualified/Review: ₹50
  - Shortlisted: ₹1000
  - Joined: ₹5000
  - Rejected: ₹0
  - **Bonus:** +₹10,000 for every 5th "joined" lead

### 12. Admin: Get All Employees Earnings
- **Endpoint:** `GET /api/earning/admin`
- **Headers:**
  - `Authorization: Bearer <admin_jwt_token>`
- **Output (JSON):**
  ```json
  {
    "employees": [
      { "id": 1, "name": "Alice Smith", "email": "alice@company.com", "employee_id": "EMP001", "earning": 15050 },
      ...
    ]
  }
  ```

---

## Leaderboard

### 13. Get Leaderboard
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

## Dashboard

### 16. Get User Details
- **Endpoint:** `GET /api/dashboard/`
- **Headers:**
  - `Authorization: Bearer <jwt_token>`
- **Output (JSON):**
  ```json
  {
    "user": {
      "id": 1,
      "name": "Alice Smith",
      "email": "alice@company.com",
      "employee_id": "EMP001",
      "is_admin": false,
      "earning": 15050
    }
  }
  ```

### 17. Get Admin Details
- **Endpoint:** `GET /api/dashboard/admin`
- **Headers:**
  - `Authorization: Bearer <jwt_token>` (admin only)
- **Output (JSON):**
  ```json
  {
    "admin": {
      "id": 2,
      "name": "Admin Name",
      "email": "admin@company.com",
      "is_admin": true
    }
  }
  ```

---

## Utility & Debug

### 14. Download Database
- **Endpoint:** `GET /api/download-db`
- **Output:**
  - Downloads the SQLite database file.

### 15. Debug Data
- **Endpoint:** `GET /api/debug-data`
- **Output (JSON):**
  ```json
  {
    "users": [ ... ],
    "leads": [ ... ]
  }
  ```

---

## Error Handling
- All errors are returned as JSON: `{ "error": "<error message>" }`
- Missing or invalid JWT returns 401/403 errors.

---

## Notes
- All endpoints except signup/login require a valid JWT in the `Authorization` header.
- Resume files are stored in the `uploads/` directory, named as the candidate's email.
- Only leads with unique mobile and email are accepted.
- Only resumes mentioning MTech (with allowed variations) are accepted as qualified leads.
- The `users` table contains an `earning` column that is updated automatically.

---

For any questions or issues, contact the backend maintainer.
