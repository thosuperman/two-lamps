# Requirements and compliance checklist

Sources, read on 2026-11-21:
- Official Rules: https://redditgameofday2026.devpost.com/rules
- Overview: https://redditgameofday2026.devpost.com/

Status key:
- ✅ **Done and verified:** I checked it myself in this environment.
- 🟡 **Prepared, needs you:** the material is ready; one account-level action remains.
- ⬜ **Not done.**

## Key facts (from the official pages)

| Item | Official text / value |
|---|---|
| Submission deadline | **Tue Dec 8, 2026, 6:00 pm Pacific Time** (Devpost shows "Dec 9, 2026 @ 11:00am GMT+9") |
| Judging | Dec 9–16, 2026. Winners announced on or around Dec 17, 3:00 pm PT |
| Eligibility | Individuals of legal age of majority, teams or organizations. Excludes OFAC/embargoed regions, Brazil, Quebec, Russia, Crimea, Cuba, Iran, North Korea, Syria, and Reddit/Devpost affiliates |
| Prizes | Best Daily Game $15,000 (1) · Best Ported Daily Game $6,000 (1, for porting owned IP, which does not apply to us) · Honorable Mentions $1,000 (10) · Devvit Helpers $500 (6) · Feedback $200 (5). **A project can win only one prize** |
| Judging | Stage 1: pass/fail viability (fits the theme, uses Devvit). Stage 2: four **equally weighted** criteria: **Delightful UX, Polish, Reddit-y, Daily Content**. Ties are broken in that order |
| Video | **Optional**. Must be **under 1 minute** (judges need not watch past 1:00), show the project working on its device, and be **public on YouTube, Vimeo, Facebook Video or Youku**, linked in the form |
| App listing | Required: `developers.reddit.com/apps/{app-name}`, created on upload |
| README | Required: **a detailed README.md in the app's root directory** describing the game and how to play |
| Demo post | Required: link to the **test subreddit** and **a post running the game**. The subreddit must be **public** (or have `dr-admin-approve` installed). Testing: "a public subreddit with less than 200 members" |
| Repository | **Optional:** public repo URL |
| Feedback survey | Optional (Feedback prize) |
| Publishing | Overview: "**PLEASE DO NOT SUBMIT YOUR APP FOR PUBLISHING** … the app can remain private" (upload and playtest only) |
| Language | English (or English translations) |
| AI use | Not restricted by the Official Rules. The overview says: "Did you use AI? Fantastic! But it shouldn't be obvious the moment we open your app." |
| IP | Only materials you own or have licensed. Must be the entrant's original work. Third-party SDKs must be used within their terms |
| New project | Must be newly created, or significantly updated during Nov 11 – Dec 8, 2026 |
| Availability | Free and unrestricted for judges until judging ends |

## Compliance checklist

| # | Requirement | Status | Evidence / action |
|---|---|---|---|
| 1 | Built on Devvit Web with Interactive Posts | ✅ | React + Canvas client and Hono server via `@devvit/web` 0.15.3. Inline entry `splash.html`, expanded entry `game.html` |
| 2 | Daily game with a satisfying daily loop | ✅ | A deterministic puzzle each UTC day, with a twist per weekday. Cron creates the post at 00:00 UTC (it ran unattended on Nov 19 and Nov 20) |
| 3 | Installs and runs consistently | ✅ | Running on r/two_lamps_dev_dev (playtest) and installed on r/TwoLampsGame (v0.0.2). Played end to end on an iPhone 17 simulator in real Reddit mobile web |
| 4 | Text description of features | 🟡 | Ready in `full-description.md`; paste it into Devpost |
| 5 | Video under 1 minute, public on YouTube or Vimeo | ✅ | https://youtu.be/HnOmt2mEe-A: **Public**, 57 s, playable logged out (checked Nov 23) |
| 6 | App listing link | ✅ | https://developers.reddit.com/apps/two-lamps (uploaded Nov 20, 2026 UTC) |
| 7 | README.md in the app root | ✅ | `app/README.md`: how to play, twists, screenshots, architecture, setup |
| 8 | Public demo subreddit with fewer than 200 members | ✅ | https://www.reddit.com/r/TwoLampsGame/, created Nov 20, 2026 UTC, **public**, 1 member. `two-lamps` v0.0.2 installed |
| 9 | Post running the game | ✅ | https://www.reddit.com/r/TwoLampsGame/comments/1y17t8u/. Played end to end on it: solved, par, comment and flair. The cron adds a new post daily. An earlier post from the old `two-lamps-dev` name was removed |
| 10 | Do not submit for publishing | ✅ | Uploaded and installed only. `npm run launch` was never run |
| 11 | English materials | ✅ | All copy is in English |
| 12 | Original work and licences | ✅ | Code written for this project. Template from `reddit/devvit-template-react` (BSD-3-Clause, attributed). No third-party art, fonts or audio: all visuals are drawn in code, and the sounds are synthesised |
| 13 | Created during the submission period | ✅ | Research started Nov 16. The app was scaffolded Nov 16–21, 2026 |
| 14 | Public repo (optional) | ✅ | https://github.com/thosuperman/two-lamps (public) |
| 15 | Logged-out judges can reach the demo | 🟡 | Logged-out **mobile web** showed an "Unreviewed Content" wall for the new dev subreddit (seen Nov 20). TODO: open r/TwoLampsGame in a private window, and tell judges to use desktop or the Reddit app |
| 16 | Free, unrestricted access until Dec 16 | ✅ | No paywall, no payments permission. Keep the subreddit public and the app installed until Dec 16 |
| 17 | Devvit Rules (no on-the-nose Reddit theming, no scroll traps, user actions only on explicit tap) | ✅ | No Snoo or karma theming. Inline card verified not to trap scroll. Comments only from an explicit "Post to comments" tap, labelled "from your account". Flair is opt-in |
