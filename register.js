(function () {
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
      diet: 'Food allergies/diet', heard: 'Heard about us from', notes: 'Notes',
      conduct: 'Agreed to Code of Conduct', photos: 'Photo consent'
    };
    var out = {};
    Object.keys(labels).forEach(function (k) { out[labels[k]] = data[k] || (k === 'photos' ? 'no' : ''); });

    out.email = data.email;
    out._subject = 'Hackathon registration: ' + data.first + ' ' + data.last;
    out._template = 'table';
    out._replyto = data.email;
    out._autoresponse = 'Thanks for registering for the NextGen STEM Hackathon on Saturday, November 28, 2026. '
      + 'You\'re on the list. We\'ll email you the venue, time and anything else you need before the day. '
      + 'Questions? Just reply to this email.';

    // Each registration is emailed to the address below by FormSubmit.
    fetch('https://formsubmit.co/ajax/nextgenstem42@gmail.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(out)
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || String(j.success) !== 'true') {
            throw new Error('We couldn\'t send that just now. Try again in a minute.');
          }
        });
      })
      .then(showDone)
      .catch(function (err) {
        send.disabled = false;
        say(err.message + ' If it keeps happening, email nextgenstem42@gmail.com.', true);
      });
  });
})();
