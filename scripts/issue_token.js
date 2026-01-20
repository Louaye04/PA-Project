const auth = require('../backend/services/auth.service');
const email = process.argv[2];
if (!email) {
  console.error('Usage: node issue_token.js <email>');
  process.exit(2);
}
const user = auth.getUserByEmail(email);
if (!user) {
  console.error('User not found:', email);
  process.exit(1);
}
const result = auth.issueTokenForUser(user);
console.log(result.token);
