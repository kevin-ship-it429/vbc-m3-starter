# Debug Log — Morrowlane Service Request Portal

Issues found and fixed while building the back end locally (`npm run dev`, http://localhost:3000).

---

## Issue #1: Submitting the form fails — "Could not reach the server"

**Date:** 2026-11-23
**Status:** ☐ Open ☑ Fixed ☐ Needs follow-up

**Found during:**
☑ Valid-entry test
☐ Empty-form test
☐ Duplicate test
☐ Unrealistic-value test
☐ Math check
☐ Other: __________

### Symptom
**What did you do?**
Opened http://localhost:3000, filled in the New request form, and clicked **Submit request**.

**What did you expect?**
The request would save and appear in the Requests table.

**What happened instead?**
The form showed "Could not reach the server." The table was empty and the tiles showed "–". The browser console showed:
```
:3000/api/summary:1   Failed to load resource: the server responded with a status of 404 (Not Found)
:3000/api/requests:1  Failed to load resource: the server responded with a status of 404 (Not Found)
```

### Root cause
The page was calling back-end endpoints (`/api/requests`, `/api/summary`) that didn't exist yet. The starter project ships with only the front end, so every call returned 404 (Not Found). The README describes this as the intended starting state.

### Fix
Built the read side. `lib/requests.js` reads `data/seed-requests.csv` and assigns ids. `app/api/requests/route.js` (`GET`) returns all requests newest first. The CSV reader handles quoted fields with commas, Windows line endings, and the em dash in the data. Saving new requests (`POST`) was built afterward; see Issue #4.

### Verification
**How did you test the fix?**
Called `GET /api/requests` directly and reloaded the page.

**What happened after the fix?**
The endpoint returned HTTP 200 with all 22 seed requests, newest first. The status counts were 13 Complete, 6 In Progress and 3 New, matching a hand count of the CSV. After a refresh, the Requests table populated.

**Evidence or notes:**
The summary 404 was still present at this point. See Issue #2.

---

## Issue #2: Requests table loads, but summary tiles still 404

**Date:** 2026-11-23
**Status:** ☐ Open ☑ Fixed ☐ Needs follow-up

**Found during:**
☐ Valid-entry test
☐ Empty-form test
☐ Duplicate test
☐ Unrealistic-value test
☑ Math check
☐ Other: __________

### Symptom
**What did you do?**
Refreshed the page after the requests endpoint was built and checked the developer tools.

**What did you expect?**
The table and the three tiles (Open requests, Urgent open, Completed this month) would all load.

**What happened instead?**
The table populated, but the tiles stayed at "–" and the console showed:
```
page.js:48  GET http://localhost:3000/api/summary 404 (Not Found)
```

### Root cause
The tiles call a separate endpoint, `/api/summary`, which hadn't been built yet.

### Fix
Created `app/api/summary/route.js`. It reuses the same CSV reader and calculates:
- **Open requests:** status is not Complete
- **Urgent open:** open and priority is Urgent
- **Completed this month:** Complete, in the month of the *most recent request* (not today's date, per the README)

### Verification
**How did you test the fix?**
Called `GET /api/summary` and compared the results to a hand count of the CSV.

**What happened after the fix?**
It returned HTTP 200 `{"open_requests":9,"urgent_open":2,"completed_this_month":5}`, matching the hand count of 9 / 2 / 5. After a refresh, the tiles showed the numbers and the console error was gone.

**Evidence or notes:**
Months are calculated in UTC. A request submitted late on the last evening of a month (Central time) could count toward the next month. This is a possible Known limitation.

---

## Issue #3: "Completed this month" drops to 0 after adding a new request

**Date:** 2026-11-23
**Status:** ☐ Open ☐ Fixed ☑ Needs follow-up

**Found during:**
☐ Valid-entry test
☐ Empty-form test
☐ Duplicate test
☐ Unrealistic-value test
☑ Math check
☐ Other: __________

### Symptom
**What did you do?**
Submitted a test request (dated 2026-11-23) and looked at the tiles.

**What did you expect?**
Open requests would go up by 1 and the other tiles would stay the same.

**What happened instead?**
The tiles went from **9 / 2 / 5** to **10 / 2 / 0**. "Completed this month" fell from 5 to 0.

### Root cause
This is not a code bug; it's an "almost-right" moment. The README says the tile uses the month of the *most recent* request. Once a November request existed, "this month" became November, and no November requests were Complete yet. The code follows the spec, but on screen it looks broken.

### Fix
No code change yet. It's logged for follow-up.

### Verification
**How did you test the fix?**
Not yet tested. To do: hand-count the tile during test-pass check #5.

**What happened after the fix?**
Not applicable yet.

**Evidence or notes:**
Decide whether this behavior makes sense for real coordinators. Consider listing it under Known limitations or using it as the almost-right example in the Assessment. This happened again when two "Bob" test rows (Nov 23 and Nov 24) were in the CSV: the tiles showed 10 / 2 / 0, then 11 / 2 / 0. Those rows were deleted on 2026-11-24 and the tiles returned to 9 / 2 / 5. To reproduce it, submit any new request.

---

## Issue #4: Form saves requests with blank fields

**Date:** 2026-11-23
**Status:** ☐ Open ☑ Fixed ☐ Needs follow-up

**Found during:**
☐ Valid-entry test
☑ Empty-form test
☐ Duplicate test
☑ Unrealistic-value test
☐ Math check
☐ Other: __________

### Symptom
**What did you do?**
After the `POST /api/requests` endpoint was built, submitted the form with some fields left blank.

**What did you expect?**
The form would refuse to save and show a clear error message next to the Submit button.

**What happened instead?**
The request saved anyway, with empty values in the CSV:
```
2026-11-23T21:46:39Z,Test 2,,,,New
```

### Root cause
The POST endpoint saved whatever it received. Validation (required fields, allowed values, length limit) hadn't been built yet. The browser's dropdowns aren't a guarantee, since anyone can send data to the server without using the form, so the checks have to run on the server.

### Fix
Added server-side validation in `app/api/requests/route.js`. On failure it returns HTTP 400 with a plain-English message, which the page already displays next to the Submit button:
- All four fields required (whitespace-only counts as blank)
- Location must be Minneapolis, Chicago, Denver, or Austin
- Priority must be Low, Medium, High, or Urgent
- Description must be 500 characters or fewer

### Verification
**How did you test the fix?**
Sent each bad case directly to the server and checked that the CSV did not change.

**What happened after the fix?**

| Input | Message | Saved? |
|---|---|---|
| Entire form blank | "Please fill in all fields: Requester name, Location, Description and Priority are required." | No (400) |
| Name is only spaces | "Requester name is required." | No (400) |
| Two fields blank | "Please fill in all fields: Location and Description are required." | No (400) |
| Location "Paris" | "Location must be Minneapolis, Chicago, Denver, or Austin." | No (400) |
| Priority "ASAP" | "Priority must be Low, Medium, High, or Urgent." | No (400) |
| 501-character description | "Description must be 500 characters or fewer (it is 501)." | No (400) |
| Valid request | — | Yes (201) |

**Evidence or notes:**
A separate test row, `Frank, Minneapolis, "Does, this, break things?!"`, confirmed that commas in a description are stored safely and don't shift columns.

---

## Issue #5: Test rows left in the data file

**Date:** 2026-11-23
**Status:** ☐ Open ☑ Fixed ☐ Needs follow-up

**Found during:**
☐ Valid-entry test
☑ Empty-form test
☐ Duplicate test
☐ Unrealistic-value test
☐ Math check
☑ Other: Data cleanup after testing

### Symptom
**What did you do?**
Submitted test requests while building and testing the POST endpoint and validation.

**What did you expect?**
The data would contain only real requests.

**What happened instead?**
Test rows ("Frank" and the blank "Test 2" row) stayed in `data/seed-requests.csv` and showed in the table and tile counts.

### Root cause
Every successful submission is permanently added to the CSV file. Nothing removes test data automatically.

### Fix
Restored the original seed file with `git checkout data/seed-requests.csv`.

### Verification
**How did you test the fix?**
Checked `git status` and called `/api/summary`.

**What happened after the fix?**
`git status` showed no changes to the CSV, and the tiles returned to 9 / 2 / 5. After a refresh, the table showed the original 22 requests.

**Evidence or notes:**
Three more test rows were added after this cleanup: two "Bob" rows (Nov 23 and Nov 24) and the 475-character name row from Issue #9. All three were removed on 2026-11-24 the same way. Before removing them, `git diff` confirmed they were the only changes, so no status updates on the original requests were lost. The CSV is back to the original 22 requests and the tiles show 9 / 2 / 5.

---

## Issue #6: Dev server stopped; restart landed on the wrong port

**Date:** 2026-11-24
**Status:** ☐ Open ☑ Fixed ☐ Needs follow-up

**Found during:**
☐ Valid-entry test
☐ Empty-form test
☐ Duplicate test
☐ Unrealistic-value test
☐ Math check
☑ Other: Running the local dev server

### Symptom
**What did you do?**
Came back to the project after the dev server had been stopped, and asked for it to be started again.

**What did you expect?**
The app would run at http://localhost:3000.

**What happened instead?**
Claude Code had stopped the server because the computer was critically low on memory. On restart, Next.js printed:
```
⚠ Port 3000 is in use by process 55888, using available port 3001 instead.
```

### Root cause
Only the outer `npm` process was stopped. The actual Next.js server process from the day before kept running in the background and still held port 3000. Starting again created a *second* server on port 3001, which used even more memory.

### Fix
Found every Node process running from this project folder, stopped all of them (both the old server and the new one), confirmed ports 3000 and 3001 were free, and started one clean server.

### Verification
**How did you test the fix?**
Loaded http://localhost:3000 and checked the server output.

**What happened after the fix?**
The page returned HTTP 200 on port 3000, and the server output showed `Local: http://localhost:3000` with no port warning.

**Evidence or notes:**
Not an app bug; it was caused by the local environment. If it happens again, close other programs to free memory before restarting.

---

## Issue #7: Changing a request's Status gives a 404

**Date:** 2026-11-24
**Status:** ☐ Open ☑ Fixed ☐ Needs follow-up

**Found during:**
☑ Valid-entry test
☐ Empty-form test
☐ Duplicate test
☐ Unrealistic-value test
☐ Math check
☐ Other: __________

### Symptom
**What did you do?**
Changed the Status dropdown for a request in the Requests table.

**What did you expect?**
The new status would save and stay after a refresh.

**What happened instead?**
The change didn't save. The console showed:
```
page.js:120  PATCH http://localhost:3000/api/requests/24 404 (Not Found)
```

### Root cause
The dropdown calls `PATCH /api/requests/[id]`, which hadn't been built yet.

### Fix
Created `app/api/requests/[id]/route.js` and added `updateRequestStatus()` to `lib/requests.js`. It changes only the status of the matching row and rewrites the CSV with its quoting and line endings intact. It also checks:
- Status must be New, In Progress, or Complete. Otherwise it returns 400.
- An id that doesn't exist returns 404 "No request found with id ___."

### Verification
**How did you test the fix?**
Sent status changes directly to the server, compared the CSV before and after, then restored the file.

**What happened after the fix?**
- Request 6 → "In Progress": 200. Only that row's status changed in the file.
- Status "Done": 400 "Status must be New, In Progress, or Complete."
- Id 999 and id "abc": 404 "No request found…"

**Evidence or notes:**
The original change to request 24 was not saved, because it happened before the fix. Ids are each row's position in the CSV, so they stay reliable only as long as rows are added at the end. Editing or reordering the file by hand could make the dropdown update the wrong row. This is a Known limitation, and moving to Supabase should fix it.

---

## Issue #8: Export CSV link gives a 404

**Date:** 2026-11-24
**Status:** ☐ Open ☑ Fixed ☐ Needs follow-up

**Found during:**
☐ Valid-entry test
☐ Empty-form test
☐ Duplicate test
☐ Unrealistic-value test
☐ Math check
☑ Other: Testing the Export CSV link

### Symptom
**What did you do?**
Clicked **Export CSV** above the Requests table.

**What did you expect?**
A file named `morrowlane-requests.csv` would download.

**What happened instead?**
404 error.

### Root cause
The link points to `/api/export`, which hadn't been built yet.

### Fix
Created `app/api/export/route.js`. It returns every request, newest first, as CSV with:
- `Content-Type: text/csv`
- `Content-Disposition: attachment; filename="morrowlane-requests.csv"` (this makes the browser download it)
- An `id` column, so it matches the table
- A UTF-8 marker so Excel shows the em dash correctly instead of garbled characters like `â€"`

### Verification
**How did you test the fix?**
Requested `/api/export`, then checked the response headers and file contents.

**What happened after the fix?**
HTTP 200 with the correct headers. The file has a header row plus 24 requests, newest first. "Water leak under the breakroom sink, floor 6" stayed in one column, and the em dash came through intact.

**Evidence or notes:**
With this fix, all five endpoints from the README contract are built.

---

## Issue #9: No character limit on Requester name

**Date:** 2026-11-24
**Status:** ☐ Open ☑ Fixed ☐ Needs follow-up

**Found during:**
☐ Valid-entry test
☐ Empty-form test
☐ Duplicate test
☑ Unrealistic-value test
☐ Math check
☐ Other: __________

### Symptom
**What did you do?**
Typed a very long string into Requester name and clicked **Submit request**.

**What did you expect?**
The form would reject a name that long.

**What happened instead?**
The request saved (a 475-character name), and the huge string stretched the Requests table so it looked broken.

### Root cause
Validation checked that the name wasn't blank but had no maximum length. Description had a 500-character limit; Requester name had none.

### Fix
- **Server** (`app/api/requests/route.js`): rejects names over 100 characters with HTTP 400 and "Requester name must be 100 characters or fewer (it is ___)."
- **Form** (`app/page.js`): added `maxLength={100}` to the Requester name input, so the browser stops typing at 100 characters. This is only a convenience; the server check is the real protection.

### Verification
**How did you test the fix?**
Sent names of 101 and 100 characters directly to the server, then restored the CSV.

**What happened after the fix?**
- 101 characters: rejected (400) with the message above
- 100 characters: saved (201)

**Evidence or notes:**
The 475-character row from the original test (id 25) was deleted from `data/seed-requests.csv` on 2026-11-24, along with the two "Bob" test rows (see Issue #5). The table displays normally again.

---

## Issue #10: Dates in the Requests table wrap onto two lines

**Date:** 2026-11-24
**Status:** ☐ Open ☑ Fixed ☐ Needs follow-up

**Found during:**
☐ Valid-entry test
☐ Empty-form test
☐ Duplicate test
☐ Unrealistic-value test
☐ Math check
☑ Other: Visual review of the Requests table

### Symptom
**What did you do?**
Looked at the Requests table after it was populated.

**What did you expect?**
Each date (e.g. "Aug 28, 2026") would show on a single line.

**What happened instead?**
Dates wrapped after the comma, putting "Aug 28," on one line and "2026" on the next, which made the table look messy.

### Root cause
Table cells wrap text by default whenever a column gets narrow. The browser treated the space after the comma as a place it could break the line. Nothing told it to keep the date together.

### Fix
- `app/page.js`: added a `date-cell` class to the Date column's cells.
- `app/globals.css`: added `.requests-table .date-cell { white-space: nowrap; }` so the date never breaks across lines.

Only the Date column changed. Description and the other columns can still wrap normally.

### Verification
**How did you test the fix?**
Confirmed the page still loads (HTTP 200) after the change, then refreshed the page to check the table.

**What happened after the fix?**
Dates should show on one line, e.g. "Aug 28, 2026". Confirm this in the browser after a refresh, and try narrowing the window to check that dates still don't wrap.

**Evidence or notes:**
On very narrow (phone-sized) screens the table may get slightly wider, since the date column can no longer shrink by wrapping. A before/after screenshot would be good evidence here.

---

## Issue #11: Submitting a request on the live site returns a 500 error

**Date:** 2026-11-24
**Status:** ☐ Open ☑ Fixed ☐ Needs follow-up

**Found during:**
☑ Valid-entry test
☐ Empty-form test
☐ Duplicate test
☐ Unrealistic-value test
☐ Math check
☐ Other: __________

### Symptom
**What did you do?**
On the live Netlify site (https://morrowlane-service-requests.netlify.app), filled in a valid New request form and clicked **Submit request**.

**What did you expect?**
The request would save and appear in the table, the same way it does locally.

**What happened instead?**
The request did not save. The browser console showed:
```
Failed to load resource: the server responded with a status of 500 ()
```
The server's response was `{"error":"Could not save the request. Please try again."}`.

### Root cause
Locally, `npm run dev` is a normal program that can edit `data/seed-requests.csv`. On Netlify, the API runs as a **serverless function**: a short-lived copy of the code started on demand, where the deployed files are **read-only**. Reading the CSV works (the table, tiles and export all load), but adding a row is refused. Even if writing were allowed, each copy is temporary and several can run at once, so saved data would vanish on a later request.

Evidence:
- Netlify request log: `POST /api/requests` → 500 at 2026-11-24 20:00 UTC, from the Next.js server handler.
- Reproduced with a direct valid POST: same 500 and the same error message. The tiles stayed at 9 / 2 / 5.
- `GET /api/requests`, `/api/summary` and `/api/export` all returned 200 on the live site, so only writes fail.
- Optional: copy the exact error from **Netlify → Logs → Functions** (expected: `EROFS: read-only file system`).

### Fix
Moved storage from the CSV file to a **Supabase** database (project `morrowlane-service-requests`, table `requests`):
1. Created the `requests` table in Supabase and ran `supabase/setup.sql` to load the 22 seed requests (ids 1–22) and add access rules that let the app read, add and update requests, but not delete them.
2. Rewrote `lib/requests.js` to read, insert and update through `@supabase/supabase-js`. The function names stayed the same, so the API routes and the page didn't change.
3. Added `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `.env.local` (local, not committed) and to Netlify's environment variables (live site).
4. Committed and pushed (commit `931f250`), which triggered a new Netlify deploy.

**Almost-right moment during the fix:** after adding the Netlify variables and clicking Redeploy, the live site still returned 500. The Supabase code had never been committed or pushed, so Netlify rebuilt the old CSV commit (`eba4f1a`). The tiles proved it: the live site showed 9 / 2 / 5 (CSV data) while local showed 10 / 2 / 0 (Supabase data). Pushing the commit fixed it.

### Verification
**How did you test the fix?**
On the live site, submitted valid requests, refreshed, changed their statuses, and refreshed again. Tested all the endpoints: table, tiles, submit, status change and export.

**What happened after the fix?**
Everything worked and the data stayed after a refresh. The live data now includes:
- id 24 "Frank": submitted, then changed to **In Progress**
- id 25 "Bob": submitted, then changed to **Complete**

The live tiles moved to 11 / 2 / 1, which is consistent with these changes: two new open requests, and Bob counting as completed in November, the month of the newest request. A request saved from the local app (id 23) also appears on the live site, which shows both use the same database.

**Evidence or notes:**
- Commit `931f250`: "Move storage from CSV file to Supabase"
- Netlify env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (values not recorded here)
- Test rows 23–25 are still in Supabase. Delete them in Table Editor if they're not wanted; the tiles will return to 9 / 2 / 5.
- Add a screenshot of the live table after refresh, if possible.

---

## Issue #12: The same request can be submitted twice

**Date:** 2026-11-24
**Status:** ☐ Open ☑ Fixed ☐ Needs follow-up

**Found during:**
☐ Valid-entry test
☐ Empty-form test
☑ Duplicate test
☐ Unrealistic-value test
☐ Math check
☐ Other: __________

### Symptom
**What did you do?**
On the live site, submitted the same request twice in a row: Requester "TEST - Duplicate", Chicago, "Duplicate test: identical submission", High.

**What did you expect?**
The second submission would be rejected (or at least flagged) as a duplicate.

**What happened instead?**
Both were saved as separate requests, **#30 and #31**, one second apart, both "New". The Open requests tile went up by 2 for one real issue, so a coordinator could send two people to fix the same problem.

### Root cause
The POST endpoint checked that each field was filled in and allowed, but never compared a new request against existing ones. Every valid submission was saved, no matter what was already in the table.

### Fix
Added a duplicate check before saving:
- `lib/requests.js`: new `findOpenDuplicate()` looks for an **open** request (status not Complete) with the same requester, location and description, ignoring capitalization and extra spaces.
- `app/api/requests/route.js`: if one is found, return **409** with: "This looks like a duplicate of request #30 (same requester, location, and description), which is still New. Update that request instead of submitting it again." The page shows this next to the Submit button.

Design choices:
- **Completed requests don't count**, so a recurring job (e.g. "Quarterly deep clean") can be requested again once the last one is done.
- **Priority is ignored** in the comparison, so resubmitting the same problem as "Urgent" is still caught. The right move is to update the existing request.
- **A different location is allowed**, since it's a different site.

### Verification
**How did you test the fix?**
Ran against the local app, which uses the same Supabase database as the live site:

| Test | Result |
|---|---|
| Exact repeat of "TEST - Duplicate" (Chicago) | 409, duplicate of #30 (not saved) ✅ |
| Same text in different capitals and spacing, different priority | 409, duplicate of #30 ✅ |
| Same text, different location (Denver) | 201, saved (#35) ✅ |
| Resubmit a **Completed** seed request (Dana Whitfield, HVAC) | 201, saved (#36) ✅ |
| Brand-new valid request | 201, saved (#37) ✅ |
| Empty form | 400, still blocked ✅ |

**What happened after the fix?**
Locally: duplicates are blocked and everything else saves normally.
**Live site (after deploy `dc0f0cb`):** resubmitting "TEST - Duplicate" (Chicago) returned **409** "This looks like a duplicate of request #38 … which is still New. Update that request instead of submitting it again." and saved nothing ✅

Note: the check was sent repeatedly while waiting for the deploy, so four copies (#38–#41) were saved by the *old* code before the new version went live. Lesson: confirm the deploy is ready before testing a fix live. These rows were later deleted.

**Evidence or notes:**
- Rows #30/#31 (the original duplicates) and the test rows from this pass (#29, #32–#35, #37, plus #36 "Dana Whitfield") are in Supabase; delete them in Table Editor when done.
- Known limitation: two identical submissions sent at the *exact* same moment could both pass the check. A database-level unique rule would close that gap.

---

## Issue #13: Long unbroken description pushes Priority and Status outside the card

**Date:** 2026-11-24
**Status:** ☐ Open ☑ Fixed ☐ Needs follow-up

**Found during:**
☐ Valid-entry test
☐ Empty-form test
☐ Duplicate test
☑ Unrealistic-value test
☐ Math check
☐ Other: __________

### Symptom
**What did you do?**
Viewed the Requests table after the absurd-values test saved a 500-character description: "TEST - 500 chars zzzzzzzz…" (request #33).

**What did you expect?**
The description would wrap inside its column and the table would stay inside the white card.

**What happened instead?**
The long run of "z"s with no spaces couldn't wrap, so it stretched the Description column and pushed the **Priority** and **Status** columns out past the white background into the grey page border.

### Root cause
Browsers only wrap text at spaces (and a few punctuation marks) by default. The table shows the first 80 characters of a description, and here about 63 of them were one unbroken "word". The browser had nowhere to break it, so it widened the table instead.

### Fix
- `app/page.js`: new `breakLongWords()` adds invisible **soft hyphens** every 12 characters inside any word longer than 15 characters. The browser shows one as **"-"** only where it actually breaks the line; elsewhere it stays invisible. Normal descriptions with spaces are unchanged.
- `app/globals.css`: the description cell gets `overflow-wrap: anywhere` as a last-resort safety net, so nothing can push the other columns out.

The saved data is unchanged. This only affects how descriptions are displayed, so the CSV export still contains the original text.

### Verification
**How did you test the fix?**
Ran the break logic on sample text: the 500-char test description gets break points every 12 characters; "Water leak under the breakroom sink, floor 6" is untouched; a long URL gets break points. The page compiles and loads (HTTP 200).

**What happened after the fix?**
On the live site: added a request whose description is one long unbroken word, then viewed the Requests table.

Result: the description wrapped with "-" at the line breaks (soft hyphens), and Priority and Status stayed inside the white card ✅

**Evidence or notes:**
A before/after screenshot of the table would be good evidence. The Requester name column could have the same problem with a 100-character unbroken name; it isn't covered by this fix.

---

## Issue #14: Exported CSV can run spreadsheet formulas (CSV injection)

**Date:** 2026-11-24
**Status:** ☐ Open ☑ Fixed ☐ Needs follow-up

**Found during:**
☐ Valid-entry test
☐ Empty-form test
☐ Duplicate test
☑ Unrealistic-value test
☐ Math check
☐ Other: __________

### Symptom
**What did you do?**
Reviewed the live data after the test pass. Request #27 had the Requester name `=HYPERLINK("https://evil.example/?x=1","CLICK-ME")` and the description `=1+1 CSV injection probe`.

**What did you expect?**
Exported text would open in a spreadsheet as plain text.

**What happened instead?**
The export wrote these values exactly as entered. Excel and Google Sheets treat any cell starting with `=`, `+`, `-` or `@` as a **formula**, so opening the export would turn #27's name into a live clickable link to an outside website, and `=1+1` would show as `2`.

### Root cause
The form accepts any text (correctly; names and descriptions are free text), and the export copied it into the CSV unchanged. CSV is just text, so the spreadsheet app decides what a cell means, and a leading `=` means "formula."

### Fix
`app/api/export/route.js`: new `neutralizeFormula()` adds a `'` in front of any exported value that starts with `=`, `+`, `-`, `@`, a tab or a carriage return. Spreadsheets treat a leading `'` as "show this as text." Only the export is changed; the saved data and the table on the page show the text exactly as entered.

### Verification
**How did you test the fix?**
Downloaded the export from the local app, which uses the same Supabase data.

**What happened after the fix?**
- #27 exports as `'=HYPERLINK(...)` and `'=1+1 CSV injection probe`, so it's shown as text, not run as a formula ✅
- Normal rows (e.g. #1 Dana Whitfield, #6 "Water leak…, floor 6") are unchanged ✅
- **Live site:** downloaded the export and opened it in **Excel**. The formula-probe rows showed as plain text, not as links or calculated values ✅

**Evidence or notes:**
A description that legitimately starts with "-" (e.g. "- fix door") also gets a `'` in the export. That's harmless and is the standard trade-off for this protection.

---

## Issue #15: Long unbroken Requester name can stretch the table

**Date:** 2026-11-24
**Status:** ☐ Open ☑ Fixed ☐ Needs follow-up

**Found during:**
☐ Valid-entry test
☐ Empty-form test
☐ Duplicate test
☑ Unrealistic-value test
☐ Math check
☐ Other: __________

### Symptom
**What did you do?**
Follow-up to Issue #13: the Requester name allows up to 100 characters, which could be one unbroken "word."

**What did you expect?**
A long name would wrap within its column.

**What happened instead?**
The Issue #13 fix only covered Description. A 100-character name with no spaces would stretch the Requester column and push other columns out of the card, the same way #33's description did.

### Root cause
Same as Issue #13: browsers only wrap at spaces by default, and the wrapping fix had only been applied to the Description cell.

### Fix
- `app/page.js`: the Requester cell now uses the same `breakLongWords()` (soft hyphens every 12 characters in words longer than 15).
- `app/globals.css`: renamed the cell style to `.wrap-cell` and applied it to both Requester and Description.

### Verification
**How did you test the fix?**
The page compiles and loads (HTTP 200). Same logic as Issue #13.

**What happened after the fix?**
On the live site (after deploy `a11dcf5`): submitted a request with a long unbroken Requester name. The name wrapped with "-" at the line breaks and stayed inside the white card ✅

**Evidence or notes:**
A screenshot would be good evidence.

---

## Issue #16: No rate limiting on writes (security audit: Medium)

**Date:** 2026-11-24
**Status:** ☐ Open ☑ Fixed ☐ Needs follow-up

**Found during:**
☐ Valid-entry test
☐ Empty-form test
☐ Duplicate test
☐ Unrealistic-value test
☐ Math check
☑ Other: Security audit (OpenCode)

### Symptom
**What did you do?**
Ran an automated security audit against the live site.

**What did you expect?**
Rapid-fire write requests from one visitor would be slowed down or refused.

**What happened instead?**
20 parallel status updates (PATCH) all returned 200, and 3 rapid new-request submissions (POST) all returned 201. Nothing stopped a script from flooding the database with requests or flipping statuses back and forth.

### Root cause
The API had no limit on how often one visitor could write. On Netlify, a simple in-memory counter wouldn't work: the API runs as many short-lived copies that don't share memory, so each copy would count separately.

### Fix
Count write attempts in Supabase, which all copies share:
- `supabase/rate-limit.sql`: a `rate_limit_hits` table (locked: access rules on with no permissions, so the app can't read or edit it directly) and a `check_rate_limit()` database function that counts a visitor's recent attempts, records the new one, and handles simultaneous requests one at a time so 20 parallel requests can't all slip through.
- `lib/rateLimit.js`: identifies the visitor by IP address (stored only as a one-way hash, never the raw IP) and calls the function. Over the limit → **429** "Too many … in a short time (limit N per minute). Please wait a minute and try again."
- Limits, per visitor per rolling minute: **5 new requests**, **15 status changes**. Invalid attempts count too, so bad requests can't be used to probe freely. Reading (table, tiles, export) isn't limited.
- If the limiter itself fails (e.g. the SQL hasn't been run), it logs the error and lets the request through, so a limiter problem can't take the whole app down.

### Verification
**How did you test the fix?**
Ran `supabase/rate-limit.sql` in Supabase, then tested against the local app (same database) using requests that save nothing:
1. 6 rapid empty-form POSTs
2. 20 parallel PATCHes to a missing id (999)
3. Repeated GETs

**What happened after the fix?**
- Before the SQL was run: the app kept working (400/404 as normal) and logged "Rate limit check failed (allowing request)", confirming the fail-open safety net.
- 6 rapid POSTs: **400 400 400 400 400 429**, with the 6th getting `429 Too Many Requests`, `Retry-After: 60`, "Too many new requests in a short time (limit 5 per minute)…" ✅
- 20 parallel PATCHes: **15 × 404, 5 × 429**. Exactly 15 got through even when sent at the same instant ✅
- GETs: all 200 (reading isn't limited) ✅
- No data changed; no limiter errors after the SQL was run.
- **Live site (after deploy `70e5092`):** 6 rapid POSTs → 400 ×5 then 429 (`Retry-After: 60`); 20 parallel PATCHes → 15 × 404, 5 × 429; page, table, tiles and export all 200. No data changed ✅

**Evidence or notes:**
Limits are per IP address. A determined attacker with many IP addresses could still get through more slowly. Netlify's firewall rate limiting would be a stronger next step.

---

## Issue #17: A failed load shows "No requests to show yet." (security audit: Low)

**Date:** 2026-11-24
**Status:** ☐ Open ☑ Fixed ☐ Needs follow-up

**Found during:**
☐ Valid-entry test
☐ Empty-form test
☐ Duplicate test
☐ Unrealistic-value test
☐ Math check
☑ Other: Security audit (OpenCode)

### Symptom
**What did you do?**
The audit reviewed what the page does when loading the request list fails (e.g. the server is down or the network drops), both on first load and when refreshing the list after a status change.

**What did you expect?**
An error message saying the list couldn't be loaded.

**What happened instead?**
The page wiped the list and showed "No requests to show yet." A coordinator would think every request had been deleted. After a status change, a failed refresh emptied a table that had just been showing data.

### Root cause
In `app/page.js`, `loadRequests()`'s error handler set the list to empty (`setRequests([])`) and never set the table error message. The page then couldn't tell "loaded successfully, and there are zero requests" apart from "failed to load."

### Fix
`app/page.js`:
- New `loadState` ("loading" → "ready", or "error") tracks whether the list ever loaded successfully.
- On failure, the existing list is **kept on screen** (not wiped), and the table shows: "Could not load the latest requests. Check your connection and refresh the page."
- "No requests to show yet." now appears only after a *successful* load that returned zero requests. While loading, it shows "Loading requests…".
- A failed status update that returns a non-JSON error no longer crashes the error handler.

### Verification
**How did you test the fix?**
The page compiles and loads (HTTP 200).
On the live site (after deploy `70e5092`): loaded the table, set the browser offline (DevTools → Network → Offline), then changed a request's status.

**What happened after the fix?**
The error message appeared as expected, and the table did not switch to "No requests to show yet." ✅

**Evidence or notes:**
—

---

## Issue #18: Soft hyphens end up in copied text (security audit: Low, regression from #13/#15)

**Date:** 2026-11-24
**Status:** ☐ Open ☑ Fixed ☐ Needs follow-up

**Found during:**
☐ Valid-entry test
☐ Empty-form test
☐ Duplicate test
☐ Unrealistic-value test
☐ Math check
☑ Other: Security audit (OpenCode)

### Symptom
**What did you do?**
The audit reviewed the Issue #13/#15 wrapping fix.

**What did you expect?**
Copying a name or description from the table would copy exactly what was entered.

**What happened instead?**
The wrapping fix inserts invisible soft-hyphen characters (U+00AD) every 12 characters into long words. Copying that text pastes the hidden characters into emails, tickets or spreadsheets, where they can break searches and exact matches.

### Root cause
To show a "-" where long unbroken text breaks, the fix changed the displayed text itself rather than just its styling. Browsers copy the text as displayed, hidden characters included.

### Fix
`app/page.js`: kept the soft hyphens (they're the only way to show a "-" at the line break, which was the requirement), and added a **copy handler** on the table. When copied text contains soft hyphens, it puts a clean version, with them removed, on the clipboard. Copies without soft hyphens behave normally. The saved data and CSV export never contained soft hyphens.

The audit suggested a CSS-only fix (`overflow-wrap: anywhere`) instead. That would also keep the table inside the card (the CSS safety net is already in place), but it can't show a "-" at the break for text that isn't a dictionary word. If the "-" isn't needed, removing `breakLongWords()` gives the simplest CSS-only solution.

### Verification
**How did you test the fix?**
The page compiles and loads (HTTP 200).
On the live site (after deploy `70e5092`): selected a long unbroken description in the table, copied it (Ctrl+C), pasted it elsewhere and checked for hidden soft-hyphen characters.

**What happened after the fix?**
The text copied without the soft hyphens: the pasted text matched what was entered ✅

**Evidence or notes:**
Limitation: dragging selected text (instead of Ctrl+C or right-click → Copy) bypasses the copy handler.

---

## Issue #19: Long descriptions are cut off with "…" and can't be read in full

**Date:** 2026-11-24
**Status:** ☐ Open ☑ Fixed ☐ Needs follow-up

**Found during:**
☐ Valid-entry test
☐ Empty-form test
☐ Duplicate test
☑ Unrealistic-value test
☐ Math check
☐ Other: __________

### Symptom
**What did you do?**
While checking Issue #13 on the live site, viewed a request with a long description.

**What did you expect?**
A way to read the whole description on the page.

**What happened instead?**
The description stopped after 80 characters with "…". The full text (up to 500 characters) was saved, but the only way to read it was to download the CSV export.

### Root cause
Not a bug from our changes. The starter's `truncate()` function in `app/page.js` deliberately cuts descriptions at 80 characters so table rows stay short. Nothing on the page showed the rest.

### Fix
Kept the 80-character preview so the table stays compact, and added a **hover tooltip**: the description cell's `title` attribute holds the full text whenever a description is longer than 80 characters. Short descriptions get no tooltip, since there's nothing hidden.

### Verification
**How did you test the fix?**
The page compiles and loads locally (HTTP 200).
On the live site (after deploy `a11dcf5`): hovered over a description that ends in "…".

**What happened after the fix?**
The tooltip showed the full description ✅

**Evidence or notes:**
Limitations: the tooltip needs a mouse (it doesn't appear on phones or tablets or for keyboard-only users), and copying from the table still copies only the 80-character preview. The full text is always in the CSV export.
