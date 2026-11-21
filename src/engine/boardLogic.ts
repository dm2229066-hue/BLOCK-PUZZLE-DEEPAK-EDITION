import { BLOCK_SHAPES, countShapeCells } from '../data/shapes';
import { BlockShape, BoardGrid, CellData, TrayPiece } from '../types/game';

export function cloneBoard(board: BoardGrid): BoardGrid {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

export function isCellOccupied(cell: CellData): boolean {
  return cell.kind !== 'empty';
}

export function canPlaceShape(
  board: BoardGrid,
  shape: BlockShape,
  startRow: number,
  startCol: number
): boolean {
  const rows = shape.matrix.length;
  const cols = shape.matrix[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (shape.matrix[r][c] === 1) {
        const br = startRow + r;
        const bc = startCol + c;
        if (br < 0 || br >= 10 || bc < 0 || bc >= 10) return false;
        if (isCellOccupied(board[br][bc])) return false;
      }
    }
  }
  return true;
}

export function hasAnyPlacementForShape(board: BoardGrid, shape: BlockShape): boolean {
  const rows = shape.matrix.length;
  const cols = shape.matrix[0].length;
  for (let r = 0; r <= 10 - rows; r++) {
    for (let c = 0; c <= 10 - cols; c++) {
      if (canPlaceShape(board, shape, r, c)) {
        return true;
      }
    }
  }
  return false;
}

export function hasAnyValidPlacement(board: BoardGrid, tray: TrayPiece[]): boolean {
  for (const piece of tray) {
    if (!piece.used && hasAnyPlacementForShape(board, piece.shape)) {
      return true;
    }
  }
  return false;
}

export function findFullLinesAfterPlacement(
  board: BoardGrid,
  shape: BlockShape,
  startRow: number,
  startCol: number
): { fullRows: number[]; fullCols: number[] } {
  const temp = cloneBoard(board);
  for (let r = 0; r < shape.matrix.length; r++) {
    for (let c = 0; c < shape.matrix[r].length; c++) {
      if (shape.matrix[r][c] === 1) {
        temp[startRow + r][startCol + c] = { kind: 'block', colorIndex: 0 };
      }
    }
  }
  return findFullLines(temp);
}

export function findFullLines(board: BoardGrid): { fullRows: number[]; fullCols: number[] } {
  const fullRows: number[] = [];
  const fullCols: number[] = [];

  for (let r = 0; r < 10; r++) {
    let allFilled = true;
    for (let c = 0; c < 10; c++) {
      if (!isCellOccupied(board[r][c])) {
        allFilled = false;
        break;
      }
    }
    if (allFilled) fullRows.push(r);
  }

  for (let c = 0; c < 10; c++) {
    let allFilled = true;
    for (let r = 0; r < 10; r++) {
      if (!isCellOccupied(board[r][c])) {
        allFilled = false;
        break;
      }
    }
    if (allFilled) fullCols.push(c);
  }

  return { fullRows, fullCols };
}

export interface PlacementOutcome {
  nextBoard: BoardGrid;
  placedCells: number;
  clearedRows: number[];
  clearedCols: number[];
  totalLinesCleared: number;
  clearedCoords: Array<{ r: number; c: number; colorIndex: number; kind: CellData['kind'] }>;
  gemsCollected: number;
  obstaclesBroken: number;
  pointsEarned: number;
  coinsEarned: number;
}

export function executePlacement(
  board: BoardGrid,
  piece: TrayPiece,
  startRow: number,
  startCol: number,
  comboStreakAfterClear: number
): PlacementOutcome {
  const nextBoard = cloneBoard(board);
  const { shape, colorIndex } = piece;

  for (let r = 0; r < shape.matrix.length; r++) {
    for (let c = 0; c < shape.matrix[r].length; c++) {
      if (shape.matrix[r][c] === 1) {
        nextBoard[startRow + r][startCol + c] = {
          kind: 'block',
          colorIndex,
        };
      }
    }
  }

  const placedCells = countShapeCells(shape.matrix);
  const { fullRows, fullCols } = findFullLines(nextBoard);
  const totalLinesCleared = fullRows.length + fullCols.length;

  const clearedCoords: PlacementOutcome['clearedCoords'] = [];
  let gemsCollected = 0;
  let obstaclesBroken = 0;

  if (totalLinesCleared > 0) {
    const affected = new Set<string>();
    for (const r of fullRows) {
      for (let c = 0; c < 10; c++) affected.add(`${r},${c}`);
    }
    for (const c of fullCols) {
      for (let r = 0; r < 10; r++) affected.add(`${r},${c}`);
    }

    affected.forEach((key) => {
      const [rs, cs] = key.split(',');
      const r = Number(rs);
      const c = Number(cs);
      const cell = nextBoard[r][c];
      if (cell.kind === 'empty') return;

      clearedCoords.push({ r, c, colorIndex: cell.colorIndex, kind: cell.kind });

      if (cell.kind === 'gem') {
        gemsCollected++;
        nextBoard[r][c] = { kind: 'empty', colorIndex: 0 };
      } else if (cell.kind === 'crate' || cell.kind === 'ice') {
        const hp = cell.hp ?? 1;
        if (hp > 1) {
          nextBoard[r][c] = { ...cell, hp: hp - 1 };
        } else {
          obstaclesBroken++;
          nextBoard[r][c] = { kind: 'empty', colorIndex: 0 };
        }
      } else {
        nextBoard[r][c] = { kind: 'empty', colorIndex: 0 };
      }
    });
  }

  // Score calculation: placement cells + line clear multiplier + combo bonus
  const placementPoints = placedCells * 5;
  let linePoints = 0;
  if (totalLinesCleared > 0) {
    // 1 line = 100, 2 = 300, 3 = 600, 4 = 1000, 5+ = 1500
    const multiBonus = [0, 100, 300, 600, 1000, 1500, 2100];
    const baseLineScore =
      totalLinesCleared < multiBonus.length
        ? multiBonus[totalLinesCleared]
        : totalLinesCleared * 400;
    const comboBonus = comboStreakAfterClear > 1 ? (comboStreakAfterClear - 1) * 60 : 0;
    linePoints = baseLineScore + comboBonus + gemsCollected * 40 + obstaclesBroken * 25;
  }

  // Coins for multi-line clears
  let coinsEarned = 0;
  if (totalLinesCleared === 2) coinsEarned = 3;
  else if (totalLinesCleared === 3) coinsEarned = 7;
  else if (totalLinesCleared >= 4) coinsEarned = 15;
  if (comboStreakAfterClear >= 3 && totalLinesCleared > 0) {
    coinsEarned += 2;
  }

  return {
    nextBoard,
    placedCells,
    clearedRows: fullRows,
    clearedCols: fullCols,
    totalLinesCleared,
    clearedCoords,
    gemsCollected,
    obstaclesBroken,
    pointsEarned: placementPoints + linePoints,
    coinsEarned,
  };
}

let uidCounter = 1;

function pickWeightedShape(candidates: BlockShape[]): BlockShape {
  const totalWeight = candidates.reduce((acc, s) => acc + s.weight, 0);
  let r = Math.random() * totalWeight;
  for (const s of candidates) {
    r -= s.weight;
    if (r <= 0) return s;
  }
  return candidates[0];
}

export function dealTrayPieces(board: BoardGrid, ensurePlayable = true): TrayPiece[] {
  const pieces: TrayPiece[] = [];

  // Count empty cells to slightly favor smaller shapes when board gets crowded
  let emptyCells = 0;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (!isCellOccupied(board[r][c])) emptyCells++;
    }
  }

  const pool =
    emptyCells < 26
      ? BLOCK_SHAPES.filter((s) => s.tier !== 'large')
      : BLOCK_SHAPES;

  for (let i = 0; i < 3; i++) {
    const shape = pickWeightedShape(pool);
    pieces.push({
      uid: `piece-${Date.now()}-${uidCounter++}`,
      shape,
      colorIndex: Math.floor(Math.random() * 8),
      used: false,
    });
  }

  // Ensure at least one piece in the dealt trio can actually fit on the current board
  if (ensurePlayable && !hasAnyValidPlacement(board, pieces)) {
    const playable = BLOCK_SHAPES.filter((s) => hasAnyPlacementForShape(board, s));
    if (playable.length > 0) {
      const rescue = playable[Math.floor(Math.random() * playable.length)];
      pieces[0] = {
        uid: `piece-${Date.now()}-${uidCounter++}`,
        shape: rescue,
        colorIndex: Math.floor(Math.random() * 8),
        used: false,
      };
    }
  }

  return pieces;
}

export function clearLineBooster(
  board: BoardGrid,
  type: 'row' | 'col',
  index: number
): {
  nextBoard: BoardGrid;
  clearedCoords: PlacementOutcome['clearedCoords'];
  gemsCollected: number;
  obstaclesBroken: number;
} {
  const nextBoard = cloneBoard(board);
  const clearedCoords: PlacementOutcome['clearedCoords'] = [];
  let gemsCollected = 0;
  let obstaclesBroken = 0;

  for (let i = 0; i < 10; i++) {
    const r = type === 'row' ? index : i;
    const c = type === 'row' ? i : index;
    const cell = nextBoard[r][c];
    if (cell.kind === 'empty') continue;

    clearedCoords.push({ r, c, colorIndex: cell.colorIndex, kind: cell.kind });
    if (cell.kind === 'gem') gemsCollected++;
    if (cell.kind === 'crate' || cell.kind === 'ice') obstaclesBroken++;
    nextBoard[r][c] = { kind: 'empty', colorIndex: 0 };
  }

  return { nextBoard, clearedCoords, gemsCollected, obstaclesBroken };
}
