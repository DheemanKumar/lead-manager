const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

// GET /api/dashboard/ - return details of user
router.get('/', auth, dashboardController.getUserDetails);

// GET /api/dashboard/admin - return details of admin
router.get('/admin', auth, dashboardController.getAdminDetails);

module.exports = router;
