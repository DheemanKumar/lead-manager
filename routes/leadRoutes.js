// POST /, GET /dashboard route definitions

const express = require('express');
const router = express.Router();
const leadsController = require('../controllers/leadsController');
const upload = require('../middleware/upload');
const auth = require('../middleware/auth');

router.post('/', auth, upload.single('resume'), leadsController.submitLead);
router.get('/dashboard', auth, leadsController.getDashboard);

module.exports = router;
