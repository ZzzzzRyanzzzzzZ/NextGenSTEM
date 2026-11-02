/* NextGen STEM admin.
   ---------------------------------------------------------------------------
   Builds every form from admin/schema.js, so adding a content type or a field
   means editing that file only.

   Signing in posts to /api/login, which checks the password on the server and
   sets a signed httpOnly cookie. Saving posts to /api/save, which commits to
   GitHub using a token held server-side. Neither the password nor the token
   is ever present in this file or in the browser.

   With no API available (plain static hosting, or signed out) the editor still
   works and exports the JSON for you to commit by hand.                     */

(function () {
  'use strict';

  var SCHEMA = window.SCHEMA;
  var LS_DRAFT = 'ngs.admin.draft';

  var state = {
    type: Object.keys(SCHEMA)[0],
    data: {},        // type -> array of records
    sha: {},         // type -> file sha from GitHub (for safe updates)
    selected: null,  // index into current type
    dirty: {},       // type -> true
    user: null,      // signed-in name, or null
    hasApi: false,   // is there a server behind this page at all
    canSave: false   // is the server configured to commit
  };

  var $ = function (s) { return document.querySelector(s); };

  /* ---------------------------------------------------------------- utils */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var toastTimer;
  function toast(msg, bad) {
    var el = $('#toast');
    el.textContent = msg;
    el.className = 'toast show' + (bad ? ' bad' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = 'toast'; }, bad ? 6000 : 3000);
  }

  function slug(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '').slice(0, 40) || ('item-' + Date.now().toString(36));
  }

  function anyDirty() { return Object.keys(state.dirty).some(function (k) { return state.dirty[k]; }); }

  function markDirty(type) {
    state.dirty[type] = true;
    saveDraft();
    refreshStatus();
  }

  function refreshStatus() {
    var d = anyDirty();
    $('#save-btn').disabled = !d;
    $('#dirty-note').textContent = d
      ? 'Unsaved changes in: ' + Object.keys(state.dirty).filter(function (k) { return state.dirty[k]; })
          .map(function (k) { return SCHEMA[k].label; }).join(', ') + '.'
      : 'No unsaved changes.';
    $('#save-btn').textContent = state.user ? 'Publish changes' : 'Download changed files';
  }

  /* -------------------------------------------------------------- drafts */
  function saveDraft() {
    try {
      localStorage.setItem(LS_DRAFT, JSON.stringify({ data: state.data, dirty: state.dirty }));
    } catch (e) { /* storage can be blocked; editing still works in-page */ }
  }
  function loadDraft() {
    try {
      var raw = localStorage.getItem(LS_DRAFT);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }
  function clearDraft() {
    try { localStorage.removeItem(LS_DRAFT); } catch (e) {}
  }

  /* ------------------------------------------------------------- session */
  function paintConn() {
    var el = $('#conn');
    if (state.user) {
      el.textContent = 'Signed in as ' + state.user;
      el.className = 'conn conn--on';
      $('#connect-btn').textContent = 'Account';
    } else {
      el.textContent = state.hasApi ? 'Signed out' : 'Local only';
      el.className = 'conn conn--off';
      $('#connect-btn').textContent = 'Sign in';
      $('#connect-btn').hidden = !state.hasApi;
    }
    refreshStatus();
  }

  function checkSession() {
    return fetch('/api/session', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j) { state.hasApi = false; return; }
        state.hasApi = true;
        state.user = j.user || null;
        state.canSave = !!j.canSave;
        if (state.hasApi && !j.configured) {
          toast('Server is up but no admin password is configured yet.', true);
        }
      })
      .catch(function () { state.hasApi = false; })
      .then(paintConn);
  }

  /* --------------------------------------------------------------- load */
  function dataUrl(file) { return '../' + file + '?t=' + Date.now(); }

  function loadAll() {
    var types = Object.keys(SCHEMA);
    return Promise.all(types.map(function (t) {
      return fetch(dataUrl(SCHEMA[t].file))
        .then(function (r) { return r.ok ? r.json() : []; })
        .catch(function () { return []; });
    })).then(function (sets) {
      types.forEach(function (t, i) { state.data[t] = Array.isArray(sets[i]) ? sets[i] : []; });

      var draft = loadDraft();
      if (draft && draft.dirty && Object.keys(draft.dirty).length) {
        var names = Object.keys(draft.dirty).filter(function (k) { return draft.dirty[k] && SCHEMA[k]; });
        if (names.length && confirm(
              'You have unsaved changes from a previous session in: ' +
              names.map(function (n) { return SCHEMA[n].label; }).join(', ') +
              '.\n\nRestore them?')) {
          names.forEach(function (n) {
            if (Array.isArray(draft.data[n])) state.data[n] = draft.data[n];
            state.dirty[n] = true;
          });
        } else {
          clearDraft();
        }
      }
    });
  }

  /* ------------------------------------------------------------- render */
  function renderTypes() {
    $('#type-list').innerHTML = Object.keys(SCHEMA).map(function (t) {
      var n = (state.data[t] || []).length;
      return '<li><button type="button" data-type="' + t + '"' +
             (t === state.type ? ' aria-current="true"' : '') + '>' +
             '<span>' + esc(SCHEMA[t].label) + (state.dirty[t] ? ' •' : '') + '</span>' +
             '<span class="count">' + n + '</span></button></li>';
    }).join('');
  }

  function sortedIndices(type) {
    var def = SCHEMA[type];
    var rows = state.data[type] || [];
    var idx = rows.map(function (_, i) { return i; });
    if (def.sortBy) {
      idx.sort(function (a, b) {
        return String(rows[a][def.sortBy] || '').localeCompare(String(rows[b][def.sortBy] || ''));
      });
    }
    return idx;
  }

  function renderList() {
    var def = SCHEMA[state.type];
    $('#list-title').textContent = def.label;
    var rows = state.data[state.type] || [];
    if (!rows.length) {
      $('#record-list').innerHTML = '<li class="empty-note">Nothing yet. Press <strong>+ New</strong>.</li>';
      return;
    }
    $('#record-list').innerHTML = sortedIndices(state.type).map(function (i) {
      var r = rows[i];
      var title = r[def.titleField] || '(untitled)';
      var sub = def.subtitleField ? (r[def.subtitleField] || '') : '';
      return '<li><button type="button" data-i="' + i + '"' +
             (state.selected === i ? ' aria-current="true"' : '') + '>' +
             '<span class="rtitle">' + esc(title) + '</span>' +
             (sub ? '<span class="rsub">' + esc(sub) + '</span>' : '') +
             '</button></li>';
    }).join('');
  }

  function optionsFor(field) {
    if (field.optionsFrom) {
      var other = SCHEMA[field.optionsFrom];
      return (state.data[field.optionsFrom] || []).map(function (r) {
        return { value: r.id || r[other.titleField], label: r[other.titleField] };
      });
    }
    return (field.options || []).map(function (o) {
      return typeof o === 'string' ? { value: o, label: o } : o;
    });
  }

  function renderEditor() {
    var host = $('#editor');
    if (state.selected === null) {
      host.innerHTML = '<p class="placeholder">Pick a record on the left, or press <strong>+ New</strong>.</p>';
      return;
    }
    var def = SCHEMA[state.type];
    var rec = state.data[state.type][state.selected];
    if (!rec) { state.selected = null; return renderEditor(); }

    var fields = def.fields.map(function (f) {
      var v = rec[f.name];
      var id = 'f-' + f.name;
      var star = f.required ? ' <span class="req-star">*</span>' : '';
      var help = f.help ? '<span class="afield__help">' + esc(f.help) + '</span>' : '';
      var ph = f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '';

      if (f.type === 'checkbox') {
        return '<label class="afield afield--check">' +
          '<input type="checkbox" id="' + id + '" data-f="' + f.name + '"' + (v ? ' checked' : '') + '>' +
          '<span class="afield__label" style="margin:0">' + esc(f.label) + '</span></label>' + help;
      }
      if (f.type === 'textarea') {
        return '<label class="afield"><span class="afield__label">' + esc(f.label) + star + '</span>' +
          '<textarea id="' + id + '" data-f="' + f.name + '"' + ph + '>' + esc(v) + '</textarea>' + help + '</label>';
      }
      if (f.type === 'select') {
        var opts = optionsFor(f).map(function (o) {
          return '<option value="' + esc(o.value) + '"' + (String(v) === String(o.value) ? ' selected' : '') + '>' +
                 esc(o.label) + '</option>';
        }).join('');
        return '<label class="afield"><span class="afield__label">' + esc(f.label) + star + '</span>' +
          '<select id="' + id + '" data-f="' + f.name + '">' +
          '<option value="">' + (f.required ? '— choose —' : '— none —') + '</option>' + opts +
          '</select>' + help + '</label>';
      }
      return '<label class="afield"><span class="afield__label">' + esc(f.label) + star + '</span>' +
        '<input type="' + esc(f.type || 'text') + '" id="' + id + '" data-f="' + f.name + '" value="' + esc(v) + '"' + ph + '>' +
        help + '</label>';
    }).join('');

    host.innerHTML =
      '<div class="aedit__head"><h2 class="h3">' + esc(rec[def.titleField] || 'New ' + def.label.toLowerCase()) + '</h2>' +
      '<span class="fine">id: ' + esc(rec.id || '—') + '</span></div>' +
      '<form id="rec-form" autocomplete="off">' + fields + '</form>' +
      '<div class="aedit__foot">' +
        '<button id="dup-btn" class="btn btn--ghost btn--sm" type="button">Duplicate</button>' +
        '<button id="del-btn" class="btn btn--ghost btn--sm btn--danger" type="button">Delete</button>' +
      '</div>';
  }

  function renderAll() { renderTypes(); renderList(); renderEditor(); refreshStatus(); }

  /* -------------------------------------------------------------- events */
  $('#type-list').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-type]');
    if (!b) return;
    state.type = b.dataset.type;
    state.selected = null;
    renderAll();
  });

  $('#record-list').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-i]');
    if (!b) return;
    state.selected = +b.dataset.i;
    renderList(); renderEditor();
  });

  $('#new-btn').addEventListener('click', function () {
    var def = SCHEMA[state.type];
    var rec = { id: '' };
    def.fields.forEach(function (f) { rec[f.name] = f.type === 'checkbox' ? true : ''; });
    state.data[state.type].push(rec);
    state.selected = state.data[state.type].length - 1;
    markDirty(state.type);
    renderAll();
  });

  // live-edit the selected record
  $('#editor').addEventListener('input', function (e) {
    var el = e.target.closest('[data-f]');
    if (!el || state.selected === null) return;
    var def = SCHEMA[state.type];
    var rec = state.data[state.type][state.selected];
    rec[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value;
    if (!rec.id && el.dataset.f === def.titleField) rec.id = slug(el.value);
    markDirty(state.type);
    // Update the header in place rather than re-rendering the form, which
    // would throw away the caret mid-word.
    var head = document.querySelector('.aedit__head .h3');
    var idEl = document.querySelector('.aedit__head .fine');
    if (head) head.textContent = rec[def.titleField] || 'New ' + def.label.toLowerCase();
    if (idEl) idEl.textContent = 'id: ' + (rec.id || '—');
    renderTypes(); renderList();
  });

  $('#editor').addEventListener('click', function (e) {
    if (e.target.id === 'del-btn') {
      var def = SCHEMA[state.type];
      var rec = state.data[state.type][state.selected];
      if (!confirm('Delete "' + (rec[def.titleField] || 'this record') + '"? This cannot be undone here.')) return;
      state.data[state.type].splice(state.selected, 1);
      state.selected = null;
      markDirty(state.type);
      renderAll();
    }
    if (e.target.id === 'dup-btn') {
      var copy = JSON.parse(JSON.stringify(state.data[state.type][state.selected]));
      copy.id = slug((copy[SCHEMA[state.type].titleField] || 'copy') + '-copy');
      state.data[state.type].push(copy);
      state.selected = state.data[state.type].length - 1;
      markDirty(state.type);
      renderAll();
    }
  });

  /* ---------------------------------------------------------- connection */
  var dlg = $('#connect-dlg');
  $('#connect-btn').addEventListener('click', function () {
    $('#lg-error').hidden = true;
    $('#lg-out').hidden = !state.user;
    $('#lg-pass').value = '';
    if (state.user) $('#lg-user').value = state.user;
    dlg.showModal();
    setTimeout(function () { ($('#lg-pass') || {}).focus && $('#lg-pass').focus(); }, 40);
  });

  $('#lg-cancel').addEventListener('click', function () { dlg.close(); });

  $('#login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('#lg-go');
    var err = $('#lg-error');
    err.hidden = true;
    btn.disabled = true; btn.textContent = 'Signing in…';

    fetch('/api/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: $('#lg-user').value, password: $('#lg-pass').value })
    }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, body: j }; });
    }).then(function (out) {
      if (!out.ok) throw new Error(out.body.error || 'Sign-in failed.');
      state.user = out.body.user;
      $('#lg-pass').value = '';
      dlg.close();
      paintConn();
      toast('Signed in as ' + state.user + '.');
    }).catch(function (e2) {
      err.textContent = e2.message;
      err.hidden = false;
    }).finally(function () {
      btn.disabled = false; btn.textContent = 'Sign in';
    });
  });

  $('#lg-out').addEventListener('click', function () {
    fetch('/api/logout', { method: 'POST', credentials: 'same-origin' })
      .then(function () {
        state.user = null;
        dlg.close();
        paintConn();
        toast('Signed out.');
      });
  });

  /* --------------------------------------------------------------- save */
  function changedTypes() {
    return Object.keys(state.dirty).filter(function (k) { return state.dirty[k]; });
  }

  function serialise(type) {
    return JSON.stringify(state.data[type], null, 2) + '\n';
  }

  function downloadAll() {
    changedTypes().forEach(function (t, i) {
      setTimeout(function () {
        var blob = new Blob([serialise(t)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = SCHEMA[t].file.split('/').pop();
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      }, i * 400);
    });
    toast('Downloaded. Replace the files in /data and commit.');
  }

  function publish() {
    var types = changedTypes();
    if (!types.length) return;
    var btn = $('#save-btn');
    btn.disabled = true; btn.textContent = 'Publishing…';

    fetch('/api/save', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: types.map(function (t2) {
          return { path: SCHEMA[t2].file, content: serialise(t2) };
        })
      })
    }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, status: r.status, body: j }; });
    }).then(function (out) {
      if (out.status === 401) {
        state.user = null; paintConn();
        throw new Error('Your session expired. Sign in again.');
      }
      if (!out.ok) throw new Error(out.body.error || 'Could not publish.');
      (out.body.written || []).forEach(function (path) {
        Object.keys(SCHEMA).forEach(function (k) { if (SCHEMA[k].file === path) state.dirty[k] = false; });
      });
      clearDraft();
      renderTypes();
      toast('Published. The site rebuilds in a minute or so.');
    }).catch(function (err) {
      toast(err.message, true);
    }).finally(function () {
      refreshStatus();
    });
  }

  $('#save-btn').addEventListener('click', function () {
    if (!changedTypes().length) return;
    if (state.user) publish();
    else downloadAll();
  });

  window.addEventListener('beforeunload', function (e) {
    if (anyDirty()) { e.preventDefault(); e.returnValue = ''; }
  });

  /* --------------------------------------------------------------- boot */
  checkSession();
  loadAll().then(renderAll).catch(function (err) {
    $('#editor').innerHTML = '<p class="placeholder">Could not load the data files: ' + esc(err.message) + '</p>';
  });
})();
