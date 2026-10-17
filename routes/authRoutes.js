import express from 'express';
import {
  register,
  verifyEmail,
  resendVerification,
  login,
  refresh,
  logout,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getMe,
  updateProfile,
  changePassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authLimiter, otpSendLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Registration & Verification
router.post('/register', authLimiter, register);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', authLimiter, resendVerification);

// Login & Session
router.post('/login', authLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);

// Forgot Password with 6-Digit OTP (Rate Limited)
router.post('/forgot-password', otpSendLimiter, forgotPassword);
router.put('/forgot-password', otpSendLimiter, forgotPassword);
router.post('/verify-otp', authLimiter, verifyOtp);
router.post('/verify-forgot-password-otp', authLimiter, verifyOtp);
router.put('/verify-forgot-password-otp', authLimiter, verifyOtp);
router.post('/reset-password', authLimiter, resetPassword);
router.put('/reset-password', authLimiter, resetPassword);

// Profile & Settings (Protected)
router.get('/me', protect, getMe);
router.get('/details', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/update-user', protect, updateProfile);
router.put('/change-password', protect, changePassword);

export default router;
