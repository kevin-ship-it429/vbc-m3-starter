# Module 3 Playbook Submission — Service Request Portal

**Name:** [YOUR NAME]
**Live URL:** https://morrowlane-service-requests.netlify.app
**Repo:** https://github.com/kevin-ship-it429/vbc-m3-starter

## What I built

*3–5 plain-English sentences about what you built and who it's for. No jargon — write it the way you'd explain it to a coworker who doesn't code.*

[YOUR DESCRIPTION]

## Debug Log

*Document the bug you hit when your deployed site stopped behaving like your laptop. Fill in all five fields below. Keep it factual — what you saw, what you asked, what turned out to be true.*

**Symptom:** [YOUR DESCRIPTION OF WHAT WENT WRONG — what you saw on screen, and how it differed from what happened locally]

**What I asked Claude:**

> [YOUR PROMPT — paste the actual three-part prompt you used: what you did, what you expected, what actually happened]

**Root cause:** [YOUR EXPLANATION IN PLAIN ENGLISH — what was really happening underneath, in your own words]

**Fix:** [YOUR FIX — the steps you took, and what you asked Claude to change]

**Verification:** [YOUR VERIFICATION — what you did on the live site to prove the bug was actually gone, not just quiet]

## Test pass results

*Run all five checks against your live site and record what happened. "Result" is pass or fail plus what you actually saw. "Fix made" is what you changed, or "None needed."*

| # | Check | What I did | Result | Fix made |
|---|---|---|---|---|
| 1 | Valid entry | On the live site, submitted "TEST - Happy Path" (Austin, Medium) with a valid description, then refreshed. | **Pass.** Saved as #29 with status New, listed first after refresh, Open requests tile went up by 1 (14 → 15). | None needed. |
| 2 | Empty form | Submitted a fully blank form, a form with only spaces/tabs, an empty request body, and a form with only Description blank. | **Pass.** All rejected with 400 and a message naming the missing fields, e.g. "Please fill in all fields: Requester name, Location, Description and Priority are required." / "Description is required." Nothing saved. | None needed. |
| 3 | Duplicate-ish | Submitted the identical request "TEST - Duplicate" (Chicago, High) twice in a row. | **Fail.** Both saved as #30 and #31, one second apart, counting twice in Open requests. | Added a server-side duplicate check: an open request with the same requester, location, and description (ignoring capitalization/spacing) is rejected with 409 "This looks like a duplicate of request #30…". Verified locally; see DEBUG-LOG Issue #12. |
| 4 | Absurd values | Tried a 101-char name, 501-char description, location "Paris" and "denver", priority "ASAP", a number as the name, non-JSON, sneaking in status "Complete"/id 1, `<script>` and SQL-looking text, and status "Done" / ids 0, -1, 1.5, 99999999999999999999 on the status update. | **Pass.** Every bad value rejected with a clear 400/404 message; exactly 500 chars saved; sneaked-in status/id ignored (saved as New with a new id); script and SQL text stored as plain text and shown harmlessly; table intact. | None needed. (Requester name limit of 100 was added earlier, DEBUG-LOG Issue #9.) |
| 5 | Hand-checked tile math | Pulled every request from the live site and counted by hand: status not Complete; open + Urgent; Complete in the month of the newest request (Nov 2026). | **Pass.** Hand count 20 / 2 / 1 matched the tiles exactly (20 / 2 / 1). Urgent open = #22 Alison Vo and #15 Priya Raghunathan; completed in Nov = #25 Bob. | None needed. (Note: "Completed this month" follows the newest request's month, so it dropped from 5 to 0–1 once November requests existed. DEBUG-LOG Issue #3.) |

## Known limitations

*Be honest. List 3–5 things your app can't do or doesn't protect against, one bullet each — the things you'd want a real user to know before trusting it.*

- [YOUR LIMITATION]
- [YOUR LIMITATION]
- [YOUR LIMITATION]

## Assessment

*Around 250 words, first person. Where did AI move fast for you? Describe one genuine almost-right moment — something that looked correct and wasn't — and how you caught it. What would you prompt differently next time?*

[YOUR ASSESSMENT]

## Debugging Ideas (running list)

*Working notes collected while building. Add to this as new issues come up.*

### Observed so far
- **Form submit fails with 404s** on `/api/requests` and `/api/summary`. This is expected in the starter, because the API routes don't exist yet. If a 404 shows up *after* a route is built, check the folder path (`app/api/requests/route.js`) and the exported function name (`GET`, `POST`, `PATCH`).

### Seed CSV pitfalls (`data/seed-requests.csv`)
- **Commas inside quoted fields:** 4 descriptions contain commas, e.g. `"Water leak under the breakroom sink, floor 6"`. Splitting naively on `,` shifts columns, so a row's priority or status ends up holding part of its description.
- **Windows line endings (CRLF):** every line ends in `\r\n`. If you split only on `\n`, a hidden `\r` stays on the end of `status`, so `"Complete\r" !== "Complete"` and the tile counts come out wrong without any error.
- **Non-ASCII character:** row 3 has an em dash (—). Read the file as UTF-8 or it will show up garbled.
- **Oldest-first order:** the file is sorted oldest to newest, but the API and export must return newest first.
- **No `id` column:** ids must be assigned when the data is loaded. Check that the ids stay stable between requests, or the status dropdown will PATCH the wrong row.

### Hand-checked expected tile values (from the seed data)
- Open requests = **9** (6 In Progress + 3 New)
- Urgent open = **2**
- Completed this month = **5** (the latest month in the data is August 2026)
- If the tiles show different numbers, suspect the CRLF or quoting issues above first.

### Almost-right moments (follow up)
- [ ] **"Completed this month" dropped to 0 after adding a new request.** After POSTing a test request (dated 2026-11-23), the tiles went from **9 / 2 / 5** to **10 / 2 / 0**. The tile uses the month of the *most recent* request, and the newest request was now in November, which had no completed requests. The code matches the README rule, but on screen it looks like a bug.
  - Follow up: confirm with a hand count during test check #5. Decide whether this is the intended behavior for real coordinators, and consider listing it under Known limitations or using it as the almost-right example in the Assessment.

### Things to watch for later
- **Data vanishing on the live site:** compare how storage behaves on a laptop with how it behaves on a deployed host (README step 6).
- **"This month" logic:** `completed_this_month` must use the month of the *most recent request*, not today's date.
- **Validation bypass:** test the API directly (not just through the form), since the dropdowns don't guarantee valid values.
