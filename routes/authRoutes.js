// POST /signup, POST /login route definitions

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/signup-otp', authController.signupWithOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-forgot-otp', authController.verifyForgotOtp);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
