(function () {
  // Google Sheet that collects registrations (Apps Script web app).
  var SHEET_URL = 'https://script.google.com/macros/s/AKfycbxpq4Qj4rxuhgIDDiqwSRM8IziEcoHnUSuwg5o4kC3FlLSd0Haz-BjRHO92nGT0LGs9/exec';

  var form = document.getElementById('reg');
  var status = document.getElementById('status');
  var send = document.getElementById('send');

  function say(msg, bad) {
    status.textContent = msg;
    status.className = bad ? 'err' : '';
  }

  function showDone() {
    form.hidden = true;
    document.getElementById('done').hidden = false;
    window.scrollTo(0, 0);
  }

  // The visible question for a field, e.g. "Grade" or "Team".
  function fieldName(el) {
    var group = el.closest('.radios');
    var label = group ? document.getElementById(group.getAttribute('aria-labelledby'))
      : el.type === 'checkbox' ? null
      : form.querySelector('label[for="' + el.id + '"]');
    if (el.type === 'checkbox') return 'the Code of Conduct box';
    if (!label) return el.name;
    var t = label.cloneNode(true);
    t.querySelectorAll('small').forEach(function (s) { s.remove(); });
    return t.textContent.trim();
  }

  // Clear a field's red mark as soon as it's fixed.
  form.addEventListener('input', function (e) {
    var g = e.target.closest('.radios');
    if (g) g.classList.remove('missing');
  });
  form.addEventListener('change', function (e) {
    var g = e.target.closest('.radios');
    if (g) g.classList.remove('missing');
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Trim spaces first so "  " doesn't count as filled in.
    form.querySelectorAll('input[type=text], input[type=email], input[type=tel], textarea').forEach(function (el) {
      el.value = el.value.trim();
    });

    form.classList.add('tried');
    var bad = Array.prototype.filter.call(form.elements, function (el) {
      return el.willValidate && !el.checkValidity();
    });
    // Mark radio groups as a whole, since only one radio carries "required".
    form.querySelectorAll('.radios').forEach(function (g) {
      g.classList.toggle('missing', !!g.querySelector('input:invalid'));
    });

    if (bad.length) {
      var names = [];
      bad.forEach(function (el) {
        var name = fieldName(el);
        if (names.indexOf(name) < 0) names.push(name);
      });
      var emailWrong = bad.some(function (el) { return el.type === 'email' && el.value; });
      say((emailWrong ? 'Check the email address. ' : '') + 'Still needed: ' + names.join(', ') + '.', true);
      bad[0].focus();
      return;
    }

    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = String(v).trim(); });

    send.disabled = true;
    say('Sending…');

    // A bot filled in the hidden field. Pretend it worked.
    if (data._honey) { showDone(); return; }
    delete data._honey;

    // Readable names for the email we receive.
    var labels = {
      first: 'First name', last: 'Last name', phone: 'Phone',
      school: 'School', grade: 'Grade', experience: 'Coding experience',
      team: 'Team', teammates: 'Teammates', parent_name: 'Parent/guardian',
      parent_email: 'Parent email',
      heard: 'Heard about us from', notes: 'Notes',
      conduct: 'Agreed to Code of Conduct'
    };
    var out = {};
    Object.keys(labels).forEach(function (k) { out[labels[k]] = data[k] || ''; });

    out.email = data.email;
    out._subject = 'Hackathon registration: ' + data.first + ' ' + data.last;
    out._template = 'table';
    out._replyto = data.email;
    out._autoresponse = 'Thanks for registering for the NextGen STEM Hackathon on Saturday, November 28, 2026. '
      + 'You\'re on the list. It\'s online, so you can join from anywhere. We\'ll email you the link to join, the start time and anything else you need before the day. '
      + 'Questions? Just reply to this email.';

    // 1. Add a row to the Google Sheet. Google doesn't let the page read its
    //    reply, so a request that goes through counts as saved.
    var row = {};
    Object.keys(labels).forEach(function (k) { row[labels[k]] = out[labels[k]]; });
    row['Email'] = data.email;

    fetch(SHEET_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(row)
    })
      .catch(function () {
        throw new Error('We couldn\'t send that just now. Check your connection and try again.');
      })
      .then(function () {
        // 2. Also email a copy to the inbox and a confirmation to the student.
        //    If this part fails, the sheet already has them, so don't block.
        return fetch('https://formsubmit.co/ajax/nextgenstem42@gmail.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(out)
        }).catch(function () {});
      })
      .then(showDone)
      .catch(function (err) {
        send.disabled = false;
        say(err.message + ' If it keeps happening, email nextgenstem42@gmail.com.', true);
      });
  });
})();
