# Battleship Build Prompts

## Prompt 1

Build a single-page Battleship game (HTML/CSS/JS, no frameworks, no build step) playable in the browser against an AI opponent.

GAME RULES:
- Standard 10x10 grid (columns A-J, rows 1-10)
- Standard fleet: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2)
- Player places their fleet manually; AI places its fleet randomly using valid placement rules
- Turn-based: player fires first, then AI fires, alternating
- Track hits, misses, sunk ships, and detect win condition for both sides
- Standard Battleship rules do not require ships to be non-adjacent — ships may touch diagonally or orthogonally. Enforce only overlap and off-board constraints.

PLACEMENT UX:
- Show a sidebar list of ships to place, with the current ship highlighted
- Show a ghost/preview of the ship on the grid as the player hovers over cells
- Press R or right-click to rotate orientation before placing (right-click handler must call event.preventDefault() to suppress the browser context menu)
- On touch devices, show the ghost preview on the last-tapped cell and confirm placement with a second tap on the same cell (or a dedicated "Place" button). R-key rotation falls back to a visible "Rotate" button on mobile.
- Clicking a valid cell places the ship; prevent overlapping or off-board placement
- After all 5 ships are placed, show a "Start Game" button to transition to the game phase

AI OPPONENT LOGIC (probability density targeting):
Implement the AI's targeting using a probability heatmap, NOT random or simple hunt-target:
1. Maintain a probability grid (10x10) recalculated each AI turn
2. For each remaining AI-side knowledge of the player's unsunk ships, and for each empty/unknown cell, count how many valid orientations/placements of each remaining ship size would cover that cell without overlapping any cell already known to be a miss or a sunk ship
3. Sum these counts per cell to produce the probability grid
4. AI fires at the highest-scoring unknown cell (break ties randomly)
5. Recalculate the grid after every shot (hit, miss, or sink) so the AI's targeting adapts in real time
6. Add a ~600ms delay before the AI fires so the player can register their shot result before the AI responds

UI/UX:
- Two grids side by side on desktop (player's board with ships visible, AI's board showing only hits/misses/sinks)
- On narrow viewports (< ~600px), stack the two grids vertically (AI board on top, player board below)
- Clear visual states for empty/ship/hit/miss/sunk
- Turn indicator and simple status messages (e.g. "You hit a ship!", "AI sunk your Cruiser!")
- Win/loss screen with restart option
- Clean, modern, responsive layout
- Use a simple, intentional color palette (not default browser styling)

STRUCTURE:
- index.html, style.css, script.js (separate files)
- Keep game logic functions (probability calculation, placement validation, win detection) as pure functions that take board state as arguments and return values — no direct DOM access inside logic functions
- Wrap all DOM initialization in an initGame() function. Call it from a single DOMContentLoaded listener at the bottom of script.js. Pure logic functions must be defined at module scope so test.html can load script.js and call them directly without triggering any DOM setup.
- Code should be organized into clear functions/modules for: board generation, ship placement, rendering, AI probability calculation, AI targeting, game state/turn management
- Add inline comments explaining the probability heatmap logic specifically, since this is the core differentiator

Do not add multiplayer, accounts, sound, or backend — this is a static, client-side single-page app.

## Prompt 2

Enhance the existing Battleship game with the following additions:

1. "Show AI Thinking" toggle:
   - When enabled, overlay the AI's current probability heatmap on the AI's board as a heat-color gradient (low probability = cool color, high probability = warm color) on unknown cells
   - Update this overlay live as the AI's grid recalculates each turn
   - Toggle should be clearly labeled and off by default

2. UX polish:
   - Add subtle animations for hits, misses, and ship-sunk events (brief highlight or transition, no heavy effects)
   - Add a "Restart Game" button that resets both boards and game state cleanly
   - Add a turn-by-turn message log (scrollable, last ~5-10 events) showing shot results for both sides
   - Verify the mobile-stacked layout from Prompt 1 still works well at ~375px viewport

3. Edge case handling — verify and fix as needed:
   - Prevent firing on the AI's turn or on already-targeted cells
   - Prevent invalid ship placements during setup (overlap, off-board)
   - Handle rapid/double-clicks during AI's turn without breaking game state

4. Basic test coverage:
   - Write test.js as a browser-runnable script and a test.html that loads script.js then test.js. Tests should log PASS/FAIL to the console. No Node.js or npm required.
   - test.html must not trigger game initialization — it relies on the initGame() separation from Prompt 1, so the pure logic functions are available without any DOM setup running.
   - Cover: probability grid calculation correctness on a known board state, ship placement validation logic, and win-condition detection
   - Add a comment block at the top of test.js explaining how to run the tests (open test.html in a browser). The README will be written in a later step.

Keep the existing file structure (index.html, style.css, script.js) — add test.js and test.html as new files. No new dependencies unless minimal and well-justified.

## Prompt 3

Finalize this project for public release:

1. Ensure index.html is at the repo root so GitHub Pages can serve it directly. Note: GitHub Pages must be enabled manually in the repo Settings → Pages → Source: main branch / (root) — this is a manual step the user will complete, not something you can do. Document this in the README as a setup note if relevant, but do not attempt to verify a live URL.

2. Write a README.md including:
   - Short project description (live demo link to be added manually by the user once Pages is enabled)
   - How to play (rules summary)
   - Brief explanation of the AI opponent's probability-based targeting logic (2-3 paragraphs, written for a non-technical reader)
   - One paragraph on the "Show AI Thinking" feature and why it's included (transparency into AI decision-making)
   - How to run locally (open index.html in a browser)
   - How to run tests (open test.html in a browser)

3. Clean up the repo:
   - Remove dead/commented-out code, but preserve all explanatory inline comments — especially the probability heatmap documentation added in Prompt 1
   - Ensure consistent formatting across all files
   - Add a LICENSE file (MIT)

4. Final verification pass (local only):
   - Confirm the game works end-to-end by reasoning through the code: ship placement, full game to win and to loss, AI thinking toggle, restart
   - Report any remaining known issues or limitations in a "Known Limitations" section of the README
