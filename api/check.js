/* Diagnostics for the publishing setup.

   Asks GitHub what the server's own token is allowed to do, so a failed
   publish can be told apart from a mis-scoped token or a stale environment
   variable. Requires a session, and never returns the token itself.        */

import { requireSession } from './_auth.js';

export default async function handler(req, res) {
  const user = requireSession(req, res);
  if (!user) return;

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';

  const out = {
    repo: repo || null,
    branch,
    tokenPresent: Boolean(token),
    tokenKind: !token ? null
      : token.startsWith('github_pat_') ? 'fine-grained'
      : token.startsWith('ghp_') ? 'classic'
      : 'unrecognised prefix',
    tokenLength: token ? token.length : 0
  };

  if (!token || !repo) {
    out.verdict = 'GITHUB_TOKEN and GITHUB_REPO must both be set in Vercel.';
    return res.status(200).json(out);
  }

  try {
    const r = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'nextgenstem-admin'
      }
    });

    out.httpStatus = r.status;

    if (r.status === 401) {
      out.verdict = 'GitHub rejected the token entirely. It is wrong, revoked, or expired. '
                  + 'Generate a new one and remember to redeploy after changing it in Vercel.';
      return res.status(200).json(out);
    }
    if (r.status === 404) {
      out.verdict = `GitHub cannot see ${repo} with this token. Either GITHUB_REPO is wrong, `
                  + 'or the token does not list this repository under "Only select repositories".';
      return res.status(200).json(out);
    }
    if (!r.ok) {
      out.verdict = `GitHub returned ${r.status} when reading the repository.`;
      return res.status(200).json(out);
    }

    const j = await r.json();
    out.repoFullName = j.full_name;
    out.private = j.private;
    out.defaultBranch = j.default_branch;
    out.permissions = j.permissions || null;   // { admin, push, pull, ... }

    const canPush = Boolean(j.permissions && j.permissions.push);
    out.canWrite = canPush;

    if (!canPush) {
      out.verdict = 'This token can read the repository but cannot push to it. '
                  + 'Set its Contents permission to "Read and write". If you already did, '
                  + 'the value in Vercel is probably from before the change: update it and redeploy.';
    } else if (out.defaultBranch !== branch) {
      out.verdict = `The token can write, but GITHUB_BRANCH is "${branch}" while the repository's `
                  + `default branch is "${j.default_branch}". Publishing will target "${branch}".`;
    } else {
      out.verdict = 'Looks right: the token can write to this repository and branch.';
    }

    return res.status(200).json(out);
  } catch (err) {
    out.verdict = 'Could not reach GitHub: ' + err.message;
    return res.status(200).json(out);
  }
}
