import React, { useState } from 'react';
import {
  ArrowLeft,
  Music,
  ShieldCheck,
  Smartphone,
  Trash2,
  Vibrate,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { adManager } from '../ads/adManager';
import { soundEngine } from '../audio/soundEngine';
import { createDefaultSaveData } from '../storage/saveSystem';
import { SaveData, ThemeConfig } from '../types/game';

interface SettingsScreenProps {
  save: SaveData;
  theme: ThemeConfig;
  onBack: () => void;
  onUpdateSave: (updater: (prev: SaveData) => SaveData) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  save,
  theme,
  onBack,
  onUpdateSave,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const toggleMusic = () => {
    soundEngine.unlockFromGesture();
    soundEngine.playSfx('click');
    onUpdateSave((prev) => ({
      ...prev,
      settings: { ...prev.settings, musicEnabled: !prev.settings.musicEnabled },
    }));
  };

  const toggleSfx = () => {
    soundEngine.unlockFromGesture();
    onUpdateSave((prev) => ({
      ...prev,
      settings: { ...prev.settings, sfxEnabled: !prev.settings.sfxEnabled },
    }));
  };

  const toggleHaptics = () => {
    soundEngine.playSfx('click');
    onUpdateSave((prev) => ({
      ...prev,
      settings: { ...prev.settings, hapticsEnabled: !prev.settings.hapticsEnabled },
    }));
  };

  const setDragOffset = (mode: SaveData['settings']['dragOffsetMode']) => {
    soundEngine.playSfx('click');
    onUpdateSave((prev) => ({
      ...prev,
      settings: { ...prev.settings, dragOffsetMode: mode },
    }));
  };

  const handleResetAll = () => {
    soundEngine.playSfx('click');
    onUpdateSave(() => createDefaultSaveData());
    setConfirmReset(false);
    setResetDone(true);
    window.setTimeout(() => setResetDone(false), 2500);
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
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center hover:bg-white/5"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-extrabold">Settings</h1>
          <div className="w-[44px]" />
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-5 space-y-5">
        {resetDone && (
          <div className="rounded-2xl p-3 bg-emerald-500/20 border border-emerald-400/30 text-center text-xs font-semibold text-emerald-200">
            Progress reset to fresh game state.
          </div>
        )}

        {/* Audio & Haptics */}
        <section
          className="rounded-3xl p-5 space-y-3"
          style={{ backgroundColor: theme.surfaceBg, border: `1px solid ${theme.surfaceBorder}` }}
        >
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: theme.accentHex }}>
            Audio & Feedback
          </h2>

          <div className="divide-y divide-white/5">
            <div className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Music className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="font-semibold text-sm">Background Music</div>
                  <div className="text-xs" style={{ color: theme.textMuted }}>
                    Gentle ambient marimba soundtrack
                  </div>
                </div>
              </div>
              <button
                onClick={toggleMusic}
                className={`min-h-[40px] px-4 rounded-xl text-xs font-bold ${
                  save.settings.musicEnabled
                    ? `${theme.accentBg} text-slate-950`
                    : 'bg-white/10 text-white/60'
                }`}
              >
                {save.settings.musicEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {save.settings.sfxEnabled ? (
                  <Volume2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <VolumeX className="w-5 h-5 text-slate-400" />
                )}
                <div>
                  <div className="font-semibold text-sm">Sound Effects</div>
                  <div className="text-xs" style={{ color: theme.textMuted }}>
                    Block placement, line clears, combos & coins
                  </div>
                </div>
              </div>
              <button
                onClick={toggleSfx}
                className={`min-h-[40px] px-4 rounded-xl text-xs font-bold ${
                  save.settings.sfxEnabled
                    ? `${theme.accentBg} text-slate-950`
                    : 'bg-white/10 text-white/60'
                }`}
              >
                {save.settings.sfxEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Vibrate className="w-5 h-5 text-sky-400" />
                <div>
                  <div className="font-semibold text-sm">Touch Haptics</div>
                  <div className="text-xs" style={{ color: theme.textMuted }}>
                    Tactile vibration on Android devices
                  </div>
                </div>
              </div>
              <button
                onClick={toggleHaptics}
                className={`min-h-[40px] px-4 rounded-xl text-xs font-bold ${
                  save.settings.hapticsEnabled
                    ? `${theme.accentBg} text-slate-950`
                    : 'bg-white/10 text-white/60'
                }`}
              >
                {save.settings.hapticsEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </section>

        {/* Touch Control Calibration */}
        <section
          className="rounded-3xl p-5 space-y-3"
          style={{ backgroundColor: theme.surfaceBg, border: `1px solid ${theme.surfaceBorder}` }}
        >
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: theme.accentHex }}>
              Touch Drag Finger-Lift Offset
            </h2>
          </div>
          <p className="text-xs" style={{ color: theme.textMuted }}>
            Raises dragged blocks above your fingertip on touchscreens so you can clearly see target grid cells.
          </p>

          <div className="grid grid-cols-3 gap-2">
            {(['compact', 'normal', 'high'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setDragOffset(opt)}
                className={`min-h-[44px] rounded-xl text-xs font-bold capitalize ${
                  save.settings.dragOffsetMode === opt
                    ? `${theme.accentBg} text-slate-950`
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </section>

        {/* App Info & Data Management */}
        <section
          className="rounded-3xl p-5 space-y-4"
          style={{ backgroundColor: theme.surfaceBg, border: `1px solid ${theme.surfaceBorder}` }}
        >
          <div className="flex items-center gap-3">
            <img
              src="/src/assets/images/app_icon_1795262186898.jpg"
              alt="App Icon"
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-xl object-cover"
            />
            <div>
              <div className="font-bold text-base">Block Puzzle – Deepak Edition</div>
              <div className="text-xs" style={{ color: theme.textMuted }}>
                Offline-ready · Android Capacitor Portrait Edition
              </div>
            </div>
          </div>

          {adManager.isPrivacyOptionsRequired() && (
            <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Ad Privacy Preferences</div>
                  <div className="text-xs" style={{ color: theme.textMuted }}>
                    Manage your Google consent choices.
                  </div>
                </div>
              </div>
              <button
                onClick={() => adManager.openPrivacyOptions()}
                className="min-h-[42px] px-4 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold shrink-0"
              >
                Manage
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-sm text-rose-400">Reset Saved Progress</div>
              <div className="text-xs" style={{ color: theme.textMuted }}>
                Clears levels, coins, themes, and statistics from this device.
              </div>
            </div>
            <button
              onClick={() => setConfirmReset(true)}
              className="min-h-[42px] px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold flex items-center gap-1.5 shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>
        </section>
      </main>

      {/* In-app confirmation modal */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl"
            style={{ backgroundColor: theme.surfaceBg, border: `1px solid ${theme.surfaceBorder}` }}
          >
            <h3 className="text-lg font-extrabold">Reset All Progress?</h3>
            <p className="text-xs leading-relaxed" style={{ color: theme.textMuted }}>
              This will erase your unlocked levels, high scores, coins, and unlocked themes. This action cannot be undone.
            </p>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 min-h-[46px] rounded-xl bg-white/10 font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleResetAll}
                className="flex-1 min-h-[46px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
