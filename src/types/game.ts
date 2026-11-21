export type GameMode = 'classic' | 'level' | 'challenge' | 'daily' | 'time';

export type ScreenId =
  | 'home'
  | 'gameplay'
  | 'levels'
  | 'challenges'
  | 'shop'
  | 'rewards'
  | 'achievements'
  | 'settings';

export type BoosterType =
  | 'undo'
  | 'removeBlock'
  | 'clearRow'
  | 'clearCol'
  | 'shuffle'
  | 'extraMove';

export type BlockSkinId =
  | 'carved-wood'
  | 'polished-gem'
  | 'minimal-matte'
  | 'neon-prism';

export type ThemeId =
  | 'classic-wood'
  | 'neon-cyber'
  | 'midnight-dark'
  | 'candy-colorful'
  | 'forest-nature'
  | 'royal-sapphire';

export type CellKind = 'empty' | 'block' | 'crate' | 'ice' | 'gem';

export interface CellData {
  kind: CellKind;
  colorIndex: number; // 0..7 palette index
  hp?: number; // for multi-hit crates/ice (1 or 2)
  gemType?: 'emerald' | 'ruby' | 'sapphire' | 'gold';
}

export type BoardGrid = CellData[][]; // 10x10

export interface BlockShape {
  id: string;
  name: string;
  matrix: number[][]; // 1 = occupied, 0 = empty
  weight: number; // spawn frequency weight
  tier: 'small' | 'medium' | 'large';
}

export interface TrayPiece {
  uid: string;
  shape: BlockShape;
  colorIndex: number;
  used: boolean;
}

export interface LevelObjective {
  targetScore?: number;
  targetLines?: number;
  targetGems?: number;
  targetObstacles?: number;
}

export interface LevelConfig {
  id: number;
  chapter: number;
  title: string;
  subtitle: string;
  objective: LevelObjective;
  maxMoves: number | null; // null = unlimited moves until no piece fits
  starThresholds: [number, number, number];
  coinReward: number;
  presetGrid: BoardGrid;
  obstacleCount: number;
  gemCount: number;
}

export interface ChallengeConfig {
  id: string;
  title: string;
  description: string;
  difficulty: 'Medium' | 'Hard' | 'Expert' | 'Master';
  objective: LevelObjective;
  maxMoves: number | null;
  timeLimitSec?: number | null;
  coinReward: number;
  presetGrid: BoardGrid;
}

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  tagline: string;
  price: number;
  isPremium?: boolean;
  appBg: string;
  surfaceBg: string;
  surfaceBorder: string;
  textPrimary: string;
  textMuted: string;
  accentBg: string;
  accentText: string;
  accentHex: string;
  boardFrameHex: string;
  boardBgHex: string;
  cellEmptyHex: string;
  cellEmptyBorderHex: string;
  gridLineHex: string;
  blockColors: string[];
}

export interface SkinConfig {
  id: BlockSkinId;
  name: string;
  description: string;
  price: number;
}

export interface BoosterCatalogItem {
  id: BoosterType;
  name: string;
  shortName: string;
  description: string;
  price: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  metric:
    | 'totalLines'
    | 'bestClassicScore'
    | 'highestLevel'
    | 'maxCombo'
    | 'maxMultiClear'
    | 'dailyCompleted'
    | 'themesOwned'
    | 'boostersUsed'
    | 'totalGames'
    | 'spinsUsed'
    | 'challengesCompleted';
  target: number;
  coinReward: number;
}

export interface RewardHistoryItem {
  id: string;
  reason: string;
  amount: number; // positive = earned, negative = spent
  timestamp: string;
}

export interface PlayerStats {
  totalGames: number;
  totalLines: number;
  totalBlocksPlaced: number;
  maxCombo: number;
  maxMultiClear: number;
  boostersUsed: number;
  spinsUsed: number;
  totalStarsEarned: number;
}

export interface SaveData {
  version: number;
  coins: number;
  bestScores: {
    classic: number;
    time: number;
    daily: number;
  };
  unlockedLevel: number; // highest unlocked level 1..1050
  levelStars: Record<number, number>; // levelId -> 1 | 2 | 3
  levelBestScores: Record<number, number>;
  completedChallenges: string[];
  completedDailyDates: string[]; // YYYY-MM-DD
  dailyStreak: number;
  lastDailyLoginDate: string | null; // YYYY-MM-DD
  dailyLoginDay: number; // 0..6 (next day index to claim)
  lastSpinDate: string | null; // YYYY-MM-DD
  claimedChests: string[]; // chest ids
  claimedAchievements: string[];
  boosters: Record<BoosterType, number>;
  unlockedThemes: ThemeId[];
  selectedTheme: ThemeId;
  unlockedSkins: BlockSkinId[];
  selectedSkin: BlockSkinId;
  settings: {
    musicEnabled: boolean;
    sfxEnabled: boolean;
    hapticsEnabled: boolean;
    dragOffsetMode: 'compact' | 'normal' | 'high';
  };
  stats: PlayerStats;
  rewardHistory: RewardHistoryItem[];
}

export interface UndoSnapshot {
  board: BoardGrid;
  tray: TrayPiece[];
  score: number;
  movesUsed: number;
  linesCleared: number;
  gemsCollected: number;
  obstaclesBroken: number;
  combo: number;
}
