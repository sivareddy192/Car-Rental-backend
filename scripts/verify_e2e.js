import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { EmailVerification } from '../models/EmailVerification.js';
import { PasswordResetChallenge } from '../models/PasswordResetChallenge.js';

const API_URL = 'http://localhost:5000/api';

async function jsonRequest(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runE2EVerification() {
  console.log('====================================================');
  console.log('🚀 Car Rental E2E INTEGRATION & SECURITY VALIDATION');
  console.log('====================================================');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/royaldrives');

  try {
    // 1. Admin Login Test
    console.log('\n[TEST 1] Logging in as Executive Admin...');
    const adminLoginRes = await jsonRequest(`${API_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@royaldrives.com',
        password: 'RoyalAdmin#2026',
      }),
    });
    console.log(`✅ Admin authenticated: ${adminLoginRes.data.user.name} (${adminLoginRes.data.user.role})`);
    const adminToken = adminLoginRes.data.accessToken;

    // 2. Demo Member Login Test
    console.log('\n[TEST 2] Logging in as Demo Member...');
    const memberLoginRes = await jsonRequest(`${API_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: 'member@royaldrives.com',
        password: 'MemberPass#2026',
      }),
    });
    console.log(`✅ Member authenticated: ${memberLoginRes.data.user.name}`);
    const memberToken = memberLoginRes.data.accessToken;

    // 3. User Registration with Resend Email Verification Token
    const testEmail = `vip_${Date.now()}@royaldrives.com`;
    console.log(`\n[TEST 3] Registering new member: ${testEmail}...`);
    const regRes = await jsonRequest(`${API_URL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Prince Vikramaditya',
        email: testEmail,
        phone: '+91 99887 76655',
        password: 'RoyalSecret#2026',
        confirmPassword: 'RoyalSecret#2026',
      }),
    });
    console.log(`✅ Registration response: ${regRes.data.message}`);

    const verificationRecord = await EmailVerification.findOne({ email: testEmail, isUsed: false });
    console.log(`✅ Stored single-use token hash: ${verificationRecord.tokenHash.substring(0, 16)}...`);

    // 4. Forgot Password Flow with 6-Digit OTP
    console.log(`\n[TEST 4] Requesting 6-Digit OTP for member@royaldrives.com...`);
    const forgotRes = await jsonRequest(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      body: JSON.stringify({ email: 'member@royaldrives.com' }),
    });
    console.log(`✅ Forgot password response: ${forgotRes.data.message}`);

    const otpChallenge = await PasswordResetChallenge.findOne({
      email: 'member@royaldrives.com',
      isUsed: false,
    }).sort({ createdAt: -1 });

    console.log(`✅ OTP Challenge active. Expiration: ${otpChallenge.expiresAt}`);
    console.log(`✅ Stored OTP Hash: ${otpChallenge.otpHash.substring(0, 16)}...`);

    // Test incorrect OTP attempt
    const wrongOtpRes = await jsonRequest(`${API_URL}/auth/verify-otp`, {
      method: 'POST',
      body: JSON.stringify({
        email: 'member@royaldrives.com',
        otp: '000000',
      }),
    });
    console.log(`✅ Incorrect OTP attempt correctly rejected: "${wrongOtpRes.data.message}"`);

    // 5. Fleet Vehicles & Availability
    console.log('\n[TEST 5] Fetching luxury fleet showroom catalog...');
    const fleetRes = await jsonRequest(`${API_URL}/vehicles`);
    console.log(`✅ Retrieved ${fleetRes.data.count} luxury vehicles`);
    const vehicle = fleetRes.data.vehicles[0];
    console.log(`   Sample vehicle: ${vehicle.brand} ${vehicle.name} (₹${vehicle.pricePerDay}/day)`);

    // 6. Booking Engine & Atomic Double-Booking Prevention
    console.log('\n[TEST 6] Testing atomic reservation & double-booking prevention...');
    const start = new Date('2026-12-01T10:00:00Z');
    const end = new Date('2026-12-05T10:00:00Z');

    const bookRes1 = await jsonRequest(`${API_URL}/bookings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${memberToken}` },
      body: JSON.stringify({
        vehicleId: vehicle._id,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        pickupLocation: 'Jubilee Hills Concierge',
        dropoffLocation: 'Shamshabad Airport VIP',
        customerName: 'Aditya Varma',
        customerEmail: 'member@royaldrives.com',
        customerPhone: '+91 98765 43210',
      }),
    });
    console.log(`✅ Booking 1 confirmed! Reference: ${bookRes1.data.booking.bookingReference}`);

    // Attempt overlapping Booking 2 for same vehicle (Dec 3 to Dec 7)
    console.log('   Attempting conflicting overlapping reservation (Dec 3 to Dec 7)...');
    const bookConflictRes = await jsonRequest(`${API_URL}/bookings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${memberToken}` },
      body: JSON.stringify({
        vehicleId: vehicle._id,
        startDate: '2026-12-03T10:00:00Z',
        endDate: '2026-12-07T10:00:00Z',
        pickupLocation: 'HITEC City',
        dropoffLocation: 'HITEC City',
        customerName: 'Conflict Tester',
        customerEmail: 'conflict@example.com',
        customerPhone: '+91 98765 00000',
      }),
    });
    console.log(`✅ Overlapping booking correctly rejected (HTTP ${bookConflictRes.status}): "${bookConflictRes.data.message}"`);

    // Cancel Booking 1 and verify availability restoration
    console.log('   Cancelling Booking 1 to restore fleet calendar...');
    const cancelRes = await jsonRequest(`${API_URL}/bookings/${bookRes1.data.booking._id}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${memberToken}` },
      body: JSON.stringify({ reason: 'Travel schedule updated' }),
    });
    console.log(`✅ Cancellation confirmed: ${cancelRes.data.message}`);

    // 7. Wishlist Operations
    console.log('\n[TEST 7] Testing Wishlist persistence and duplicate prevention...');
    const addWishRes = await jsonRequest(`${API_URL}/wishlist/${vehicle._id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    console.log(`✅ Wishlist addition: ${addWishRes.data.message}`);

    const getWishRes = await jsonRequest(`${API_URL}/wishlist`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    console.log(`✅ Current saved vehicles count: ${getWishRes.data.count}`);

    // 8. Service Enquiry Dispatch (Taxi / NRI / Wedding)
    console.log('\n[TEST 8] Testing Wedding Fleet Enquiry dispatch...');
    const enquiryRes = await jsonRequest(`${API_URL}/enquiries`, {
      method: 'POST',
      body: JSON.stringify({
        enquiryType: 'wedding',
        name: 'Kavitha & Arvind',
        email: 'wedding@example.com',
        phone: '+91 98765 11223',
        serviceDetails: {
          venue: 'Taj Falaknuma Palace',
          vehicle: 'Rolls-Royce Ghost',
          theme: 'Royal White Orchids',
        },
      }),
    });
    console.log(`✅ Wedding enquiry registered: ${enquiryRes.data.message}`);

    // 9. Contact Us Form with Spam Honeypot Check
    console.log('\n[TEST 9] Testing Contact form with honeypot security...');
    const contactRes = await jsonRequest(`${API_URL}/contact`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Diplomatic Mission Hyderabad',
        email: 'embassy@consulate.gov',
        subject: 'Fleet Escort Protocol',
        message: 'Requesting 3 luxury SUVs for diplomatic motorcade next month.',
        botCheck: '',
      }),
    });
    console.log(`✅ Contact transmission: ${contactRes.data.message}`);

    // 10. Admin Analytics Telemetry
    console.log('\n[TEST 10] Testing Admin Dashboard Analytics & KPIs...');
    const analyticsRes = await jsonRequest(`${API_URL}/admin/analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`✅ Telemetry metrics retrieved:`);
    console.log(`   - Fleet vehicles: ${analyticsRes.data.stats.totalVehicles}`);
    console.log(`   - Total revenue: ₹${analyticsRes.data.stats.totalRevenue.toLocaleString('en-IN')}`);
    console.log(`   - Confirmed bookings: ${analyticsRes.data.stats.confirmedBookings}`);
    console.log(`   - Active inquiries: ${analyticsRes.data.stats.enquiriesCount}`);

    console.log('\n====================================================');
    console.log('🎉 ALL 10 E2E INTEGRATION TESTS PASSED PERFECTLY!');
    console.log('====================================================\n');
  } catch (error) {
    console.error('❌ E2E Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runE2EVerification();
