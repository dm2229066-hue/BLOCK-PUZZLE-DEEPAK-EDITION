import React from 'react';
import { ArrowLeft, Award, Check, Coins } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { ACHIEVEMENTS } from '../data/rewards';
import { appendRewardHistory, getAchievementProgress } from '../storage/saveSystem';
import { SaveData, ThemeConfig } from '../types/game';

interface AchievementsScreenProps {
  save: SaveData;
  theme: ThemeConfig;
  onBack: () => void;
  onUpdateSave: (updater: (prev: SaveData) => SaveData) => void;
}

export const AchievementsScreen: React.FC<AchievementsScreenProps> = ({
  save,
  theme,
  onBack,
  onUpdateSave,
}) => {
  const handleClaim = (achId: string, title: string, coins: number) => {
    if (save.claimedAchievements.includes(achId)) return;
    soundEngine.playSfx('coin');
    onUpdateSave((prev) => ({
      ...prev,
      coins: prev.coins + coins,
      claimedAchievements: [...prev.claimedAchievements, achId],
      rewardHistory: appendRewardHistory(prev.rewardHistory, `Achievement: ${title}`, coins),
    }));
  };

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
            <h1 className="text-lg font-extrabold">Achievement Center</h1>
            <p className="text-xs tabular-nums" style={{ color: theme.textMuted }}>
              {save.claimedAchievements.length}/{ACHIEVEMENTS.length} Completed
            </p>
          </div>

          <div
            className="min-h-[40px] px-3 rounded-xl flex items-center gap-1.5 font-mono tabular-nums font-bold text-sm"
            style={{ backgroundColor: theme.surfaceBg, border: `1px solid ${theme.surfaceBorder}` }}
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span>{save.coins.toLocaleString()}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {ACHIEVEMENTS.map((ach) => {
            const current = getAchievementProgress(save, ach);
            const claimed = save.claimedAchievements.includes(ach.id);
            const ready = !claimed && current >= ach.target;
            const pct = Math.min(100, Math.round((current / ach.target) * 100));

            return (
              <div
                key={ach.id}
                className="rounded-2xl p-4 flex items-center justify-between gap-3.5"
                style={{
                  backgroundColor: theme.surfaceBg,
                  border: `1px solid ${ready ? theme.accentHex : theme.surfaceBorder}`,
                }}
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      <Award
                        className={`w-5 h-5 ${
                          claimed || ready ? 'text-amber-400' : 'text-slate-400'
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">{ach.title}</div>
                      <p className="text-xs" style={{ color: theme.textMuted }}>
                        {ach.description}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: theme.accentHex }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] tabular-nums" style={{ color: theme.textMuted }}>
                      <span>
                        {Math.min(current, ach.target).toLocaleString()} / {ach.target.toLocaleString()}
                      </span>
                      <span className="text-amber-400 font-bold">+{ach.coinReward} Coins</span>
                    </div>
                  </div>
                </div>

                <button
                  disabled={!ready}
                  onClick={() => handleClaim(ach.id, ach.title, ach.coinReward)}
                  className={`min-h-[42px] px-3.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1 ${
                    claimed
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : ready
                      ? `${theme.accentBg} text-slate-950`
                      : 'bg-white/5 text-white/40 cursor-not-allowed'
                  }`}
                >
                  {claimed ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Claimed</span>
                    </>
                  ) : ready ? (
                    <span>Claim</span>
                  ) : (
                    <span>Locked</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};
