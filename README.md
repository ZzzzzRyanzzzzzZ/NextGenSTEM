# NextGen STEM

Static site for NextGen STEM: free in-person competitions on one topic at a
time, ninety minutes each, with the kit handed out at the door.

Hosted on Vercel. Every push to `main` deploys automatically.

## Run it locally

```bash
python -m http.server 5178
```

Then open <http://localhost:5178>. No build step; it is plain HTML, CSS and JS.
That serves the pages and the admin in its signed-out, download-the-JSON mode.
The `/api/*` routes need `vercel dev` (`npm i -g vercel`) to run locally.

## Layout

| Path | What it is |
|---|---|
| `index.html` | Home |
| `competitions.html` | The calendar, the rules, and hosting a round |
| `events.html` | Upcoming events, drawn from `data/events.json` |
| `page.html` | The shell every admin-made page is served through, at `/p/<address>` |
| `admin/` | The content editor. See "Editing content" below |
| `data/*.json` | The content itself |
| `404.html` | Shown for any address that does not exist (its links are absolute for that reason) |
| `css/style.css` | One stylesheet. Brand palette lives in the `:root` block at the top |
| `js/main.js` | Mobile nav and scroll reveal |
| `js/content.js` | Draws everything in `data/` onto the pages |
| `img/share.png` | Open Graph card used when a link is shared |
| `templates/` | Two decision emails, to copy and fill in |

## Editing content

Open `/admin/` (locally: <http://localhost:5178/admin/>) and sign in. Six
things can be edited there, and none of them need the HTML touched:

| In the admin | What it changes | File |
|---|---|---|
| **Site text** | Retypes headings and paragraphs that are already on the site, plus the menu button and the footer blurb | `data/text.json` |
| **Sections** | Adds a new block of writing to the bottom of a page | `data/sections.json` |
| **Pages** | A whole new page at `/p/<address>`, optionally in the top menu | `data/pages.json` |
| **Competitions** | The calendar table and the "next one" dates | `data/competitions.json` |
| **Events** | The events list | `data/events.json` |
| **Kits** | Only the Kit column of the calendar. Not shown anywhere else yet | `data/kits.json` |

Anything left blank in **Site text** falls back to the wording written into
the HTML, so an empty `data/text.json` leaves the site exactly as it ships.

### Saving

Signed in, pressing **Publish changes** commits the JSON to GitHub and Vercel
redeploys. Your password is checked on the server and the GitHub token lives
there too, so neither is ever present in the browser.

Signed out, the editor still works and **Download changed files** gives you the
JSON to commit by hand.

Anyone can open `/admin/`, but without a session they cannot write anything.

### How a section is drawn

Each page has a `<div data-content="sections" data-page="home">` just before
`</main>`. `js/content.js` fills it with every section whose **Which page**
matches, in the order you set. The six looks map onto the site's existing
styles: plain, tinted band, navy band, big quote, row of cards, numbered list.

In the writing box, a blank line starts a new paragraph. For cards and the
numbered list, starting a paragraph with `Title: ` gives that card a heading.

### Adding a new slot of editable text

1. Put `data-text="some.key"` on the element in the HTML. Its current wording
   stays as the default.
2. Add a slot with the same key to one of the groups under `text:` in
   `admin/schema.js`.

For a link whose address should be editable too, add
`data-text-href="some.other.key"` to the `<a>`.

### Adding a field or a whole content type

Edit `admin/schema.js`. It defines each type, its data file and its fields,
and the admin builds its forms from it.

To add a type: copy a block, give it a new key, create the matching
`data/<key>.json` containing `[]`, and add that path to `ALLOWED` in
`api/save.js`. To show it on a page, add a `data-content="..."` hook and a
small render function in `js/content.js`.

## The application form

Registration is a Jotform: <https://form.jotform.com/262548966626170>. The
button in the top-right corner of every page opens it in a new tab; nothing
is embedded and nothing on this site handles submissions. Its label and its
address are both editable under **Site text → Every page**, so pointing it
somewhere else takes no code change.

The public contact address is `nextgenstem42@gmail.com`.

## Palette

Taken from the atom mark. Navy is both the logo ground and the body ink.

| Token | Hex | Role |
|---|---|---|
| `--ink` | `#1a3a56` | Navy: text, dark sections |
| `--teal` | `#2a9d9c` | Orbits: links, focus, accents |
| `--coral` | `#f8836b` | Nucleus: the mark; `--coral-ink` for small text |
| `--gold` | `#f5cd5c` | Electrons: sparingly |

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
