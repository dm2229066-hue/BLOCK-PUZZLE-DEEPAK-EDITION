import assert from 'node:assert/strict';
import {
  COMPLETED_LEVELS_PER_AD,
  InterstitialFrequencyController,
  MIN_INTERSTITIAL_INTERVAL_MS,
} from '../src/ads/adManager';
import { BLOCK_SHAPES } from '../src/data/shapes';
import {
  createEmptyBoard,
  getChallengePresets,
  getDailyChallengeForDate,
  getLevelConfig,
  TOTAL_LEVELS,
} from '../src/data/levels';
import {
  canPlaceShape,
  clearLineBooster,
  dealTrayPieces,
  executePlacement,
  findFullLines,
  hasAnyValidPlacement,
} from '../src/engine/boardLogic';
import { loadSaveData } from '../src/storage/saveSystem';

// 1. Test Block Placement & Collision
const board = createEmptyBoard();
const sq2 = BLOCK_SHAPES.find((s) => s.id === 'sq2')!;
assert.equal(canPlaceShape(board, sq2, 0, 0), true, '2x2 should fit at (0,0)');
assert.equal(canPlaceShape(board, sq2, 9, 9), false, '2x2 should not fit out of bounds at (9,9)');

const outcome1 = executePlacement(board, { uid: 'p1', shape: sq2, colorIndex: 0, used: false }, 0, 0, 1);
assert.equal(outcome1.placedCells, 4);
assert.equal(canPlaceShape(outcome1.nextBoard, sq2, 0, 0), false, 'Occupied cells must reject overlap');
assert.equal(canPlaceShape(outcome1.nextBoard, sq2, 1, 1), false, 'Partial overlap must be rejected');
assert.equal(canPlaceShape(outcome1.nextBoard, sq2, 0, 2), true, 'Adjacent placement should succeed');

// 2. Test Horizontal & Vertical Multi-Line Clearing + Combo Scoring
const lineBoard = createEmptyBoard();
// Fill row 0 columns 0..8 and column 9 rows 1..9, leaving (0,9) open for a 1x1 dot!
for (let c = 0; c < 9; c++) lineBoard[0][c] = { kind: 'block', colorIndex: 1 };
for (let r = 1; r < 10; r++) lineBoard[r][9] = { kind: 'block', colorIndex: 2 };
const dot = BLOCK_SHAPES.find((s) => s.id === 'single')!;
const multiOutcome = executePlacement(
  lineBoard,
  { uid: 'p2', shape: dot, colorIndex: 3, used: false },
  0,
  9,
  2 // combo 2
);
assert.equal(multiOutcome.clearedRows.length, 1, 'Row 0 should clear');
assert.equal(multiOutcome.clearedCols.length, 1, 'Col 9 should clear');
assert.equal(multiOutcome.totalLinesCleared, 2, 'Double clear should count 2 lines');
assert.ok(multiOutcome.pointsEarned > 300, 'Double clear + combo should award >300 pts');
assert.equal(multiOutcome.coinsEarned, 3, 'Double clear should award 3 coins');
assert.equal(findFullLines(multiOutcome.nextBoard).fullRows.length, 0, 'Board should have no leftover full rows');

// 3. Test Gem & Multi-HP Crate Breaking
const specialBoard = createEmptyBoard();
for (let c = 0; c < 7; c++) specialBoard[5][c] = { kind: 'block', colorIndex: 0 };
specialBoard[5][7] = { kind: 'gem', colorIndex: 4, gemType: 'emerald' };
specialBoard[5][8] = { kind: 'crate', colorIndex: 0, hp: 2 };
const specialOutcome = executePlacement(
  specialBoard,
  { uid: 'p3', shape: dot, colorIndex: 0, used: false },
  5,
  9,
  1
);
assert.equal(specialOutcome.gemsCollected, 1, 'Clearing row should collect embedded gem');
assert.equal(specialOutcome.obstaclesBroken, 0, '2-HP crate should crack to 1 HP on first hit');
assert.equal(specialOutcome.nextBoard[5][8].kind, 'crate');
assert.equal(specialOutcome.nextBoard[5][8].hp, 1);

// 4. Test Booster Line Clear
const boosterRes = clearLineBooster(specialOutcome.nextBoard, 'col', 8);
assert.equal(boosterRes.obstaclesBroken, 1, 'Column booster should shatter remaining crate');
assert.equal(boosterRes.nextBoard[5][8].kind, 'empty');

// 5. Test Tray Dealing & Game Over Detection
const crowded = createEmptyBoard();
for (let r = 0; r < 10; r++) {
  for (let c = 0; c < 10; c++) {
    crowded[r][c] = { kind: 'block', colorIndex: 0 };
  }
}
const bar5 = BLOCK_SHAPES.find((s) => s.id === 'h5')!;
assert.equal(
  hasAnyValidPlacement(crowded, [{ uid: 'x', shape: bar5, colorIndex: 0, used: false }]),
  false,
  'Full board must detect Game Over'
);
const freshTray = dealTrayPieces(createEmptyBoard(), true);
assert.equal(freshTray.length, 3);
assert.equal(hasAnyValidPlacement(createEmptyBoard(), freshTray), true);

// 6. Validate All 1,050 Levels + Challenges + Daily Challenge
assert.ok(TOTAL_LEVELS >= 1000, 'Must have at least 1000 levels');
const seenSubtitles = new Set<string>();
for (let id = 1; id <= TOTAL_LEVELS; id++) {
  const cfg = getLevelConfig(id);
  assert.equal(cfg.id, id);
  assert.equal(cfg.presetGrid.length, 10);
  assert.equal(cfg.presetGrid[0].length, 10);
  const { fullRows, fullCols } = findFullLines(cfg.presetGrid);
  assert.equal(fullRows.length, 0, `Level ${id} should not start with pre-filled full row`);
  assert.equal(fullCols.length, 0, `Level ${id} should not start with pre-filled full col`);
  // Ensure at least one piece can be placed at start
  const startTray = dealTrayPieces(cfg.presetGrid, true);
  assert.equal(hasAnyValidPlacement(cfg.presetGrid, startTray), true, `Level ${id} must be playable`);
  seenSubtitles.add(`${cfg.title}-${cfg.subtitle}`);
}
assert.ok(seenSubtitles.size > 500, 'Levels must have varied configurations and objectives');

const challenges = getChallengePresets();
assert.equal(challenges.length, 8);
const daily1 = getDailyChallengeForDate('2026-11-21');
const daily2 = getDailyChallengeForDate('2026-11-22');
assert.notEqual(daily1.id, daily2.id);

// 7. Test Corrupted LocalStorage Safe Recovery
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: () => '{broken json!!!',
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
  length: 0,
};
const recovered = loadSaveData();
assert.equal(recovered.unlockedLevel, 1);
assert.equal(recovered.coins, 150);

// 8. Test AdMob Interstitial Frequency, Cooldown & Policy Guards
const adCtrl = new InterstitialFrequencyController();
const t0 = 1_000_000;
assert.equal(adCtrl.canShowAtBreak('level_complete', t0).allowed, false, 'Must block before initialization');
adCtrl.markInitialized();

// Never during active gameplay
adCtrl.setActiveGameplay(true);
assert.equal(adCtrl.canShowAtBreak('game_over', t0).allowed, false, 'Must block during active gameplay');
adCtrl.setActiveGameplay(false);

// Level frequency gate: after every completed level
assert.equal(COMPLETED_LEVELS_PER_AD, 1);
adCtrl.recordLevelCompleted(); // 1
assert.equal(adCtrl.canShowAtBreak('level_complete', t0).allowed, true, 'Allow after level 1');
adCtrl.markAdShown(t0);
adCtrl.recordLevelCompleted(); // 2
assert.equal(adCtrl.canShowAtBreak('level_complete', t0 + 25_000).allowed, true, 'Allow after level 2 without 120s block');
adCtrl.markAdShown(t0 + 25_000);
adCtrl.recordLevelCompleted(); // 3
assert.equal(adCtrl.canShowAtBreak('level_complete', t0 + 50_000).allowed, true, 'Allow after level 3');

// Simultaneous ad block
adCtrl.setShowing(true);
assert.equal(adCtrl.canShowAtBreak('level_complete', t0 + 60_000).allowed, false, 'Never show simultaneous ads');
adCtrl.setShowing(false);

// 120-second minimum cooldown still applies to non-level menu/game-over breaks
adCtrl.markAdShown(t0);
assert.equal(adCtrl.canShowAtBreak('game_over', t0 + 60_000).allowed, false, 'Block game_over within 120s cooldown');
assert.equal(adCtrl.canShowAtBreak('return_to_menu', t0 + MIN_INTERSTITIAL_INTERVAL_MS, { meaningfulPlay: false }).allowed, false, 'Block return to menu without meaningful play');
assert.equal(adCtrl.canShowAtBreak('game_over', t0 + MIN_INTERSTITIAL_INTERVAL_MS).allowed, true, 'Allow game_over after >= 120s cooldown');

console.log('ALL GAME ENGINE, 1,050-LEVEL & ADMOB FREQUENCY TESTS PASSED!');
