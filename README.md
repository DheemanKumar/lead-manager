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

### 1a. Sign Up with Email OTP Verification
- **Endpoint:** `POST /api/auth/signup-otp`
- **Input (JSON):**
  ```json
  {
    "name": "Alice Smith",
    "email": "alice@company.com",
    "employee_id": "EMP001",
    "password": "yourpassword",
    "is_admin": false
  }
  ```
- **Output (JSON):**
  - Success: `{ "message": "OTP sent to email", "token": "<token>" }`
  - Error: `{ "error": "Email already exists" }`
- **Logic:**
  - Stores registration data in a temporary table (`pending_users`).
  - Generates a 6-digit OTP and sends it to the user's email.
  - Returns a token for identification during OTP verification.

### 1b. OTP Verification
- **Endpoint:** `POST /api/auth/verify-otp`
- **Input (JSON):**
  ```json
  {
    "email": "alice@company.com",
    "otp": 123456
  }
  ```
- **Output (JSON):**
  - Success: `{ "message": "Registration complete. You can now log in." }`
  - Error: `{ "error": "Invalid OTP" }` or `{ "error": "No pending registration for this email" }`
- **Logic:**
  - Checks the OTP for the email in the `pending_users` table.
  - If valid, moves the user to the main `users` table and deletes the pending record.
  - If invalid, returns an error.

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

### 3. Logout
- **Endpoint:** `POST /api/auth/logout`
- **Output (JSON):**
  - Success: `{ "message": "Logged out successfully. Please remove the token from your client." }`
- **Logic:**
  - For stateless JWT, logout is handled on the client by removing the token (from localStorage, cookies, etc).
  - This endpoint simply instructs the client to remove the token.

### 4. Forgot Password (OTP)
- **Endpoint:** `POST /api/auth/forgot-password`
- **Input (JSON):**
  ```json
  { "email": "alice@company.com" }
  ```
- **Output (JSON):**
  - Success: `{ "message": "OTP sent to email", "token": "<token>" }`
  - Error: `{ "error": "No user with this email" }`
- **Logic:**
  - Generates a 6-digit OTP and sends it to the user's email.
  - Stores the OTP in the `pending_users` table (upserts if already present).
  - Returns a token for identification during OTP verification.

### 4a. Verify OTP for Password Reset
- **Endpoint:** `POST /api/auth/verify-forgot-otp`
- **Input (JSON):**
  ```json
  { "email": "alice@company.com", "otp": 123456 }
  ```
- **Output (JSON):**
  - Success: `{ "message": "OTP verified. You can now reset your password.", "resetToken": "<token>" }`
  - Error: `{ "error": "Invalid OTP" }` or `{ "error": "No OTP request for this email" }`
- **Logic:**
  - Checks the OTP for the email in the `pending_users` table.
  - If valid, returns a new token for password reset.

### 4b. Reset Password
- **Endpoint:** `POST /api/auth/reset-password`
- **Input (JSON):**
  ```json
  { "email": "alice@company.com", "newPassword": "newpassword123" }
  ```
- **Output (JSON):**
  - Success: `{ "message": "Password reset successful. You can now log in." }`
  - Error: `{ "error": "No OTP verification found for this email" }`
- **Logic:**
  - Updates the user's password in the `users` table if OTP was verified.
  - Deletes the OTP record from `pending_users` after successful reset.

---

## Leads

### Submit Lead
- **Endpoint:** `POST /api/leads/`
- **Headers:**
  - `Authorization: Bearer <jwt_token>`
- **Input (form-data):**
  - `name` (Text, required)
  - `mobile` (Text, required)
  - `email` (Text, required)
  - `degree` (Text, required)
  - `course` (Text, required)
  - `college` (Text, required)
  - `year_of_passing` (Text, required)
  - `resume` (File, PDF, required)
- **Output (JSON):**
  - If any field is missing:
    ```json
    {
      "message": "Data insufficient: All fields and resume are required.",
      "name": true/false,
      "mobile": true/false,
      "email": true/false,
      "degree": true/false,
      "course": true/false,
      "college": true/false,
      "year_of_passing": true/false,
      "resume": true/false
    }
    ```
  - On success:
    ```json
    {
      "email_copy": true/false,
      "contact_copy": true/false,
      "degree": true/false,
      "course": true/false
    }
    ```
- **Logic:**
  - All fields and resume are mandatory.
  - If email or mobile already exists, `copy` is set to true.
  - If `degree` is "mtech" and `course` is one of ["cse", "it", "machine learning"], eligibility is true.
  - If eligibility is true and copy is false, 50 is added to the user's earning.
  - The lead is saved in all cases.

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
        "degree": "MTech",
        "course": "CSE",
        "college": "ABC College",
        "year_of_passing": "2024",
        "resume_path": "uploads/bob@email.com.pdf",
        "downloded": true,
        "copy": false,
        "eligibility": true,
        "status": "qualified lead",
        "submitted_by": "alice@company.com",
        "created_at": "2024-06-01T12:34:56.000Z"
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
  - Downloads a ZIP file containing all resumes (regardless of download status). After download, all included resumes are marked as downloaded (`downloded = true`).

### 9a. Admin: Download Only New Resumes (ZIP)
- **Endpoint:** `GET /api/leads/admin/downloadnew`
- **Headers:**
  - `Authorization: Bearer <admin_jwt_token>`
- **Output:**
  - Downloads a ZIP file containing only resumes that have not yet been downloaded (`downloded = false`). After download, these resumes are marked as downloaded.

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

### 12. Admin: Get All Employees Earnings (Detailed)
- **Endpoint:** `GET /api/earning/admin`
- **Headers:**
  - `Authorization: Bearer <admin_jwt_token>`
- **Output (JSON):**
  ```json
  {
    "employees": [
      {
        "submitted_by": "alice@company.com",
        "user_name": "Alice Smith",
        "leads": [
          { "name": "Bob Candidate", "status": "qualified lead", "eligibility": true, "copy": false, "earning": 50 },
          { "name": "Jane Smith", "status": "joined", "eligibility": true, "copy": false, "earning": 5000 }
        ],
        "totalEarning": 5050,
        "bonus": 10000,
        "finalEarning": 15050
      },
      ...
    ]
  }
  ```
- **Logic:**
  - Groups all leads by `submitted_by` (employee email), joins with user name.
  - For each group, returns all leads, per-lead earnings, total, bonus, and final earning.
  - No user table data is returned directly.

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

## Registration & Email OTP Verification Flow (How Signup Works)

### How Signup Works Now
1. **User fills the registration form** on the frontend with name, email, employee ID, password, and (optionally) is_admin.
2. **Frontend sends a POST request to `/api/auth/signup-otp`** with the registration details.
3. **Backend generates a 6-digit OTP** and stores the registration data in a temporary table (`pending_users`).
4. **Backend sends the OTP to the user's email** and returns a token (for identification) to the frontend.
5. **Frontend prompts the user to enter the OTP** received in their email.
6. **Frontend sends a POST request to `/api/auth/verify-otp`** with the user's email and the OTP.
7. **Backend verifies the OTP**:
   - If correct, the user is moved to the main `users` table and registration is complete.
   - If incorrect, an error is returned and the user can retry.

### How to Integrate in the Frontend

1. **Registration Form Submission**
   - Collect user details: name, email, employee_id, password, is_admin (if needed).
   - Send a POST request to `/api/auth/signup-otp` with these details.
   - Example (using fetch):
     ```js
     fetch('/api/auth/signup-otp', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ name, email, employee_id, password, is_admin })
     })
     .then(res => res.json())
     .then(data => {
       if (data.token) {
         // Save token if needed, prompt for OTP
       } else {
         // Show error
       }
     });
     ```

2. **Prompt for OTP**
   - After successful signup-otp, show an input for the OTP the user received by email.

3. **OTP Verification**
   - Send a POST request to `/api/auth/verify-otp` with the user's email and the OTP.
   - Example:
     ```js
     fetch('/api/auth/verify-otp', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ email, otp })
     })
     .then(res => res.json())
     .then(data => {
       if (data.message) {
         // Registration complete, redirect to login
       } else {
         // Show error
       }
     });
     ```

4. **Error Handling**
   - If the OTP is incorrect, show an error and allow the user to retry.
   - If the email is already registered, show an appropriate message.

5. **Resend OTP (Optional)**
   - You can add a button to request a new OTP by calling the signup-otp endpoint again with the same email.

---

## Forgot Password and Reset Flow

### How Forgot Password Works Now
1. **User requests password reset** on the frontend by entering their registered email.
2. **Frontend sends a POST request to `/api/auth/forgot-password`** with the email.
3. **Backend generates a 6-digit OTP** and sends it to the user's email.
4. **Frontend prompts the user to enter the OTP** received in their email.
5. **Frontend sends a POST request to `/api/auth/verify-forgot-otp`** with the user's email and the OTP.
6. **Backend verifies the OTP**:
   - If correct, returns a token for password reset.
   - If incorrect, an error is returned and the user can retry.
7. **User enters a new password** on the frontend.
8. **Frontend sends a POST request to `/api/auth/reset-password`** with the new password and the reset token.
9. **Backend updates the password** and returns a success message.

### How to Integrate in the Frontend

1. **Forgot Password Form Submission**
   - Collect user email.
   - Send a POST request to `/api/auth/forgot-password` with the email.
   - Example:
     ```js
     fetch('/api/auth/forgot-password', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ email })
     })
     .then(res => res.json())
     .then(data => {
       if (data.token) {
         // Save token if needed, prompt for OTP
       } else {
         // Show error
       }
     });
     ```

2. **Prompt for OTP**
   - After successful forgot-password request, show an input for the OTP the user received by email.

3. **OTP Verification for Password Reset**
   - Send a POST request to `/api/auth/verify-forgot-otp` with the user's email and the OTP.
   - Example:
     ```js
     fetch('/api/auth/verify-forgot-otp', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ email, otp })
     })
     .then(res => res.json())
     .then(data => {
       if (data.resetToken) {
         // OTP verified, allow password reset
       } else {
         // Show error
       }
     });
     ```

4. **Reset Password Submission**
   - Collect new password.
   - Send a POST request to `/api/auth/reset-password` with the new password and the reset token.
   - Example:
     ```js
     fetch('/api/auth/reset-password', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ email, newPassword })
     })
     .then(res => res.json())
     .then(data => {
       if (data.message) {
         // Password reset successful, redirect to login
       } else {
         // Show error
       }
     });
     ```

5. **Error Handling**
   - If the OTP is incorrect, show an error and allow the user to retry.
   - If the email is not registered, show an appropriate message.

---

For any questions or issues, contact the backend maintainer.
