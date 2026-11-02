/* Shared auth helpers for the admin API.
   ---------------------------------------------------------------------------
   The session is a signed, httpOnly cookie. Signing happens here on the
   server with SESSION_SECRET, so the browser cannot read it or forge one,
   and the admin password never reaches the client.

   Env vars (set in Vercel -> Project -> Settings -> Environment Variables):
     SESSION_SECRET   required. Any long random string.
     ADMIN_PASSWORD   a single shared admin password, or
     ADMIN_USERS      {"ryan":"<sha256 of password>", ...} for several accounts
     GITHUB_TOKEN     fine-grained token, Contents: read and write
     GITHUB_REPO      e.g. ZzzzzRyanzzzzzZ/NextGenSTEM
     GITHUB_BRANCH    defaults to main                                        */

import crypto from 'node:crypto';

const COOKIE = 'ngs_session';
const MAX_AGE = 60 * 60 * 12; // 12 hours

function b64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64url(s) {
  s = String(s).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(s + '='.repeat((4 - s.length % 4) % 4), 'base64');
}

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error('SESSION_SECRET is missing or too short (use 32+ random characters).');
  }
  return s;
}

function sign(data) {
  return b64url(crypto.createHmac('sha256', secret()).update(data).digest());
}

/* Timing-safe compare that does not leak length. */
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function sha256hex(s) {
  return crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');
}

/* Returns the username on success, or null. */
export function verifyCredentials(username, password) {
  if (!password) return null;

  const raw = process.env.ADMIN_USERS;
  if (raw) {
    let users;
    try { users = JSON.parse(raw); } catch { throw new Error('ADMIN_USERS is not valid JSON.'); }
    const name = String(username || '').trim();
    const expected = Object.prototype.hasOwnProperty.call(users, name) ? users[name] : null;
    // Always hash, so a missing user costs the same as a wrong password.
    const got = sha256hex(password);
    if (expected && safeEqual(got, expected)) return name;
    return null;
  }

  const single = process.env.ADMIN_PASSWORD;
  if (!single) throw new Error('Neither ADMIN_USERS nor ADMIN_PASSWORD is set.');
  if (safeEqual(password, single)) return String(username || 'admin').trim() || 'admin';
  return null;
}

export function makeSession(user) {
  const payload = b64url(JSON.stringify({ u: user, exp: Date.now() + MAX_AGE * 1000 }));
  return payload + '.' + sign(payload);
}

export function readSession(req) {
  const header = req.headers.cookie || '';
  const hit = header.split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='));
  if (!hit) return null;
  const token = decodeURIComponent(hit.slice(COOKIE.length + 1));
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;

  const payload = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  let ok = false;
  try {
    ok = crypto.timingSafeEqual(unb64url(mac), unb64url(sign(payload)));
  } catch { return null; }
  if (!ok) return null;

  let data;
  try { data = JSON.parse(unb64url(payload).toString('utf8')); } catch { return null; }
  if (!data || !data.exp || Date.now() > data.exp) return null;
  return data.u;
}

export function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie',
    `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${MAX_AGE}`);
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie',
    `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`);
}

/* Small helper so each route reads the same way. */
export function requireSession(req, res) {
  const user = readSession(req);
  if (!user) {
    res.status(401).json({ error: 'Not signed in.' });
    return null;
  }
  return user;
}
