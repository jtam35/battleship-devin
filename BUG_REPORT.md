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
