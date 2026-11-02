import { readSession } from './_auth.js';

export default function handler(req, res) {
  let user = null;
  try { user = readSession(req); } catch { user = null; }
  const configured = Boolean(
    process.env.SESSION_SECRET && (process.env.ADMIN_USERS || process.env.ADMIN_PASSWORD)
  );
  const canSave = Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO);
  return res.status(200).json({ user, configured, canSave });
}
