// POST /, GET /dashboard route definitions

const express = require('express');
const router = express.Router();
const leadsController = require('../controllers/leadsController');
const upload = require('../middleware/upload');
const auth = require('../middleware/auth');

router.post('/', auth, upload.single('resume'), leadsController.submitLead);
router.get('/dashboard', auth, leadsController.getDashboard);
router.get('/admin/download/:id', auth, leadsController.adminDownloadResume);
router.get('/admin/downloadall', auth, leadsController.adminDownloadAllResumes);
router.get('/admin/downloadnew', auth, leadsController.adminDownloadNewResume);
router.post('/admin/updatestatus/:id/:state', auth, leadsController.adminUpdateStatus);
router.get('/admin/leads', auth, leadsController.adminGetAllLeads);

module.exports = router;
