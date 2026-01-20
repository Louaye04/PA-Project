// Script to validate SMTP configuration used by email.service
(async () => {
  try {
    const svc = require('../services/email.service');
    if (typeof svc.verifyTransporter !== 'function') {
      console.error('verifyTransporter not available in email.service');
      process.exit(2);
    }
    console.log('Attempting to verify SMTP transporter...');
    await svc.verifyTransporter();
    console.log('SMTP verification succeeded. Transporter is ready.');
    process.exit(0);
  } catch (err) {
    console.error('SMTP verification failed:');
    console.error(err && err.message ? err.message : err);
    if (err && err.stack) console.error(err.stack);
    process.exit(1);
  }
})();
