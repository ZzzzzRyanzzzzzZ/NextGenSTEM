# Saving registrations to a Google Sheet

Every sign-up on `/register` becomes a new row in a Google Sheet that you own.
It takes about five minutes to set up.

1. Make a new Google Sheet, for example "Hackathon registrations".
2. In the sheet, open **Extensions → Apps Script**.
3. Delete whatever is in the editor and paste in the code below. Click **Save**.
4. Click **Deploy → New deployment**. Click the gear next to "Select type" and choose **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy**, allow the permissions it asks for, and copy the **Web app URL**.
   It ends in `/exec`.
6. In Vercel, open the project, go to **Settings → Environment Variables**, and add:
   - Name: `SHEET_WEBHOOK_URL`
   - Value: the URL you copied
7. Redeploy the site (Deployments → ⋯ → Redeploy) so it picks up the variable.
8. Submit a test registration, check the row shows up, then delete it.

Keep the web app URL private. Anyone with it could add rows to the sheet.

If you change the script later, use **Deploy → Manage deployments → Edit → New
version**. That keeps the same URL.

```javascript
const COLUMNS = [
  'submitted', 'first', 'last', 'email', 'phone', 'school', 'grade',
  'experience', 'team', 'teammates',
  'parent_name', 'parent_email', 'parent_phone',
  'diet', 'heard', 'notes', 'conduct', 'photos'
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) sheet.appendRow(COLUMNS);
    const data = JSON.parse(e.postData.contents);
    // A leading = + - or @ would make Sheets treat the text as a formula.
    const row = COLUMNS.map(k => {
      const v = String(data[k] || '');
      return /^[=+\-@]/.test(v) ? "'" + v : v;
    });
    sheet.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
```
