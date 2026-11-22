(function () {
  // Google Sheet that collects registrations (Apps Script web app).
  var SHEET_URL = 'https://script.google.com/macros/s/AKfycbxRd77bMYv9S45zZO908QmxS7LA8aiZMs3O1ffKmXZwnagUUJxu9gMObuXVRydeQTu5/exec';

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

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var bad = form.querySelector(':invalid');
    if (bad) {
      say('A few things are missing. Check the highlighted field.', true);
      bad.focus();
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
      parent_email: 'Parent email', parent_phone: 'Emergency phone',
      heard: 'Heard about us from', notes: 'Notes',
      conduct: 'Agreed to Code of Conduct', photos: 'Photo consent'
    };
    var out = {};
    Object.keys(labels).forEach(function (k) { out[labels[k]] = data[k] || (k === 'photos' ? 'no' : ''); });

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
