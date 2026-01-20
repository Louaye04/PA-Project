// Force Ethereal test account for local testing when running this script
process.env.EMAIL_FORCE_ETHEREAL = process.env.EMAIL_FORCE_ETHEREAL || '1';
const emailService = require('../services/email.service');
const email = process.argv[2] || 'sellerb@example.local';
(async () => {
  try {
    const res = await emailService.sendOTPEmail(email, 'TestUser', '127.0.0.1');
    console.log('SEND RESULT:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('SEND ERROR:', err && err.message ? err.message : err);
    if (err && err.stack) console.error(err.stack);
    process.exit(1);
  }
})();
