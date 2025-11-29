const nodemailer = require("nodemailer");
const crypto = require("crypto");

/**
 * ============================================
 * SECURE EMAIL OTP SERVICE
 * ============================================
 *
 * Security Features Implemented:
 * 1. Time-based OTP expiration (1 minute)
 * 2. Rate limiting per email (max 3 attempts per 15 min)
 * 3. IP-based rate limiting
 * 4. Secure random OTP generation (crypto)
 * 5. Hash verification for tampering detection
 * 6. Attempt tracking to prevent brute force
 * 7. Automatic cleanup of expired OTPs
 * 8. Resend cooldown (60 seconds)
 * 9. Maximum daily limit per email
 * 10. Secure token generation for session tracking
 */

// In-memory store for OTP data (use Redis in production)
const otpStore = new Map();
const rateLimitStore = new Map();
const dailyLimitStore = new Map();

// Configuration
const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 1,
  MAX_ATTEMPTS: 3,
  RESEND_COOLDOWN_SECONDS: 60,
  RATE_LIMIT_WINDOW_MINUTES: 15,
  MAX_REQUESTS_PER_WINDOW: 3,
  MAX_DAILY_EMAILS: 10,
  CLEANUP_INTERVAL_MINUTES: 10,
};

/**
 * Create email transporter
 * IMPORTANT: Configure with your email provider
 */
const createTransporter = () => {
  // For Gmail (configure in .env):
  // EMAIL_USER=your-email@gmail.com
  // EMAIL_PASS=your-app-specific-password (not your regular password!)

  return nodemailer.createTransport({
    service: "gmail", // or 'outlook', 'yahoo', etc.
    auth: {
      user: process.env.EMAIL_USER || "babaamerabdenour44@gmail.com",
      pass: process.env.EMAIL_PASS || "fkgxhrhwlbredqar",
    },
    // Security options
    secure: true, // use TLS
    tls: {
      rejectUnauthorized: true,
    },
  });
};

/**
 * Generate cryptographically secure OTP
 * Uses crypto.randomInt for true randomness
 */
const generateSecureOTP = () => {
  // Generate secure random 6-digit number
  const otp = crypto.randomInt(100000, 999999);
  return otp.toString();
};

/**
 * Generate secure hash for OTP verification
 * Prevents tampering with stored OTP data
 */
const generateOTPHash = (email, otp, timestamp) => {
  const secret =
    process.env.OTP_SECRET || "your-secret-key-change-in-production";
  const data = `${email}:${otp}:${timestamp}`;
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
};

/**
 * Verify OTP hash integrity
 */
const verifyOTPHash = (email, otp, timestamp, hash) => {
  const expectedHash = generateOTPHash(email, otp, timestamp);
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(expectedHash, "hex")
  );
};

/**
 * Check rate limiting for email
 * Prevents spam and abuse
 */
const checkRateLimit = (email, ipAddress) => {
  const now = Date.now();
  const windowMs = OTP_CONFIG.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;

  // Check email-based rate limit
  const emailKey = `email:${email}`;
  const emailRequests = rateLimitStore.get(emailKey) || [];
  const recentEmailRequests = emailRequests.filter(
    (time) => now - time < windowMs
  );

  if (recentEmailRequests.length >= OTP_CONFIG.MAX_REQUESTS_PER_WINDOW) {
    const oldestRequest = recentEmailRequests[0];
    const waitTime = Math.ceil((windowMs - (now - oldestRequest)) / 1000);
    throw new Error(
      `Too many requests. Please try again in ${Math.ceil(
        waitTime / 60
      )} minutes.`
    );
  }

  // Check IP-based rate limit (prevents distributed attacks)
  if (ipAddress) {
    const ipKey = `ip:${ipAddress}`;
    const ipRequests = rateLimitStore.get(ipKey) || [];
    const recentIpRequests = ipRequests.filter((time) => now - time < windowMs);

    if (recentIpRequests.length >= OTP_CONFIG.MAX_REQUESTS_PER_WINDOW * 2) {
      throw new Error(
        "Too many requests from this IP address. Please try again later."
      );
    }

    rateLimitStore.set(ipKey, [...recentIpRequests, now]);
  }

  // Update email rate limit
  rateLimitStore.set(emailKey, [...recentEmailRequests, now]);

  return true;
};

/**
 * Check daily email limit
 * Prevents excessive email sending
 */
const checkDailyLimit = (email) => {
  const today = new Date().toDateString();
  const dailyKey = `${today}:${email}`;
  const count = dailyLimitStore.get(dailyKey) || 0;

  if (count >= OTP_CONFIG.MAX_DAILY_EMAILS) {
    throw new Error("Daily email limit reached. Please try again tomorrow.");
  }

  dailyLimitStore.set(dailyKey, count + 1);
  return true;
};

/**
 * Check resend cooldown
 * Prevents rapid resend requests
 */
const checkResendCooldown = (email) => {
  const otpData = otpStore.get(email);

  if (otpData && otpData.lastSentAt) {
    const timeSinceLastSend = Date.now() - otpData.lastSentAt;
    const cooldownMs = OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000;

    if (timeSinceLastSend < cooldownMs) {
      const waitTime = Math.ceil((cooldownMs - timeSinceLastSend) / 1000);
      throw new Error(
        `Please wait ${waitTime} seconds before requesting a new code.`
      );
    }
  }

  return true;
};

/**
 * Generate and send OTP email
 */
exports.sendOTPEmail = async (email, userName, ipAddress = null) => {
  try {
    // Security checks
    checkRateLimit(email, ipAddress);
    checkDailyLimit(email);
    checkResendCooldown(email);

    // Generate secure OTP
    const otp = generateSecureOTP();
    const timestamp = Date.now();
    const expiresAt = timestamp + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000;
    const sessionId = crypto.randomUUID();

    // Generate security hash
    const hash = generateOTPHash(email, otp, timestamp);

    // Store OTP data
    otpStore.set(email, {
      otp,
      timestamp,
      expiresAt,
      hash,
      attempts: 0,
      sessionId,
      lastSentAt: timestamp,
    });

    // Create email transporter
    const transporter = createTransporter();

    // Email HTML template (professional and secure)
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Code - BKH Shop</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #6d28d9, #ec4899); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 40px 30px; }
    .otp-box { background: #f8f9fa; border: 2px dashed #6d28d9; border-radius: 10px; padding: 20px; text-align: center; margin: 30px 0; }
    .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #6d28d9; font-family: 'Courier New', monospace; }
    .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e0e0e0; }
    .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #6d28d9, #ec4899); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .info-item { background: #f8f9fa; padding: 15px; border-radius: 5px; }
    .info-label { font-size: 12px; color: #666; margin-bottom: 5px; }
    .info-value { font-weight: bold; color: #333; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 BKH Shop - Verification Code</h1>
    </div>
    
    <div class="content">
      <p>Hello <strong>${userName || "User"}</strong>,</p>
      
      <p>You requested a verification code to secure your account. Use the code below to complete your authentication:</p>
      
      <div class="otp-box">
        <div style="font-size: 14px; color: #666; margin-bottom: 10px;">Your Verification Code</div>
        <div class="otp-code">${otp}</div>
        <div style="font-size: 12px; color: #666; margin-top: 10px;">Valid for ${
          OTP_CONFIG.EXPIRY_MINUTES
        } minutes</div>
      </div>
      
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">📅 Sent At</div>
          <div class="info-value">${new Date(
            timestamp
          ).toLocaleTimeString()}</div>
        </div>
        <div class="info-item">
          <div class="info-label">⏰ Expires At</div>
          <div class="info-value">${new Date(
            expiresAt
          ).toLocaleTimeString()}</div>
        </div>
      </div>
      
      <div class="warning-box">
        <strong>⚠️ Security Warning:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Never share this code with anyone</li>
          <li>BKH Shop will never ask for your code via phone or email</li>
          <li>This code expires in ${OTP_CONFIG.EXPIRY_MINUTES} minutes</li>
          <li>You have ${
            OTP_CONFIG.MAX_ATTEMPTS
          } attempts to enter the correct code</li>
        </ul>
      </div>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        If you didn't request this code, please ignore this email or contact our support team immediately.
      </p>
      
      <p style="color: #999; font-size: 12px; margin-top: 20px;">
        <strong>Session ID:</strong> ${sessionId}<br>
        <strong>Request Time:</strong> ${new Date(
          timestamp
        ).toLocaleString()}<br>
        This information can be used for security tracking.
      </p>
    </div>
    
    <div class="footer">
      <p>© 2025 BKH Shop. All rights reserved.</p>
      <p style="margin: 10px 0;">
        <a href="#" style="color: #6d28d9; text-decoration: none; margin: 0 10px;">Privacy Policy</a> |
        <a href="#" style="color: #6d28d9; text-decoration: none; margin: 0 10px;">Terms of Service</a> |
        <a href="#" style="color: #6d28d9; text-decoration: none, margin: 0 10px;">Contact Support</a>
      </p>
      <p style="color: #999; font-size: 11px;">
        This is an automated message. Please do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email
    const info = await transporter.sendMail({
      from: `"BKH Shop Security" <${
        process.env.EMAIL_USER || "noreply@bkhshop.com"
      }>`,
      to: email,
      subject: `🔐 Your Verification Code: ${otp}`,
      html: emailHtml,
      text: `Your BKH Shop verification code is: ${otp}\n\nThis code expires in ${
        OTP_CONFIG.EXPIRY_MINUTES
      } minutes.\n\nSession ID: ${sessionId}\nSent at: ${new Date(
        timestamp
      ).toLocaleString()}\n\nIf you didn't request this, please ignore this email.`,
      // Security headers
      headers: {
        "X-Priority": "1",
        "X-MSMail-Priority": "High",
        Importance: "high",
      },
    });

    // Log removed

    return {
      success: true,
      message: "Verification code sent successfully",
      sessionId,
      expiresAt,
      expiresIn: OTP_CONFIG.EXPIRY_MINUTES * 60, // seconds
      canResendAt: timestamp + OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000,
    };
  } catch (error) {
    // Log removed
    throw error;
  }
};

/**
 * Verify OTP code
 * Includes security checks and attempt limiting
 */
exports.verifyOTP = async (email, otp, sessionId = null) => {
  try {
    const otpData = otpStore.get(email);

    if (!otpData) {
      throw new Error("No verification code found. Please request a new code.");
    }

    // Check expiration
    if (Date.now() > otpData.expiresAt) {
      otpStore.delete(email);
      throw new Error(
        "Verification code has expired. Please request a new code."
      );
    }

    // Check session ID (optional but recommended)
    if (sessionId && otpData.sessionId !== sessionId) {
      throw new Error("Invalid session. Please request a new code.");
    }

    // Check attempts
    if (otpData.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
      otpStore.delete(email);
      throw new Error("Maximum attempts exceeded. Please request a new code.");
    }

    // Increment attempts
    otpData.attempts++;

    // Verify hash integrity (prevents tampering)
    if (!verifyOTPHash(email, otpData.otp, otpData.timestamp, otpData.hash)) {
      otpStore.delete(email);
      throw new Error(
        "Security verification failed. Please request a new code."
      );
    }

    // Verify OTP (constant-time comparison to prevent timing attacks)
    const inputOTP = otp.toString().trim();
    const storedOTP = otpData.otp.toString();

    if (inputOTP.length !== storedOTP.length) {
      throw new Error("Invalid verification code.");
    }

    // Timing-safe comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(inputOTP),
      Buffer.from(storedOTP)
    );

    if (!isValid) {
      const remainingAttempts = OTP_CONFIG.MAX_ATTEMPTS - otpData.attempts;
      if (remainingAttempts > 0) {
        throw new Error(
          `Invalid verification code. ${remainingAttempts} attempt(s) remaining.`
        );
      } else {
        otpStore.delete(email);
        throw new Error(
          "Maximum attempts exceeded. Please request a new code."
        );
      }
    }

    // Success! Remove OTP from store
    otpStore.delete(email);

    // Log removed

    return {
      success: true,
      message: "Verification successful",
      email,
      verifiedAt: Date.now(),
    };
  } catch (error) {
    // Log removed
    throw error;
  }
};

/**
 * Cleanup expired OTPs
 * Run periodically to free memory
 */
const cleanupExpiredOTPs = () => {
  const now = Date.now();
  let cleaned = 0;

  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(email);
      cleaned++;
    }
  }

  // Cleanup old rate limit data
  const windowMs = OTP_CONFIG.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;
  for (const [key, requests] of rateLimitStore.entries()) {
    const recent = requests.filter((time) => now - time < windowMs);
    if (recent.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, recent);
    }
  }

  // Cleanup old daily limits (keep only today's data)
  const today = new Date().toDateString();
  for (const [key] of dailyLimitStore.entries()) {
    if (!key.startsWith(today)) {
      dailyLimitStore.delete(key);
    }
  }

  if (cleaned > 0) {
    // Log removed
  }
};

// Start cleanup interval
setInterval(
  cleanupExpiredOTPs,
  OTP_CONFIG.CLEANUP_INTERVAL_MINUTES * 60 * 1000
);

/**
 * Get OTP status for email (for debugging/admin)
 */
exports.getOTPStatus = (email) => {
  const otpData = otpStore.get(email);
  if (!otpData) {
    return { exists: false };
  }

  return {
    exists: true,
    expiresAt: otpData.expiresAt,
    expiresIn: Math.max(0, Math.ceil((otpData.expiresAt - Date.now()) / 1000)),
    attempts: otpData.attempts,
    maxAttempts: OTP_CONFIG.MAX_ATTEMPTS,
    remainingAttempts: Math.max(0, OTP_CONFIG.MAX_ATTEMPTS - otpData.attempts),
    sessionId: otpData.sessionId,
    lastSentAt: otpData.lastSentAt,
  };
};

/**
 * Manually clear OTP (for admin/testing)
 */
exports.clearOTP = (email) => {
  otpStore.delete(email);
  return { success: true, message: "OTP cleared successfully" };
};

// Export config for reference
exports.OTP_CONFIG = OTP_CONFIG;
