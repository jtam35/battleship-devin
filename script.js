/* ============================================================
   Battleship – single-page, no-framework, client-side game
   ============================================================ */

// ── Constants ───────────────────────────────────────────────
var GRID_SIZE = 10;
var COLS = ['A','B','C','D','E','F','G','H','I','J'];

var FLEET = [
  { name: 'Carrier',    size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser',    size: 3 },
  { name: 'Submarine',  size: 3 },
  { name: 'Destroyer',  size: 2 }
];

// Cell states
var EMPTY  = 0;
var SHIP   = 1;
var HIT    = 2;
var MISS   = 3;
var SUNK   = 4;

// ── Pure game-logic helpers (no DOM access) ─────────────────

/** Create a fresh 10x10 board filled with EMPTY. */
function createBoard() {
  var board = [];
  for (var r = 0; r < GRID_SIZE; r++) {
    board[r] = [];
    for (var c = 0; c < GRID_SIZE; c++) {
      board[r][c] = EMPTY;
    }
  }
  return board;
}

/**
 * Return the list of [row, col] cells a ship of `size` would occupy
 * starting at (row, col) in the given orientation.
 * Returns null if any cell is off-board.
 */
function shipCells(row, col, size, horizontal) {
  var cells = [];
  for (var i = 0; i < size; i++) {
    var r = horizontal ? row : row + i;
    var c = horizontal ? col + i : col;
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return null;
    cells.push([r, c]);
  }
  return cells;
}

/**
 * Check whether placing a ship is valid:
 * all cells on-board and none already occupied.
 */
function isValidPlacement(board, row, col, size, horizontal) {
  var cells = shipCells(row, col, size, horizontal);
  if (!cells) return false;
  for (var i = 0; i < cells.length; i++) {
    if (board[cells[i][0]][cells[i][1]] !== EMPTY) return false;
  }
  return true;
}

/**
 * Place a ship on the board (mutates board).
 * Returns the cells occupied, or null if invalid.
 */
function placeShip(board, row, col, size, horizontal) {
  if (!isValidPlacement(board, row, col, size, horizontal)) return null;
  var cells = shipCells(row, col, size, horizontal);
  for (var i = 0; i < cells.length; i++) {
    board[cells[i][0]][cells[i][1]] = SHIP;
  }
  return cells;
}

/**
 * Randomly place all ships in FLEET on a board.
 * Returns an array of ship records: { name, size, cells, sunk }.
 */
function placeFleetRandomly(board) {
  var ships = [];
  for (var f = 0; f < FLEET.length; f++) {
    var placed = false;
    while (!placed) {
      var horiz = Math.random() < 0.5;
      var r = Math.floor(Math.random() * GRID_SIZE);
      var c = Math.floor(Math.random() * GRID_SIZE);
      var cells = placeShip(board, r, c, FLEET[f].size, horiz);
      if (cells) {
        ships.push({ name: FLEET[f].name, size: FLEET[f].size, cells: cells, sunk: false });
        placed = true;
      }
    }
  }
  return ships;
}

/**
 * Process a shot on `board` at (row, col).
 * Returns 'hit', 'miss', or 'already' (cell already fired upon).
 */
function fireShot(board, row, col) {
  var val = board[row][col];
  if (val === HIT || val === MISS || val === SUNK) return 'already';
  if (val === SHIP) { board[row][col] = HIT; return 'hit'; }
  board[row][col] = MISS;
  return 'miss';
}

/**
 * After a hit, check if the ship owning (row, col) is fully sunk.
 * If so, mark all its cells as SUNK and set ship.sunk = true.
 * Returns the ship object if newly sunk, else null.
 */
function checkSunk(board, ships, row, col) {
  for (var s = 0; s < ships.length; s++) {
    if (ships[s].sunk) continue;
    var cells = ships[s].cells;
    var belongs = false;
    for (var i = 0; i < cells.length; i++) {
      if (cells[i][0] === row && cells[i][1] === col) { belongs = true; break; }
    }
    if (!belongs) continue;
    var allHit = true;
    for (var j = 0; j < cells.length; j++) {
      if (board[cells[j][0]][cells[j][1]] !== HIT) { allHit = false; break; }
    }
    if (allHit) {
      ships[s].sunk = true;
      for (var k = 0; k < cells.length; k++) {
        board[cells[k][0]][cells[k][1]] = SUNK;
      }
      return ships[s];
    }
  }
  return null;
}

/**
 * Check if all ships in the fleet are sunk -> game over.
 */
function allSunk(ships) {
  for (var i = 0; i < ships.length; i++) {
    if (!ships[i].sunk) return false;
  }
  return true;
}

/* ── AI probability-density targeting ────────────────────────
 *
 * Instead of random shots or simple hunt/target, the AI builds a
 * probability heatmap each turn:
 *
 * 1. Start with a 10x10 grid of zeros.
 * 2. For every ship size the AI has NOT yet sunk on the player's board,
 *    slide that ship across every cell in both orientations.
 * 3. A placement is "valid" if every cell it covers is either EMPTY or
 *    HIT (unknown or confirmed ship) — it must NOT cover any MISS or
 *    SUNK cell.
 * 4. For each valid placement, increment the count of every covered cell
 *    by 1.
 * 5. Zero-out any cell the AI has already fired at (HIT / MISS / SUNK).
 * 6. The cell with the highest count is the AI's best guess for the
 *    next shot. Ties are broken randomly.
 *
 * This naturally focuses fire around existing hits (because those cells
 * admit more valid placements) while also choosing optimal "hunting"
 * cells when no hits are open.
 */

/**
 * Build the probability heatmap for the AI's next shot.
 * `board` is the PLAYER's board from the AI's perspective (AI sees
 *  HIT/MISS/SUNK but not which cells are SHIP vs EMPTY).
 * `remainingSizes` is an array of ship sizes the AI hasn't sunk yet.
 * Returns a 10x10 grid of scores.
 */
function buildProbabilityGrid(board, remainingSizes) {
  var prob = createBoard(); // all zeros

  for (var s = 0; s < remainingSizes.length; s++) {
    var size = remainingSizes[s];

    // Horizontal placements
    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c <= GRID_SIZE - size; c++) {
        var valid = true;
        for (var i = 0; i < size; i++) {
          var v = board[r][c + i];
          // Allow EMPTY (unknown) and HIT (confirmed ship part, not yet sunk)
          if (v !== EMPTY && v !== SHIP && v !== HIT) { valid = false; break; }
          // From AI's viewpoint, SHIP looks like EMPTY (AI doesn't know).
          // We treat SHIP same as EMPTY here since this fn receives the
          // real board, but AI "sees" SHIP cells as unknown.
        }
        if (valid) {
          for (var j = 0; j < size; j++) prob[r][c + j]++;
        }
      }
    }

    // Vertical placements
    for (var r2 = 0; r2 <= GRID_SIZE - size; r2++) {
      for (var c2 = 0; c2 < GRID_SIZE; c2++) {
        var valid2 = true;
        for (var i2 = 0; i2 < size; i2++) {
          var v2 = board[r2 + i2][c2];
          if (v2 !== EMPTY && v2 !== SHIP && v2 !== HIT) { valid2 = false; break; }
        }
        if (valid2) {
          for (var j2 = 0; j2 < size; j2++) prob[r2 + j2][c2]++;
        }
      }
    }
  }

  // Zero-out already-shot cells so AI won't re-fire
  for (var r3 = 0; r3 < GRID_SIZE; r3++) {
    for (var c3 = 0; c3 < GRID_SIZE; c3++) {
      var cv = board[r3][c3];
      if (cv === HIT || cv === MISS || cv === SUNK) prob[r3][c3] = 0;
    }
  }

  return prob;
}

/**
 * Choose the AI's next target cell using the probability heatmap.
 * Returns [row, col].
 */
function aiChooseTarget(board, remainingSizes) {
  var prob = buildProbabilityGrid(board, remainingSizes);
  var maxVal = -1;
  var candidates = [];

  for (var r = 0; r < GRID_SIZE; r++) {
    for (var c = 0; c < GRID_SIZE; c++) {
      if (prob[r][c] > maxVal) {
        maxVal = prob[r][c];
        candidates = [[r, c]];
      } else if (prob[r][c] === maxVal && maxVal > 0) {
        candidates.push([r, c]);
      }
    }
  }

  // Break ties randomly
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Get remaining ship sizes from a fleet that haven't been sunk yet.
 */
function remainingShipSizes(ships) {
  var sizes = [];
  for (var i = 0; i < ships.length; i++) {
    if (!ships[i].sunk) sizes.push(ships[i].size);
  }
  return sizes;
}

// ── DOM / rendering (only inside initGame) ──────────────────

function initGame() {

  // ── State ──
  var playerBoard, aiBoard;
  var playerShips, aiShips;
  var placementBoard;
  var placedShips;
  var currentShipIdx;
  var horizontal;
  var gameOver;
  var playerTurn;
  var lastTapCell;
  var messageLog = [];  // turn-by-turn log entries

  // ── DOM refs ──
  var statusEl        = document.getElementById('status');
  var placementPhase  = document.getElementById('placement-phase');
  var gamePhase       = document.getElementById('game-phase');
  var endScreen       = document.getElementById('end-screen');
  var endTitle        = document.getElementById('end-title');
  var endMessage      = document.getElementById('end-message');
  var restartBtn      = document.getElementById('restart-btn');
  var restartGameBtn  = document.getElementById('restart-game-btn');
  var startBtn        = document.getElementById('start-btn');
  var rotateBtn       = document.getElementById('rotate-btn');
  var shipsToPlaceUl  = document.getElementById('ships-to-place');
  var placementGrid   = document.getElementById('placement-grid');
  var aiGridEl        = document.getElementById('ai-grid');
  var playerGridEl    = document.getElementById('player-grid');
  var heatmapToggle   = document.getElementById('heatmap-toggle');
  var logListEl       = document.getElementById('log-list');

  // ── Helpers ──
  function setStatus(msg) { statusEl.textContent = msg; }

  /** Add an entry to the message log and update the DOM. */
  function addLogEntry(msg, type) {
    messageLog.push({ msg: msg, type: type || '' });
    if (messageLog.length > 10) messageLog.shift();
    renderLog();
  }

  function renderLog() {
    logListEl.innerHTML = '';
    for (var i = messageLog.length - 1; i >= 0; i--) {
      var li = document.createElement('li');
      li.textContent = messageLog[i].msg;
      if (messageLog[i].type) li.className = 'log-' + messageLog[i].type;
      logListEl.appendChild(li);
    }
  }

  /** Build the 11x11 grid DOM (header row + header col + 10x10 cells). */
  function buildGridDOM(container, onClick) {
    container.innerHTML = '';
    var corner = document.createElement('div');
    corner.className = 'header-cell';
    container.appendChild(corner);
    for (var c = 0; c < GRID_SIZE; c++) {
      var ch = document.createElement('div');
      ch.className = 'header-cell';
      ch.textContent = COLS[c];
      container.appendChild(ch);
    }
    for (var r = 0; r < GRID_SIZE; r++) {
      var rh = document.createElement('div');
      rh.className = 'header-cell';
      rh.textContent = r + 1;
      container.appendChild(rh);
      for (var c2 = 0; c2 < GRID_SIZE; c2++) {
        var cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = r;
        cell.dataset.col = c2;
        if (onClick) {
          cell.addEventListener('click', onClick);
        }
        container.appendChild(cell);
      }
    }
  }

  /** Return the cell DOM element from a grid container at (r, c). */
  function getCellEl(container, r, c) {
    var idx = 11 + r * 11 + 1 + c;
    return container.children[idx];
  }

  /** Render board state onto a grid container. showShips = true for player board. */
  function renderBoard(container, board, showShips) {
    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        var el = getCellEl(container, r, c);
        el.className = 'cell';
        el.style.backgroundColor = '';
        var v = board[r][c];
        if (v === SHIP && showShips) el.classList.add('ship');
        if (v === HIT)  el.classList.add('hit');
        if (v === MISS) el.classList.add('miss');
        if (v === SUNK) el.classList.add('sunk');
      }
    }
  }

  /** Apply a brief animation class to a cell, auto-removed after animation ends. */
  function animateCell(container, row, col, animClass) {
    var el = getCellEl(container, row, col);
    el.classList.add(animClass);
    el.addEventListener('animationend', function handler() {
      el.classList.remove(animClass);
      el.removeEventListener('animationend', handler);
    });
  }

  /**
   * Render the probability heatmap overlay on the AI board.
   * Uses HSL: hue from 240 (blue/cool) to 0 (red/warm) proportional to probability.
   * Only overlays unknown cells (not hit/miss/sunk).
   */
  function renderHeatmap() {
    if (!heatmapToggle.checked) return;
    // Build probability from player's perspective: where might AI ships be?
    var sizes = remainingShipSizes(aiShips);
    var prob = buildProbabilityGrid(aiBoard, sizes);

    // Find max for normalization
    var maxVal = 0;
    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        if (prob[r][c] > maxVal) maxVal = prob[r][c];
      }
    }
    if (maxVal === 0) return;

    for (var r2 = 0; r2 < GRID_SIZE; r2++) {
      for (var c2 = 0; c2 < GRID_SIZE; c2++) {
        var el = getCellEl(aiGridEl, r2, c2);
        var v = aiBoard[r2][c2];
        // Only overlay on unknown cells
        if (v === EMPTY || v === SHIP) {
          var ratio = prob[r2][c2] / maxVal;
          if (ratio > 0) {
            // HSL: hue 240 (blue) -> 0 (red), saturation 80%, lightness 40-55%
            var hue = Math.round(240 * (1 - ratio));
            var lightness = Math.round(40 + 15 * ratio);
            el.style.backgroundColor = 'hsl(' + hue + ', 80%, ' + lightness + '%)';
          }
        }
      }
    }
  }

  /** Clear heatmap overlay from AI board. */
  function clearHeatmap() {
    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        var el = getCellEl(aiGridEl, r, c);
        var v = aiBoard[r][c];
        if (v === EMPTY || v === SHIP) {
          el.style.backgroundColor = '';
        }
      }
    }
  }

  // ── Placement logic ──

  function initPlacement() {
    placementBoard = createBoard();
    placedShips = [];
    currentShipIdx = 0;
    horizontal = true;
    lastTapCell = null;
    gameOver = false;
    messageLog = [];

    buildGridDOM(placementGrid, onPlacementClick);

    placementGrid.addEventListener('mouseover', onPlacementHover);
    placementGrid.addEventListener('mouseout', clearGhost);

    placementGrid.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      toggleOrientation();
    });

    placementGrid.addEventListener('touchend', onPlacementTouch);

    renderShipList();
    startBtn.disabled = true;
    startBtn.addEventListener('click', startGame);
    rotateBtn.addEventListener('click', toggleOrientation);
    setStatus('Place your ships!');
  }

  function renderShipList() {
    shipsToPlaceUl.innerHTML = '';
    for (var i = 0; i < FLEET.length; i++) {
      var li = document.createElement('li');
      li.textContent = FLEET[i].name + ' (' + FLEET[i].size + ')';
      if (i < currentShipIdx) li.className = 'placed';
      else if (i === currentShipIdx) li.className = 'current';
      shipsToPlaceUl.appendChild(li);
    }
  }

  function toggleOrientation() {
    horizontal = !horizontal;
    setStatus('Orientation: ' + (horizontal ? 'Horizontal' : 'Vertical'));
  }

  function clearGhost() {
    var cells = placementGrid.querySelectorAll('.cell');
    for (var i = 0; i < cells.length; i++) {
      cells[i].classList.remove('ghost-ok', 'ghost-bad');
    }
  }

  function showGhost(row, col) {
    clearGhost();
    if (currentShipIdx >= FLEET.length) return;
    var size = FLEET[currentShipIdx].size;
    var cells = shipCells(row, col, size, horizontal);
    var valid = isValidPlacement(placementBoard, row, col, size, horizontal);
    if (!cells) {
      for (var i = 0; i < size; i++) {
        var r = horizontal ? row : row + i;
        var c = horizontal ? col + i : col;
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
          getCellEl(placementGrid, r, c).classList.add('ghost-bad');
        }
      }
      return;
    }
    var cls = valid ? 'ghost-ok' : 'ghost-bad';
    for (var j = 0; j < cells.length; j++) {
      getCellEl(placementGrid, cells[j][0], cells[j][1]).classList.add(cls);
    }
  }

  function onPlacementHover(e) {
    var t = e.target;
    if (!t.classList.contains('cell')) return;
    showGhost(+t.dataset.row, +t.dataset.col);
  }

  function onPlacementClick(e) {
    var t = e.target;
    if (!t.classList.contains('cell')) return;
    attemptPlacement(+t.dataset.row, +t.dataset.col);
  }

  function onPlacementTouch(e) {
    var t = e.target;
    if (!t.classList.contains('cell')) return;
    e.preventDefault();
    var row = +t.dataset.row;
    var col = +t.dataset.col;

    if (lastTapCell && lastTapCell[0] === row && lastTapCell[1] === col) {
      attemptPlacement(row, col);
      lastTapCell = null;
    } else {
      lastTapCell = [row, col];
      showGhost(row, col);
    }
  }

  function attemptPlacement(row, col) {
    if (currentShipIdx >= FLEET.length) return;
    var ship = FLEET[currentShipIdx];
    var cells = placeShip(placementBoard, row, col, ship.size, horizontal);
    if (!cells) {
      setStatus('Invalid placement!');
      return;
    }
    placedShips.push({ name: ship.name, size: ship.size, cells: cells, sunk: false });
    currentShipIdx++;
    clearGhost();
    renderBoard(placementGrid, placementBoard, true);
    renderShipList();

    if (currentShipIdx >= FLEET.length) {
      startBtn.disabled = false;
      setStatus('All ships placed! Press Start Game.');
    } else {
      setStatus('Place your ' + FLEET[currentShipIdx].name + ' (' + FLEET[currentShipIdx].size + ')');
    }
  }

  // ── Game start ──

  function startGame() {
    playerBoard = createBoard();
    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        playerBoard[r][c] = placementBoard[r][c];
      }
    }
    playerShips = placedShips;

    aiBoard = createBoard();
    aiShips = placeFleetRandomly(aiBoard);

    playerTurn = true;
    gameOver = false;
    messageLog = [];
    renderLog();

    // Reset heatmap toggle
    heatmapToggle.checked = false;

    placementPhase.classList.add('hidden');
    gamePhase.classList.remove('hidden');

    buildGridDOM(aiGridEl, onAiGridClick);
    buildGridDOM(playerGridEl, null);

    renderBoard(playerGridEl, playerBoard, true);
    renderBoard(aiGridEl, aiBoard, false);

    setStatus('Your turn \u2014 fire at the enemy!');
  }

  // ── Player fires ──

  function onAiGridClick(e) {
    // Prevent firing during AI turn, after game over, or rapid clicks
    if (!playerTurn || gameOver) return;
    var t = e.target;
    if (!t.classList.contains('cell')) return;
    var row = +t.dataset.row;
    var col = +t.dataset.col;

    var result = fireShot(aiBoard, row, col);
    if (result === 'already') { setStatus('Already fired there!'); return; }

    var coord = COLS[col] + (row + 1);
    if (result === 'hit') {
      var sunkShip = checkSunk(aiBoard, aiShips, row, col);
      if (sunkShip) {
        setStatus('You sunk the enemy ' + sunkShip.name + '!');
        addLogEntry('You sunk ' + sunkShip.name + ' at ' + coord + '!', 'sunk');
        // Animate all sunk cells
        for (var k = 0; k < sunkShip.cells.length; k++) {
          animateCell(aiGridEl, sunkShip.cells[k][0], sunkShip.cells[k][1], 'anim-sunk');
        }
      } else {
        setStatus('You hit a ship!');
        addLogEntry('You hit at ' + coord + '!', 'hit');
        animateCell(aiGridEl, row, col, 'anim-hit');
      }
    } else {
      setStatus('Miss!');
      addLogEntry('You missed at ' + coord + '.', 'miss');
      animateCell(aiGridEl, row, col, 'anim-miss');
    }

    renderBoard(aiGridEl, aiBoard, false);
    renderHeatmap();

    if (allSunk(aiShips)) {
      endGame(true);
      return;
    }

    // AI's turn after a short delay
    playerTurn = false;
    setTimeout(aiTurn, 600);
  }

  // ── AI fires ──

  function aiTurn() {
    if (gameOver) return;
    var sizes = remainingShipSizes(playerShips);
    var target = aiChooseTarget(playerBoard, sizes);
    if (!target) return;

    var result = fireShot(playerBoard, target[0], target[1]);
    var coord = COLS[target[1]] + (target[0] + 1);

    if (result === 'hit') {
      var sunkShip = checkSunk(playerBoard, playerShips, target[0], target[1]);
      if (sunkShip) {
        setStatus('AI sunk your ' + sunkShip.name + '!');
        addLogEntry('AI sunk your ' + sunkShip.name + ' at ' + coord + '!', 'sunk');
        for (var k = 0; k < sunkShip.cells.length; k++) {
          animateCell(playerGridEl, sunkShip.cells[k][0], sunkShip.cells[k][1], 'anim-sunk');
        }
      } else {
        setStatus('AI hit your ship at ' + coord + '!');
        addLogEntry('AI hit at ' + coord + '!', 'hit');
        animateCell(playerGridEl, target[0], target[1], 'anim-hit');
      }
    } else {
      setStatus('AI missed at ' + coord + '.');
      addLogEntry('AI missed at ' + coord + '.', 'miss');
      animateCell(playerGridEl, target[0], target[1], 'anim-miss');
    }

    renderBoard(playerGridEl, playerBoard, true);

    if (allSunk(playerShips)) {
      endGame(false);
      return;
    }

    playerTurn = true;
  }

  // ── End game ──

  function endGame(playerWon) {
    gameOver = true;
    endScreen.classList.remove('hidden');
    if (playerWon) {
      endTitle.textContent = 'Victory!';
      endMessage.textContent = 'You destroyed the enemy fleet!';
      addLogEntry('VICTORY! All enemy ships destroyed.', 'sunk');
    } else {
      endTitle.textContent = 'Defeat';
      endMessage.textContent = 'The AI destroyed your fleet.';
      addLogEntry('DEFEAT. The AI destroyed your fleet.', 'hit');
    }
  }

  function resetToPlacement() {
    endScreen.classList.add('hidden');
    gamePhase.classList.add('hidden');
    placementPhase.classList.remove('hidden');
    initPlacement();
  }

  restartBtn.addEventListener('click', resetToPlacement);
  restartGameBtn.addEventListener('click', resetToPlacement);

  // Heatmap toggle handler
  heatmapToggle.addEventListener('change', function() {
    if (heatmapToggle.checked) {
      renderHeatmap();
    } else {
      clearHeatmap();
    }
  });

  // ── Keyboard shortcut: R to rotate ──
  document.addEventListener('keydown', function(e) {
    if (e.key === 'r' || e.key === 'R') {
      if (!placementPhase.classList.contains('hidden')) {
        toggleOrientation();
      }
    }
  });

  // ── Kick off ──
  initPlacement();
}

// Single DOMContentLoaded listener that bootstraps everything.
// Skip initialization if __TEST_MODE__ flag is set (used by test.html).
if (!window.__TEST_MODE__) {
  document.addEventListener('DOMContentLoaded', initGame);
}
