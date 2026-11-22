# NextGen STEM Hackathon

The website for the NextGen STEM Hackathon, Saturday, November 28, 2026.

Hosted on Vercel. Every push to `main` deploys.

| File | What it is |
|---|---|
| `index.html` | The hackathon page: details, schedule, what to bring, FAQ |
| `register.html` / `register.js` | The registration form |
| `api/register.js` | Takes each sign-up and adds it to a Google Sheet |
| `style.css` | All the styling |
| `404.html` | Shown for addresses that don't exist |

## Before you launch

1. Set up the Google Sheet so registrations get saved: see `docs/google-sheet-setup.md`.
   Until `SHEET_WEBHOOK_URL` is set, the form shows "Registration isn't switched on yet."
2. In `index.html`, replace every `TBA` (venue and time) and fix the schedule times.
3. Add your custom domain in Vercel under Settings → Domains.

## Run it locally

`npx vercel dev`, then open http://localhost:3000. (A plain static server shows
the pages, but the form needs `vercel dev` to submit.)
