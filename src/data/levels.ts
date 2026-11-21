import { BoardGrid, CellData, ChallengeConfig, LevelConfig, LevelObjective } from '../types/game';

export const TOTAL_LEVELS = 1050;
export const LEVELS_PER_CHAPTER = 50;
export const TOTAL_CHAPTERS = TOTAL_LEVELS / LEVELS_PER_CHAPTER; // 21 chapters

const CHAPTER_NAMES = [
  'Timber Trail',
  'Amber Courtyard',
  'Sapphire Crossing',
  'Emerald Steps',
  'Cedar Courtyard',
  'Lantern Plaza',
  'Cobalt Keep',
  'Crimson Forge',
  'Crystal Ridge',
  'Obsidian Vault',
  'Sunstone Terrace',
  'Frostbite Spire',
  'Golden Oasis',
  'Velvet Bastion',
  'Starlight Harbor',
  'Jade Labyrinth',
  'Aurora Summit',
  'Titan Citadel',
  'Astral Gallery',
  'Sovereign Crown',
  'Deepak Grandmaster',
];

export function getChapterName(chapter: number): string {
  return CHAPTER_NAMES[(chapter - 1) % CHAPTER_NAMES.length];
}

// Fast deterministic PRNG (Mulberry32)
export function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createEmptyBoard(): BoardGrid {
  const grid: BoardGrid = [];
  for (let r = 0; r < 10; r++) {
    const row: CellData[] = [];
    for (let c = 0; c < 10; c++) {
      row.push({ kind: 'empty', colorIndex: 0 });
    }
    grid.push(row);
  }
  return grid;
}

const GEM_TYPES: Array<'emerald' | 'ruby' | 'sapphire' | 'gold'> = [
  'emerald',
  'ruby',
  'sapphire',
  'gold',
];

/**
 * Generates deterministic, non-repeating, validated board patterns for Levels 1..1050.
 * Never fills an entire row or column on start, and always leaves ample placement room.
 */
function buildLevelPattern(levelId: number, rng: () => number): {
  grid: BoardGrid;
  obstacleCount: number;
  gemCount: number;
} {
  const grid = createEmptyBoard();
  let obstacleCount = 0;
  let gemCount = 0;

  // Curated early onboarding levels 1-10
  if (levelId === 1) {
    // Almost clean board with 2 gems in middle row to teach line-clearing gems
    grid[4][3] = { kind: 'gem', colorIndex: 4, gemType: 'emerald' };
    grid[4][6] = { kind: 'gem', colorIndex: 4, gemType: 'emerald' };
    return { grid, obstacleCount: 0, gemCount: 2 };
  }

  if (levelId === 2) {
    grid[2][2] = { kind: 'crate', colorIndex: 0, hp: 1 };
    grid[2][7] = { kind: 'crate', colorIndex: 0, hp: 1 };
    grid[7][2] = { kind: 'crate', colorIndex: 0, hp: 1 };
    grid[7][7] = { kind: 'crate', colorIndex: 0, hp: 1 };
    return { grid, obstacleCount: 4, gemCount: 0 };
  }

  if (levelId === 3) {
    grid[3][4] = { kind: 'gem', colorIndex: 2, gemType: 'ruby' };
    grid[5][4] = { kind: 'gem', colorIndex: 3, gemType: 'sapphire' };
    grid[4][3] = { kind: 'block', colorIndex: 1 };
    grid[4][5] = { kind: 'block', colorIndex: 1 };
    return { grid, obstacleCount: 0, gemCount: 2 };
  }

  const patternType = (levelId * 7 + Math.floor(rng() * 5)) % 9;
  const difficultyRatio = Math.min(1, levelId / 600);
  const maxSpecials = Math.min(24, 4 + Math.floor(difficultyRatio * 18));

  const placeSafe = (
    r: number,
    c: number,
    cell: CellData
  ) => {
    if (r < 0 || r >= 10 || c < 0 || c >= 10) return;
    if (grid[r][c].kind !== 'empty') return;
    // Prevent filling a full row or column at level start
    const rowCount = grid[r].filter((x) => x.kind !== 'empty').length;
    const colCount = grid.filter((row) => row[c].kind !== 'empty').length;
    if (rowCount >= 7 || colCount >= 7) return;
    grid[r][c] = cell;
    if (cell.kind === 'gem') gemCount++;
    if (cell.kind === 'crate' || cell.kind === 'ice') obstacleCount++;
  };

  const makeObstacle = (): CellData => {
    const useIce = levelId > 25 && rng() < 0.42;
    const hp = levelId > 60 && !useIce && rng() < 0.25 + difficultyRatio * 0.25 ? 2 : 1;
    return {
      kind: useIce ? 'ice' : 'crate',
      colorIndex: Math.floor(rng() * 8),
      hp,
    };
  };

  const makeGem = (): CellData => ({
    kind: 'gem',
    colorIndex: Math.floor(rng() * 8),
    gemType: GEM_TYPES[Math.floor(rng() * GEM_TYPES.length)],
  });

  if (patternType === 0) {
    // Symmetric corners + center gems
    const offsets = [
      [1, 1], [1, 8], [8, 1], [8, 8],
      [2, 2], [2, 7], [7, 2], [7, 7],
    ];
    for (let i = 0; i < Math.min(offsets.length, maxSpecials); i++) {
      const [r, c] = offsets[i];
      placeSafe(r, c, i % 3 === 0 ? makeGem() : makeObstacle());
    }
  } else if (patternType === 1) {
    // Diagonal ribbon
    for (let i = 1; i < 9; i++) {
      if (rng() < 0.72) {
        placeSafe(i, i, i % 2 === 0 ? makeGem() : makeObstacle());
      }
      if (levelId > 80 && rng() < 0.45 && i !== 9 - i) {
        placeSafe(i, 9 - i, makeObstacle());
      }
    }
  } else if (patternType === 2) {
    // Center diamond ring
    const ring = [
      [3, 4], [3, 5], [4, 3], [4, 6],
      [5, 3], [5, 6], [6, 4], [6, 5],
    ];
    for (const [r, c] of ring) {
      if (rng() < 0.8) placeSafe(r, c, rng() < 0.45 ? makeGem() : makeObstacle());
    }
  } else if (patternType === 3) {
    // Twin pillars
    const colA = 2 + Math.floor(rng() * 2);
    const colB = 9 - colA;
    for (let r = 2; r <= 7; r++) {
      if (rng() < 0.68) placeSafe(r, colA, r % 2 === 0 ? makeGem() : makeObstacle());
      if (rng() < 0.68) placeSafe(r, colB, r % 2 === 1 ? makeGem() : makeObstacle());
    }
  } else if (patternType === 4) {
    // Checkerboard islands
    for (let r = 1; r <= 8; r += 2) {
      for (let c = 1; c <= 8; c += 2) {
        if (gemCount + obstacleCount < maxSpecials && rng() < 0.55) {
          placeSafe(r, c, rng() < 0.4 ? makeGem() : makeObstacle());
        }
      }
    }
  } else if (patternType === 5) {
    // Crosshair fortress
    for (let i = 1; i <= 8; i++) {
      if (i !== 4 && i !== 5 && rng() < 0.7) {
        placeSafe(4, i, rng() < 0.35 ? makeGem() : makeObstacle());
        placeSafe(i, 5, rng() < 0.35 ? makeGem() : makeObstacle());
      }
    }
  } else if (patternType === 6) {
    // Corner clusters with pre-placed neutral blocks
    const corners = [
      [0, 0], [0, 1], [1, 0],
      [0, 9], [0, 8], [1, 9],
      [9, 0], [8, 0], [9, 1],
      [9, 9], [8, 9], [9, 8],
    ];
    for (const [r, c] of corners) {
      if (rng() < 0.62) {
        placeSafe(r, c, rng() < 0.3 ? makeGem() : { kind: 'block', colorIndex: levelId % 8 });
      }
    }
  } else if (patternType === 7) {
    // Spiral scatter
    let count = 0;
    while (count < maxSpecials) {
      const r = Math.floor(rng() * 10);
      const c = Math.floor(rng() * 10);
      placeSafe(r, c, count % 3 === 0 ? makeGem() : makeObstacle());
      count++;
    }
  } else {
    // Twin horizontal bands
    const r1 = 2 + Math.floor(rng() * 2);
    const r2 = 9 - r1;
    for (let c = 1; c <= 8; c++) {
      if (rng() < 0.55) placeSafe(r1, c, c % 3 === 0 ? makeGem() : makeObstacle());
      if (rng() < 0.55) placeSafe(r2, c, c % 3 === 1 ? makeGem() : makeObstacle());
    }
  }

  // Ensure every level with gem/obstacle mission has at least a few targets
  if (gemCount === 0 && obstacleCount === 0) {
    placeSafe(4, 4, makeGem());
    placeSafe(5, 5, makeGem());
  }

  return { grid, obstacleCount, gemCount };
}

export function getLevelConfig(levelId: number): LevelConfig {
  const clamped = Math.max(1, Math.min(TOTAL_LEVELS, levelId));
  const chapter = Math.ceil(clamped / LEVELS_PER_CHAPTER);
  const rng = createSeededRng(clamped * 2654435761 + 918273);

  const { grid, obstacleCount, gemCount } = buildLevelPattern(clamped, rng);

  // Determine mission archetype based on level number + generated items
  const missionRoll = clamped % 5;
  const baseScore = 250 + Math.floor(clamped * 14 + Math.sqrt(clamped) * 60);
  const targetLines = Math.min(18, 2 + Math.floor(clamped / 45) + (clamped % 3));

  const objective: LevelObjective = {};
  let subtitle = '';

  if (clamped === 1) {
    objective.targetGems = gemCount;
    objective.targetScore = 150;
    subtitle = `Collect ${gemCount} Gems & reach 150 pts`;
  } else if (clamped === 2) {
    objective.targetObstacles = obstacleCount;
    subtitle = `Break all ${obstacleCount} wooden crates`;
  } else if (missionRoll === 1 && gemCount >= 2) {
    objective.targetGems = gemCount;
    objective.targetScore = Math.round(baseScore * 0.65);
    subtitle = `Collect ${gemCount} Gems · ${objective.targetScore} pts`;
  } else if (missionRoll === 2 && obstacleCount >= 2) {
    objective.targetObstacles = obstacleCount;
    subtitle = `Clear ${obstacleCount} board obstacles`;
  } else if (missionRoll === 3) {
    objective.targetLines = targetLines;
    subtitle = `Clear ${targetLines} horizontal or vertical lines`;
  } else if (missionRoll === 4 && (gemCount > 0 || obstacleCount > 0)) {
    if (gemCount > 0) objective.targetGems = gemCount;
    if (obstacleCount > 0) objective.targetObstacles = obstacleCount;
    objective.targetLines = Math.max(2, Math.floor(targetLines * 0.7));
    subtitle = `Clear ${objective.targetLines} lines & clear board targets`;
  } else {
    objective.targetScore = baseScore;
    subtitle = `Reach ${baseScore.toLocaleString()} points`;
  }

  // Move limit on select challenge-like levels (every 3rd level has a generous move cap)
  const hasMoveCap = clamped >= 8 && clamped % 3 === 0;
  const maxMoves = hasMoveCap
    ? Math.max(14, 24 - Math.floor((clamped % 100) / 15) + Math.ceil((gemCount + obstacleCount) * 0.7))
    : null;

  const s1 = objective.targetScore || Math.max(200, Math.round(baseScore * 0.6));
  const s2 = Math.round(s1 * 1.35);
  const s3 = Math.round(s1 * 1.75);

  const coinReward = 15 + Math.floor(chapter * 2) + (clamped % 10 === 0 ? 25 : 0);

  return {
    id: clamped,
    chapter,
    title: clamped % 50 === 0 ? `${getChapterName(chapter)} Finale` : `Level ${clamped}`,
    subtitle,
    objective,
    maxMoves,
    starThresholds: [s1, s2, s3],
    coinReward,
    presetGrid: grid,
    obstacleCount,
    gemCount,
  };
}

export function getChallengePresets(): ChallengeConfig[] {
  const presets: Array<{
    id: string;
    title: string;
    description: string;
    difficulty: ChallengeConfig['difficulty'];
    seed: number;
    objective: LevelObjective;
    maxMoves: number | null;
    timeLimitSec?: number | null;
    coinReward: number;
    pattern: (grid: BoardGrid) => void;
  }> = [
    {
      id: 'ch-tight-squeeze',
      title: 'Tight Squeeze',
      description: 'Break 8 corner crates inside 18 careful moves.',
      difficulty: 'Medium',
      seed: 101,
      objective: { targetObstacles: 8 },
      maxMoves: 18,
      coinReward: 60,
      pattern: (g) => {
        const pts = [[0,0],[0,9],[9,0],[9,9],[1,1],[1,8],[8,1],[8,8]];
        pts.forEach(([r, c]) => (g[r][c] = { kind: 'crate', colorIndex: 0, hp: 1 }));
      },
    },
    {
      id: 'ch-crossroads',
      title: 'Crossroads',
      description: 'Clear 6 lines and collect all 4 center gems.',
      difficulty: 'Medium',
      seed: 202,
      objective: { targetLines: 6, targetGems: 4 },
      maxMoves: 22,
      coinReward: 75,
      pattern: (g) => {
        g[4][4] = { kind: 'gem', colorIndex: 3, gemType: 'sapphire' };
        g[4][5] = { kind: 'gem', colorIndex: 2, gemType: 'ruby' };
        g[5][4] = { kind: 'gem', colorIndex: 4, gemType: 'emerald' };
        g[5][5] = { kind: 'gem', colorIndex: 5, gemType: 'gold' };
        for (let i = 1; i <= 8; i++) {
          if (i !== 4 && i !== 5) {
            g[4][i] = { kind: 'block', colorIndex: 1 };
          }
        }
      },
    },
    {
      id: 'ch-diamond-core',
      title: 'Diamond Core',
      description: 'Shatter the armored 2-HP vault in the center.',
      difficulty: 'Hard',
      seed: 303,
      objective: { targetObstacles: 8, targetScore: 900 },
      maxMoves: 26,
      coinReward: 95,
      pattern: (g) => {
        const ring = [[2,4],[2,5],[3,3],[3,6],[6,3],[6,6],[7,4],[7,5]];
        ring.forEach(([r, c]) => (g[r][c] = { kind: 'crate', colorIndex: 6, hp: 2 }));
      },
    },
    {
      id: 'ch-four-corners',
      title: 'Four Bastions',
      description: 'Clear 4 corner ice clusters and hit 1,200 points.',
      difficulty: 'Hard',
      seed: 404,
      objective: { targetObstacles: 12, targetScore: 1200 },
      maxMoves: null,
      coinReward: 110,
      pattern: (g) => {
        const pts = [
          [0,0],[0,1],[1,0],[0,8],[0,9],[1,9],
          [8,0],[9,0],[9,1],[8,9],[9,8],[9,9],
        ];
        pts.forEach(([r, c]) => (g[r][c] = { kind: 'ice', colorIndex: 3, hp: 1 }));
      },
    },
    {
      id: 'ch-speed-clear',
      title: '60s Blitz Clear',
      description: 'Score 1,000 points in under 60 seconds.',
      difficulty: 'Hard',
      seed: 505,
      objective: { targetScore: 1000 },
      maxMoves: null,
      timeLimitSec: 60,
      coinReward: 120,
      pattern: (g) => {
        g[3][3] = { kind: 'gem', colorIndex: 5, gemType: 'gold' };
        g[6][6] = { kind: 'gem', colorIndex: 5, gemType: 'gold' };
      },
    },
    {
      id: 'ch-twin-towers',
      title: 'Twin Towers',
      description: 'Dismantle both vertical obstacle columns.',
      difficulty: 'Expert',
      seed: 606,
      objective: { targetObstacles: 12, targetLines: 8 },
      maxMoves: 28,
      coinReward: 140,
      pattern: (g) => {
        for (let r = 2; r <= 7; r++) {
          g[r][2] = { kind: 'crate', colorIndex: 0, hp: r % 2 === 0 ? 2 : 1 };
          g[r][7] = { kind: 'ice', colorIndex: 3, hp: 1 };
        }
      },
    },
    {
      id: 'ch-gem-vault',
      title: 'Emerald Vault',
      description: 'Rescue all 8 embedded gems across the grid.',
      difficulty: 'Expert',
      seed: 707,
      objective: { targetGems: 8 },
      maxMoves: 24,
      coinReward: 150,
      pattern: (g) => {
        for (let i = 1; i <= 8; i++) {
          g[i][9 - i] = { kind: 'gem', colorIndex: 4, gemType: GEM_TYPES[i % 4] };
        }
      },
    },
    {
      id: 'ch-grandmaster',
      title: 'Deepak Grandmaster',
      description: 'Reach 2,500 points while clearing 12 obstacles.',
      difficulty: 'Master',
      seed: 808,
      objective: { targetScore: 2500, targetObstacles: 12 },
      maxMoves: null,
      coinReward: 220,
      pattern: (g) => {
        for (let i = 2; i <= 7; i++) {
          g[2][i] = { kind: 'crate', colorIndex: 7, hp: 2 };
          g[7][i] = { kind: 'ice', colorIndex: 3, hp: 1 };
        }
      },
    },
  ];

  return presets.map((p) => {
    const grid = createEmptyBoard();
    p.pattern(grid);
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      difficulty: p.difficulty,
      objective: p.objective,
      maxMoves: p.maxMoves,
      timeLimitSec: p.timeLimitSec ?? null,
      coinReward: p.coinReward,
      presetGrid: grid,
    };
  });
}

export function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDailyChallengeForDate(dateKey: string): ChallengeConfig {
  // Hash YYYY-MM-DD into a stable seed
  let hash = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const rng = createSeededRng(hash >>> 0);
  const grid = createEmptyBoard();

  let gems = 0;
  let obstacles = 0;
  const targetGems = 3 + Math.floor(rng() * 4);
  const targetObstacles = 4 + Math.floor(rng() * 6);

  let guard = 0;
  while (gems < targetGems && guard < 60) {
    guard++;
    const r = 1 + Math.floor(rng() * 8);
    const c = 1 + Math.floor(rng() * 8);
    if (grid[r][c].kind === 'empty') {
      grid[r][c] = {
        kind: 'gem',
        colorIndex: Math.floor(rng() * 8),
        gemType: GEM_TYPES[gems % GEM_TYPES.length],
      };
      gems++;
    }
  }

  guard = 0;
  while (obstacles < targetObstacles && guard < 80) {
    guard++;
    const r = Math.floor(rng() * 10);
    const c = Math.floor(rng() * 10);
    const rowCount = grid[r].filter((x) => x.kind !== 'empty').length;
    const colCount = grid.filter((row) => row[c].kind !== 'empty').length;
    if (grid[r][c].kind === 'empty' && rowCount < 6 && colCount < 6) {
      grid[r][c] = {
        kind: rng() < 0.5 ? 'crate' : 'ice',
        colorIndex: Math.floor(rng() * 8),
        hp: rng() < 0.25 ? 2 : 1,
      };
      obstacles++;
    }
  }

  const targetScore = 900 + Math.floor(rng() * 600);

  return {
    id: `daily-${dateKey}`,
    title: `Daily Puzzle · ${dateKey}`,
    description: `Collect ${gems} gems, clear ${obstacles} obstacles & score ${targetScore.toLocaleString()} pts.`,
    difficulty: 'Hard',
    objective: {
      targetGems: gems,
      targetObstacles: obstacles,
      targetScore,
    },
    maxMoves: 28,
    coinReward: 100,
    presetGrid: grid,
  };
}
