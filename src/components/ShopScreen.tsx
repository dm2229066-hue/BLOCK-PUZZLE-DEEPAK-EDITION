import React, { useState } from 'react';
import { ArrowLeft, Check, Coins, Crown, Palette, Sparkles, Zap } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { BOOSTER_LIST } from '../data/rewards';
import { SKIN_LIST, THEME_LIST } from '../data/themes';
import { appendRewardHistory } from '../storage/saveSystem';
import { BlockSkinId, BoosterType, SaveData, ThemeConfig, ThemeId } from '../types/game';

interface ShopScreenProps {
  save: SaveData;
  theme: ThemeConfig;
  onBack: () => void;
  onUpdateSave: (updater: (prev: SaveData) => SaveData) => void;
}

type ShopTab = 'themes' | 'skins' | 'boosters';

export const ShopScreen: React.FC<ShopScreenProps> = ({
  save,
  theme,
  onBack,
  onUpdateSave,
}) => {
  const [tab, setTab] = useState<ShopTab>('themes');
  const [feedback, setFeedback] = useState<string | null>(null);

  const flashMsg = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(null), 2200);
  };

  const handleThemeAction = (t: ThemeConfig) => {
    const owned = save.unlockedThemes.includes(t.id);
    if (owned) {
      soundEngine.playSfx('click');
      onUpdateSave((prev) => ({ ...prev, selectedTheme: t.id }));
      flashMsg(`${t.name} theme equipped!`);
      return;
    }
    if (save.coins < t.price) {
      soundEngine.playSfx('invalid');
      flashMsg(`Need ${t.price - save.coins} more coins.`);
      return;
    }
    soundEngine.playSfx('coin');
    onUpdateSave((prev) => ({
      ...prev,
      coins: prev.coins - t.price,
      unlockedThemes: [...prev.unlockedThemes, t.id as ThemeId],
      selectedTheme: t.id as ThemeId,
      rewardHistory: appendRewardHistory(prev.rewardHistory, `Unlocked Theme: ${t.name}`, -t.price),
    }));
    flashMsg(`Unlocked & equipped ${t.name}!`);
  };

  const handleSkinAction = (skinId: BlockSkinId, name: string, price: number) => {
    const owned = save.unlockedSkins.includes(skinId);
    if (owned) {
      soundEngine.playSfx('click');
      onUpdateSave((prev) => ({ ...prev, selectedSkin: skinId }));
      flashMsg(`${name} skin selected!`);
      return;
    }
    if (save.coins < price) {
      soundEngine.playSfx('invalid');
      flashMsg(`Need ${price - save.coins} more coins.`);
      return;
    }
    soundEngine.playSfx('coin');
    onUpdateSave((prev) => ({
      ...prev,
      coins: prev.coins - price,
      unlockedSkins: [...prev.unlockedSkins, skinId],
      selectedSkin: skinId,
      rewardHistory: appendRewardHistory(prev.rewardHistory, `Unlocked Skin: ${name}`, -price),
    }));
    flashMsg(`Unlocked & equipped ${name}!`);
  };

  const handleBuyBooster = (boosterId: BoosterType, name: string, unitPrice: number, qty: number) => {
    const totalCost = qty === 3 ? Math.round(unitPrice * 3 * 0.85) : unitPrice;
    if (save.coins < totalCost) {
      soundEngine.playSfx('invalid');
      flashMsg(`Need ${totalCost - save.coins} more coins.`);
      return;
    }
    soundEngine.playSfx('coin');
    onUpdateSave((prev) => ({
      ...prev,
      coins: prev.coins - totalCost,
      boosters: {
        ...prev.boosters,
        [boosterId]: prev.boosters[boosterId] + qty,
      },
      rewardHistory: appendRewardHistory(prev.rewardHistory, `Purchased ${qty}x ${name}`, -totalCost),
    }));
    flashMsg(`Added +${qty} ${name} to inventory!`);
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

          <h1 className="text-lg font-extrabold">Shop & Customization</h1>

          <div
            className="min-h-[40px] px-3 rounded-xl flex items-center gap-1.5 font-mono tabular-nums font-bold text-sm"
            style={{ backgroundColor: theme.surfaceBg, border: `1px solid ${theme.surfaceBorder}` }}
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span>{save.coins.toLocaleString()}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-4 space-y-5">
        {/* Segmented Tabs */}
        <div
          className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl max-w-md mx-auto"
          style={{ backgroundColor: theme.surfaceBg, border: `1px solid ${theme.surfaceBorder}` }}
        >
          <button
            onClick={() => setTab('themes')}
            className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors ${
              tab === 'themes' ? `${theme.accentBg} text-slate-950` : 'hover:bg-white/5'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Themes</span>
          </button>
          <button
            onClick={() => setTab('skins')}
            className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors ${
              tab === 'skins' ? `${theme.accentBg} text-slate-950` : 'hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Block Skins</span>
          </button>
          <button
            onClick={() => setTab('boosters')}
            className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors ${
              tab === 'boosters' ? `${theme.accentBg} text-slate-950` : 'hover:bg-white/5'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Boosters</span>
          </button>
        </div>

        {feedback && (
          <div className="max-w-md mx-auto rounded-xl px-4 py-2 bg-emerald-500/20 border border-emerald-400/30 text-center text-xs font-semibold text-emerald-200">
            {feedback}
          </div>
        )}

        {/* Themes Tab */}
        {tab === 'themes' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {THEME_LIST.map((t) => {
              const owned = save.unlockedThemes.includes(t.id);
              const selected = save.selectedTheme === t.id;
              return (
                <div
                  key={t.id}
                  className="rounded-2xl p-4 flex flex-col justify-between gap-4"
                  style={{
                    backgroundColor: theme.surfaceBg,
                    border: `1px solid ${selected ? theme.accentHex : theme.surfaceBorder}`,
                  }}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-base flex items-center gap-1.5">
                          <span>{t.name}</span>
                          {t.isPremium && <Crown className="w-4 h-4 text-amber-400" />}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                          {t.tagline}
                        </p>
                      </div>
                    </div>

                    {/* Board & Block Palette Preview */}
                    <div
                      className="rounded-xl p-3 flex items-center justify-between gap-2"
                      style={{ backgroundColor: t.boardBgHex, border: `2px solid ${t.boardFrameHex}` }}
                    >
                      <div className="flex items-center gap-1.5">
                        {t.blockColors.slice(0, 6).map((c, idx) => (
                          <div
                            key={idx}
                            className="w-6 h-6 rounded-md shadow-inner"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-mono text-white/60">10×10</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleThemeAction(t)}
                    className={`w-full min-h-[44px] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95 ${
                      selected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : owned
                        ? 'bg-white/10 hover:bg-white/15'
                        : `${theme.accentBg} text-slate-950`
                    }`}
                  >
                    {selected ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Equipped</span>
                      </>
                    ) : owned ? (
                      <span>Select Theme</span>
                    ) : (
                      <>
                        <Coins className="w-4 h-4" />
                        <span>Unlock · {t.price}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Block Skins Tab */}
        {tab === 'skins' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SKIN_LIST.map((s) => {
              const owned = save.unlockedSkins.includes(s.id);
              const selected = save.selectedSkin === s.id;
              return (
                <div
                  key={s.id}
                  className="rounded-2xl p-5 flex flex-col justify-between gap-4"
                  style={{
                    backgroundColor: theme.surfaceBg,
                    border: `1px solid ${selected ? theme.accentHex : theme.surfaceBorder}`,
                  }}
                >
                  <div className="space-y-2">
                    <div className="font-bold text-base">{s.name}</div>
                    <p className="text-xs" style={{ color: theme.textMuted }}>
                      {s.description}
                    </p>
                  </div>

                  <button
                    onClick={() => handleSkinAction(s.id, s.name, s.price)}
                    className={`w-full min-h-[44px] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95 ${
                      selected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : owned
                        ? 'bg-white/10 hover:bg-white/15'
                        : `${theme.accentBg} text-slate-950`
                    }`}
                  >
                    {selected ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Equipped</span>
                      </>
                    ) : owned ? (
                      <span>Equip Skin</span>
                    ) : (
                      <>
                        <Coins className="w-4 h-4" />
                        <span>Unlock · {s.price}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Boosters Tab */}
        {tab === 'boosters' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BOOSTER_LIST.map((b) => {
              const pack3Price = Math.round(b.price * 3 * 0.85);
              return (
                <div
                  key={b.id}
                  className="rounded-2xl p-4 flex flex-col justify-between gap-4"
                  style={{
                    backgroundColor: theme.surfaceBg,
                    border: `1px solid ${theme.surfaceBorder}`,
                  }}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-base">{b.name}</span>
                      <span className="text-xs font-mono tabular-nums text-emerald-400">
                        Owned: {save.boosters[b.id]}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: theme.textMuted }}>
                      {b.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleBuyBooster(b.id, b.name, b.price, 1)}
                      className="min-h-[42px] rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold flex items-center justify-center gap-1 tabular-nums"
                    >
                      <span>+1 ·</span>
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>{b.price}</span>
                    </button>
                    <button
                      onClick={() => handleBuyBooster(b.id, b.name, b.price, 3)}
                      className={`min-h-[42px] rounded-xl text-xs font-bold text-slate-950 flex items-center justify-center gap-1 tabular-nums ${theme.accentBg}`}
                    >
                      <span>+3 ·</span>
                      <Coins className="w-3.5 h-3.5" />
                      <span>{pack3Price}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
