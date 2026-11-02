/* NextGen STEM content renderer.
   ---------------------------------------------------------------------------
   Draws everything the admin can edit out of the JSON in /data:

     text.json      named slots of wording, keyed to data-text="…" in the HTML
     sections.json  blocks of writing added to the end of a page
     pages.json     whole pages of their own, served at /p/<address>
     competitions.json, events.json, kits.json

   Each target keeps its hand-written markup until the fetch succeeds, so a
   failed request leaves the page exactly as it shipped.                     */

(function () {
  'use strict';

  /* Derived from this script's own URL, so the site works at the domain root
     (Vercel), under a sub-path, or from a local server, with nothing to set. */
  var BASE = (function () {
    var s = document.currentScript;
    if (!s) {
      s = Array.prototype.slice.call(document.scripts).filter(function (x) {
        return /js\/content\.js/.test(x.src || '');
      })[0];
    }
    if (s && s.src) {
      return new URL(s.src, location.href).pathname.replace(/js\/content\.js.*$/, '');
    }
    return '/';
  })();

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* Admin-entered wording is escaped, then a short list of harmless tags is
     allowed back in. Keeps <br> and <em> working in a headline without
     letting anything executable through. */
  var TAGS = 'br|em|strong|b|i|small|sup|sub';
  function rich(s) {
    var out = esc(s).replace(/\r\n?/g, '\n').replace(/\n/g, '<br>');
    out = out.replace(new RegExp('&lt;(/?)(' + TAGS + ')\\s*/?&gt;', 'gi'), '<$1$2>');
    out = out.replace(/&lt;span class=&quot;([a-z0-9 _-]{1,40})&quot;&gt;/gi, '<span class="$1">');
    return out.replace(/&lt;\/span&gt;/gi, '</span>');
  }

  /* One block of writing into paragraphs, split on blank lines. */
  function paras(s) {
    return String(s == null ? '' : s).replace(/\r\n?/g, '\n').split(/\n{2,}/)
      .map(function (p) { return p.trim(); })
      .filter(function (p) { return p.length; });
  }

  /* "Title: the rest of it" becomes a heading and a paragraph. */
  function titled(p) {
    var m = /^([^:\n]{1,60}):\s+([\s\S]+)$/.exec(p);
    return m ? { head: m[1], body: m[2] } : { head: '', body: p };
  }

  function load(name) {
    return fetch(BASE + 'data/' + name + '.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error(name + ': HTTP ' + r.status);
        return r.json();
      })
      .then(function (j) { return Array.isArray(j) ? j : []; })
      .catch(function () { return []; });
  }

  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  /* Parse as a local date; 'new Date("2026-10-03")' is UTC and can slip a day. */
  function parseDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function fmtDate(iso) {
    var d = parseDate(iso);
    return d ? d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() : esc(iso);
  }

  var STATUS = {
    open:   { cls: 'pill--open',   label: 'Open now' },
    soon:   { cls: 'pill--soon',   label: 'Opening soon' },
    closed: { cls: 'pill--closed', label: 'Closed' }
  };

  function visible(r) { return r && r.show !== false; }
  function byOrder(key) {
    return function (a, b) { return (Number(a[key]) || 0) - (Number(b[key]) || 0); };
  }

  /* --- editable wording ------------------------------------------------- */
  function applyText(rows) {
    var map = {};
    rows.forEach(function (r) {
      if (r && r.key && String(r.value || '').trim().length) map[r.key] = r.value;
    });
    if (!Object.keys(map).length) return;

    Array.prototype.forEach.call(document.querySelectorAll('[data-text]'), function (el) {
      var v = map[el.getAttribute('data-text')];
      if (v != null) el.innerHTML = rich(v);
    });
    // Links whose address is editable too.
    Array.prototype.forEach.call(document.querySelectorAll('[data-text-href]'), function (el) {
      var v = map[el.getAttribute('data-text-href')];
      if (v != null && String(v).trim().length) el.setAttribute('href', String(v).trim());
    });
  }

  /* --- menu entries for admin-added pages ------------------------------- */
  function renderNavExtra(pages) {
    var host = document.querySelector('[data-content="nav-extra"]');
    if (!host) return;
    var rows = pages.filter(function (p) { return visible(p) && p.nav && p.slug && p.title; })
                    .sort(byOrder('navOrder'));
    host.innerHTML = rows.map(function (p) {
      return '<a href="' + BASE + 'p/' + encodeURIComponent(p.slug) + '">' + esc(p.title) + '</a>';
    }).join('');
  }

  /* --- admin-added sections --------------------------------------------- */
  function sectionHtml(s) {
    var eyebrow = s.eyebrow ? '<span class="eyebrow">' + esc(s.eyebrow) + '</span>' : '';
    var head = s.heading ? '<h2 class="h2">' + rich(s.heading) + '</h2>' : '';
    var body = paras(s.body);
    var link = (s.linkUrl && s.linkLabel)
      ? '<a class="link" href="' + esc(s.linkUrl) + '">' + esc(s.linkLabel) +
        ' <span class="arw" aria-hidden="true">&rarr;</span></a>'
      : '';

    if (s.style === 'quote') {
      return '<section class="section section--ink"><div class="wrap"><div class="grid">' +
        '<div class="split__left">' + eyebrow +
          (s.heading ? '<p class="pull">' + rich(s.heading) + '</p>' : '') + '</div>' +
        '<div class="split__right"><div class="prose">' +
          body.map(function (p) { return '<p>' + rich(p) + '</p>'; }).join('') +
        '</div>' + link + '</div></div></div></section>';
    }

    if (s.style === 'cards') {
      var cards = body.map(function (p) {
        var t = titled(p);
        return '<div class="card">' +
          (t.head ? '<h3 class="h3">' + esc(t.head) + '</h3>' : '') +
          '<p>' + rich(t.body) + '</p></div>';
      }).join('');
      var cols = body.length === 2 ? 'cards--2' : 'cards--3';
      return '<section class="wrap section--tight rule-top">' +
        '<div class="grid section-intro"><div class="split__left">' + eyebrow + head + '</div>' +
        '<div class="split__right"></div></div>' +
        '<div class="cards ' + cols + ' rv">' + cards + '</div>' +
        (link ? '<div class="hero__actions mt-3">' + link + '</div>' : '') +
        '</section>';
    }

    if (s.style === 'steps') {
      var steps = body.map(function (p) {
        var t = titled(p);
        return '<li>' + (t.head ? '<h3>' + esc(t.head) + '</h3>' : '') +
               '<p>' + rich(t.body) + '</p></li>';
      }).join('');
      return '<section class="wrap section--tight rule-top"><div class="grid">' +
        '<div class="split__left">' + eyebrow + head + '</div>' +
        '<div class="split__right"><ol class="steps">' + steps + '</ol>' + link +
        '</div></div></section>';
    }

    // plain, tinted and navy share one shape and differ only in the band.
    var shell = { tinted: 'section section--deep', navy: 'section section--ink' }[s.style];
    var inner = '<div class="grid">' +
      '<div class="split__left">' + eyebrow + head + '</div>' +
      '<div class="split__right"><div class="prose">' +
        body.map(function (p) { return '<p>' + rich(p) + '</p>'; }).join('') +
      '</div>' + (link ? '<div class="hero__actions mt-2">' + link + '</div>' : '') +
      '</div></div>';

    return shell
      ? '<section class="' + shell + '"><div class="wrap">' + inner + '</div></section>'
      : '<section class="wrap section--tight rule-top">' + inner + '</section>';
  }

  function renderSections(sections) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-content="sections"]'),
      function (host) {
        var key = host.getAttribute('data-page');
        var rows = sections.filter(function (s) { return visible(s) && s.page === key; })
                           .sort(byOrder('order'));
        host.innerHTML = rows.map(sectionHtml).join('');
      });
  }

  /* --- a whole page of the admin's own ---------------------------------- */
  function renderCustomPage(pages, sections) {
    var host = document.querySelector('[data-content="page"]');
    if (!host) return;

    var want = (host.getAttribute('data-slug') || '').toLowerCase();
    if (!want) {
      var m = /\/p\/([^/?#]+)/.exec(location.pathname);
      want = decodeURIComponent(m ? m[1] : (new URLSearchParams(location.search).get('p') || ''))
             .toLowerCase();
    }

    var page = pages.filter(function (p) {
      return visible(p) && String(p.slug || '').toLowerCase() === want;
    })[0];

    if (!page) {
      host.innerHTML =
        '<section class="pagehead wrap"><div class="grid"><div class="pagehead__title">' +
        '<div class="crumb"><a href="' + BASE + '">Home</a> <span>/</span> <span>Not found</span></div>' +
        '<h1 class="h1">No page here.</h1>' +
        '<p class="lede">This address does not match a published page.</p>' +
        '<div class="hero__actions mt-2"><a class="btn btn--solid" href="' + BASE + '">' +
        'Back to the start <span class="arw" aria-hidden="true">&rarr;</span></a></div>' +
        '</div></div></section>';
      return;
    }

    document.title = page.title + ' · NextGen STEM';

    var body = paras(page.body).map(function (p) {
      // A paragraph on its own ending in a colon reads as a sub-heading.
      return /:$/.test(p) && p.length < 70
        ? '<h2 class="h3 mb-1">' + esc(p.replace(/:$/, '')) + '</h2>'
        : '<p>' + rich(p) + '</p>';
    }).join('');

    host.innerHTML =
      '<section class="pagehead wrap"><div class="grid"><div class="pagehead__title">' +
        '<div class="crumb"><a href="' + BASE + '">Home</a> <span>/</span> <span>' +
          esc(page.title) + '</span></div>' +
        (page.eyebrow ? '<span class="eyebrow">' + esc(page.eyebrow) + '</span>' : '') +
        '<h1 class="h1">' + rich(page.title) + '</h1>' +
        (page.lede ? '<p class="lede">' + rich(page.lede) + '</p>' : '') +
      '</div></div></section>' +
      (body
        ? '<section class="wrap section--tight rule-top"><div class="prose prose--wide">' +
          body + '</div></section>'
        : '');

    var slot = document.createElement('div');
    slot.setAttribute('data-content', 'sections');
    slot.setAttribute('data-page', 'page:' + page.slug);
    host.appendChild(slot);
    renderSections(sections);
  }

  /* --- competition calendar ------------------------------------------- */
  function renderCalendar(rows, kits) {
    var body = document.querySelector('[data-content="calendar"]');
    if (!body) return;

    var kitName = {};
    kits.forEach(function (k) { kitName[k.id] = k.name; });

    var sorted = rows.slice().sort(function (a, b) {
      return String(a.date).localeCompare(String(b.date));
    });

    // No competition hands out a kit yet, so the column would be a row of
    // "paper only" and nothing else. Hide it until one does.
    var anyKit = sorted.some(function (r) { return r.kit && kitName[r.kit]; });
    var head = body.parentNode.querySelector('thead tr');
    if (head) {
      Array.prototype.forEach.call(head.cells, function (th) {
        if (th.textContent.trim().toLowerCase() === 'kit') th.hidden = !anyKit;
      });
    }

    body.innerHTML = sorted.map(function (r) {
      var s = STATUS[r.status] || STATUS.soon;
      var kit = r.kit && kitName[r.kit]
        ? '<span class="kit-chip">' + esc(kitName[r.kit]) + ' kit</span>'
        : '<span class="mute">Paper only</span>';
      return '<tr>' +
        '<td>' + fmtDate(r.date) + '</td>' +
        '<td><span class="topic">' + esc(r.topic) + '</span></td>' +
        '<td>' + esc(r.field) + '</td>' +
        '<td>' + esc(r.grades) + '</td>' +
        (anyKit ? '<td>' + kit + '</td>' : '') +
        '<td><span class="pill ' + s.cls + '">' + esc(r.note || s.label) + '</span></td>' +
        '</tr>';
    }).join('');
  }

  /* --- next competition date (used on more than one page) ------------- */
  function renderNext(rows) {
    var el = document.querySelector('[data-content="next-comp"]');
    if (!el) return;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var next = rows.slice()
      .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); })
      .filter(function (r) {
        var d = parseDate(r.date);
        return d && d >= today && r.status !== 'closed';
      })[0];
    el.textContent = next ? fmtDate(next.date) : 'nothing scheduled';
  }

  /* --- kit list --------------------------------------------------------- */
  function renderKits(kits) {
    var host = document.querySelector('[data-content="kits"]');
    if (!host) return;
    var live = kits.filter(function (k) { return k.active !== false; });
    host.innerHTML = live.map(function (k) {
      return '<article class="card rv in">' +
        '<div class="card__top"><div>' +
          '<span class="num">' + esc(k.field) + '</span>' +
          '<div class="card__name card__name--sm">' + esc(k.name) + '</div>' +
        '</div></div>' +
        (k.brief ? '<p>' + esc(k.brief) + '</p>' : '') +
        (k.measure
          ? '<dl class="spec"><div><dt>Measured on</dt><dd>' + esc(k.measure) + '</dd></div></dl>'
          : '') +
        '</article>';
    }).join('');
  }

  /* --- events ----------------------------------------------------------- */
  function renderEvents(events) {
    var list = document.querySelector('[data-content="events"]');
    if (!list) return;
    var empty = document.querySelector('[data-content="events-empty"]');

    var today = new Date(); today.setHours(0, 0, 0, 0);
    var upcoming = events
      .filter(function (e) { var d = parseDate(e.date); return d && d >= today; })
      .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });

    // The page header reads differently depending on whether anything is on.
    // Both versions live in the markup so they stay editable and visible.
    var n = upcoming.length;
    var count = document.querySelector('[data-content="events-count"]');
    if (count) count.textContent = n + ' scheduled';
    ['events-head', 'events-lede'].forEach(function (hook) {
      var el = document.querySelector('[data-content="' + hook + '"]');
      if (!el) return;
      var alt = n ? el.getAttribute('data-when-any') : el.getAttribute('data-when-empty');
      if (alt) el.innerHTML = alt;
    });

    if (!n) {
      list.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    list.innerHTML = upcoming.map(function (e) {
      var d = parseDate(e.date);
      var spec = [['Where', e.where], ['When', e.when], ['Who', e.who]]
        .filter(function (p) { return p[1]; })
        .map(function (p) { return '<div><dt>' + p[0] + '</dt><dd>' + esc(p[1]) + '</dd></div>'; })
        .join('');
      return '<li class="event rv in">' +
        '<time class="event__date" datetime="' + esc(e.date) + '">' +
          '<span class="event__month">' + MONTHS[d.getMonth()] + '</span>' +
          '<span class="event__day">' + d.getDate() + '</span>' +
        '</time>' +
        '<div class="event__body">' +
          (e.kind ? '<span class="eyebrow">' + esc(e.kind) + '</span>' : '') +
          '<h3 class="h3">' + esc(e.title) + '</h3>' +
          (e.summary ? '<p>' + esc(e.summary) + '</p>' : '') +
          (spec ? '<dl class="spec">' + spec + '</dl>' : '') +
          (e.signup
            ? '<a class="link" href="' + esc(e.signup) + '" target="_blank" rel="noopener">Sign up <span class="arw" aria-hidden="true">&rarr;</span></a>'
            : '') +
        '</div></li>';
    }).join('');
  }

  /* --- go --------------------------------------------------------------- */
  var needs = {
    text:     !!document.querySelector('[data-text], [data-text-href]'),
    nav:      !!document.querySelector('[data-content="nav-extra"]'),
    sections: !!document.querySelector('[data-content="sections"]'),
    page:     !!document.querySelector('[data-content="page"]'),
    calendar: !!document.querySelector('[data-content="calendar"]'),
    kits:     !!document.querySelector('[data-content="kits"]'),
    events:   !!document.querySelector('[data-content="events"]'),
    nextComp: !!document.querySelector('[data-content="next-comp"]')
  };
  if (!Object.keys(needs).some(function (k) { return needs[k]; })) return;

  var wantPages = needs.nav || needs.page;
  var wantSections = needs.sections || needs.page;
  var none = Promise.resolve([]);

  Promise.all([
    needs.text ? load('text') : none,
    wantPages ? load('pages') : none,
    wantSections ? load('sections') : none,
    (needs.calendar || needs.nextComp) ? load('competitions') : none,
    needs.events ? load('events') : none,
    needs.calendar ? load('kits') : none
  ]).then(function (r) {
    var text = r[0], pages = r[1], sections = r[2],
        comps = r[3], events = r[4], kits = r[5];

    if (needs.nav) renderNavExtra(pages);
    if (needs.page) renderCustomPage(pages, sections);
    else if (needs.sections) renderSections(sections);
    if (needs.calendar) renderCalendar(comps, kits);
    if (needs.nextComp) renderNext(comps);
    if (needs.kits) renderKits(kits);
    if (needs.events) renderEvents(events);

    // Last, so it can also reach wording inside anything drawn above.
    if (needs.text) applyText(text);

    // Anything added after the scroll observer started needs enrolling.
    if (window.NGS && typeof window.NGS.watchReveals === 'function') {
      window.NGS.watchReveals();
    }
  }).catch(function (err) {
    // Leave whatever is already in the markup; just say so in the console.
    console.error('[content] could not load data, keeping fallback markup:', err);
  });
})();
