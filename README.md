# NextGen STEM

Static site for NextGen STEM: open-ended kits with no instructions, renewable
energy hardware you can measure, single-topic competitions, and a free-kit
fellowship selected by application.

Live at <https://zzzzzryanzzzzzz.github.io/NextGenSTEM/>. Every push to `main`
deploys via `.github/workflows/deploy.yml`.

## Run it locally

```bash
python -m http.server 5178
```

Then open <http://localhost:5178>. No build step; it is plain HTML, CSS and JS.

## Layout

| Path | What it is |
|---|---|
| `index.html` | Home |
| `kits.html`, `energy.html`, `competitions.html`, `library.html` | The four product areas |
| `apply.html` | The fellowship: six fields, the brief for each, and the button to the Jotform |
| `events.html` | Upcoming events. Empty for now; an event template is commented in the source |
| `404.html` | Served by GitHub Pages for missing paths (links are absolute for that reason) |
| `css/style.css` | One stylesheet. Brand palette lives in the `:root` block at the top |
| `js/main.js` | Mobile nav, scroll reveal, the Library waiting-list form |
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
