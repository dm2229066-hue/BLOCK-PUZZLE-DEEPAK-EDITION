import { AchievementDef, BoosterCatalogItem, BoosterType } from '../types/game';

export const BOOSTER_CATALOG: Record<BoosterType, BoosterCatalogItem> = {
  undo: {
    id: 'undo',
    name: 'Undo Move',
    shortName: 'Undo',
    description: 'Revert your last placed block and restore tray & score.',
    price: 25,
  },
  removeBlock: {
    id: 'removeBlock',
    name: 'Remove One Block',
    shortName: 'Hammer',
    description: 'Tap any single occupied cell on the board to shatter it.',
    price: 35,
  },
  clearRow: {
    id: 'clearRow',
    name: 'Clear One Row',
    shortName: 'Row Blast',
    description: 'Tap any row on the board to blast away all tiles in that row.',
    price: 55,
  },
  clearCol: {
    id: 'clearCol',
    name: 'Clear One Column',
    shortName: 'Col Blast',
    description: 'Tap any column on the board to clear the entire vertical line.',
    price: 55,
  },
  shuffle: {
    id: 'shuffle',
    name: 'Shuffle Blocks',
    shortName: 'Shuffle',
    description: 'Replace remaining tray shapes with fresh playable blocks.',
    price: 30,
  },
  extraMove: {
    id: 'extraMove',
    name: 'Extra Move',
    shortName: '+5 Moves',
    description: 'Adds +5 moves, +20s in Time Blitz, or clears a 2x2 center rescue zone.',
    price: 45,
  },
};

export const BOOSTER_LIST: BoosterCatalogItem[] = Object.values(BOOSTER_CATALOG);

export interface DailyLoginReward {
  day: number;
  label: string;
  coins: number;
  booster?: BoosterType;
  boosterQty?: number;
}

export const DAILY_LOGIN_REWARDS: DailyLoginReward[] = [
  { day: 1, label: 'Day 1', coins: 40 },
  { day: 2, label: 'Day 2', coins: 60, booster: 'undo', boosterQty: 1 },
  { day: 3, label: 'Day 3', coins: 85 },
  { day: 4, label: 'Day 4', coins: 100, booster: 'removeBlock', boosterQty: 1 },
  { day: 5, label: 'Day 5', coins: 130, booster: 'shuffle', boosterQty: 1 },
  { day: 6, label: 'Day 6', coins: 160, booster: 'clearRow', boosterQty: 1 },
  { day: 7, label: 'Mega Chest', coins: 300, booster: 'extraMove', boosterQty: 2 },
];

export interface SpinSegment {
  id: string;
  label: string;
  color: string;
  coins: number;
  booster?: BoosterType;
  boosterQty?: number;
}

export const SPIN_WHEEL_SEGMENTS: SpinSegment[] = [
  { id: 's1', label: '30 Coins', color: '#d97706', coins: 30 },
  { id: 's2', label: 'Undo x1', color: '#0284c7', coins: 15, booster: 'undo', boosterQty: 1 },
  { id: 's3', label: '75 Coins', color: '#059669', coins: 75 },
  { id: 's4', label: 'Hammer x1', color: '#9333ea', coins: 20, booster: 'removeBlock', boosterQty: 1 },
  { id: 's5', label: '150 Coins', color: '#e11d48', coins: 150 },
  { id: 's6', label: 'Shuffle x1', color: '#ca8a04', coins: 20, booster: 'shuffle', boosterQty: 1 },
  { id: 's7', label: '50 Coins', color: '#2563eb', coins: 50 },
  { id: 's8', label: 'JACKPOT 350', color: '#ea580c', coins: 350 },
];

export interface RewardChestDef {
  id: string;
  title: string;
  requirementLabel: string;
  metric: 'stars' | 'lines';
  target: number;
  coins: number;
  booster: BoosterType;
  boosterQty: number;
}

export const REWARD_CHESTS: RewardChestDef[] = [
  {
    id: 'chest-stars-15',
    title: 'Bronze Star Chest',
    requirementLabel: 'Earn 15 Level Stars',
    metric: 'stars',
    target: 15,
    coins: 120,
    booster: 'undo',
    boosterQty: 2,
  },
  {
    id: 'chest-lines-40',
    title: 'Line Sweeper Crate',
    requirementLabel: 'Clear 40 Total Lines',
    metric: 'lines',
    target: 40,
    coins: 150,
    booster: 'removeBlock',
    boosterQty: 2,
  },
  {
    id: 'chest-stars-60',
    title: 'Silver Star Chest',
    requirementLabel: 'Earn 60 Level Stars',
    metric: 'stars',
    target: 60,
    coins: 260,
    booster: 'clearRow',
    boosterQty: 2,
  },
  {
    id: 'chest-lines-150',
    title: 'Master Architect Box',
    requirementLabel: 'Clear 150 Total Lines',
    metric: 'lines',
    target: 150,
    coins: 350,
    booster: 'shuffle',
    boosterQty: 3,
  },
  {
    id: 'chest-stars-200',
    title: 'Golden Crown Chest',
    requirementLabel: 'Earn 200 Level Stars',
    metric: 'stars',
    target: 200,
    coins: 600,
    booster: 'extraMove',
    boosterQty: 3,
  },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'ach-first-game',
    title: 'First Match',
    description: 'Complete or play your first block puzzle session.',
    metric: 'totalGames',
    target: 1,
    coinReward: 25,
  },
  {
    id: 'ach-lines-10',
    title: 'Line Starter',
    description: 'Clear 10 horizontal or vertical lines.',
    metric: 'totalLines',
    target: 10,
    coinReward: 35,
  },
  {
    id: 'ach-lines-50',
    title: 'Grid Cleaner',
    description: 'Clear 50 lines across any mode.',
    metric: 'totalLines',
    target: 50,
    coinReward: 75,
  },
  {
    id: 'ach-lines-200',
    title: 'Line Virtuoso',
    description: 'Clear 200 lines across any mode.',
    metric: 'totalLines',
    target: 200,
    coinReward: 180,
  },
  {
    id: 'ach-lines-500',
    title: 'Grand Sweeper',
    description: 'Clear 500 lines total.',
    metric: 'totalLines',
    target: 500,
    coinReward: 350,
  },
  {
    id: 'ach-multi-2',
    title: 'Double Clear',
    description: 'Clear 2 or more lines with a single block placement.',
    metric: 'maxMultiClear',
    target: 2,
    coinReward: 40,
  },
  {
    id: 'ach-multi-4',
    title: 'Quadra Blast',
    description: 'Clear 4 or more lines in a single move.',
    metric: 'maxMultiClear',
    target: 4,
    coinReward: 150,
  },
  {
    id: 'ach-combo-3',
    title: 'Combo Rhythm',
    description: 'Achieve a 3x consecutive line-clear combo.',
    metric: 'maxCombo',
    target: 3,
    coinReward: 60,
  },
  {
    id: 'ach-combo-6',
    title: 'Unstoppable Streak',
    description: 'Achieve a 6x consecutive line-clear combo.',
    metric: 'maxCombo',
    target: 6,
    coinReward: 160,
  },
  {
    id: 'ach-score-1000',
    title: 'Thousand Club',
    description: 'Score 1,000+ points in Classic Mode.',
    metric: 'bestClassicScore',
    target: 1000,
    coinReward: 50,
  },
  {
    id: 'ach-score-5000',
    title: 'Puzzle Tactician',
    description: 'Score 5,000+ points in Classic Mode.',
    metric: 'bestClassicScore',
    target: 5000,
    coinReward: 140,
  },
  {
    id: 'ach-score-15000',
    title: 'Deepak Legend',
    description: 'Score 15,000+ points in Classic Mode.',
    metric: 'bestClassicScore',
    target: 15000,
    coinReward: 350,
  },
  {
    id: 'ach-lvl-5',
    title: 'Journey Begins',
    description: 'Reach Level 5 in Level Mode.',
    metric: 'highestLevel',
    target: 5,
    coinReward: 45,
  },
  {
    id: 'ach-lvl-25',
    title: 'Chapter Explorer',
    description: 'Unlock Level 25 in Level Mode.',
    metric: 'highestLevel',
    target: 25,
    coinReward: 110,
  },
  {
    id: 'ach-lvl-100',
    title: 'Centurion',
    description: 'Unlock Level 100 in Level Mode.',
    metric: 'highestLevel',
    target: 100,
    coinReward: 300,
  },
  {
    id: 'ach-daily-1',
    title: 'Daily Challenger',
    description: 'Complete your first Daily Challenge puzzle.',
    metric: 'dailyCompleted',
    target: 1,
    coinReward: 60,
  },
  {
    id: 'ach-themes-3',
    title: 'Style Collector',
    description: 'Own 3 or more board themes.',
    metric: 'themesOwned',
    target: 3,
    coinReward: 100,
  },
  {
    id: 'ach-booster-5',
    title: 'Power Tactician',
    description: 'Use 5 boosters during gameplay.',
    metric: 'boostersUsed',
    target: 5,
    coinReward: 65,
  },
];
