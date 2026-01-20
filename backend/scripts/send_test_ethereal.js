const nodemailer = require('nodemailer');
(async () => {
  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const info = await transporter.sendMail({
      from: 'noreply@example.com',
      to: 'sellerb@example.local',
      subject: 'Test OTP (Ethereal)',
      text: `Your OTP is: ${otp}`,
      html: `<b>Your OTP is: ${otp}</b>`,
    });

    console.log('Message sent. Preview URL: %s', nodemailer.getTestMessageUrl(info));
    console.log('Ethereal account:', testAccount);
  } catch (err) {
    console.error('Ethereal send error:', err);
    process.exit(1);
  }
})();
