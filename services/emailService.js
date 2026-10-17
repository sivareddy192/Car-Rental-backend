import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;
const FRONTEND_URL = process.env.FRONTEND_URL;

// Initialize Resend client if API key is provided
let resendClient = null;
const isDevPlaceholder = !RESEND_API_KEY || RESEND_API_KEY.includes('your_api_key_here');

if (!isDevPlaceholder) {
  try {
    resendClient = new Resend(RESEND_API_KEY);
    console.log('[EmailService] Resend client initialized successfully.');
  } catch (err) {
    console.error('[EmailService] Failed to initialize Resend client:', err.message);
  }
} else {
  console.log('[EmailService] RESEND_API_KEY is not configured or is a placeholder. Operating in Dev Simulation mode.');
}

/**
 * Base Luxury Black-and-White HTML Email Layout
 */
const renderEmailLayout = ({ title, preheader, content }) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f7f7f7;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #111111;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f7f7f7;
      padding: 40px 16px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .header {
      background-color: #000000;
      color: #ffffff;
      padding: 32px 24px;
      text-align: center;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 4px;
      margin: 0;
      text-transform: uppercase;
      color: #ffffff;
    }
    .brand-subtitle {
      font-size: 11px;
      letter-spacing: 2px;
      margin-top: 6px;
      text-transform: uppercase;
      color: #a3a3a3;
    }
    .body-content {
      padding: 40px 32px;
      font-size: 15px;
      line-height: 1.6;
      color: #222222;
    }
    .btn {
      display: inline-block;
      background-color: #000000;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 14px;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin: 24px 0;
    }
    .card-box {
      background-color: #fafafa;
      border: 1px solid #e5e5e5;
      border-radius: 6px;
      padding: 20px;
      margin: 24px 0;
    }
    .otp-display {
      font-size: 36px;
      letter-spacing: 8px;
      font-weight: 800;
      color: #000000;
      text-align: center;
      margin: 20px 0;
      padding: 16px;
      background-color: #f4f4f4;
      border: 1px dashed #000000;
      border-radius: 6px;
      font-family: 'Courier New', Courier, monospace;
    }
    .footer {
      background-color: #f9f9f9;
      border-top: 1px solid #eeeeee;
      padding: 24px 32px;
      text-align: center;
      font-size: 12px;
      color: #737373;
      line-height: 1.5;
    }
    .footer a {
      color: #111111;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader || title}
  </div>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="brand-title">Car Rental</h1>
        <div class="brand-subtitle">Prestige Mobility & Luxury Fleet</div>
      </div>
      <div class="body-content">
        ${content}
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Car Rental Concierge & Car Rentals. All rights reserved.</p>
        <p>This is an automated operational transmission. Please do not reply directly to this email.</p>
        <p><a href="${FRONTEND_URL}">royaldrives.com</a> &bull; Hyderabad Luxury Fleet Headquarters</p>
      </div>
    </div>
  </div>
</body>
</html>`;
};

/**
 * Core dispatch function routing exclusively through Resend
 */
const sendResendEmail = async ({ to, subject, html, text }) => {
  // If in dev placeholder mode, simulate delivery without throwing fatal errors
  if (isDevPlaceholder || !resendClient) {
    console.log(`[Resend Dev Simulation] Email queued to: ${to} | Subject: "${subject}"`);
    return {
      success: true,
      simulated: true,
      id: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    };
  }

  try {
    const { data, error } = await resendClient.emails.send({
      from: RESEND_FROM_EMAIL,
      to,
      subject,
      html,
      text: text || subject,
    });

    if (error) {
      console.error(`[Resend Error] Failed to send email to ${to}:`, error.message);
      return { success: false, error: error.message };
    }

    console.log(`[Resend Success] Email sent to ${to}. Message ID: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error(`[Resend Exception] Error sending email to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
};

/**
 * 1. Registration Verification Email
 */
export const sendVerificationEmail = async ({ to, name, verificationUrl }) => {
  const content = `
    <h2 style="font-size: 20px; font-weight: 700; margin-top: 0;">Welcome to Car Rental, ${name}</h2>
    <p>Thank you for choosing Car Rental for your prestige automotive and mobility experience.</p>
    <p>To verify your email address and activate your member privileges, please select the button below. This single-use link will expire in <strong>15 minutes</strong>.</p>
    
    <div style="text-align: center;">
      <a href="${verificationUrl}" class="btn">Verify Email Address</a>
    </div>

    <p style="font-size: 13px; color: #666666;">If the button does not work, you can copy and paste the following URL into your browser:</p>
    <p style="word-break: break-all; font-size: 12px; color: #444444; background: #fafafa; padding: 10px; border: 1px solid #eee; border-radius: 4px;">${verificationUrl}</p>

    <p style="margin-top: 32px; font-size: 13px; color: #777777;">If you did not request this registration, please disregard this email.</p>
  `;

  const html = renderEmailLayout({
    title: 'Verify Your Car Rental Account',
    preheader: 'Complete your registration to access prestige car rentals.',
    content,
  });

  const text = `Welcome to Car Rental, ${name}.\nPlease verify your email by opening: ${verificationUrl}\nThis link expires in 15 minutes.`;

  return await sendResendEmail({
    to,
    subject: 'Car Rental — Confirm Your Email Registration',
    html,
    text,
  });
};

/**
 * 2. Email Verification OTP (Alternative OTP-based verification)
 */
export const sendVerificationOtpEmail = async ({ to, name, otp }) => {
  const content = `
    <h2 style="font-size: 20px; font-weight: 700; margin-top: 0;">Email Verification Code</h2>
    <p>Dear ${name},</p>
    <p>Please use the following 6-digit verification code to confirm your email address. This passcode is valid for <strong>15 minutes</strong>.</p>
    
    <div class="otp-display">${otp}</div>

    <p style="font-size: 13px; color: #777777;">For security reasons, do not share this passcode with anyone. Car Rental representatives will never ask for your code.</p>
  `;

  const html = renderEmailLayout({
    title: 'Your Verification Code',
    preheader: 'Use your 6-digit code to complete email verification.',
    content,
  });

  const text = `Dear ${name},\nYour Car Rental email verification code is: ${otp}\nValid for 15 minutes.`;

  return await sendResendEmail({
    to,
    subject: 'Car Rental — Your Verification Code',
    html,
    text,
  });
};

/**
 * 3. Password Reset OTP Email (6-digit OTP)
 */
export const sendPasswordResetOtpEmail = async ({ to, name, otp }) => {
  const content = `
    <h2 style="font-size: 20px; font-weight: 700; margin-top: 0;">Password Reset Request</h2>
    <p>Dear ${name || 'Valued Member'},</p>
    <p>We received an official request to reset the password associated with your Car Rental account. Enter the 6-digit passcode below to proceed:</p>
    
    <div class="otp-display">${otp}</div>

    <div class="card-box">
      <strong>Important Security Notices:</strong>
      <ul style="margin: 8px 0 0 20px; padding: 0; font-size: 13px; color: #555555;">
        <li>This one-time passcode expires in <strong>5 minutes</strong>.</li>
        <li>For your protection, three incorrect entries will lock OTP submission for 15 minutes.</li>
        <li>If you did not initiate this reset, ensure your email account is secure and contact us immediately.</li>
      </ul>
    </div>
  `;

  const html = renderEmailLayout({
    title: 'Password Reset One-Time Code',
    preheader: 'Your 6-digit password reset code for Car Rental.',
    content,
  });

  const text = `Dear ${name || 'Member'},\nYour Car Rental password reset code is: ${otp}\nExpires in 5 minutes. If you did not request this, please ignore this email.`;

  return await sendResendEmail({
    to,
    subject: 'Car Rental — Password Reset Verification Code',
    html,
    text,
  });
};

/**
 * 4. Password Reset Confirmation Email
 */
export const sendPasswordResetConfirmationEmail = async ({ to, name }) => {
  const content = `
    <h2 style="font-size: 20px; font-weight: 700; margin-top: 0;">Password Successfully Updated</h2>
    <p>Dear ${name || 'Valued Member'},</p>
    <p>This is a formal notification that the password for your Car Rental account has been changed successfully.</p>
    
    <div class="card-box" style="border-left: 4px solid #000000;">
      <p style="margin: 0; font-size: 14px;"><strong>Time:</strong> ${new Date().toUTCString()}</p>
      <p style="margin: 6px 0 0 0; font-size: 14px;"><strong>Status:</strong> Active & Secured</p>
    </div>

    <p style="font-size: 13px; color: #666666;">If you did not make this change, please contact Car Rental Security Concierge immediately at <a href="mailto:security@royaldrives.com" style="color: #000000; font-weight: 600;">security@royaldrives.com</a>.</p>
    
    <div style="text-align: center;">
      <a href="${FRONTEND_URL}/login" class="btn">Log In to Your Account</a>
    </div>
  `;

  const html = renderEmailLayout({
    title: 'Password Updated Successfully',
    preheader: 'Your Car Rental account password was changed.',
    content,
  });

  const text = `Dear ${name || 'Member'},\nYour Car Rental password has been successfully updated on ${new Date().toUTCString()}.\nIf you did not make this change, contact security@royaldrives.com immediately.`;

  return await sendResendEmail({
    to,
    subject: 'Car Rental — Security Notice: Password Changed',
    html,
    text,
  });
};

/**
 * 5. Booking Confirmation Email
 */
export const sendBookingConfirmationEmail = async ({
  to,
  name,
  bookingReference,
  vehicleName,
  startDate,
  endDate,
  totalAmount,
  pickupLocation,
  dropoffLocation,
}) => {
  const content = `
    <h2 style="font-size: 20px; font-weight: 700; margin-top: 0;">Reservation Confirmed</h2>
    <p>Dear ${name},</p>
    <p>Your booking with Car Rental has been confirmed. Below are your reservation credentials and travel details:</p>
    
    <div class="card-box">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: #777777;">Booking Reference:</td>
          <td style="padding: 8px 0; font-weight: 700; text-align: right; letter-spacing: 1px;">${bookingReference}</td>
        </tr>
        <tr style="border-top: 1px solid #eeeeee;">
          <td style="padding: 8px 0; color: #777777;">Vehicle:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right;">${vehicleName}</td>
        </tr>
        <tr style="border-top: 1px solid #eeeeee;">
          <td style="padding: 8px 0; color: #777777;">Pickup Date:</td>
          <td style="padding: 8px 0; text-align: right;">${new Date(startDate).toLocaleDateString('en-US', { dateStyle: 'full' })}</td>
        </tr>
        <tr style="border-top: 1px solid #eeeeee;">
          <td style="padding: 8px 0; color: #777777;">Return Date:</td>
          <td style="padding: 8px 0; text-align: right;">${new Date(endDate).toLocaleDateString('en-US', { dateStyle: 'full' })}</td>
        </tr>
        <tr style="border-top: 1px solid #eeeeee;">
          <td style="padding: 8px 0; color: #777777;">Pickup Location:</td>
          <td style="padding: 8px 0; text-align: right;">${pickupLocation}</td>
        </tr>
        <tr style="border-top: 1px solid #eeeeee;">
          <td style="padding: 8px 0; color: #777777;">Dropoff Location:</td>
          <td style="padding: 8px 0; text-align: right;">${dropoffLocation}</td>
        </tr>
        <tr style="border-top: 2px solid #000000;">
          <td style="padding: 12px 0; font-weight: 700;">Total Rental Fare:</td>
          <td style="padding: 12px 0; font-weight: 800; font-size: 16px; text-align: right;">₹${Number(totalAmount).toLocaleString('en-IN')}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 14px;">Our chauffeur/fleet delivery team will be in touch prior to pickup. Please ensure your valid driving license and identity card are available upon vehicle handover.</p>

    <div style="text-align: center;">
      <a href="${FRONTEND_URL}/dashboard/bookings" class="btn">View Booking In Dashboard</a>
    </div>
  `;

  const html = renderEmailLayout({
    title: `Booking Confirmed — ${bookingReference}`,
    preheader: `Your Car Rental reservation ${bookingReference} for ${vehicleName} is confirmed.`,
    content,
  });

  const text = `Booking Confirmed (${bookingReference})\nDear ${name},\nYour booking for ${vehicleName} is confirmed.\nPickup: ${new Date(startDate).toDateString()} at ${pickupLocation}\nDropoff: ${new Date(endDate).toDateString()} at ${dropoffLocation}\nTotal: ₹${Number(totalAmount).toLocaleString('en-IN')}`;

  return await sendResendEmail({
    to,
    subject: `Car Rental — Reservation Confirmed [${bookingReference}]`,
    html,
    text,
  });
};

/**
 * 6. Booking Cancellation Email
 */
export const sendBookingCancellationEmail = async ({
  to,
  name,
  bookingReference,
  vehicleName,
  cancellationReason,
}) => {
  const content = `
    <h2 style="font-size: 20px; font-weight: 700; margin-top: 0;">Reservation Cancelled</h2>
    <p>Dear ${name},</p>
    <p>Your booking with reference <strong>${bookingReference}</strong> for <strong>${vehicleName}</strong> has been cancelled.</p>
    
    <div class="card-box">
      <p style="margin: 0; font-size: 14px;"><strong>Reference:</strong> ${bookingReference}</p>
      <p style="margin: 6px 0 0 0; font-size: 14px;"><strong>Vehicle:</strong> ${vehicleName}</p>
      ${cancellationReason ? `<p style="margin: 6px 0 0 0; font-size: 14px;"><strong>Reason:</strong> ${cancellationReason}</p>` : ''}
      <p style="margin: 6px 0 0 0; font-size: 14px;"><strong>Status:</strong> Cancelled & Dates Released</p>
    </div>

    <p style="font-size: 13px; color: #666666;">If this was done in error or you wish to reschedule, our 24/7 concierge is available via WhatsApp or telephone.</p>

    <div style="text-align: center;">
      <a href="${FRONTEND_URL}/self-drive" class="btn">Explore Other Vehicles</a>
    </div>
  `;

  const html = renderEmailLayout({
    title: `Booking Cancelled — ${bookingReference}`,
    preheader: `Your reservation ${bookingReference} has been cancelled.`,
    content,
  });

  const text = `Dear ${name},\nYour reservation ${bookingReference} for ${vehicleName} has been cancelled.\nReason: ${cancellationReason || 'N/A'}`;

  return await sendResendEmail({
    to,
    subject: `Car Rental — Booking Cancellation Notice [${bookingReference}]`,
    html,
    text,
  });
};

/**
 * 7. Booking Status Update Email
 */
export const sendBookingStatusUpdateEmail = async ({
  to,
  name,
  bookingReference,
  vehicleName,
  newStatus,
  notes,
}) => {
  const content = `
    <h2 style="font-size: 20px; font-weight: 700; margin-top: 0;">Booking Status Updated</h2>
    <p>Dear ${name},</p>
    <p>The status of your reservation <strong>${bookingReference}</strong> has been updated to:</p>
    
    <div class="card-box" style="text-align: center;">
      <div style="font-size: 18px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">
        ${newStatus}
      </div>
      ${notes ? `<p style="margin: 12px 0 0 0; font-size: 13px; color: #555555;">${notes}</p>` : ''}
    </div>

    <p style="font-size: 14px;">Vehicle: <strong>${vehicleName}</strong></p>

    <div style="text-align: center;">
      <a href="${FRONTEND_URL}/dashboard/bookings" class="btn">Check Booking Details</a>
    </div>
  `;

  const html = renderEmailLayout({
    title: `Status Update — ${bookingReference}`,
    preheader: `Your booking status is now ${newStatus}.`,
    content,
  });

  const text = `Dear ${name},\nYour reservation ${bookingReference} is now marked as ${newStatus}.\nVehicle: ${vehicleName}`;

  return await sendResendEmail({
    to,
    subject: `Car Rental — Status Update for Booking [${bookingReference}]`,
    html,
    text,
  });
};

/**
 * 8. Administrative Enquiry Notification Email
 */
export const sendAdminEnquiryNotificationEmail = async ({
  enquiryType,
  customerName,
  customerEmail,
  customerPhone,
  details,
}) => {
  const content = `
    <h2 style="font-size: 20px; font-weight: 700; margin-top: 0;">New Service Enquiry Received</h2>
    <p>A new customer lead was submitted on the Car Rental portal:</p>
    
    <div class="card-box">
      <p style="margin: 0; font-size: 14px;"><strong>Service Category:</strong> ${enquiryType.toUpperCase()}</p>
      <p style="margin: 6px 0 0 0; font-size: 14px;"><strong>Customer:</strong> ${customerName}</p>
      <p style="margin: 6px 0 0 0; font-size: 14px;"><strong>Email:</strong> ${customerEmail}</p>
      <p style="margin: 6px 0 0 0; font-size: 14px;"><strong>Phone:</strong> ${customerPhone}</p>
      <p style="margin: 6px 0 0 0; font-size: 14px;"><strong>Details:</strong> ${JSON.stringify(details, null, 2)}</p>
    </div>

    <div style="text-align: center;">
      <a href="${FRONTEND_URL}/admin/enquiries" class="btn">View In Admin Dashboard</a>
    </div>
  `;

  const html = renderEmailLayout({
    title: `New Enquiry — ${enquiryType.toUpperCase()}`,
    preheader: `Lead from ${customerName} for ${enquiryType}`,
    content,
  });

  return await sendResendEmail({
    to: RESEND_FROM_EMAIL.includes('<') ? RESEND_FROM_EMAIL.split('<')[1].replace('>', '') : RESEND_FROM_EMAIL,
    subject: `[ADMIN ALERT] New ${enquiryType.toUpperCase()} Enquiry from ${customerName}`,
    html,
    text: `New lead: ${customerName} (${customerPhone}) for ${enquiryType}`,
  });
};
