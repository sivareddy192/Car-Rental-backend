import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { EmailVerification } from '../models/EmailVerification.js';
import { PasswordResetChallenge } from '../models/PasswordResetChallenge.js';
import { AuditLog } from '../models/AuditLog.js';
import {
  sendVerificationEmail,
  sendPasswordResetOtpEmail,
  sendPasswordResetConfirmationEmail,
} from '../services/emailService.js';

// Helper: Token generation
const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { id: userId, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

// Helper: Set auth cookies
const setTokenCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 60 * 60 * 1000, // 1 hour
  });

  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
};

/**
 * Register User & Send Resend Verification Email
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, phone, password, confirmPassword } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, email address, and password.',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists.',
      });
    }

    // Create user with unverified status
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : '',
      password,
      isVerified: false,
    });

    // Generate single-use secure verification token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await EmailVerification.create({
      userId: user._id,
      email: normalizedEmail,
      tokenHash,
      expiresAt,
    });

    // Send verification email via Resend
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;
    
    await sendVerificationEmail({
      to: normalizedEmail,
      name: user.name,
      verificationUrl,
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your inbox and verify your email.',
      email: user.email,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify Email using secure token
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const { token, email } = req.query;

    if (!token || !email) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification link parameters.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const verificationRecord = await EmailVerification.findOne({
      email: normalizedEmail,
      tokenHash,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!verificationRecord) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is invalid, already utilized, or has expired (15-min limit).',
      });
    }

    // Invalidate token immediately
    verificationRecord.isUsed = true;
    await verificationRecord.save();

    // Mark user as verified
    const user = await User.findById(verificationRecord.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Account not found.',
      });
    }

    user.isVerified = true;
    await user.save();

    // Generate session tokens for auto-login
    const { accessToken, refreshToken } = generateTokens(user._id, user.role);
    user.refreshToken = refreshToken;
    await user.save();

    setTokenCookies(res, accessToken, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You have been logged in.',
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resend Email Verification Token
 */
export const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email address.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Always respond generically to prevent email harvesting
    if (!user || user.isVerified) {
      return res.status(200).json({
        success: true,
        message: 'If an unverified account exists with that address, a new link has been dispatched.',
      });
    }

    // Invalidate prior unused tokens
    await EmailVerification.updateMany(
      { email: normalizedEmail, isUsed: false },
      { isUsed: true }
    );

    // Create new token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await EmailVerification.create({
      userId: user._id,
      email: normalizedEmail,
      tokenHash,
      expiresAt,
    });

    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;

    await sendVerificationEmail({
      to: normalizedEmail,
      name: user.name,
      verificationUrl,
    });

    res.status(200).json({
      success: true,
      message: 'If an unverified account exists with that address, a new link has been dispatched.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * User Login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        isUnverified: true,
        email: user.email,
        message: 'Your email address is not yet verified. Please verify your email or request a new link.',
      });
    }

    const { accessToken, refreshToken } = generateTokens(user._id, user.role);
    user.refreshToken = refreshToken;
    await user.save();

    setTokenCookies(res, accessToken, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Welcome back to Car Rental.',
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh Access Token
 */
export const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token absent. Please log in again.',
      });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'royal_drives_super_secret_refresh_jwt_key_2026_luxury'
    );

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or revoked refresh token.',
      });
    }

    const tokens = generateTokens(user._id, user.role);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    res.status(200).json({
      success: true,
      accessToken: tokens.accessToken,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session. Please log in again.',
    });
  }
};

/**
 * Logout User
 */
export const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.status(200).json({
      success: true,
      message: 'Successfully logged out.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Step 1 & 2: Forgot Password — Generate & Send 6-Digit Email OTP
 * Rate limits strictly enforced:
 * - Max 3 sends per 24h per account
 * - Lockout check
 * - Expiration: 5 minutes
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email address.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const genericResponse = {
      success: true,
      message: 'If an account is associated with this email, a 6-digit verification code has been dispatched.',
      email: normalizedEmail,
    };

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Return generic message without leaking account absence
      return res.status(200).json(genericResponse);
    }

    // Check 24-hour rate limit quota (max 3 sends per 24 hours)
    const sendsIn24h = await PasswordResetChallenge.getDailySendCount(normalizedEmail);
    if (sendsIn24h >= 3) {
      return res.status(429).json({
        success: false,
        message: 'You have reached the maximum limit of 3 password reset requests for today. Please try again in 24 hours.',
      });
    }

    // Check if account is currently locked out from 3 wrong attempts
    const latestChallenge = await PasswordResetChallenge.findOne({
      email: normalizedEmail,
    }).sort({ createdAt: -1 });

    if (latestChallenge && latestChallenge.isLockedUntil && latestChallenge.isLockedUntil > new Date()) {
      const minutesRemaining = Math.ceil((latestChallenge.isLockedUntil.getTime() - Date.now()) / (60 * 1000));
      return res.status(429).json({
        success: false,
        message: `Account is temporarily locked due to multiple incorrect attempts. Please wait ${minutesRemaining} minute(s) before requesting a new code.`,
      });
    }

    // Invalidate previous challenges
    await PasswordResetChallenge.updateMany(
      { email: normalizedEmail, isUsed: false },
      { isUsed: true }
    );

    // Generate cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    await PasswordResetChallenge.create({
      email: normalizedEmail,
      userId: user._id,
      otpHash,
      expiresAt,
      ipAddress: req.ip || '',
    });

    // Send OTP via Resend
    await sendPasswordResetOtpEmail({
      to: normalizedEmail,
      name: user.name,
      otp,
    });

    res.status(200).json(genericResponse);
  } catch (error) {
    next(error);
  }
};

/**
 * Step 3 & 4: Verify 6-digit OTP
 * Rules:
 * - 5 min expiry check
 * - Max 3 attempts -> 15 min lockout
 * - Single use
 */
export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp || otp.toString().trim().length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email and the complete 6-digit code.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otpString = otp.toString().trim();

    // Find latest challenge
    const challenge = await PasswordResetChallenge.findOne({
      email: normalizedEmail,
      isUsed: false,
    }).sort({ createdAt: -1 });

    if (!challenge) {
      return res.status(400).json({
        success: false,
        message: 'No active verification code found. Please request a new code.',
      });
    }

    // Check lockout
    if (challenge.isLockedUntil && challenge.isLockedUntil > new Date()) {
      const minutesRemaining = Math.ceil((challenge.isLockedUntil.getTime() - Date.now()) / (60 * 1000));
      return res.status(429).json({
        success: false,
        isLocked: true,
        message: `Too many failed attempts. Verification is locked for ${minutesRemaining} minute(s).`,
      });
    }

    // Check expiration (5 minutes)
    if (challenge.expiresAt < new Date()) {
      challenge.isUsed = true;
      await challenge.save();
      return res.status(400).json({
        success: false,
        isExpired: true,
        message: 'Verification code has expired. Please request a new one.',
      });
    }

    // Compare hash
    const candidateHash = crypto.createHash('sha256').update(otpString).digest('hex');

    if (candidateHash !== challenge.otpHash) {
      challenge.attempts += 1;
      
      // If 3 incorrect attempts reached -> Lock for 15 minutes!
      if (challenge.attempts >= 3) {
        challenge.isLockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        await challenge.save();

        return res.status(429).json({
          success: false,
          isLocked: true,
          message: 'Maximum attempts exceeded (3/3). You are locked out for 15 minutes.',
        });
      }

      await challenge.save();
      const attemptsLeft = 3 - challenge.attempts;

      return res.status(400).json({
        success: false,
        message: `Invalid code. ${attemptsLeft} attempt(s) remaining.`,
        attemptsLeft,
      });
    }

    // OTP is valid! Create temporary reset token valid for 10 minutes
    const resetToken = crypto.randomBytes(32).toString('hex');
    challenge.isUsed = true;
    challenge.verifiedAt = new Date();
    challenge.resetToken = resetToken;
    challenge.resetTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await challenge.save();

    res.status(200).json({
      success: true,
      message: 'Passcode verified successfully. You may now set your new password.',
      resetToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Step 5: Reset Password using verified challenge resetToken
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { email, resetToken, newPassword, confirmPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields.',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify token & challenge
    const challenge = await PasswordResetChallenge.findOne({
      email: normalizedEmail,
      resetToken,
      resetTokenExpiresAt: { $gt: new Date() },
    });

    if (!challenge) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset challenge. Please start again.',
      });
    }

    // Invalidate challenge immediately to prevent reuse
    challenge.resetToken = null;
    challenge.resetTokenExpiresAt = null;
    await challenge.save();

    // Update password
    const user = await User.findById(challenge.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    user.password = newPassword;
    user.refreshToken = null; // Revoke existing sessions
    await user.save();

    // Send confirmation email via Resend
    await sendPasswordResetConfirmationEmail({
      to: normalizedEmail,
      name: user.name,
    });

    // Audit log
    await AuditLog.create({
      action: 'PASSWORD_RESET_SUCCESS',
      performedBy: user._id,
      ipAddress: req.ip || '',
      details: { email: normalizedEmail },
      targetModel: 'User',
      targetId: user._id.toString(),
    });

    res.status(200).json({
      success: true,
      message: 'Your password has been reset successfully. Please log in with your new credentials.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Current User Profile
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, address, city, drivingLicenseNumber, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (address !== undefined) user.address = address;
    if (city !== undefined) user.city = city;
    if (drivingLicenseNumber !== undefined) user.drivingLicenseNumber = drivingLicenseNumber;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change Password
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new passwords.',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match.',
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    user.password = newPassword;
    await user.save();

    await sendPasswordResetConfirmationEmail({
      to: user.email,
      name: user.name,
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    next(error);
  }
};
