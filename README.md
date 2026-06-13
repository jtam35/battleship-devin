# Battleship

A single-page Battleship game playable in the browser against an AI opponent. No frameworks, no build step, no backend — just HTML, CSS, and JavaScript.

<!-- Add your live demo link once GitHub Pages is enabled:
[▶ Play Live](https://your-username.github.io/battleship-devin/)
-->

## How to Play

1. **Place your fleet** — Drag your cursor over the grid to preview ship positions. Click to place. Press **R** or right-click to rotate between horizontal and vertical orientation. On mobile, tap a cell to preview, then tap again to confirm.

2. **Fire at the enemy** — Click cells on the "Enemy Waters" grid to fire. Hits appear as red ✕, misses as gray dots. Sink all five enemy ships to win.

3. **Standard rules** — 10×10 grid, standard fleet: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2). Players alternate turns. Ships may touch but cannot overlap.

## The AI Opponent

This isn't a random-shooting AI. It uses **probability-density targeting** — a technique that calculates the most statistically likely location of your remaining ships on every single turn.

Here's how it works: before each shot, the AI considers every ship it hasn't sunk yet and asks, "for each remaining ship, how many valid positions could it occupy that include this particular cell?" A "valid position" is one where the ship doesn't overlap any cell the AI already knows is a miss or part of a sunk ship. The AI counts these valid positions for every cell on the board and produces a probability heatmap — cells with higher counts are more likely to contain a ship.

The AI then fires at the cell with the highest probability score (breaking ties randomly). This approach is powerful because it naturally concentrates fire around existing hits — if the AI has already hit part of a ship, the adjacent cells will have very high scores since many valid ship placements pass through those cells. At the same time, when no hits are active, the algorithm favors center-board cells (which can be covered by more orientations) over corners and edges, making its "hunting" pattern statistically optimal rather than random.

## "Show AI Thinking"

During gameplay, you can toggle **"Show AI Thinking"** to visualize the AI's probability heatmap overlaid on the Enemy Waters board. Unknown cells are colored on a gradient from blue (low probability) through green and yellow to red (high probability). This feature exists to make the AI's decision-making transparent — you can see exactly why it targets certain cells and how its strategy adapts as the game progresses. It's a window into the algorithm that's trying to beat you.

## Run Locally

No installation required. Serve the files with any HTTP server:

```bash
cd battleship-devin
python3 -m http.server 8080
# Open http://localhost:8080 in your browser
```

Or simply open `index.html` directly in a browser (file:// protocol works fine).

## Run Tests

Open `test.html` in any modern browser and check the developer console (F12 → Console). The test suite exercises the pure game-logic functions — ship placement validation, probability grid calculation, and win-condition detection — and logs PASS/FAIL for each assertion. No Node.js or npm required.

```
Results: 46 passed, 0 failed
ALL TESTS PASSED
```

## GitHub Pages Deployment

This project is ready to serve from GitHub Pages. To enable:

1. Go to **Settings → Pages** in your repository
2. Under **Source**, select **Deploy from a branch**
3. Choose **main** branch and **/ (root)** folder
4. Click **Save**

Your game will be live at `https://<username>.github.io/battleship-devin/` within a few minutes.

## Project Structure

```
index.html   — Game UI and layout
style.css    — Styling, animations, responsive breakpoints
script.js    — All game logic, AI, and DOM rendering
test.html    — Test harness (sets __TEST_MODE__ to skip DOM init)
test.js      — 46 assertions covering core game logic
```

## Known Limitations

- **No persistent state** — Game progress is lost on page refresh. There is no save/load mechanism.
- **AI does not use "target mode" heuristics** — The probability-density approach is strong but does not explicitly track ship orientation after multiple hits on the same ship. It relies purely on statistical scoring, which is slightly suboptimal compared to dedicated hunt/target algorithms in edge cases.
- **No multiplayer** — This is a single-player game against the AI only.
- **No sound effects** — The game is silent by design to keep it lightweight and dependency-free.
- **Touch placement UX** — On mobile, ship placement requires a double-tap (preview then confirm). This can feel slightly less fluid than the desktop hover-and-click experience.

## License

[MIT](LICENSE)
