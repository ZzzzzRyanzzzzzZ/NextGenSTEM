/* NextGen STEM content schema.
   ---------------------------------------------------------------------------
   This file is the only thing you edit to change what the admin can manage.
   The admin builds its forms from here, so adding a field, a slot of editable
   text, or a whole new content type needs no changes to admin.js.

   TO ADD A FIELD:   add an entry to that type's `fields` array.
   TO ADD A TYPE:    copy a block below, give it a new key, create the matching
                     file (e.g. data/workshops.json containing []) and add that
                     path to ALLOWED in api/save.js.
   TO ADD A TEXT SLOT: put a data-text="some.key" attribute on the element in
                     the HTML, then add a slot with the same key to SITE_TEXT
                     below. The wording in the HTML stays as the default.

   Field types: text, textarea, date, time, number, select, checkbox, url   */

var APPLY_FORM = 'https://form.jotform.com/262548966626170';

window.SCHEMA = {

  /* --------------------------------------------------------- site text ---
     A flat list of named slots rather than records. Anything left blank
     falls back to the wording already in the HTML.                        */
  text: {
    kind: 'kv',
    label: 'Site text',
    file: 'data/text.json',
    blurb: 'Retype any of the headings and paragraphs below. Leave a box '
         + 'empty to keep what the page says now. Line breaks are kept, and '
         + 'the tags &lt;em&gt;, &lt;strong&gt; and &lt;br&gt; work if you '
         + 'want them.',
    groups: [
      {
        label: 'Every page',
        slots: [
          { key: 'site.cta.label', label: 'Menu button label',
            placeholder: 'Register' },
          { key: 'site.cta.url', label: 'Menu button link', type: 'url',
            placeholder: APPLY_FORM,
            help: 'Where the button in the top-right corner goes.' },
          { key: 'site.footnote', label: 'Footer blurb', type: 'textarea' }
        ]
      },
      {
        label: 'Home page',
        slots: [
          { key: 'home.eyebrow', label: 'Small line above the headline' },
          { key: 'home.hero.title', label: 'Headline', type: 'textarea',
            help: 'Press return where you want the line to break.' },
          { key: 'home.hero.lede', label: 'Opening paragraph', type: 'textarea' },
          { key: 'home.how.title', label: '"How it works" heading', type: 'textarea' },
          { key: 'home.how.lede', label: '"How it works" paragraph', type: 'textarea' },
          { key: 'home.pull', label: 'The big quote', type: 'textarea' }
        ]
      },
      {
        label: 'Competitions page',
        slots: [
          { key: 'comp.title', label: 'Headline', type: 'textarea' },
          { key: 'comp.lede', label: 'Opening paragraph', type: 'textarea' }
        ]
      }
    ]
  },

  /* ----------------------------------------------------------- sections ---
     Blocks of your own, added to the bottom of a page in order.           */
  sections: {
    label: 'Sections',
    file: 'data/sections.json',
    titleField: 'heading',
    subtitleField: 'page',
    sortBy: 'order',
    orderField: 'order',
    blurb: 'A section is a block of writing added to the end of a page. '
         + 'Use Move up and Move down to put them in order.',
    fields: [
      { name: 'page', label: 'Which page', type: 'select', required: true,
        options: [
          { value: 'home',         label: 'Home' },
          { value: 'competitions', label: 'Competitions' },
          { value: 'events',       label: 'Events' }
        ],
        optionsFrom: { type: 'pages', value: 'slug', label: 'title', prefix: 'page:' } },
      { name: 'style', label: 'Look', type: 'select', required: true,
        options: [
          { value: 'plain',  label: 'Plain, on white' },
          { value: 'tinted', label: 'Tinted band' },
          { value: 'navy',   label: 'Navy band' },
          { value: 'quote',  label: 'Big quote' },
          { value: 'cards',  label: 'Row of cards' },
          { value: 'steps',  label: 'Numbered list' }
        ],
        help: 'Cards and the numbered list split the writing below into one '
            + 'card or step per paragraph.' },
      { name: 'eyebrow', label: 'Small line above the heading', type: 'text' },
      { name: 'heading', label: 'Heading', type: 'text', required: true },
      { name: 'body', label: 'Writing', type: 'textarea',
        help: 'Leave a blank line between paragraphs. For cards and steps, '
            + 'start a paragraph with "Title: " to give it a heading.' },
      { name: 'linkLabel', label: 'Button or link text', type: 'text' },
      { name: 'linkUrl', label: 'Button or link address', type: 'url' },
      { name: 'order', label: 'Position on the page', type: 'number' },
      { name: 'show', label: 'Show this section', type: 'checkbox' }
    ]
  },

  /* -------------------------------------------------------------- pages ---
     Whole new pages. They live at /p/<address> and can be put in the menu. */
  pages: {
    label: 'Pages',
    file: 'data/pages.json',
    titleField: 'title',
    subtitleField: 'slug',
    sortBy: 'navOrder',
    orderField: 'navOrder',
    previewPath: 'slug',
    blurb: 'A new page of your own. It appears at /p/ followed by the '
         + 'address you give it. Longer blocks can be added to it from '
         + 'Sections afterwards.',
    fields: [
      { name: 'title', label: 'Page title', type: 'text', required: true,
        placeholder: 'Our team' },
      { name: 'slug', label: 'Address', type: 'text', required: true,
        placeholder: 'our-team',
        help: 'Lower case, dashes instead of spaces. The page is then at '
            + '/p/our-team.' },
      { name: 'eyebrow', label: 'Small line above the heading', type: 'text' },
      { name: 'lede', label: 'Opening paragraph', type: 'textarea' },
      { name: 'body', label: 'Writing', type: 'textarea',
        help: 'Leave a blank line between paragraphs. A paragraph ending in '
            + 'a colon becomes a heading.' },
      { name: 'nav', label: 'Put it in the top menu', type: 'checkbox', default: false },
      { name: 'navOrder', label: 'Position in the menu', type: 'number' },
      { name: 'show', label: 'Publish this page', type: 'checkbox' }
    ]
  },

  /* ------------------------------------------------------- competitions --- */
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

  /* ------------------------------------------------------------- events --- */
  events: {
    label: 'Events',
    file: 'data/events.json',
    titleField: 'title',
    subtitleField: 'date',
    sortBy: 'date',
    fields: [
      { name: 'date',    label: 'Date',     type: 'date', required: true },
      { name: 'title',   label: 'Title',    type: 'text', required: true, placeholder: 'Build day' },
      { name: 'kind',    label: 'Kind',     type: 'text', placeholder: 'Build day · In person' },
      { name: 'summary', label: 'Summary',  type: 'textarea' },
      { name: 'where',   label: 'Where',    type: 'text', placeholder: 'Richmond, VA' },
      { name: 'when',    label: 'When',     type: 'text', placeholder: '10:00 to 16:00' },
      { name: 'who',     label: 'Who',      type: 'text', placeholder: 'Ages 11 to 18' },
      { name: 'signup',  label: 'Sign-up link', type: 'url' }
    ]
  },

  /* --------------------------------------------------------------- kits ---
     Not in use on the public site yet. Kept here so the competition
     calendar has something to put in its Kit column when it is.          */
  kits: {
    label: 'Kits',
    file: 'data/kits.json',
    titleField: 'name',
    subtitleField: 'field',
    sortBy: 'name',
    blurb: 'Only used by the Kit column of the competition calendar.',
    fields: [
      { name: 'name',    label: 'Kit name', type: 'text', required: true, placeholder: 'Linkage' },
      { name: 'field',   label: 'Field',    type: 'text', required: true, placeholder: 'Mechanisms' },
      { name: 'brief',   label: 'The brief', type: 'textarea',
        help: 'The one constraint handed out with the box.' },
      { name: 'measure', label: 'What gets measured', type: 'text' },
      { name: 'active',  label: 'Currently offered',  type: 'checkbox' }
    ]
  }

};
