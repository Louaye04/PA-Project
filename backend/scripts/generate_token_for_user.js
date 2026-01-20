const authService = require('../services/auth.service');

const email = process.argv[2] || 'hindkahla2@gmail.com';

try {
  const user = authService.getUserByEmail(email);
  if (!user) {
    console.error('User not found:', email);
    process.exit(1);
  }

  const result = authService.issueTokenForUser(user);
  console.log(JSON.stringify({ token: result.token, user: result.user }, null, 2));
} catch (e) {
  console.error('Error generating token:', e.message);
  process.exit(1);
}
