# Module 3 Playbook Submission — Service Request Portal

**Name:** Kevin Seston
**Live URL:** https://morrowlane-service-requests.netlify.app
**Repo:** https://github.com/kevin-ship-it429/vbc-m3-starter

## What I built

*3–5 plain-English sentences about what you built and who it's for. No jargon — write it the way you'd explain it to a coworker who doesn't code.*

I built an online application to submit service requests, track request status and export requests. It's built for Morrowlane's Workplace Coordinators across Minneapolis, Chicago, Denver, and Austin. Everyone sees the same shared list, with tiles showing what's open, what's urgent, and what was completed this month, plus a one-click CSV export. It also protects the data by rejecting incomplete or invalid entries, blocking duplicate requests, and limiting how fast anyone can submit or change requests.

## Debug Log

*Document the bug you hit when your deployed site stopped behaving like your laptop. Fill in all five fields below. Keep it factual — what you saw, what you asked, what turned out to be true.*

**Symptom:** On my laptop, submitting the New request form saved the request and it showed up in the table. On the live Netlify site, the same valid submission didn't save. The form showed an error, the table didn't change, and the browser console showed `Failed to load resource: the server responded with a status of 500 ()`. Reading still worked on the live site (the table, tiles and CSV export all loaded); only saving failed.

**What I asked Claude:**

> I filled in a valid form submission and clicked submit request. It did not save and I got this error. Failed to load resource: the server responded with a status of 500 ()

**Root cause:** The app works on my laptop because the locally hosted app can edit files in the project folder on my laptop. On Netlify, the project files are read-only so it can read the CSV, but it can't write to it, so every save crashed.

**Fix:** I moved storage from the CSV file to a Supabase database. I created a `requests` table in Supabase and imported the data from the CSV file. I asked Claude to rewrite `lib/requests.js` to use Supabase instead of the CSV file. I added `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `.env.local` and to Netlify's environment variables. I asked Claude to commit and push the updated app to Netlify.

**Verification:** [YOUR VERIFICATION — what you did on the live site to prove the bug was actually gone, not just quiet]

On the live site I submitted two new requests, refreshed, changed one to In Progress and the other to Complete, and refreshed again. Both requests and their new statuses were still there, and the tiles updated to match.

## Test pass results

*Run all five checks against your live site and record what happened. "Result" is pass or fail plus what you actually saw. "Fix made" is what you changed, or "None needed."*

| # | Check | What I did | Result | Fix made |
|---|---|---|---|---|
| 1 | Valid entry | On the live site, submitted "TEST - Happy Path" (Austin, Medium) with a valid description, then refreshed. | **Pass.** Saved as #29 with status New, listed first after refresh, Open requests tile went up by 1 (14 → 15). | None needed. |
| 2 | Empty form | Submitted a fully blank form, a form with only spaces/tabs, an empty request body, and a form with only Description blank. | **Pass.** All rejected with 400 and a message naming the missing fields, e.g. "Please fill in all fields: Requester name, Location, Description and Priority are required." / "Description is required." Nothing saved. | None needed. |
| 3 | Duplicate-ish | Submitted the identical request "TEST - Duplicate" (Chicago, High) twice in a row. | **Fail.** Both saved as #30 and #31, one second apart, counting twice in Open requests. | Added a server-side duplicate check: an open request with the same requester, location, and description (ignoring capitalization/spacing) is rejected with 409 "This looks like a duplicate of request #30…". |
| 4 | Absurd values | Tried a 101-char name, 501-char description, location "Paris" and "denver", priority "ASAP", a number as the name, non-JSON, sneaking in status "Complete"/id 1, `<script>` and SQL-looking text, and status "Done" / ids 0, -1, 1.5, 99999999999999999999 on the status update. | **Pass.** Every bad value rejected with a clear 400/404 message; exactly 500 chars saved; sneaked-in status/id ignored (saved as New with a new id); script and SQL text stored as plain text and shown harmlessly; table intact. | None needed. (Requester name limit of 100 was added earlier) |
| 5 | Hand-checked tile math | Pulled every request from the live site and counted by hand: status not Complete; open + Urgent; Complete in the month of the newest request (Nov 2026). | **Pass.** Hand count 20 / 2 / 1 matched the tiles exactly (20 / 2 / 1). Urgent open = #22 Alison Vo and #15 Priya Raghunathan; completed in Nov = #25 Bob. | None needed. |

## Known limitations

*Be honest. List 3–5 things your app can't do or doesn't protect against, one bullet each — the things you'd want a real user to know before trusting it.*

- **No logins or audit trail.** Anyone with the link can view every request, submit new ones and change any request's status, and the app doesn't record who changed what or when.
- **No editing or deleting in the app.** A typo in a request, or a wrong priority, can't be fixed from the page. Removing a request requires going into Supabase directly.
- **The duplicate check only catches near-exact copies.** It blocks an open request with the same requester, location and description (ignoring capitalization and spacing), but the same problem described in different words still gets through. Two identical submissions sent at the exact same moment could also both be saved.
- **"Completed this month" can look wrong.** It counts completions in the month of the *newest* request, not today's month, so it drops to 0 or 1 as soon as the first request of a new month comes in. Months are also based on UTC time, so a request submitted on the last evening of a month in Minneapolis can count toward the next month.
- **Only plain checks on the text.** The app limits length and requires every field, but it can't tell whether a name or description is real. "asdf" or "1234" is accepted as a valid request.

## Assessment

*Around 250 words, first person. Where did AI move fast for you? Describe one genuine almost-right moment — something that looked correct and wasn't — and how you caught it. What would you prompt differently next time?*


AI moved very fast setting up the initial APIs. It was prompting me to setup the next missing API before I said anything. An almost-right moment occurred while verifying absurd entries, I tested a 500 char description and it saved correctly but caused the table to expand outside the white grid. An automated test didn't catch this, needed a visual check. Next time I would prompt the AI to confirm visual layout wasn't adversely affected by edge cases and if it couldn't confirm it to ask me to.

Another almost-right moment came during the Supabase fix. I added the Supabase keys to Netlify and redeployed, but the live site still returned the same 500 error. Everything looked set up correctly, but the new code had never been committed or pushed to GitHub, so Netlify had just rebuilt the old CSV version. The tile numbers gave it away: the live site showed the old CSV totals (9 / 2 / 5) while my laptop showed the Supabase totals (10 / 2 / 0). Once the code was pushed, saving worked on the live site. I learned that "deployed successfully" only means the build worked, not that it's running the code I think it is.

After my own five-part test pass, I ran a separate security audit with OpenCode, and it found problems my testing missed. There was no rate limiting, so a script could flood the database or flip statuses back and forth. A failed page load showed "No requests to show yet," which would make a coordinator think everything had been deleted. And the fix I had just made for long text wrapping added hidden characters that would come along whenever someone copied a name or description. That last one was a new problem caused by a fix, which showed me that every fix needs its own review. Having a second tool check the work caught things neither I nor the first AI had thought to test.