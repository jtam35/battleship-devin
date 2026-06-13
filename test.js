/*
 * ════════════════════════════════════════════════════════════════
 * Battleship – Browser-Runnable Test Suite
 * ════════════════════════════════════════════════════════════════
 *
 * HOW TO RUN:
 *   Open test.html in any modern browser and check the developer console
 *   (F12 → Console). Each test logs PASS or FAIL with a description.
 *   No Node.js or npm required.
 *
 * WHAT IS TESTED:
 *   1. Probability grid calculation correctness on a known board state
 *   2. Ship placement validation logic (valid, overlap, off-board)
 *   3. Win-condition detection (allSunk)
 *
 * These tests exercise the pure logic functions defined at module scope
 * in script.js. test.html sets __TEST_MODE__ = true before loading
 * script.js, so initGame() is never called and no DOM setup occurs.
 * ════════════════════════════════════════════════════════════════
 */

(function() {
  'use strict';

  var passed = 0;
  var failed = 0;

  function assert(condition, description) {
    if (condition) {
      console.log('PASS: ' + description);
      passed++;
    } else {
      console.error('FAIL: ' + description);
      failed++;
    }
  }

  function assertEqual(actual, expected, description) {
    if (actual === expected) {
      console.log('PASS: ' + description);
      passed++;
    } else {
      console.error('FAIL: ' + description + ' (expected ' + expected + ', got ' + actual + ')');
      failed++;
    }
  }

  // ────────────────────────────────────────────────────────────
  // 1. Ship Placement Validation Tests
  // ────────────────────────────────────────────────────────────

  console.log('\n── Ship Placement Validation ──');

  // Valid horizontal placement on empty board
  (function() {
    var board = createBoard();
    var result = isValidPlacement(board, 0, 0, 5, true);
    assert(result === true, 'Valid horizontal placement at (0,0) size 5 on empty board');
  })();

  // Valid vertical placement on empty board
  (function() {
    var board = createBoard();
    var result = isValidPlacement(board, 0, 0, 5, false);
    assert(result === true, 'Valid vertical placement at (0,0) size 5 on empty board');
  })();

  // Off-board horizontal: ship extends past column 9
  (function() {
    var board = createBoard();
    var result = isValidPlacement(board, 0, 7, 5, true);
    assert(result === false, 'Off-board: horizontal size 5 at col 7 (extends to col 11)');
  })();

  // Off-board vertical: ship extends past row 9
  (function() {
    var board = createBoard();
    var result = isValidPlacement(board, 8, 0, 3, false);
    assert(result === false, 'Off-board: vertical size 3 at row 8 (extends to row 10)');
  })();

  // Overlap detection: place one ship, try to place another overlapping
  (function() {
    var board = createBoard();
    placeShip(board, 2, 3, 4, true); // occupies (2,3)-(2,6)
    var result = isValidPlacement(board, 0, 5, 5, false); // occupies (0,5)-(4,5) → overlap at (2,5)
    assert(result === false, 'Overlap: vertical size 5 at (0,5) overlaps ship at (2,3)-(2,6)');
  })();

  // Adjacent is OK (ships may touch)
  (function() {
    var board = createBoard();
    placeShip(board, 0, 0, 3, true); // occupies (0,0)-(0,2)
    var result = isValidPlacement(board, 1, 0, 3, true); // adjacent row
    assert(result === true, 'Adjacent placement allowed: ship at (1,0)-(1,2) next to (0,0)-(0,2)');
  })();

  // placeShip returns null on invalid placement
  (function() {
    var board = createBoard();
    var result = placeShip(board, 0, 9, 3, true); // off-board
    assert(result === null, 'placeShip returns null for off-board placement');
  })();

  // placeShip returns cells on valid placement
  (function() {
    var board = createBoard();
    var cells = placeShip(board, 3, 2, 3, true);
    assert(cells !== null && cells.length === 3, 'placeShip returns 3 cells for size 3 ship');
    assertEqual(board[3][2], SHIP, 'placeShip marks cell (3,2) as SHIP');
    assertEqual(board[3][3], SHIP, 'placeShip marks cell (3,3) as SHIP');
    assertEqual(board[3][4], SHIP, 'placeShip marks cell (3,4) as SHIP');
  })();

  // shipCells returns null when off-board
  (function() {
    var result = shipCells(9, 0, 2, false); // vertical from row 9 → row 10 (off)
    assert(result === null, 'shipCells returns null for off-board vertical');
  })();

  // shipCells returns correct cells
  (function() {
    var cells = shipCells(1, 2, 3, true);
    assert(cells.length === 3, 'shipCells returns 3 cells for size 3');
    assert(cells[0][0] === 1 && cells[0][1] === 2, 'shipCells first cell is (1,2)');
    assert(cells[2][0] === 1 && cells[2][1] === 4, 'shipCells last cell is (1,4)');
  })();

  // ────────────────────────────────────────────────────────────
  // 2. Probability Grid Calculation Tests
  // ────────────────────────────────────────────────────────────

  console.log('\n── Probability Grid Calculation ──');

  // Empty board: center cells should have higher probability than corners
  (function() {
    var board = createBoard();
    var prob = buildProbabilityGrid(board, [3]);
    // Corner (0,0) with size-3 ship: horiz (0,0)→(0,2) and vert (0,0)→(2,0) = 2 placements
    // Center (4,4) can be covered by many more placements
    assert(prob[4][4] > prob[0][0], 'Center has higher probability than corner (size-3 ship)');
  })();

  // Known miss reduces probability of adjacent cells
  (function() {
    var board = createBoard();
    var probBefore = buildProbabilityGrid(board, [3]);
    var valBefore = probBefore[5][5];

    board[5][4] = MISS; // miss to the left of (5,5)
    var probAfter = buildProbabilityGrid(board, [3]);
    var valAfter = probAfter[5][5];

    assert(valAfter < valBefore, 'Probability at (5,5) decreases after adjacent miss at (5,4)');
  })();

  // Already-fired cells have zero probability
  (function() {
    var board = createBoard();
    board[3][3] = HIT;
    board[7][7] = MISS;
    board[1][1] = SUNK;
    var prob = buildProbabilityGrid(board, [3, 4]);
    assertEqual(prob[3][3], 0, 'HIT cell (3,3) has probability 0');
    assertEqual(prob[7][7], 0, 'MISS cell (7,7) has probability 0');
    assertEqual(prob[1][1], 0, 'SUNK cell (1,1) has probability 0');
  })();

  // Board with all cells missed except one row → only horizontal placements count
  (function() {
    var board = createBoard();
    // Fill everything with MISS except row 0
    for (var r = 1; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        board[r][c] = MISS;
      }
    }
    var prob = buildProbabilityGrid(board, [2]);
    // Row 0 cells should have nonzero, all other rows zero
    assert(prob[0][0] > 0, 'Row 0 col 0 has nonzero probability when only row 0 is open');
    assertEqual(prob[1][0], 0, 'Row 1 (all missed) has probability 0');
    // Horizontal: size 2 can start at cols 0-8 → col 0 covered by start at 0 = 1 time from horiz
    // But since vertical is blocked (row 1 is MISS), only horizontal placements exist on row 0
    // Col 0: covered by placement starting at col 0 = 1 horiz
    // Col 1: covered by placement starting at col 0 and col 1 = 2
    assertEqual(prob[0][0], 1, 'Edge col 0 covered by exactly 1 horizontal placement of size 2');
    assertEqual(prob[0][1], 2, 'Col 1 covered by 2 horizontal placements of size 2');
  })();

  // Multiple ship sizes compound probability
  (function() {
    var board = createBoard();
    var probOne = buildProbabilityGrid(board, [2]);
    var probTwo = buildProbabilityGrid(board, [2, 3]);
    // With two ship sizes, every cell should have >= probability of one size alone
    assert(probTwo[5][5] > probOne[5][5], 'Two ship sizes yield higher probability than one');
  })();

  // Hit cell boosts surrounding probability (placements through hits)
  (function() {
    var board = createBoard();
    board[5][5] = HIT;
    var prob = buildProbabilityGrid(board, [3]);
    // Cells adjacent to a hit should have high probability because ships can pass through hits
    assert(prob[5][4] > 0, 'Cell left of HIT has nonzero probability');
    assert(prob[5][6] > 0, 'Cell right of HIT has nonzero probability');
    assert(prob[4][5] > 0, 'Cell above HIT has nonzero probability');
    assert(prob[6][5] > 0, 'Cell below HIT has nonzero probability');
  })();

  // ────────────────────────────────────────────────────────────
  // 3. Win Condition Detection Tests
  // ────────────────────────────────────────────────────────────

  console.log('\n── Win Condition Detection ──');

  // Not all sunk → game continues
  (function() {
    var ships = [
      { name: 'Carrier', size: 5, cells: [[0,0],[0,1],[0,2],[0,3],[0,4]], sunk: true },
      { name: 'Destroyer', size: 2, cells: [[5,5],[5,6]], sunk: false }
    ];
    assert(allSunk(ships) === false, 'allSunk returns false when one ship remains');
  })();

  // All sunk → game over
  (function() {
    var ships = [
      { name: 'Carrier', size: 5, cells: [[0,0],[0,1],[0,2],[0,3],[0,4]], sunk: true },
      { name: 'Destroyer', size: 2, cells: [[5,5],[5,6]], sunk: true }
    ];
    assert(allSunk(ships) === true, 'allSunk returns true when all ships sunk');
  })();

  // checkSunk marks ship as sunk and returns it
  (function() {
    var board = createBoard();
    board[0][0] = HIT;
    board[0][1] = HIT;
    var ships = [
      { name: 'Destroyer', size: 2, cells: [[0,0],[0,1]], sunk: false }
    ];
    var result = checkSunk(board, ships, 0, 1);
    assert(result !== null, 'checkSunk returns the ship when all cells are HIT');
    assertEqual(result.name, 'Destroyer', 'checkSunk returns correct ship name');
    assert(ships[0].sunk === true, 'checkSunk sets ship.sunk to true');
    assertEqual(board[0][0], SUNK, 'checkSunk marks cells as SUNK');
    assertEqual(board[0][1], SUNK, 'checkSunk marks cells as SUNK');
  })();

  // checkSunk returns null when ship is not fully hit
  (function() {
    var board = createBoard();
    board[2][0] = HIT;
    board[2][1] = SHIP; // not yet hit
    var ships = [
      { name: 'Destroyer', size: 2, cells: [[2,0],[2,1]], sunk: false }
    ];
    var result = checkSunk(board, ships, 2, 0);
    assert(result === null, 'checkSunk returns null when ship not fully hit');
    assert(ships[0].sunk === false, 'Ship remains not sunk');
  })();

  // fireShot tests
  (function() {
    var board = createBoard();
    board[0][0] = SHIP;
    assertEqual(fireShot(board, 0, 0), 'hit', 'fireShot returns hit on SHIP cell');
    assertEqual(board[0][0], HIT, 'fireShot changes SHIP to HIT');
    assertEqual(fireShot(board, 1, 1), 'miss', 'fireShot returns miss on EMPTY cell');
    assertEqual(board[1][1], MISS, 'fireShot changes EMPTY to MISS');
    assertEqual(fireShot(board, 0, 0), 'already', 'fireShot returns already on HIT cell');
    assertEqual(fireShot(board, 1, 1), 'already', 'fireShot returns already on MISS cell');
  })();

  // remainingShipSizes
  (function() {
    var ships = [
      { name: 'Carrier', size: 5, sunk: true },
      { name: 'Battleship', size: 4, sunk: false },
      { name: 'Destroyer', size: 2, sunk: false }
    ];
    var sizes = remainingShipSizes(ships);
    assertEqual(sizes.length, 2, 'remainingShipSizes returns 2 unsunk ships');
    assert(sizes[0] === 4 && sizes[1] === 2, 'remainingShipSizes returns correct sizes [4, 2]');
  })();

  // ────────────────────────────────────────────────────────────
  // Summary
  // ────────────────────────────────────────────────────────────

  console.log('\n══════════════════════════════════════');
  console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
  console.log('══════════════════════════════════════');

  if (failed > 0) {
    console.error('SOME TESTS FAILED');
  } else {
    console.log('ALL TESTS PASSED');
  }
})();
