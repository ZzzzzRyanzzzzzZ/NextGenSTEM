import { verifyCredentials, makeSession, setSessionCookie } from './_auth.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
  const { username, password } = body;

  let user;
  try {
    user = verifyCredentials(username, password);
  } catch (err) {
    // A configuration problem, not a bad password. Say so plainly.
    return res.status(500).json({ error: err.message });
  }

  if (!user) return res.status(401).json({ error: 'Wrong username or password.' });

  setSessionCookie(res, makeSession(user));
  return res.status(200).json({ user });
}

function safeParse(s) { try { return JSON.parse(s); } catch { return {}; } }
