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
**Status:** ☑ Open ☐ Fixed ☐ Needs follow-up

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
- To do: copy the exact error from **Netlify → Logs → Functions** (expected: `EROFS: read-only file system`).

### Fix
In progress: move storage from the CSV file to a Supabase database (project `morrowlane-service-requests`).

### Verification
**How did you test the fix?**
_To do after the fix is deployed: submit a valid request on the live site, refresh, then change its status and refresh again._

**What happened after the fix?**
_To do._

**Evidence or notes:**
_To do._
