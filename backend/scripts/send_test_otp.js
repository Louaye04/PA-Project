const emailService = require('../services/email_local');

(async () => {
  try {
    const res = await emailService.sendOTPEmail('sellerb@example.local', 'SellerB', '127.0.0.1');
    console.log('sendOTPEmail result:', res);
  } catch (e) {
    console.error('Error sending test OTP:', e && e.message ? e.message : e);
    console.error(e);
  }
})();
