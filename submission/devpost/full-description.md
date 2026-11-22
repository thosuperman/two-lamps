# Two Lamps: the Devpost story

> Paste each section into the matching Devpost field. Everything described here is implemented and was tested in a live Reddit playtest.

## Inspiration

There is an old puzzle about two lamps and a pile of wooden blocks. Each lamp throws the pile's shadow onto a different wall. Can you guess the pile from the two shadows? And how few blocks could you get away with?

We loved that it is easy to explain and hard to master. Any arrangement that casts the right shadows "works", so everyone finishes. But the elegant answer, where one tall tower quietly does the job for both walls, takes real thought. That gap between *solved* and *solved beautifully* felt perfect for a daily game: everyone gets a win, and there is always one more block to shave off before tomorrow's plaza appears.

## What it does

Two Lamps is a daily puzzle that lives inside a Reddit post.

- **The puzzle.** A small plaza at dusk, with a plaster wall on each side and a lantern lighting each wall. Each wall shows a dashed silhouette: the shadow you need to cast. Tap a tile to stack a block; long-press, or switch to Remove, to take one off. The shadows update as you build. A column glows gold when it fits and turns red and hatched when it is too tall.
- **Two goals in one session.** First, make both shadows match. The windows light up, the lanterns flare, and you have solved it. Then par is revealed: the fewest blocks the shadows allow. Can you get there?
- **A weekly rhythm.** Every UTC day has a new puzzle, and each weekday changes how you think:

  | Day | Twist |
  |---|---|
  | Monday | Warm-up (small plot) |
  | Tuesday | Big Plot |
  | Wednesday | Rock Garden (some tiles can't be built on) |
  | Thursday | Boulder Field (more rocks, fewer shortcuts) |
  | Friday | Full House (same shadows, but the **most** blocks wins) |
  | Saturday | Third Lamp (a lamp overhead lights the exact tiles you must fill) |
  | Sunday | Grand Plot |

- **Right in the feed.** The post card shows the real puzzle, walls and silhouettes included, so you can size it up before tapping Play. Once you've played, the card shows your own lit build and stars.
- **Results that mean something.** The result card shows your stars, your blocks against par, a "First try" badge if you reached par without resetting, and a histogram of how this subreddit did today, with your bar highlighted ("Better than X% of N players").
- **Streaks and flair.** Solve the daily puzzle on consecutive days to grow a streak. Opt in, and your subreddit flair shows it: "🏮 Two Lamps · 🔥 5-day streak".
- **Comments as the scoreboard.** One tap on "Post to comments" adds your result to the day's thread from your account (only when you tap, and only once per puzzle):
  > 🏮 Two Lamps #4 · Full House
  > ★★★ 27 blocks (par 27, most possible) · first try

  The thread becomes the place to compare results and argue about Wednesday's rocks.
- **No rules screen.** New players get one hint at a time ("Tap a tile to stack a block" → "Fill each dashed shadow exactly"). A "?" opens a three-picture explainer if you want it.

## How we built it

- **Devvit Web.** The game is an Interactive Post with two entry points: an inline feed card (`splash.html`) and an expanded game view (`game.html`). Both use React 19, built with Vite.
- **A hand-drawn renderer.** The plaza is drawn on a 2D canvas every frame: isometric blocks drawn back to front, plaster walls with lamplight, cast shadows, flickering lanterns, rocks, overhead light pools and spark particles. There are no image assets. Every visual is drawn in code, and the sound effects are synthesised with the Web Audio API.
- **A shared, provable engine.** One TypeScript module runs on both client and server: shadow projection, validation and **exact par**.
  - For the classic two-wall puzzle, par is a closed formula: for each height level, a stack can serve a row and a column at once, so par is `Σ h · (rows + cols − maximum bipartite matching)`.
  - Rocks and the overhead footprint fit the same per-level matching.
  - We verify par against an exhaustive search of every possible build on small grids, in our unit tests.
- **Deterministic daily content.** Each day's puzzle is generated from a hash of the date, so the client can show it instantly and the server regenerates the identical puzzle to score it. Quality filters reject dull days: par must sit well below the "fill everything" count, there must be enough distinct heights, rocks must actually break an easy pairing, and the overhead lamp must change the answer.
- **Server (Hono on Devvit).**
  - `/api/state` returns the player's record, streak and the day's histogram.
  - `/api/solve` re-validates every submitted build before saving anything, so scores can't be forged by editing the client.
  - Records, histograms, streaks, flair opt-ins and share locks live in **Devvit Redis**.
- **Reddit-native features.**
  - The **scheduler** posts "Two Lamps #N · Twist" at 00:00 UTC.
  - An **install trigger** creates the first post.
  - A **moderator menu** action is the manual fallback.
  - **User actions** (`runAs: 'USER'`) handle the opt-in comment.
  - The **flair API** handles the streak flair.
  - The **native share sheet**, with a clipboard fallback, handles sharing.

## Challenges we ran into

- **Making "fewest blocks" provably fair.** A daily puzzle with a par score is only fun if par is right. We worked out an exact matching-based formula and then refused to trust it until brute force agreed on every random case.
- **Readable 3D on a phone.** Tall front stacks can hide the shadows behind them. We added a status light above every wall column (gold, red or hollow), so you can always read the state of each wall even when blocks cover it.
- **Fast fingers.** In device testing, rapid taps on the same tower were occasionally lost or landed on the stack behind it, because the next tap arrived before the screen had re-rendered. We made each tap update the build and the hit-test immediately, then stress-tested with taps 10 ms apart.
- **Living inside the feed.** The inline card must never trap scrolling, and the expanded view has to fit any phone. We tested both on real Reddit mobile web.

## Accomplishments that we're proud of

- **A par score you can trust:** it is mathematically exact, and checked against brute force in our tests.
- **One shared engine:** the same code scores on the server and draws on the client, so what you see is exactly what gets scored.
- **Everything drawn in code:** no image assets, yet the plaza has a clear look of its own, from flickering lanterns to the windows lighting up when you solve.
- **A loop that feels like Reddit:** the post you play is the same post where your community's results and comments collect, every day.

## What we learned

- Daily puzzles live or die on fairness and legibility, much more than on difficulty.
- Contextual hints beat tutorials. Three short nudges explained the game better than any rules screen we drafted.
- Devvit Web lets a small project feel native: scheduler, Redis, flair, user actions and the share sheet are all a few lines each.

## What's next for Two Lamps

- **Community Sunday.** Players build a puzzle; the subreddit votes; the winner becomes Sunday's daily, with the creator credited. Every build is automatically solvable, because the creator's own build is a solution.
- **The street.** A row of each day's lit builds from the subreddit, growing into a little town over the weeks.
- **Fixed-block Thursdays,** with pre-placed blocks you have to work around.
- An **archive** of past plazas for streak repairs and catch-up play.
