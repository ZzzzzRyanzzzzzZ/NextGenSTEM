/* Commit content files to GitHub, on behalf of a signed-in admin.

   The GitHub token lives in a Vercel environment variable and is used only
   here, server-side. It is never sent to the browser, so opening the admin
   page gives nobody the ability to write.                                   */

import { requireSession } from './_auth.js';

/* Only these paths may be written, whatever the request claims. */
const ALLOWED = new Set([
  'data/text.json',
  'data/sections.json',
  'data/pages.json',
  'data/kits.json',
  'data/competitions.json',
  'data/events.json'
]);

const API = 'https://api.github.com';

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'nextgenstem-admin'
  };
}

async function getSha(repo, branch, path, token) {
  const r = await fetch(`${API}/repos/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`,
    { headers: ghHeaders(token) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Reading ${path}: GitHub ${r.status}`);
  const j = await r.json();
  return j.sha;
}

async function putFile(repo, branch, path, content, sha, message, token) {
  const body = {
    message,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch
  };
  if (sha) body.sha = sha;

  const r = await fetch(`${API}/repos/${repo}/contents/${encodeURI(path)}`,
    { method: 'PUT', headers: ghHeaders(token), body: JSON.stringify(body) });

  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    // A bare status code is not much help, so name the usual cause.
    const hint = {
      403: '. The token can read this repo but not write to it. Set its '
         + 'Contents permission to "Read and write".',
      404: '. Check GITHUB_REPO, and that the token lists this repository '
         + 'under "Only select repositories".',
      409: '. The file changed in GitHub since this page loaded it. '
         + 'Reload the admin and make the edit again.',
      422: '. GitHub rejected the commit, often a branch protection rule on '
         + `${branch}.`
    }[r.status] || '';
    throw new Error(`Writing ${path}: GitHub ${r.status}${hint} ${j.message || ''}`.trim());
  }
  return r.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }

  const user = requireSession(req, res);
  if (!user) return;

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!token || !repo) {
    return res.status(500).json({ error: 'GITHUB_TOKEN and GITHUB_REPO are not set on the server.' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
  const files = Array.isArray(body.files) ? body.files : [];
  if (!files.length) return res.status(400).json({ error: 'No files supplied.' });

  // Validate everything before writing anything.
  for (const f of files) {
    if (!f || !ALLOWED.has(f.path)) {
      return res.status(400).json({ error: `Not an editable file: ${f && f.path}` });
    }
    if (typeof f.content !== 'string') {
      return res.status(400).json({ error: `Missing content for ${f.path}` });
    }
    try {
      const parsed = JSON.parse(f.content);
      if (!Array.isArray(parsed)) throw new Error('not an array');
    } catch (e) {
      return res.status(400).json({ error: `${f.path} is not a JSON array: ${e.message}` });
    }
  }

  const written = [];
  try {
    // Sequentially: each write needs the sha left by the one before it.
    for (const f of files) {
      const sha = await getSha(repo, branch, f.path, token);
      await putFile(repo, branch, f.path, f.content, sha,
        `Update ${f.path.replace('data/', '').replace('.json', '')} via admin (${user})`, token);
      written.push(f.path);
    }
  } catch (err) {
    return res.status(502).json({ error: err.message, written });
  }

  return res.status(200).json({ ok: true, written, user });
}

function safeParse(s) { try { return JSON.parse(s); } catch { return {}; } }
