# Demo script and recording plan

The organisers' limit is **under 1 minute**, and judges don't have to watch past 1:00. That's why this cut runs 57 s instead of the two-minute structure in the brief. Timings are in `storyboard.md`.

## How the footage was recorded (reproducible)

1. Boot the iPhone 17 simulator and set a clean status bar:
   ```bash
   xcrun simctl status_bar booted override --time 9:41 --batteryState charged --batteryLevel 100 --wifiBars 3 --cellularBars 4
   ```
2. In Safari, log in to Reddit and open today's post on r/TwoLampsGame.
3. Start recording:
   ```bash
   xcrun simctl io booted recordVideo --codec=h264 raw.mp4
   ```
4. Play the run below with real taps, then stop with Ctrl-C.

| Beat | Action | What it shows |
|---|---|---|
| Feed | Hold on the post, then tap **Play** | The inline card with the real puzzle |
| First hint | (no action) | "Tap a tile to stack a block" pulses the centre tile |
| Build | Tap stacks | Shadows update live; matched columns turn gold |
| Mistake | Over-stack one column | Red hatching and a red light; hint: "Long-press a stack to remove a block" |
| Fix | Long-press | Block removed |
| Solve | Finish a valid build (20 blocks) | Lamps flare, windows light, sparks; "Lamps lit!" sheet; par revealed |
| Chase | **Go for more**, then add 7 blocks | "Flawless!", ★★★, First try |
| Social | **Post to comments**, flair toggle | "Posted", "Flair on" toast |
| Proof | Back to the post, scroll to comments, back to the card | The comment with flair in the thread; the card now shows ★★★ |

## Editing (reproducible)

```bash
python3 make_video.py
```
`make_video.py` cuts `raw.mp4` by timestamps, composites it onto a background drawn in code, adds the captions and the `say` voiceover, and writes `demo.mp4`.

```bash
python3 make_stills.py
```
`make_stills.py` builds the gallery images and covers from the same real screenshots.

The raw recording (about 400 MB) is not in the repo.

## YouTube upload

- **Title:** Two Lamps: a daily shadow puzzle for Reddit (Devvit)
- **Visibility:** **Public**. This is required by the rules.
- **Thumbnail:** `../media/thumbnail.png`
- **Captions:** upload `subtitles.srt` as English
- **Description:**

> Two lamps light a tiny plaza, each throwing a shadow on its own wall. Stack blocks until both shadows match the dashed outlines, then chase par: the fewest blocks the shadows allow (or the most, on Full House Fridays). A new puzzle every day, with a different twist each weekday. Results, streak flair and comments live right on the Reddit post.
>
> Built with Reddit's Developer Platform (Devvit Web), React and Canvas.
> Play: https://www.reddit.com/r/TwoLampsGame/
> Footage: the live app on Reddit mobile web (iPhone simulator). Sped-up sections are marked.
