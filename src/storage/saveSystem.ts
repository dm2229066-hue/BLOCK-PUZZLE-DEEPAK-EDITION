import { ACHIEVEMENTS } from '../data/rewards';
import { getTodayDateKey, TOTAL_LEVELS } from '../data/levels';
import {
  AchievementDef,
  BlockSkinId,
  BoosterType,
  RewardHistoryItem,
  SaveData,
  ThemeId,
} from '../types/game';

const STORAGE_KEY = 'bp_deepak_edition_v1';

export function createDefaultSaveData(): SaveData {
  return {
    version: 1,
    coins: 150, // starter coins so players can try shop/boosters right away
    bestScores: {
      classic: 0,
      time: 0,
      daily: 0,
    },
    unlockedLevel: 1,
    levelStars: {},
    levelBestScores: {},
    completedChallenges: [],
    completedDailyDates: [],
    dailyStreak: 0,
    lastDailyLoginDate: null,
    dailyLoginDay: 0,
    lastSpinDate: null,
    claimedChests: [],
    claimedAchievements: [],
    boosters: {
      undo: 2,
      removeBlock: 2,
      clearRow: 1,
      clearCol: 1,
      shuffle: 2,
      extraMove: 1,
    },
    unlockedThemes: ['classic-wood'],
    selectedTheme: 'classic-wood',
    unlockedSkins: ['carved-wood'],
    selectedSkin: 'carved-wood',
    settings: {
      musicEnabled: true,
      sfxEnabled: true,
      hapticsEnabled: true,
      dragOffsetMode: 'normal',
    },
    stats: {
      totalGames: 0,
      totalLines: 0,
      totalBlocksPlaced: 0,
      maxCombo: 0,
      maxMultiClear: 0,
      boostersUsed: 0,
      spinsUsed: 0,
      totalStarsEarned: 0,
    },
    rewardHistory: [
      {
        id: 'init-welcome',
        reason: 'Welcome Bonus · Deepak Edition',
        amount: 150,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

function sanitizeSaveData(raw: unknown): SaveData {
  const def = createDefaultSaveData();
  if (!raw || typeof raw !== 'object') return def;
  const obj = raw as Partial<SaveData>;

  const totalStarsEarned =
    obj.levelStars && typeof obj.levelStars === 'object'
      ? Object.values(obj.levelStars).reduce(
          (sum, v) => sum + (typeof v === 'number' ? Math.max(0, Math.min(3, v)) : 0),
          0
        )
      : def.stats.totalStarsEarned;

  return {
    version: 1,
    coins: typeof obj.coins === 'number' && Number.isFinite(obj.coins) ? Math.max(0, Math.floor(obj.coins)) : def.coins,
    bestScores: {
      classic: typeof obj.bestScores?.classic === 'number' ? obj.bestScores.classic : 0,
      time: typeof obj.bestScores?.time === 'number' ? obj.bestScores.time : 0,
      daily: typeof obj.bestScores?.daily === 'number' ? obj.bestScores.daily : 0,
    },
    unlockedLevel:
      typeof obj.unlockedLevel === 'number'
        ? Math.max(1, Math.min(TOTAL_LEVELS, Math.floor(obj.unlockedLevel)))
        : 1,
    levelStars: obj.levelStars && typeof obj.levelStars === 'object' ? obj.levelStars : {},
    levelBestScores:
      obj.levelBestScores && typeof obj.levelBestScores === 'object' ? obj.levelBestScores : {},
    completedChallenges: Array.isArray(obj.completedChallenges) ? obj.completedChallenges : [],
    completedDailyDates: Array.isArray(obj.completedDailyDates) ? obj.completedDailyDates : [],
    dailyStreak: typeof obj.dailyStreak === 'number' ? Math.max(0, obj.dailyStreak) : 0,
    lastDailyLoginDate: typeof obj.lastDailyLoginDate === 'string' ? obj.lastDailyLoginDate : null,
    dailyLoginDay: typeof obj.dailyLoginDay === 'number' ? obj.dailyLoginDay % 7 : 0,
    lastSpinDate: typeof obj.lastSpinDate === 'string' ? obj.lastSpinDate : null,
    claimedChests: Array.isArray(obj.claimedChests) ? obj.claimedChests : [],
    claimedAchievements: Array.isArray(obj.claimedAchievements) ? obj.claimedAchievements : [],
    boosters: {
      undo: typeof obj.boosters?.undo === 'number' ? Math.max(0, obj.boosters.undo) : def.boosters.undo,
      removeBlock:
        typeof obj.boosters?.removeBlock === 'number'
          ? Math.max(0, obj.boosters.removeBlock)
          : def.boosters.removeBlock,
      clearRow:
        typeof obj.boosters?.clearRow === 'number' ? Math.max(0, obj.boosters.clearRow) : def.boosters.clearRow,
      clearCol:
        typeof obj.boosters?.clearCol === 'number' ? Math.max(0, obj.boosters.clearCol) : def.boosters.clearCol,
      shuffle:
        typeof obj.boosters?.shuffle === 'number' ? Math.max(0, obj.boosters.shuffle) : def.boosters.shuffle,
      extraMove:
        typeof obj.boosters?.extraMove === 'number'
          ? Math.max(0, obj.boosters.extraMove)
          : def.boosters.extraMove,
    },
    unlockedThemes:
      Array.isArray(obj.unlockedThemes) && obj.unlockedThemes.length > 0
        ? (obj.unlockedThemes as ThemeId[])
        : ['classic-wood'],
    selectedTheme: (obj.selectedTheme as ThemeId) || 'classic-wood',
    unlockedSkins:
      Array.isArray(obj.unlockedSkins) && obj.unlockedSkins.length > 0
        ? (obj.unlockedSkins as BlockSkinId[])
        : ['carved-wood'],
    selectedSkin: (obj.selectedSkin as BlockSkinId) || 'carved-wood',
    settings: {
      musicEnabled: obj.settings?.musicEnabled ?? true,
      sfxEnabled: obj.settings?.sfxEnabled ?? true,
      hapticsEnabled: obj.settings?.hapticsEnabled ?? true,
      dragOffsetMode: obj.settings?.dragOffsetMode ?? 'normal',
    },
    stats: {
      totalGames: obj.stats?.totalGames ?? 0,
      totalLines: obj.stats?.totalLines ?? 0,
      totalBlocksPlaced: obj.stats?.totalBlocksPlaced ?? 0,
      maxCombo: obj.stats?.maxCombo ?? 0,
      maxMultiClear: obj.stats?.maxMultiClear ?? 0,
      boostersUsed: obj.stats?.boostersUsed ?? 0,
      spinsUsed: obj.stats?.spinsUsed ?? 0,
      totalStarsEarned,
    },
    rewardHistory: Array.isArray(obj.rewardHistory) ? obj.rewardHistory.slice(0, 60) : def.rewardHistory,
  };
}

export function loadSaveData(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultSaveData();
    const parsed = JSON.parse(raw);
    return sanitizeSaveData(parsed);
  } catch {
    return createDefaultSaveData();
  }
}

export function persistSaveData(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Handle storage quota full gracefully
  }
}

export function appendRewardHistory(
  history: RewardHistoryItem[],
  reason: string,
  amount: number
): RewardHistoryItem[] {
  if (amount === 0) return history;
  const entry: RewardHistoryItem = {
    id: `tx-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    reason,
    amount,
    timestamp: new Date().toISOString(),
  };
  return [entry, ...history].slice(0, 60);
}

export function getAchievementProgress(save: SaveData, ach: AchievementDef): number {
  switch (ach.metric) {
    case 'totalLines':
      return save.stats.totalLines;
    case 'bestClassicScore':
      return save.bestScores.classic;
    case 'highestLevel':
      return save.unlockedLevel;
    case 'maxCombo':
      return save.stats.maxCombo;
    case 'maxMultiClear':
      return save.stats.maxMultiClear;
    case 'dailyCompleted':
      return save.completedDailyDates.length;
    case 'themesOwned':
      return save.unlockedThemes.length;
    case 'boostersUsed':
      return save.stats.boostersUsed;
    case 'totalGames':
      return save.stats.totalGames;
    case 'spinsUsed':
      return save.stats.spinsUsed;
    case 'challengesCompleted':
      return save.completedChallenges.length;
  }
}

export function canClaimDailyLogin(save: SaveData): boolean {
  const today = getTodayDateKey();
  return save.lastDailyLoginDate !== today;
}

export function canFreeSpinToday(save: SaveData): boolean {
  const today = getTodayDateKey();
  return save.lastSpinDate !== today;
}

export function useBoosterFromSave(save: SaveData, booster: BoosterType): SaveData | null {
  if (save.boosters[booster] <= 0) return null;
  return {
    ...save,
    boosters: {
      ...save.boosters,
      [booster]: save.boosters[booster] - 1,
    },
    stats: {
      ...save.stats,
      boostersUsed: save.stats.boostersUsed + 1,
    },
  };
}
