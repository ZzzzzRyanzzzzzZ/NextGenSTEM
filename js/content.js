/* NextGen STEM content renderer.
   Draws the competition calendar, the kit list and the events list from the
   JSON in /data, so adding something through the admin updates every page
   that shows it. Each target element keeps its server-rendered markup until
   this succeeds, so a failed fetch never leaves an empty page.             */

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

  function load(name) {
    return fetch(BASE + 'data/' + name + '.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error(name + ': HTTP ' + r.status);
        return r.json();
      });
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

  /* --- competition calendar ------------------------------------------- */
  function renderCalendar(rows, kits) {
    var body = document.querySelector('[data-content="calendar"]');
    if (!body) return;

    var kitName = {};
    kits.forEach(function (k) { kitName[k.id] = k.name; });

    var sorted = rows.slice().sort(function (a, b) {
      return String(a.date).localeCompare(String(b.date));
    });

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
        '<td>' + kit + '</td>' +
        '<td><span class="pill ' + s.cls + '">' + esc(r.note || s.label) + '</span></td>' +
        '</tr>';
    }).join('');
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
    calendar: !!document.querySelector('[data-content="calendar"]'),
    kits:     !!document.querySelector('[data-content="kits"]'),
    events:   !!document.querySelector('[data-content="events"]')
  };
  if (!needs.calendar && !needs.kits && !needs.events) return;

  var jobs = [load('kits')];
  jobs.push(needs.calendar ? load('competitions') : Promise.resolve([]));
  jobs.push(needs.events ? load('events') : Promise.resolve([]));

  Promise.all(jobs).then(function (res) {
    var kits = res[0], comps = res[1], events = res[2];
    if (needs.calendar) renderCalendar(comps, kits);
    if (needs.kits) renderKits(kits);
    if (needs.events) renderEvents(events);
  }).catch(function (err) {
    // Leave whatever is already in the markup; just say so in the console.
    console.error('[content] could not load data, keeping fallback markup:', err);
  });
})();
