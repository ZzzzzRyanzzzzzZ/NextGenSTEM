# NextGen STEM

Static site for NextGen STEM: free in-person competitions where the kit is
handed out at the door, renewable energy hardware you can measure, and a
fellowship selected by application.

Hosted on Vercel. Every push to `main` deploys automatically.

## Run it locally

```bash
python -m http.server 5178
```

Then open <http://localhost:5178>. No build step; it is plain HTML, CSS and JS.

## Layout

| Path | What it is |
|---|---|
| `index.html` | Home |
| `energy.html`, `competitions.html`, `events.html` | The public sections |
| `apply.html` | The fellowship: six fields, the brief for each, and the button to the Jotform |
| `events.html` | Upcoming events. Empty for now; an event template is commented in the source |
| `admin/` | The content editor. See "Editing content" below |
| `data/*.json` | The content itself: kits, competitions, events |
| `404.html` | Served by GitHub Pages for missing paths (links are absolute for that reason) |
| `css/style.css` | One stylesheet. Brand palette lives in the `:root` block at the top |
| `js/main.js` | Mobile nav and scroll reveal |
| `js/content.js` | Draws the calendar and events list from `data/` |
| `img/share.png` | Open Graph card used when a link is shared |
| `templates/` | The two decision emails, to copy and fill in |

## Receiving applications

The application is a Jotform: <https://form.jotform.com/262548966626170>.
Every "Apply" button and link on the site opens it in a new tab; nothing is
embedded and nothing on this site handles submissions. They land in the
Jotform account and are emailed from there. To change the questions, edit
the form in Jotform. To change where the buttons go, search the HTML for the
form URL.

Everything routes through that one form: kit applications, class-set
requests, event sign-ups and venue offers. Every call to action on the site
points at it. The public contact address is `nextgenstem42@gmail.com`, which
is also what the form itself tells applicants to write to.

## Adding an event

In `events.html`, inside `<ol class="events">`, there is a commented-out
`<li class="event">` template. Copy it, fill in the date, title, place and
time, and delete the `<div class="empty">` block above it. Update the
`0 scheduled` figure in the page header too.

## Kits are free

Nothing on the site has a price. Kits, energy units and class sets are all
allocated by application through the form, never sold, and the copy says so
wherever a price used to be.

## Replying to applicants

`templates/accepted.txt` and `templates/not-yet.txt` are the two emails. Both
are written to be filled in, not sent as-is; the bracketed parts are the point.

## Palette

Taken from the atom mark. Navy is both the logo ground and the body ink.

| Token | Hex | Role |
|---|---|---|
| `--ink` | `#1a3a56` | Navy: text, dark sections |
| `--teal` | `#2a9d9c` | Orbits: links, focus, accents |
| `--coral` | `#f8836b` | Nucleus: the mark; `--coral-ink` for small text |
| `--gold` | `#f5cd5c` | Electrons: sparingly |


## Editing content

Content lives as JSON in `data/`. The calendar on the competitions page and the
list on the events page are drawn from it at page load, so editing the JSON is
all that is needed to change what the site shows.

Open `/admin/` (locally: <http://localhost:5178/admin/>) to edit it through
forms instead of by hand.

### Saving

Signed in, pressing **Publish changes** commits the JSON to GitHub and Vercel
redeploys. Your password is checked on the server and the GitHub token lives
there too, so neither is ever present in the browser.

Signed out, the editor still works and **Download changed files** gives you the
JSON to commit by hand.

Anyone can open `/admin/`, but without a session they cannot write anything.

### Adding a field or a new content type

Edit `admin/schema.js` only. It defines each type, its data file, and its
fields, and the admin builds its forms from it.

To add a type: copy a block, give it a new key, and create the matching
`data/<key>.json` containing `[]`. To show it on a page, add a
`data-content="..."` hook and a small render function in `js/content.js`.


## Deploying to Vercel

1. <https://vercel.com/new>, import `ZzzzzRyanzzzzzZ/NextGenSTEM`.
2. Framework preset: **Other**. No build command, no output directory; the
   repository root is served as-is and `api/` becomes serverless functions.
3. Add the environment variables below, then deploy.

### Environment variables

Set these in Vercel under Project → Settings → Environment Variables.

| Name | Required | What it is |
|---|---|---|
| `SESSION_SECRET` | yes | 32+ random characters. Signs the session cookie. |
| `ADMIN_PASSWORD` | one of these | A single shared admin password. |
| `ADMIN_USERS` | one of these | `{"ryan":"<sha256>","sam":"<sha256>"}` for separate accounts. Takes priority over `ADMIN_PASSWORD`. |
| `GITHUB_TOKEN` | to publish | Fine-grained token for this repo, *Contents: read and write*. |
| `GITHUB_REPO` | to publish | `ZzzzzRyanzzzzzZ/NextGenSTEM` |
| `GITHUB_BRANCH` | no | Defaults to `main`. |

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Hash a password for `ADMIN_USERS`:

```bash
node scripts/hash-password.mjs "the password"
```

### After deploying

Change `https://nextgenstem.vercel.app` in the `canonical` and `og:url` tags of
each page if your Vercel domain differs.

## Running locally

```bash
python -m http.server 5178
```

That serves the pages and the admin in its signed-out, download-the-JSON mode.
The `/api/*` routes need `vercel dev` (`npm i -g vercel`) to run locally.
