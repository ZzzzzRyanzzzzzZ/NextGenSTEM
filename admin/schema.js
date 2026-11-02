/* NextGen STEM content schema.
   ---------------------------------------------------------------------------
   This file is the only thing you edit to change what the admin can manage.
   The admin builds its forms from here, so adding a field or a whole new
   content type needs no changes to admin.js.

   TO ADD A FIELD:  add an entry to that type's `fields` array.
   TO ADD A TYPE:   copy a block below, give it a new key, and create the
                    matching empty file (e.g. data/workshops.json with []).

   Field types: text, textarea, date, time, number, select, checkbox, url
   `optionsFrom: 'kits'` fills a dropdown from another type's records.        */

window.SCHEMA = {

  competitions: {
    label: 'Competitions',
    file: 'data/competitions.json',
    titleField: 'topic',
    subtitleField: 'date',
    sortBy: 'date',
    fields: [
      { name: 'date',   label: 'Date',            type: 'date',   required: true },
      { name: 'topic',  label: 'Subtopic',        type: 'text',   required: true,
        help: 'The one idea the whole round is about, e.g. "Integrals", not "Calculus".' },
      { name: 'field',  label: 'Field',           type: 'text',   help: 'Biology, Physics, Mathematics…' },
      { name: 'grades', label: 'Grades',          type: 'text',   placeholder: '9–12' },
      { name: 'kit',    label: 'Kit handed out',  type: 'select', optionsFrom: 'kits',
        help: 'Which kit entrants get at the door. Leave blank for paper-only rounds.' },
      { name: 'status', label: 'Status',          type: 'select',
        options: [
          { value: 'open',   label: 'Open now' },
          { value: 'soon',   label: 'Opening soon' },
          { value: 'closed', label: 'Closed' }
        ], required: true },
      { name: 'note',   label: 'Status note',     type: 'text',
        help: 'Shown instead of the default label, e.g. "Opens 6 Nov" or "Closed · 812 entrants".' }
    ]
  },

  kits: {
    label: 'Kits',
    file: 'data/kits.json',
    titleField: 'name',
    subtitleField: 'field',
    sortBy: 'name',
    fields: [
      { name: 'name',    label: 'Kit name', type: 'text', required: true, placeholder: 'Linkage' },
      { name: 'field',   label: 'Field',    type: 'text', required: true, placeholder: 'Mechanisms' },
      { name: 'brief',   label: 'The brief', type: 'textarea',
        help: 'The one constraint handed out with the box.' },
      { name: 'measure', label: 'What gets measured', type: 'text' },
      { name: 'active',  label: 'Currently offered',  type: 'checkbox' }
    ]
  },

  events: {
    label: 'Events',
    file: 'data/events.json',
    titleField: 'title',
    subtitleField: 'date',
    sortBy: 'date',
    fields: [
      { name: 'date',    label: 'Date',     type: 'date', required: true },
      { name: 'title',   label: 'Title',    type: 'text', required: true, placeholder: 'Linkage build day' },
      { name: 'kind',    label: 'Kind',     type: 'text', placeholder: 'Build day · In person' },
      { name: 'summary', label: 'Summary',  type: 'textarea' },
      { name: 'where',   label: 'Where',    type: 'text', placeholder: 'Richmond, VA' },
      { name: 'when',    label: 'When',     type: 'text', placeholder: '10:00 to 16:00' },
      { name: 'who',     label: 'Who',      type: 'text', placeholder: 'Ages 11 to 18' },
      { name: 'signup',  label: 'Sign-up link', type: 'url' }
    ]
  }

};
