const fs = require('fs');
const path = require('path');

// Load email service (prefer SMTP-backed if available)
let emailService;
try {
  emailService = require('../services/email.service');
} catch (e) {
  emailService = require('../services/email_local');
}

const USERS_DB = path.join(__dirname, '..', 'data', 'users.json');

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const isRealEmail = (email) => {
  if (!email) return false;
  const e = String(email).toLowerCase().trim();
  if (!e.includes('@')) return false;
  // skip local example domains
  if (e.endsWith('@example.local')) return false;
  return true;
};

const main = async () => {
  if (!fs.existsSync(USERS_DB)) {
    console.error('users.json not found at', USERS_DB);
    process.exit(1);
  }
  const raw = fs.readFileSync(USERS_DB, 'utf8');
  const users = JSON.parse(raw);
  const targets = users.filter(u => isRealEmail(u.email));
  if (!targets.length) {
    console.log('No real emails found to send to.');
    process.exit(0);
  }

  console.log(`Sending OTP to ${targets.length} users (sequential, 1s delay)...`);
  for (const u of targets) {
    try {
      const res = await emailService.sendOTPEmail(u.email, u.name || u.email, '127.0.0.1');
      console.log(`Sent to ${u.email}:`, res && res.message ? res.message : JSON.stringify(res));
    } catch (err) {
      console.error(`Failed to send to ${u.email}:`, err && err.message ? err.message : err);
    }
    // wait 1s between sends to be polite / avoid provider rate-limits
    await delay(1000);
  }
  console.log('Done sending OTPs.');
  process.exit(0);
};

main();
