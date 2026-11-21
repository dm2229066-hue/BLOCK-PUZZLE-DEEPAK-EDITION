import React from 'react';
import {
  Award,
  Calendar,
  Coins,
  Flame,
  Gift,
  Grid3X3,
  Layers,
  Play,
  Settings,
  ShoppingBag,
  Timer,
  Trophy,
} from 'lucide-react';
import { canClaimDailyLogin, canFreeSpinToday } from '../storage/saveSystem';
import { GameMode, SaveData, ScreenId, ThemeConfig } from '../types/game';

interface HomeScreenProps {
  save: SaveData;
  theme: ThemeConfig;
  onStartMode: (mode: GameMode, levelId?: number) => void;
  onNavigate: (screen: ScreenId) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  save,
  theme,
  onStartMode,
  onNavigate,
}) => {
  const hasDailyGift = canClaimDailyLogin(save) || canFreeSpinToday(save);

  return (
    <div
      className="min-h-full w-full flex flex-col"
      style={{ backgroundColor: theme.appBg, color: theme.textPrimary }}
    >
      {/* Top Header Bar */}
      <header className="w-full max-w-6xl mx-auto px-4 pt-safe py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/src/assets/images/app_icon_1795262186898.jpg"
            alt="Block Puzzle Deepak Edition Emblem"
            referrerPolicy="no-referrer"
            className="w-11 h-11 rounded-xl object-cover shadow-md shrink-0 border border-white/10"
          />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight truncate leading-tight">
              Block Puzzle
            </h1>
            <p className="text-xs font-medium truncate" style={{ color: theme.textMuted }}>
              Deepak Edition · 1,050 Levels
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigate('rewards')}
            className="min-h-[44px] px-3.5 rounded-xl flex items-center gap-2 font-semibold text-sm tabular-nums transition-transform active:scale-95"
            style={{
              backgroundColor: theme.surfaceBg,
              border: `1px solid ${theme.surfaceBorder}`,
            }}
            aria-label="Coin balance and rewards"
          >
            <Coins className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{save.coins.toLocaleString()}</span>
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center transition-transform active:scale-95"
            style={{
              backgroundColor: theme.surfaceBg,
              border: `1px solid ${theme.surfaceBorder}`,
            }}
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Responsive Content: Single column on mobile portrait, 2-column balanced layout on desktop */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 pb-6 pt-2 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left / Primary Hero Column */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          {/* Primary Play Hero Card */}
          <div
            className="relative overflow-hidden rounded-3xl p-5 sm:p-7 shadow-xl"
            style={{
              backgroundColor: theme.surfaceBg,
              border: `1px solid ${theme.surfaceBorder}`,
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="space-y-2 max-w-md">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.accentHex }}>
                  Journey Progress
                </p>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                  Level {save.unlockedLevel}
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: theme.textMuted }}>
                  Drag carved blocks onto the 10×10 board, clear lines in combos, and conquer 1,050 handcrafted stages.
                </p>
                <div className="flex items-center gap-4 pt-1 text-xs font-medium tabular-nums" style={{ color: theme.textMuted }}>
                  <span>Best Classic: {save.bestScores.classic.toLocaleString()}</span>
                  <span aria-hidden="true">·</span>
                  <span>Stars: {save.stats.totalStarsEarned}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 sm:min-w-[190px]">
                <button
                  onClick={() => onStartMode('level', save.unlockedLevel)}
                  className={`min-h-[52px] px-6 rounded-2xl font-bold text-base text-slate-950 flex items-center justify-center gap-2.5 shadow-lg transition-transform active:scale-95 ${theme.accentBg}`}
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span className="whitespace-nowrap">Play Level {save.unlockedLevel}</span>
                </button>
                <button
                  onClick={() => onNavigate('levels')}
                  className="min-h-[44px] px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-white/5"
                  style={{ border: `1px solid ${theme.surfaceBorder}` }}
                >
                  <Layers className="w-4 h-4" />
                  <span>Browse 1,050 Levels</span>
                </button>
              </div>
            </div>
          </div>

          {/* 5 Game Modes Grid */}
          <div>
            <h3 className="text-sm font-bold mb-3 px-1" style={{ color: theme.textMuted }}>
              Game Modes
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onStartMode('classic')}
                className="min-h-[96px] p-4 rounded-2xl text-left flex flex-col justify-between transition-transform active:scale-[0.98] hover:brightness-110"
                style={{
                  backgroundColor: theme.surfaceBg,
                  border: `1px solid ${theme.surfaceBorder}`,
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <Grid3X3 className="w-6 h-6 text-amber-400" />
                  <span className="text-xs font-mono tabular-nums" style={{ color: theme.textMuted }}>
                    {save.bestScores.classic.toLocaleString()}
                  </span>
                </div>
                <div>
                  <div className="font-bold text-base">Classic Mode</div>
                  <div className="text-xs truncate" style={{ color: theme.textMuted }}>
                    Endless 10×10 high score
                  </div>
                </div>
              </button>

              <button
                onClick={() => onNavigate('levels')}
                className="min-h-[96px] p-4 rounded-2xl text-left flex flex-col justify-between transition-transform active:scale-[0.98] hover:brightness-110"
                style={{
                  backgroundColor: theme.surfaceBg,
                  border: `1px solid ${theme.surfaceBorder}`,
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <Layers className="w-6 h-6 text-emerald-400" />
                  <span className="text-xs font-mono tabular-nums" style={{ color: theme.textMuted }}>
                    {save.unlockedLevel}/1050
                  </span>
                </div>
                <div>
                  <div className="font-bold text-base">Level Mode</div>
                  <div className="text-xs truncate" style={{ color: theme.textMuted }}>
                    Gems, crates & stars
                  </div>
                </div>
              </button>

              <button
                onClick={() => onStartMode('daily')}
                className="min-h-[96px] p-4 rounded-2xl text-left flex flex-col justify-between transition-transform active:scale-[0.98] hover:brightness-110"
                style={{
                  backgroundColor: theme.surfaceBg,
                  border: `1px solid ${theme.surfaceBorder}`,
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <Calendar className="w-6 h-6 text-sky-400" />
                  <span className="text-xs font-mono tabular-nums" style={{ color: theme.textMuted }}>
                    {save.completedDailyDates.length} Done
                  </span>
                </div>
                <div>
                  <div className="font-bold text-base">Daily Challenge</div>
                  <div className="text-xs truncate" style={{ color: theme.textMuted }}>
                    New board every day
                  </div>
                </div>
              </button>

              <button
                onClick={() => onStartMode('time')}
                className="min-h-[96px] p-4 rounded-2xl text-left flex flex-col justify-between transition-transform active:scale-[0.98] hover:brightness-110"
                style={{
                  backgroundColor: theme.surfaceBg,
                  border: `1px solid ${theme.surfaceBorder}`,
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <Timer className="w-6 h-6 text-rose-400" />
                  <span className="text-xs font-mono tabular-nums" style={{ color: theme.textMuted }}>
                    {save.bestScores.time.toLocaleString()}
                  </span>
                </div>
                <div>
                  <div className="font-bold text-base">Time Challenge</div>
                  <div className="text-xs truncate" style={{ color: theme.textMuted }}>
                    120s speed blitz
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => onNavigate('challenges')}
              className="mt-3 w-full min-h-[68px] p-4 rounded-2xl flex items-center justify-between transition-transform active:scale-[0.99] hover:brightness-110"
              style={{
                backgroundColor: theme.surfaceBg,
                border: `1px solid ${theme.surfaceBorder}`,
              }}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
                  <Flame className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-base">Challenge Mode</div>
                  <div className="text-xs" style={{ color: theme.textMuted }}>
                    8 tactical missions with high coin payouts
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono tabular-nums shrink-0" style={{ color: theme.textMuted }}>
                {save.completedChallenges.length}/8
              </span>
            </button>
          </div>
        </section>

        {/* Right / Hub Actions Column */}
        <aside className="lg:col-span-5 flex flex-col gap-4">
          {/* Quick Navigation Grid */}
          <div
            className="rounded-3xl p-5 space-y-3"
            style={{
              backgroundColor: theme.surfaceBg,
              border: `1px solid ${theme.surfaceBorder}`,
            }}
          >
            <h3 className="text-sm font-bold" style={{ color: theme.textMuted }}>
              Player Hub
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onNavigate('shop')}
                className="min-h-[68px] p-3.5 rounded-2xl flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-colors text-left"
              >
                <ShoppingBag className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">Shop & Themes</div>
                  <div className="text-xs truncate" style={{ color: theme.textMuted }}>
                    {save.unlockedThemes.length}/6 Themes
                  </div>
                </div>
              </button>

              <button
                onClick={() => onNavigate('rewards')}
                className="min-h-[68px] p-3.5 rounded-2xl flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-colors text-left relative"
              >
                <Gift className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">Rewards & Spin</div>
                  <div className="text-xs truncate" style={{ color: theme.textMuted }}>
                    {hasDailyGift ? 'Ready to claim' : 'Wheel & Chests'}
                  </div>
                </div>
              </button>

              <button
                onClick={() => onNavigate('achievements')}
                className="min-h-[68px] p-3.5 rounded-2xl flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-colors text-left"
              >
                <Award className="w-5 h-5 text-sky-400 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">Achievements</div>
                  <div className="text-xs truncate" style={{ color: theme.textMuted }}>
                    {save.claimedAchievements.length}/18 Claimed
                  </div>
                </div>
              </button>

              <button
                onClick={() => onNavigate('settings')}
                className="min-h-[68px] p-3.5 rounded-2xl flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-colors text-left"
              >
                <Settings className="w-5 h-5 text-slate-300 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">Settings</div>
                  <div className="text-xs truncate" style={{ color: theme.textMuted }}>
                    Audio & Controls
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Lifetime Records Card */}
          <div
            className="rounded-3xl p-5 space-y-3"
            style={{
              backgroundColor: theme.surfaceBg,
              border: `1px solid ${theme.surfaceBorder}`,
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold" style={{ color: theme.textMuted }}>
                Lifetime Records
              </h3>
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-2xl bg-black/20">
                <div className="text-lg font-extrabold font-mono tabular-nums">
                  {save.stats.totalLines.toLocaleString()}
                </div>
                <div className="text-[11px]" style={{ color: theme.textMuted }}>
                  Lines Cleared
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-black/20">
                <div className="text-lg font-extrabold font-mono tabular-nums">
                  {save.stats.maxCombo}x
                </div>
                <div className="text-[11px]" style={{ color: theme.textMuted }}>
                  Best Combo
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-black/20">
                <div className="text-lg font-extrabold font-mono tabular-nums">
                  {save.stats.totalStarsEarned}
                </div>
                <div className="text-[11px]" style={{ color: theme.textMuted }}>
                  Total Stars
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};
