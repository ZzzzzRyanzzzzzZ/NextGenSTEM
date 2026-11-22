(function () {
  var form = document.getElementById('reg');
  var status = document.getElementById('status');
  var send = document.getElementById('send');

  function say(msg, bad) {
    status.textContent = msg;
    status.className = bad ? 'err' : '';
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

    fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) throw new Error(j.error || 'Something went wrong.');
        });
      })
      .then(function () {
        form.hidden = true;
        document.getElementById('done').hidden = false;
        window.scrollTo(0, 0);
      })
      .catch(function (err) {
        send.disabled = false;
        say(err.message + ' If it keeps happening, email nextgenstem42@gmail.com.', true);
      });
  });
})();
