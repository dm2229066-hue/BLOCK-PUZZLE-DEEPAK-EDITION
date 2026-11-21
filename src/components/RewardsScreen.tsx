import React, { useState } from 'react';
import { ArrowLeft, CalendarCheck, Check, Coins, Gift, History, PackageOpen, Sparkles } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { getTodayDateKey } from '../data/levels';
import {
  BOOSTER_CATALOG,
  DAILY_LOGIN_REWARDS,
  REWARD_CHESTS,
  SPIN_WHEEL_SEGMENTS,
} from '../data/rewards';
import { appendRewardHistory, canClaimDailyLogin, canFreeSpinToday } from '../storage/saveSystem';
import { SaveData, ThemeConfig } from '../types/game';

interface RewardsScreenProps {
  save: SaveData;
  theme: ThemeConfig;
  onBack: () => void;
  onUpdateSave: (updater: (prev: SaveData) => SaveData) => void;
}

export const RewardsScreen: React.FC<RewardsScreenProps> = ({
  save,
  theme,
  onBack,
  onUpdateSave,
}) => {
  const [wheelAngle, setWheelAngle] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rewardBanner, setRewardBanner] = useState<string | null>(null);

  const canClaimLogin = canClaimDailyLogin(save);
  const freeSpinAvailable = canFreeSpinToday(save);

  const handleClaimDailyLogin = () => {
    if (!canClaimLogin) return;
    const todayKey = getTodayDateKey();
    const reward = DAILY_LOGIN_REWARDS[save.dailyLoginDay % 7];

    soundEngine.playSfx('levelComplete');
    onUpdateSave((prev) => {
      const nextBoosters = { ...prev.boosters };
      if (reward.booster && reward.boosterQty) {
        nextBoosters[reward.booster] = (nextBoosters[reward.booster] ?? 0) + reward.boosterQty;
      }
      return {
        ...prev,
        coins: prev.coins + reward.coins,
        boosters: nextBoosters,
        lastDailyLoginDate: todayKey,
        dailyLoginDay: (prev.dailyLoginDay + 1) % 7,
        dailyStreak: prev.dailyStreak + 1,
        rewardHistory: appendRewardHistory(
          prev.rewardHistory,
          `Daily Login (${reward.label})`,
          reward.coins
        ),
      };
    });

    const boosterText =
      reward.booster && reward.boosterQty
        ? ` + ${reward.boosterQty}× ${BOOSTER_CATALOG[reward.booster].shortName}`
        : '';
    setRewardBanner(`Claimed +${reward.coins} Coins${boosterText}!`);
  };

  const handleSpin = (paid: boolean) => {
    if (isSpinning) return;
    const cost = paid ? 50 : 0;
    if (paid && save.coins < cost) {
      soundEngine.playSfx('invalid');
      setRewardBanner('Need 50 Coins for an extra spin!');
      return;
    }

    const segCount = SPIN_WHEEL_SEGMENTS.length;
    const winningIndex = Math.floor(Math.random() * segCount);
    const sliceDeg = 360 / segCount;
    // Rotate so winning segment lands under top pointer (0 deg)
    const targetOffset = 360 - (winningIndex * sliceDeg + sliceDeg / 2);
    const extraSpins = 360 * 5;
    const nextAngle = wheelAngle - (wheelAngle % 360) + extraSpins + targetOffset;

    setIsSpinning(true);
    setWheelAngle(nextAngle);
    soundEngine.playSfx('spin');

    if (paid) {
      onUpdateSave((prev) => ({
        ...prev,
        coins: prev.coins - cost,
        rewardHistory: appendRewardHistory(prev.rewardHistory, 'Lucky Spin Ticket', -cost),
      }));
    }

    window.setTimeout(() => {
      const prize = SPIN_WHEEL_SEGMENTS[winningIndex];
      const todayKey = getTodayDateKey();
      soundEngine.playSfx('coin');
      onUpdateSave((prev) => {
        const nextBoosters = { ...prev.boosters };
        if (prize.booster && prize.boosterQty) {
          nextBoosters[prize.booster] = (nextBoosters[prize.booster] ?? 0) + prize.boosterQty;
        }
        return {
          ...prev,
          coins: prev.coins + prize.coins,
          boosters: nextBoosters,
          lastSpinDate: todayKey,
          stats: {
            ...prev.stats,
            spinsUsed: prev.stats.spinsUsed + 1,
          },
          rewardHistory: appendRewardHistory(
            prev.rewardHistory,
            `Lucky Spin: ${prize.label}`,
            prize.coins
          ),
        };
      });
      setIsSpinning(false);
      setRewardBanner(`Lucky Spin Won: ${prize.label}!`);
    }, 3100);
  };

  const handleOpenChest = (chestId: string) => {
    const chest = REWARD_CHESTS.find((c) => c.id === chestId);
    if (!chest) return;
    if (save.claimedChests.includes(chestId)) return;

    const currentVal =
      chest.metric === 'stars' ? save.stats.totalStarsEarned : save.stats.totalLines;
    if (currentVal < chest.target) return;

    soundEngine.playSfx('levelComplete');
    onUpdateSave((prev) => ({
      ...prev,
      coins: prev.coins + chest.coins,
      claimedChests: [...prev.claimedChests, chest.id],
      boosters: {
        ...prev.boosters,
        [chest.booster]: prev.boosters[chest.booster] + chest.boosterQty,
      },
      rewardHistory: appendRewardHistory(prev.rewardHistory, `Opened ${chest.title}`, chest.coins),
    }));
    setRewardBanner(
      `${chest.title} opened: +${chest.coins} Coins & +${chest.boosterQty}× ${BOOSTER_CATALOG[chest.booster].shortName}!`
    );
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

          <h1 className="text-lg font-extrabold">Rewards, Spin & Chests</h1>

          <div
            className="min-h-[40px] px-3 rounded-xl flex items-center gap-1.5 font-mono tabular-nums font-bold text-sm"
            style={{ backgroundColor: theme.surfaceBg, border: `1px solid ${theme.surfaceBorder}` }}
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span>{save.coins.toLocaleString()}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-5 space-y-6">
        {rewardBanner && (
          <div className="rounded-2xl p-3.5 bg-amber-500/20 border border-amber-400/40 text-center text-sm font-bold text-amber-200">
            {rewardBanner}
          </div>
        )}

        {/* 7-Day Daily Login Calendar */}
        <section
          className="rounded-3xl p-5 space-y-4"
          style={{ backgroundColor: theme.surfaceBg, border: `1px solid ${theme.surfaceBorder}` }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-emerald-400" />
                <span>7-Day Daily Login Calendar</span>
              </h2>
              <p className="text-xs" style={{ color: theme.textMuted }}>
                Login streak: {save.dailyStreak} days
              </p>
            </div>
            <button
              disabled={!canClaimLogin}
              onClick={handleClaimDailyLogin}
              className={`min-h-[44px] px-5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 ${
                canClaimLogin
                  ? `${theme.accentBg} text-slate-950`
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              }`}
            >
              <Gift className="w-4 h-4" />
              <span>{canClaimLogin ? 'Claim Today' : 'Claimed Today'}</span>
            </button>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {DAILY_LOGIN_REWARDS.map((item, idx) => {
              const isCurrent = idx === save.dailyLoginDay && canClaimLogin;
              const isPast = idx < save.dailyLoginDay;
              return (
                <div
                  key={item.day}
                  className={`rounded-2xl p-2.5 text-center flex flex-col items-center justify-center gap-1 ${
                    isCurrent ? 'ring-2 ring-amber-400' : ''
                  }`}
                  style={{
                    backgroundColor: isPast ? 'rgba(16,185,129,0.14)' : 'rgba(0,0,0,0.25)',
                    border: `1px solid ${theme.surfaceBorder}`,
                  }}
                >
                  <span className="text-[10px] font-bold uppercase" style={{ color: theme.textMuted }}>
                    {item.label}
                  </span>
                  {isPast ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Coins className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="text-xs font-extrabold font-mono tabular-nums">
                    +{item.coins}
                  </span>
                  {item.booster && (
                    <span className="text-[10px] text-sky-300 truncate max-w-full">
                      +{item.boosterQty} {BOOSTER_CATALOG[item.booster].shortName}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Lucky Spin Wheel + Milestone Chests */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Lucky Spin Wheel */}
          <section
            className="lg:col-span-5 rounded-3xl p-5 flex flex-col items-center gap-4 text-center"
            style={{ backgroundColor: theme.surfaceBg, border: `1px solid ${theme.surfaceBorder}` }}
          >
            <div>
              <h2 className="text-base font-extrabold flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Lucky Spin Wheel</span>
              </h2>
              <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                1 free spin daily · Extra spins 50 Coins
              </p>
            </div>

            <div className="relative w-60 h-60 flex items-center justify-center">
              {/* Top Pointer */}
              <div
                className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 w-0 h-0"
                style={{
                  borderLeft: '10px solid transparent',
                  borderRight: '10px solid transparent',
                  borderTop: '18px solid #facc15',
                }}
              />

              <svg
                viewBox="0 0 200 200"
                className="w-full h-full drop-shadow-xl"
                style={{
                  transform: `rotate(${wheelAngle}deg)`,
                  transition: isSpinning
                    ? 'transform 3s cubic-bezier(0.12, 0.8, 0.16, 1)'
                    : 'none',
                }}
              >
                {SPIN_WHEEL_SEGMENTS.map((seg, i) => {
                  const total = SPIN_WHEEL_SEGMENTS.length;
                  const startDeg = (i * 360) / total - 90;
                  const endDeg = ((i + 1) * 360) / total - 90;
                  const startRad = (startDeg * Math.PI) / 180;
                  const endRad = (endDeg * Math.PI) / 180;
                  const x1 = 100 + 94 * Math.cos(startRad);
                  const y1 = 100 + 94 * Math.sin(startRad);
                  const x2 = 100 + 94 * Math.cos(endRad);
                  const y2 = 100 + 94 * Math.sin(endRad);
                  const midRad = ((startDeg + endDeg) / 2) * (Math.PI / 180);
                  const tx = 100 + 60 * Math.cos(midRad);
                  const ty = 100 + 60 * Math.sin(midRad);
                  const textRot = (startDeg + endDeg) / 2 + 90;

                  return (
                    <g key={seg.id}>
                      <path
                        d={`M100,100 L${x1},${y1} A94,94 0 0,1 ${x2},${y2} Z`}
                        fill={seg.color}
                        stroke="#0f172a"
                        strokeWidth="2"
                      />
                      <text
                        x={tx}
                        y={ty}
                        fill="#ffffff"
                        fontSize="8.5"
                        fontWeight="800"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${textRot}, ${tx}, ${ty})`}
                      >
                        {seg.label}
                      </text>
                    </g>
                  );
                })}
                <circle cx="100" cy="100" r="16" fill="#0f172a" stroke="#facc15" strokeWidth="3" />
              </svg>
            </div>

            {freeSpinAvailable ? (
              <button
                disabled={isSpinning}
                onClick={() => handleSpin(false)}
                className={`w-full min-h-[48px] rounded-2xl font-bold text-sm text-slate-950 ${theme.accentBg} disabled:opacity-50`}
              >
                {isSpinning ? 'Spinning...' : 'Spin Free Daily Wheel'}
              </button>
            ) : (
              <button
                disabled={isSpinning}
                onClick={() => handleSpin(true)}
                className="w-full min-h-[48px] rounded-2xl font-bold text-sm bg-white/10 hover:bg-white/15 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Coins className="w-4 h-4 text-amber-400" />
                <span>{isSpinning ? 'Spinning...' : 'Extra Spin · 50 Coins'}</span>
              </button>
            )}
          </section>

          {/* Reward Chests */}
          <section
            className="lg:col-span-7 rounded-3xl p-5 space-y-3.5"
            style={{ backgroundColor: theme.surfaceBg, border: `1px solid ${theme.surfaceBorder}` }}
          >
            <h2 className="text-base font-extrabold flex items-center gap-2">
              <PackageOpen className="w-5 h-5 text-amber-400" />
              <span>Milestone Reward Chests</span>
            </h2>

            <div className="space-y-2.5">
              {REWARD_CHESTS.map((chest) => {
                const claimed = save.claimedChests.includes(chest.id);
                const progress =
                  chest.metric === 'stars' ? save.stats.totalStarsEarned : save.stats.totalLines;
                const ready = !claimed && progress >= chest.target;
                const pct = Math.min(100, Math.round((progress / chest.target) * 100));

                return (
                  <div
                    key={chest.id}
                    className="rounded-2xl p-3.5 flex items-center justify-between gap-3 bg-black/20"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm truncate">{chest.title}</span>
                        <span className="text-xs font-mono tabular-nums text-amber-400 shrink-0">
                          +{chest.coins}c · +{chest.boosterQty} {BOOSTER_CATALOG[chest.booster].shortName}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: theme.accentHex }}
                        />
                      </div>
                      <div className="text-[11px] tabular-nums" style={{ color: theme.textMuted }}>
                        {chest.requirementLabel} ({Math.min(progress, chest.target)}/{chest.target})
                      </div>
                    </div>

                    <button
                      disabled={!ready}
                      onClick={() => handleOpenChest(chest.id)}
                      className={`min-h-[42px] px-4 rounded-xl text-xs font-bold shrink-0 ${
                        claimed
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : ready
                          ? `${theme.accentBg} text-slate-950`
                          : 'bg-white/5 text-white/40 cursor-not-allowed'
                      }`}
                    >
                      {claimed ? 'Opened' : ready ? 'Open' : 'Locked'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Reward History */}
        <section
          className="rounded-3xl p-5 space-y-3"
          style={{ backgroundColor: theme.surfaceBg, border: `1px solid ${theme.surfaceBorder}` }}
        >
          <h2 className="text-base font-extrabold flex items-center gap-2">
            <History className="w-4 h-4 text-sky-400" />
            <span>Recent Coin History</span>
          </h2>
          <div className="divide-y divide-white/5 max-h-64 overflow-y-auto custom-scroll">
            {save.rewardHistory.slice(0, 20).map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{item.reason}</div>
                  <div className="text-[11px]" style={{ color: theme.textMuted }}>
                    {new Date(item.timestamp).toLocaleDateString()}
                  </div>
                </div>
                <span
                  className={`font-mono font-bold tabular-nums shrink-0 ${
                    item.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {item.amount >= 0 ? `+${item.amount}` : item.amount} Coins
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
