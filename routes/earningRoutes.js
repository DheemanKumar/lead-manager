// routes/earningRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const earningController = require('../controllers/earningController');

router.get('/breakdown', auth, earningController.earningBreakdown);
router.get('/admin', auth, earningController.allEmployeesEarnings);

module.exports = router;
