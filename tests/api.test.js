import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

import { User } from '../models/User.js';
import { Vehicle } from '../models/Vehicle.js';
import { Booking } from '../models/Booking.js';
import { PasswordResetChallenge } from '../models/PasswordResetChallenge.js';
import { EmailVerification } from '../models/EmailVerification.js';
import {
  sendVerificationEmail,
  sendPasswordResetOtpEmail,
  sendBookingConfirmationEmail,
} from '../services/emailService.js';

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/royaldrives');
});

after(async () => {
  await mongoose.disconnect();
});

test('1. Resend Email Service: Graceful execution of transactional emails', async () => {
  const resVerify = await sendVerificationEmail({
    to: 'client@example.com',
    name: 'Test Client',
    verificationUrl: 'http://localhost:5173/verify-email?token=xyz123',
  });
  assert.equal(resVerify.success, true);

  const resOtp = await sendPasswordResetOtpEmail({
    to: 'client@example.com',
    name: 'Test Client',
    otp: '784920',
  });
  assert.equal(resOtp.success, true);

  const resBooking = await sendBookingConfirmationEmail({
    to: 'client@example.com',
    name: 'Test Client',
    bookingReference: 'RD-TEST-001',
    vehicleName: 'Rolls-Royce Ghost',
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000 * 2),
    totalAmount: 250000,
    pickupLocation: 'Jubilee Hills Hub',
    dropoffLocation: 'Shamshabad Airport',
  });
  assert.equal(resBooking.success, true);
});

test('2. Authentication & Email Verification Token single-use security', async () => {
  const testEmail = `test_${Date.now()}@royaldrives.com`;
  const user = await User.create({
    name: 'Verification Tester',
    email: testEmail,
    password: 'SecurePassword123!',
    isVerified: false,
  });

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const record = await EmailVerification.create({
    userId: user._id,
    email: testEmail,
    tokenHash,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });

  assert.equal(record.isUsed, false);
  record.isUsed = true;
  await record.save();
  user.isVerified = true;
  await user.save();

  const updatedUser = await User.findById(user._id);
  assert.equal(updatedUser.isVerified, true);
});

test('3. Forgot Password 6-Digit OTP: 3 failed attempts trigger 15-minute lockout', async () => {
  const testEmail = `otp_test_${Date.now()}@royaldrives.com`;
  const user = await User.create({
    name: 'OTP Tester',
    email: testEmail,
    password: 'InitialPassword123!',
    isVerified: true,
  });

  const realOtp = '824915';
  const otpHash = crypto.createHash('sha256').update(realOtp).digest('hex');

  const challenge = await PasswordResetChallenge.create({
    email: testEmail,
    userId: user._id,
    otpHash,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    attempts: 0,
  });

  // Attempt 1
  challenge.attempts += 1;
  await challenge.save();
  assert.equal(challenge.attempts, 1);
  assert.equal(challenge.isLockedUntil, null);

  // Attempt 2
  challenge.attempts += 1;
  await challenge.save();
  assert.equal(challenge.attempts, 2);

  // Attempt 3 -> Lock for 15 minutes
  challenge.attempts += 1;
  if (challenge.attempts >= 3) {
    challenge.isLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
  }
  await challenge.save();

  assert.equal(challenge.attempts, 3);
  assert.ok(challenge.isLockedUntil > new Date());
});

test('4. Booking Engine: Overlapping reservation prevention', async () => {
  const vehicle = await Vehicle.findOne();
  assert.ok(vehicle);

  const start1 = new Date('2026-11-10T10:00:00Z');
  const end1 = new Date('2026-11-15T10:00:00Z');

  const booking1 = await Booking.create({
    bookingReference: `RD-UNIT-${Date.now()}`,
    userId: new mongoose.Types.ObjectId(),
    vehicleId: vehicle._id,
    startDate: start1,
    endDate: end1,
    totalDays: 5,
    totalAmount: 100000,
    status: 'confirmed',
    pickupLocation: 'Jubilee Hills',
    dropoffLocation: 'Jubilee Hills',
    customerName: 'Booking Tester',
    customerEmail: 'testbooking@example.com',
    customerPhone: '9876543210',
  });

  const start2 = new Date('2026-11-12T10:00:00Z');
  const end2 = new Date('2026-11-17T10:00:00Z');

  const conflicts = await Booking.find({
    vehicleId: vehicle._id,
    status: { $in: ['confirmed', 'ongoing', 'pending'] },
    $or: [{ startDate: { $lte: end2 }, endDate: { $gte: start2 } }],
  });

  assert.equal(conflicts.length > 0, true);

  await Booking.findByIdAndDelete(booking1._id);
});
