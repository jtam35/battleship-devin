# Bug Report

This document tracks all bugs found during development, testing, and deployment of the Battleship game.

---

## BUG-001: Game files not deployed to main branch

- **Severity:** Critical (page does not load)
- **File(s) affected:** All game files (index.html, style.css, script.js, test.html, test.js, LICENSE, README.md)
- **Description:** GitHub Pages was configured to serve from the `main` branch, but all game files only existed on the feature branch (`devin/1781300364-battleship-game`). The main branch contained only a placeholder README.md. Visiting `https://jtam35.github.io/battleship-devin/` showed no game — just the raw README text.
- **Root cause:** The pull request (#2) containing all game code was never merged into main. GitHub Pages had no index.html to serve.
- **Fix applied:** Merged the feature branch into main, bringing all game files to the root of the main branch.
- **How to verify:** Visit `https://jtam35.github.io/battleship-devin/` — the game should load and display the placement phase with the 10×10 grid and Fleet sidebar.

---

## BUG-002: Game controls positioned beside board instead of above it

- **Severity:** Medium (layout is broken on wide viewports, game still playable)
- **File affected:** `style.css`, line 72–79 (`.game-controls` rule)
- **Description:** During the game phase, the "Show AI Thinking" toggle and "Restart Game" button appeared to the left of the Enemy Waters board instead of centered above both boards. On wider viewports (≥900px), the controls were small enough (~250px) to fit on the same flex row as the first board (~388px), resulting in a misaligned layout.
- **Root cause:** The `#game-phase` section uses `display: flex; flex-wrap: wrap` for its layout. The `.game-controls` element was a flex child of this container but had no `width` or `flex-basis` property to force it onto its own row. The flex algorithm placed it beside the first board-wrapper since both fit within the container's max-width (250px + 32px gap + 388px = 670px < 900px).
- **Fix applied:** Added `width: 100%` to `.game-controls`, forcing it to occupy the full row above both boards regardless of viewport width.
- **How to verify:** Start a game and observe the layout at ≥900px viewport — "Show AI Thinking" and "Restart Game" should appear centered on their own row above both grids, not beside the Enemy Waters board.

---

## BUG-003: Battle Log positioned beside board instead of below it

- **Severity:** Medium (layout is broken on wide viewports, game still playable)
- **File affected:** `style.css`, line 224–228 (`#message-log` rule)
- **Description:** The Battle Log section appeared to the right of the "Your Board" grid instead of centered below both boards. On wide viewports, the message log (~400px max-width) was narrow enough to share a flex row with the player board (~388px) since the two boards (808px total) already pushed the second board to a new row.
- **Root cause:** Same flex layout issue as BUG-002. `#message-log` had `max-width: 400px` and `margin: 1rem auto 0` for centering, but no `flex-basis` property to force a line break in the parent flex container. Without it, the flex algorithm placed it beside the player board on the second row.
- **Fix applied:** Added `flex-basis: 100%` to `#message-log`, forcing it onto its own row below both boards.
- **How to verify:** Start a game and fire a shot — the Battle Log should appear centered below both grids on its own row, not beside the player's board.

---

## BUG-004: Heatmap overlay displayed on wrong board

- **Severity:** Medium (feature works but shows misleading information on wrong grid)
- **File affected:** `script.js`, lines 383–434 (`renderHeatmap()` and `clearHeatmap()` functions)
- **Description:** The "Show AI Thinking" heatmap was overlaid on the AI's board (Enemy Waters — where the player shoots). This is incorrect. The heatmap represents the AI's probability estimates of where the *player's* ships are hiding, so it should be overlaid on the player's board (the board the AI is targeting).
- **Root cause:** `renderHeatmap()` was computing the probability grid using `aiShips` and `aiBoard` (showing where the player might find AI ships) and rendering it on `aiGridEl`. This made it a player targeting aid rather than a visualization of the AI's internal decision-making. Similarly, `clearHeatmap()` was clearing from `aiGridEl`. Additionally, the heatmap was not being re-rendered after the AI fires (since `renderBoard()` clears inline styles on re-render).
- **Fix applied:**
  1. Changed `renderHeatmap()` to use `playerShips`/`playerBoard`/`playerGridEl` — computing and displaying the AI's actual probability estimates of where player ships are
  2. Changed `clearHeatmap()` to clear from `playerGridEl`
  3. Added `renderHeatmap()` call after `renderBoard(playerGridEl, ...)` in `aiTurn()` so the overlay updates after each AI shot
  4. Added tooltip to the toggle label: "Heatmap shows where the AI thinks your ships are — warm = likely target, cool = ruled out."
- **How to verify:**
  1. Start a game and enable "Show AI Thinking"
  2. The player's board (right grid) should show a blue-to-red gradient on unfired cells
  3. The Enemy Waters board (left grid) should remain unaffected
  4. Fire a shot and wait for AI response — the heatmap should update on the player board after the AI fires
  5. Toggle off — player board returns to normal colors

---

## BUG-005: Difficulty selector and mobile fixes not deployed to live site

- **Severity:** Critical (features invisible to end users, mobile experience degraded)
- **File(s) affected:** All game files (index.html, style.css, script.js)
- **Description:** After implementing the difficulty selector (PR #9), post-match stats (PR #6), and mobile UX improvements (PR #8), none of these features appeared on the live GitHub Pages site at `https://jtam35.github.io/battleship-devin/`. The difficulty dropdown (Easy/Medium/Hard) was completely absent from the deployed game, and the mobile layout lacked the touch target and stacking improvements. Users on iPhone Safari saw the old, unoptimized layout.
- **Root cause:** PRs #6, #8, and #9 were never merged into the `main` branch. GitHub Pages serves from `main`, so the live site was still running the code from PR #5 (the last merged PR). All three features existed only on their respective feature branches. Additionally, merging all three required conflict resolution between PR #6 (stat counters) and PR #9 (difficulty/huntQueue variables) in `script.js`.
- **Fix applied:** Created a combined merge branch that includes all three PRs with conflicts resolved. The two conflict sites were:
  1. Variable declarations (line ~326): both PRs added variables after `messageLog` — resolved by keeping both sets (`playerShots`/`playerHits`/`aiShots`/`aiHits` from PR #6 and `aiDifficulty` from PR #9)
  2. `resetToPlacement()` (line ~773): both PRs added reset logic — resolved by keeping both (`playerShots = 0; playerHits = 0; aiShots = 0; aiHits = 0;` from PR #6 and `huntQueue = [];` from PR #9)
- **How to verify:**
  1. After merging, visit `https://jtam35.github.io/battleship-devin/`
  2. The difficulty dropdown (Easy/Medium/Hard) should be visible in the placement phase sidebar between the Rotate button and Start Game button
  3. On mobile (375px viewport / iPhone Safari): layout stacks vertically, cells are 32px touch targets, difficulty selector is visible
  4. Hard-refresh (Ctrl+Shift+R or Cmd+Shift+R) if the browser cached the old version

---

## BUG-006: Mobile touch events unreliable for ship placement

- **Severity:** Medium (ship placement flow broken or sluggish on iOS Safari)
- **File(s) affected:** `script.js` (lines 607–614, `onPlacementTouch`), `style.css` (lines 198–206, `.grid .cell`; line 50, `.btn`)
- **Description:** On real mobile devices (particularly iOS Safari), the ship placement touch flow was unreliable. Users reported "something is still wrong with the placement on mobile" despite the flow working correctly in Chrome's device emulation mode. Symptoms included sluggish/delayed cell selection, ghost preview not appearing on tap, and the Place Ship button not responding immediately.
- **Root cause:** Three issues combined:
  1. **Missing `touch-action: manipulation`** on grid cells and buttons — without this CSS property, iOS Safari applies a 300ms delay before firing `click` events (to detect potential double-tap-to-zoom gestures). The `touchend` handler fired immediately, but if it failed for any reason, the fallback `click` path was delayed.
  2. **`e.preventDefault()` in `onPlacementTouch`** created a single point of failure — it prevented the synthetic `click` event from firing after `touchend`. This meant only the `touchend` → `onPlacementTouch` code path worked on mobile. If `touchend` didn't fire correctly (e.g., slight finger movement interpreted as scroll, or iOS event sequencing quirks), no handler ran at all.
  3. **Missing `-webkit-tap-highlight-color: transparent`** on cells caused a blue flash overlay on iOS that obscured the ghost preview visual feedback.
- **Fix applied:**
  1. Added `touch-action: manipulation` to `.grid .cell` and `.btn` in `style.css` — eliminates the 300ms click delay on all mobile browsers
  2. Removed `e.preventDefault()` from `onPlacementTouch` in `script.js` — both `touchend` and `click` handlers now fire (they're idempotent, so running both is harmless and more robust)
  3. Added `-webkit-tap-highlight-color: transparent` to `.grid .cell` in `style.css`
- **How to verify:**
  1. Open the game on an iPhone (Safari) or Android (Chrome) at 375px viewport
  2. Tap a grid cell — the ghost preview should appear immediately (no delay)
  3. Tap "Place Ship" — the ship should place immediately
  4. Repeat for all 5 ships — the flow should be smooth with no missed taps

---

## Audit Results: Areas Verified Without Issues

The following areas were audited and confirmed to be bug-free:

### JavaScript (script.js)
- **Syntax:** No syntax errors. All functions properly closed, no missing semicolons or braces.
- **DOM element references:** All `getElementById()` calls match IDs in index.html (`status`, `placement-phase`, `game-phase`, `end-screen`, `end-title`, `end-message`, `restart-btn`, `restart-game-btn`, `start-btn`, `rotate-btn`, `ships-to-place`, `placement-grid`, `ai-grid`, `player-grid`, `heatmap-toggle`, `log-list`).
- **Event listeners:** Correctly attached — `DOMContentLoaded` triggers `initGame()`, placement clicks/hovers/touches handled, AI grid click handler checks `playerTurn` and `gameOver` flags.
- **initGame() invocation:** Properly guarded by `if (!window.__TEST_MODE__)` and registered on `DOMContentLoaded`. Since `<script>` is at end of `<body>`, the event hasn't fired yet when the listener is registered — timing is correct.
- **Ship placement validation:** `isValidPlacement()` correctly checks bounds via `shipCells()` and overlap via board state. `placeFleetRandomly()` loops until valid placement found.
- **AI probability calculation:** `buildProbabilityGrid()` correctly iterates horizontal and vertical placements, validates against MISS/SUNK cells, and zeros out already-fired cells.
- **Turn management:** `playerTurn` flag set to `false` immediately after valid shot, re-enabled after `aiTurn()` completes. `gameOver` flag blocks all clicks after win/loss.
- **Win condition:** `allSunk()` iterates all ships and returns true only when every ship has `sunk: true`.

### CSS (style.css)
- **Asset references:** No external assets referenced — all styling is self-contained.
- **Hidden class:** `.hidden { display: none !important; }` correctly hides elements. Removing the class restores the element's declared `display` value.
- **Responsive layout:** `@media (max-width: 600px)` correctly stacks boards vertically and reduces cell sizes.
- **Animations:** `@keyframes` definitions are syntactically correct. Animation classes auto-removed via JS `animationend` event listener — no memory leak.

### HTML (index.html)
- **Structure:** Valid HTML5 document with proper `<meta charset>` and viewport tag.
- **Asset paths:** `style.css` and `script.js` referenced with relative paths — works on GitHub Pages since index.html is at repo root.
- **No broken references:** No images, fonts, or external resources that could 404.
