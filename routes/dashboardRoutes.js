const express = require('express');
const router = express.Router();
const leadsController = require('../controllers/leadsController');
const auth = require('../middleware/auth');

// GET /api/leads - list all leads submitted by the user
router.get('/', auth, leadsController.getUserLeads);

module.exports = router;
