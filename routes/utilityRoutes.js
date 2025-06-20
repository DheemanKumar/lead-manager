// Utility routes: /api/download-db and /api/debug-data

const express = require('express');
const router = express.Router();
const utilityController = require('../controllers/utilityController');

router.get('/download-db', utilityController.downloadDb);
router.get('/debug-data', utilityController.debugData);

module.exports = router;
