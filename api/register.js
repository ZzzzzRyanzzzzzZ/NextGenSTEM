/* Receives the registration form and adds it as a row in a Google Sheet.

   Set SHEET_WEBHOOK_URL in Vercel (Project -> Settings -> Environment
   Variables) to the web app URL from docs/google-sheet-setup.md. The URL is
   kept on the server, so nobody can write to the sheet directly.           */

const FIELDS = [
  'first', 'last', 'email', 'phone', 'school', 'grade',
  'experience', 'team', 'teammates',
  'parent_name', 'parent_email', 'parent_phone',
  'diet', 'heard', 'notes', 'conduct', 'photos'
];
const REQUIRED = [
  'first', 'last', 'email', 'school', 'grade', 'experience', 'team',
  'parent_name', 'parent_email', 'parent_phone', 'conduct'
];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  // Bots fill in the hidden field. Pretend it worked.
  if (body.website) return res.status(200).json({ ok: true });

  const row = { submitted: new Date().toISOString() };
  for (const k of FIELDS) row[k] = String(body[k] ?? '').trim().slice(0, 1000);

  const missing = REQUIRED.filter(k => !row[k]);
  if (missing.length) return res.status(400).json({ error: 'Please fill in every required field.' });
  if (!EMAIL.test(row.email) || !EMAIL.test(row.parent_email)) {
    return res.status(400).json({ error: 'One of the email addresses doesn\'t look right.' });
  }
  if (!['9', '10', '11', '12'].includes(row.grade)) {
    return res.status(400).json({ error: 'Grade has to be 9, 10, 11 or 12.' });
  }

  const url = process.env.SHEET_WEBHOOK_URL;
  if (!url) {
    console.error('SHEET_WEBHOOK_URL is not set');
    return res.status(503).json({ error: 'Registration isn\'t switched on yet.' });
  }

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
      redirect: 'follow'
    });
    const text = await r.text();
    if (!r.ok || !text.includes('"ok":true')) {
      console.error('Sheet webhook failed', r.status, text.slice(0, 300));
      return res.status(502).json({ error: 'We couldn\'t save that just now. Try again in a minute.' });
    }
  } catch (err) {
    console.error('Sheet webhook error', err);
    return res.status(502).json({ error: 'We couldn\'t save that just now. Try again in a minute.' });
  }

  return res.status(200).json({ ok: true });
}
