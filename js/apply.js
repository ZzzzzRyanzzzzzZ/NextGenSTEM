/* NextGen STEM fellowship application.
   There is no server behind this site, so the form assembles the answers into
   a plain-text email addressed to us and hands it to the applicant's mail
   client. The same text is shown on the page as a fallback, because a
   surprising number of browsers have no mail client wired up at all.        */

(function () {
  'use strict';

  var TO = 'diwanryan13@gmail.com';

  var form = document.getElementById('apply-form');
  if (!form) return;

  var note = form.querySelector('.form-note');
  var out = document.getElementById('apply-out');
  var outText = document.getElementById('apply-text');
  var copyBtn = document.getElementById('apply-copy');

  /* Field labels are richer than the input names, so read the visible label
     where there is one and fall back to the name attribute.                 */
  function labelFor(el) {
    if (el.type === 'radio' || el.type === 'checkbox') return el.name;
    var l = el.id && form.querySelector('label[for="' + el.id + '"]');
    if (!l) return el.name;
    var clone = l.cloneNode(true);
    var sub = clone.querySelector('.sub');
    if (sub) sub.remove();
    var req = clone.querySelector('.req');
    if (req) req.remove();
    return clone.textContent.replace(/\s+/g, ' ').trim();
  }

  function firstInvalid() {
    var els = form.querySelectorAll('[required]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.type === 'checkbox' && !el.checked) return el;
      if (el.type === 'radio') {
        if (!form.querySelector('input[name="' + el.name + '"]:checked')) return el;
        continue;
      }
      if (el.type !== 'checkbox' && !String(el.value).trim()) return el;
      if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim())) return el;
    }
    return null;
  }

  function collect() {
    var lines = [];
    var seenRadio = {};

    form.querySelectorAll('input, select, textarea').forEach(function (el) {
      if (!el.name) return;

      if (el.type === 'radio') {
        if (seenRadio[el.name]) return;
        seenRadio[el.name] = true;
        var picked = form.querySelector('input[name="' + el.name + '"]:checked');
        lines.push([el.name, picked ? picked.value.replace(/&amp;/g, '&') : '(none chosen)']);
        return;
      }

      if (el.type === 'checkbox') {
        lines.push([el.name, el.checked ? el.value : 'No']);
        return;
      }

      var v = String(el.value).trim();
      if (!v) return;
      lines.push([labelFor(el), v]);
    });

    return lines;
  }

  function compose(lines) {
    var body = ['NextGen STEM fellowship application', ''];
    lines.forEach(function (pair) {
      var multiline = pair[1].indexOf('\n') !== -1 || pair[1].length > 70;
      body.push(pair[0] + (multiline ? '\n' : ': ') + pair[1]);
      body.push('');
    });
    body.push('Sent from nextgenstem.org/apply');
    return body.join('\n');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var bad = firstInvalid();
    if (bad) {
      note.textContent = 'Almost there. "' + labelFor(bad) + '" still needs an answer.';
      var focusable = bad.type === 'radio'
        ? form.querySelector('input[name="' + bad.name + '"]')
        : bad;
      focusable.focus();
      focusable.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    var lines = collect();
    var name = (form.querySelector('#f-name') || {}).value || 'Applicant';
    var field = form.querySelector('input[name="Field"]:checked');
    var fieldName = field ? field.value.replace(/&amp;/g, '&').split(' · ')[0] : 'Unassigned';

    var subject = 'Fellowship application: ' + name.trim() + ' (' + fieldName + ')';
    var text = compose(lines);

    /* Always show the copyable version first, so the applicant can see their
       answers survived even if the mail client never opens.                 */
    outText.value = 'To: ' + TO + '\nSubject: ' + subject + '\n\n' + text;
    out.hidden = false;

    var href = 'mailto:' + TO +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(text);

    /* Modern browsers hand very long mailto links to the OS handler without
       complaint; the ceiling below is where older ones start truncating. The
       copyable version is on screen either way.                            */
    if (href.length < 6000) {
      window.location.href = href;
      note.textContent = 'Opening your email app. Press send there to submit. ' +
        'Nothing has been sent until you do. If nothing opened, use the copy ' +
        'below instead.';
    } else {
      note.textContent = 'Your answers are long enough that some email apps would ' +
        'truncate them, so copy the text below and send it to ' + TO + ' instead.';
    }

    out.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      outText.select();
      var done = function () { copyBtn.textContent = 'Copied'; setTimeout(function () {
        copyBtn.textContent = 'Copy to clipboard';
      }, 2200); };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(outText.value).then(done, function () {
          document.execCommand('copy'); done();
        });
      } else {
        document.execCommand('copy');
        done();
      }
    });
  }
})();
