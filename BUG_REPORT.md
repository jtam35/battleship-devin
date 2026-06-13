# Bug Report

## BUG-001: Game files not deployed to main branch

- **File(s) affected:** All game files (index.html, style.css, script.js, test.html, test.js, LICENSE, README.md)
- **Description:** GitHub Pages was configured to serve from the `main` branch, but all game files only existed on the feature branch (`devin/1781300364-battleship-game`). The main branch contained only a placeholder README.md.
- **Root cause:** The pull request (#2) containing all game code was never merged into main. GitHub Pages had no index.html to serve.
- **Fix applied:** Merged the feature branch into main, bringing all game files to the root of the main branch.
- **How to verify:** Visit `https://jtam35.github.io/battleship-devin/` — the game should load and display the placement phase with the 10×10 grid and Fleet sidebar.

## BUG-002: Game controls positioned beside board instead of above it

- **File affected:** `style.css`, line 72–79 (`.game-controls` rule)
- **Description:** During the game phase, the "Show AI Thinking" toggle and "Restart Game" button appeared to the left of the Enemy Waters board instead of centered above both boards. On wider viewports (≥900px), the controls were small enough to fit on the same flex row as the first board.
- **Root cause:** The `.game-controls` element was a flex child of `#game-phase` (which uses `display: flex; flex-wrap: wrap`) but had no `width` or `flex-basis` property to force it onto its own row. At ~250px wide, it fit beside the ~388px board within the 900px container.
- **Fix applied:** Added `width: 100%` to `.game-controls`, forcing it to occupy the full row above both boards.
- **How to verify:** Start a game and observe the layout — "Show AI Thinking" and "Restart Game" should appear centered on their own row above both grids, not beside the Enemy Waters board.

## BUG-003: Battle Log positioned beside board instead of below it

- **File affected:** `style.css`, line 224–228 (`#message-log` rule)
- **Description:** The Battle Log section appeared to the right of the "Your Board" grid instead of centered below both boards. Similar to BUG-002, the message log was narrow enough to share a flex row with the player board.
- **Root cause:** `#message-log` had `max-width: 400px` but no `flex-basis: 100%` to force a line break in the flex container. It fit alongside the player board on the same row.
- **Fix applied:** Added `flex-basis: 100%` to `#message-log`, forcing it onto its own row below both boards.
- **How to verify:** Start a game and fire a shot — the Battle Log should appear centered below both grids, spanning the full container width (up to its 400px max-width), not beside the player's board.
