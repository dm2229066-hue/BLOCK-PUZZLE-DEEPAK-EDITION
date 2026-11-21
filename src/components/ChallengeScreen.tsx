import React, { useMemo } from 'react';
import { ArrowLeft, Calendar, CheckCircle2, Coins, Flame, Play } from 'lucide-react';
import {
  getChallengePresets,
  getDailyChallengeForDate,
  getTodayDateKey,
} from '../data/levels';
import { ChallengeConfig, SaveData, ThemeConfig } from '../types/game';

interface ChallengeScreenProps {
  save: SaveData;
  theme: ThemeConfig;
  onBack: () => void;
  onPlayDaily: () => void;
  onPlayChallenge: (cfg: ChallengeConfig) => void;
}

export const ChallengeScreen: React.FC<ChallengeScreenProps> = ({
  save,
  theme,
  onBack,
  onPlayDaily,
  onPlayChallenge,
}) => {
  const todayKey = getTodayDateKey();
  const dailyCfg = useMemo(() => getDailyChallengeForDate(todayKey), [todayKey]);
  const isDailyDone = save.completedDailyDates.includes(todayKey);
  const challenges = useMemo(() => getChallengePresets(), []);

  return (
    <div
      className="min-h-full w-full flex flex-col"
      style={{ backgroundColor: theme.appBg, color: theme.textPrimary }}
    >
      <header
        className="sticky top-0 z-20 px-4 pt-safe py-3 border-b backdrop-blur-md"
        style={{ backgroundColor: `${theme.appBg}ee`, borderColor: theme.surfaceBorder }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center hover:bg-white/5"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-extrabold">Challenges & Daily</h1>
            <p className="text-xs tabular-nums" style={{ color: theme.textMuted }}>
              {save.completedChallenges.length}/{challenges.length} Missions Cleared
            </p>
          </div>
          <div className="w-[44px]" />
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-5 space-y-6">
        {/* Daily Challenge Card */}
        <section
          className="rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          style={{
            backgroundColor: theme.surfaceBg,
            border: `1px solid ${theme.surfaceBorder}`,
          }}
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400">
              <Calendar className="w-4 h-4" />
              <span>Today&apos;s Daily Challenge · {todayKey}</span>
            </div>
            <h2 className="text-xl font-extrabold">{dailyCfg.title}</h2>
            <p className="text-sm" style={{ color: theme.textMuted }}>
              {dailyCfg.description}
            </p>
            <div className="flex items-center gap-4 text-xs font-semibold pt-1 tabular-nums">
              <span className="text-amber-400 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" /> +{dailyCfg.coinReward} Coins
              </span>
              <span style={{ color: theme.textMuted }}>
                Completed Days: {save.completedDailyDates.length}
              </span>
            </div>
          </div>

          <button
            onClick={onPlayDaily}
            className={`min-h-[48px] px-5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shrink-0 ${
              isDailyDone
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : `${theme.accentBg} text-slate-950`
            }`}
          >
            {isDailyDone ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Replay Daily</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Play Daily</span>
              </>
            )}
          </button>
        </section>

        {/* Special Challenge Missions */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold px-1" style={{ color: theme.textMuted }}>
            Tactical Challenge Missions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {challenges.map((ch) => {
              const completed = save.completedChallenges.includes(ch.id);
              return (
                <div
                  key={ch.id}
                  className="rounded-2xl p-4 flex flex-col justify-between gap-3"
                  style={{
                    backgroundColor: theme.surfaceBg,
                    border: `1px solid ${theme.surfaceBorder}`,
                  }}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-base flex items-center gap-2">
                        <Flame className="w-4 h-4 text-purple-400 shrink-0" />
                        <span>{ch.title}</span>
                      </span>
                      <span className="text-xs font-semibold" style={{ color: theme.textMuted }}>
                        {ch.difficulty}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: theme.textMuted }}>
                      {ch.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1 tabular-nums">
                      <Coins className="w-3.5 h-3.5" /> +{ch.coinReward}
                    </span>

                    <button
                      onClick={() => onPlayChallenge(ch)}
                      className={`min-h-[40px] px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95 ${
                        completed
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : `${theme.accentBg} text-slate-950`
                      }`}
                    >
                      {completed ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Cleared</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Start</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};
