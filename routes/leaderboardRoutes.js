// GET /top route definitions

const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const auth = require('../middleware/auth');

router.get('/', leaderboardController.getLeaderboard);

module.exports = router;
