# Technical details

## Built with (verified from `package.json`)

| Layer | Technology |
|---|---|
| Platform | Reddit Developer Platform, **Devvit Web 0.15.3** (`@devvit/web`, `@devvit/start`, `devvit` CLI) |
| Client | **React 19.3**, **TypeScript 6.0**, HTML5 **Canvas 2D** renderer, Web Audio API (synthesised sound), CSS with Tailwind 4 base |
| Build | **Vite 8.3** (`@vitejs/plugin-react`, `@tailwindcss/vite`) |
| Server | **Hono 4.13** on `@hono/node-server`, running in Devvit's serverless Node runtime |
| Storage | **Devvit Redis**: hashes and strings |
| Reddit capabilities | Interactive Posts (inline and expanded entry points), Scheduler (cron), app-install trigger, moderator menu action, Reddit API (submit custom post, flair), **User Actions** (`runAs: 'USER'` comment), client `showShareSheet`, `showToast`, `showLoginPrompt`, `requestExpandedMode` |
| Quality | ESLint 10 + typescript-eslint, Prettier, Node's built-in test runner (`node --test` with type stripping) |

There are no external services, fetch domains, image files, fonts or audio files. Everything is drawn or synthesised in code.

## Architecture

```
            ┌─────────────── shared/ (runs on client AND server) ───────────────┐
            │ engine.ts  projections · validation · exact par · stars · RNG     │
            │ daily.ts   date → deterministic puzzle (weekday twist + filters)  │
            └───────────────────────────────────────────────────────────────────┘
 client/ (inline + expanded webviews)          server/ (Hono on Devvit)
 ├ splash.tsx   feed card: today's plaza       ├ routes/api.ts   /api/state /solve /share /flair
 ├ game/App.tsx game screen + hints            ├ core/game.ts    verify · record · histogram · streak · flair
 ├ game/scene.ts canvas renderer               ├ core/daily.ts   one post per UTC day
 ├ game/Board.tsx input + animation loop       ├ routes/scheduler.ts  cron 0 0 * * *
 └ game/ResultSheet.tsx result card            └ routes/menu.ts · triggers.ts
```

## Exact par

For two walls with row targets `R` and column targets `C`, every row and every column whose target is `h` needs a stack of height exactly `h`. One stack can serve both a row and a column only when both targets equal `h`, so:

```
par = Σ over heights h of  h · ( |rows with R=h| + |cols with C=h| − maxMatching_h )
```

`maxMatching_h` is the maximum bipartite matching between those rows and columns over buildable tiles. Rocks just remove edges.

The third lamp (an exact footprint) costs 1 per covered tile, plus `h − 1` per raised stack on the same matching.

Full House days use the closed-form maximum: every allowed tile at `min(R_i, C_j)`.

`src/shared/engine.test.ts` checks par against an exhaustive search of every possible build, on random 3×3 grids with rocks and footprints.

## Anti-cheat and fairness

- The client sends only the build. The server regenerates the day's puzzle, checks `matches()`, computes blocks and stars itself, and then writes the record.
- Records keep the best build per player per day. The histogram is adjusted when a best improves, so each player counts once.
- Streaks count only the newest daily puzzle (`day === today`). Older posts stay playable for fun.

## Redis keys

| Key | Type | Purpose |
|---|---|---|
| `rec:{day}` | hash: user → JSON | Best blocks, first solve, stars, first-try flag, best build |
| `hist:{day}` | hash: blocks → count | Today's histogram, by each player's best result |
| `par:{day}` | hash: user → "1" | Players who reached par |
| `streak:{user}` | hash | `last`, `count`, `max` |
| `flair:{user}` | string | Streak-flair opt-in |
| `shared:{day}:{user}` | string | Once-per-puzzle comment lock |
| `daily:{day}:post` | string | Guards against a second daily post on the same day |

## Reddit permissions requested (`devvit.json`)

- `redis: true`
- `reddit.scope: "moderator"`, needed to set user flair
- `reddit.asUser: ["SUBMIT_COMMENT"]`, for the explicit "Post to comments" action only

## How Reddit features change the gameplay

- **The post is the game and the scoreboard.** The feed card shows the real puzzle. Results collect in the same thread, and the histogram is per subreddit.
- **Streak flair** turns a private habit into a visible badge inside the community.
- **Scheduler posts** keep a fresh plaza at the top of the subreddit every day without moderator effort.
- **Comment-as-you** is opt-in and labelled, so the thread fills with real, comparable results rather than spam.
