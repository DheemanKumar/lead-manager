// Utility routes: /api/download-db and /api/debug-data

const express = require('express');
const router = express.Router();
const utilityController = require('../controllers/utilityController');
const auth = require('../middleware/auth');

router.get('/download-db', utilityController.downloadDb);
router.get('/debug-data', utilityController.debugData);
router.post('/reset-schema', auth, utilityController.resetSchema);
router.post('/update-schema', auth, utilityController.updateSchema);

module.exports = router;
