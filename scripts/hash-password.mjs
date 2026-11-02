/* Turn a password into the SHA-256 hash that ADMIN_USERS expects.
   Usage:  node scripts/hash-password.mjs "the password"                     */

import crypto from 'node:crypto';

const pw = process.argv[2];
if (!pw) {
  console.error('Usage: node scripts/hash-password.mjs "your password"');
  process.exit(1);
}
const hash = crypto.createHash('sha256').update(pw, 'utf8').digest('hex');
console.log(hash);
console.log('\nPut it in ADMIN_USERS, for example:');
console.log(JSON.stringify({ ryan: hash }));
