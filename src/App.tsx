import { useCallback, useEffect, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { adManager } from './ads/adManager';
import { soundEngine } from './audio/soundEngine';
import { AchievementsScreen } from './components/AchievementsScreen';
import { ChallengeScreen } from './components/ChallengeScreen';
import { GameplayScreen } from './components/GameplayScreen';
import { HomeScreen } from './components/HomeScreen';
import { LevelSelectScreen } from './components/LevelSelectScreen';
import { RewardsScreen } from './components/RewardsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { ShopScreen } from './components/ShopScreen';
import { THEMES } from './data/themes';
import { loadSaveData, persistSaveData } from './storage/saveSystem';
import { ChallengeConfig, GameMode, SaveData, ScreenId } from './types/game';

export default function App() {
  const [save, setSave] = useState<SaveData>(() => loadSaveData());
  const [screen, setScreen] = useState<ScreenId>('home');
  const [activeMode, setActiveMode] = useState<GameMode>('classic');
  const [activeLevelId, setActiveLevelId] = useState<number>(() => loadSaveData().unlockedLevel);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeConfig | null>(null);

  const theme = THEMES[save.selectedTheme] ?? THEMES['classic-wood'];

  // Initialize AdMob SDK & UMP Consent in background (preloads first interstitial; never shows on launch)
  useEffect(() => {
    adManager.initialize().catch(() => {});
  }, []);

  // Sync audio settings & persist save changes
  useEffect(() => {
    persistSaveData(save);
    soundEngine.setSettings(save.settings.musicEnabled, save.settings.sfxEnabled);
  }, [save]);

  // Unlock Web Audio on first user interaction
  useEffect(() => {
    const unlock = () => {
      soundEngine.unlockFromGesture();
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  // Pause audio when app goes to background (Android battery / focus safety)
  useEffect(() => {
    const onVisibility = () => {
      soundEngine.handleVisibilityChange(document.hidden);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Capacitor Android hardware Back Button handling
  useEffect(() => {
    let listenerHandle: { remove: () => Promise<void> } | null = null;
    CapApp.addListener('backButton', () => {
      if (screen !== 'home') {
        soundEngine.playSfx('click');
        setScreen('home');
      } else {
        CapApp.exitApp().catch(() => {});
      }
    })
      .then((handle) => {
        listenerHandle = handle;
      })
      .catch(() => {
        // Running in standard browser, ignore Capacitor bridge absence
      });

    return () => {
      if (listenerHandle) {
        listenerHandle.remove().catch(() => {});
      }
    };
  }, [screen]);

  const handleUpdateSave = useCallback((updater: (prev: SaveData) => SaveData) => {
    setSave((prev) => updater(prev));
  }, []);

  const handleNavigate = useCallback((nextScreen: ScreenId) => {
    soundEngine.unlockFromGesture();
    soundEngine.playSfx('click');
    setScreen(nextScreen);
  }, []);

  const handleStartMode = useCallback(
    (mode: GameMode, levelId?: number) => {
      soundEngine.unlockFromGesture();
      soundEngine.playSfx('click');
      setActiveMode(mode);
      setActiveChallenge(null);
      if (mode === 'level') {
        setActiveLevelId(levelId ?? save.unlockedLevel);
      }
      setScreen('gameplay');
    },
    [save.unlockedLevel]
  );

  const handleStartChallenge = useCallback((cfg: ChallengeConfig) => {
    soundEngine.unlockFromGesture();
    soundEngine.playSfx('click');
    setActiveMode('challenge');
    setActiveChallenge(cfg);
    setScreen('gameplay');
  }, []);

  return (
    <div
      className="min-h-screen w-full"
      style={{ backgroundColor: theme.appBg, color: theme.textPrimary }}
    >
      {screen === 'home' && (
        <HomeScreen
          save={save}
          theme={theme}
          onStartMode={handleStartMode}
          onNavigate={handleNavigate}
        />
      )}

      {screen === 'gameplay' && (
        <GameplayScreen
          mode={activeMode}
          levelId={activeLevelId}
          challengeConfig={activeChallenge}
          save={save}
          theme={theme}
          onUpdateSave={handleUpdateSave}
          onExitHome={() => handleNavigate('home')}
          onNextLevel={(nextLvl) => {
            soundEngine.playSfx('click');
            setActiveLevelId(nextLvl);
          }}
        />
      )}

      {screen === 'levels' && (
        <LevelSelectScreen
          save={save}
          theme={theme}
          onBack={() => handleNavigate('home')}
          onSelectLevel={(lvlId) => handleStartMode('level', lvlId)}
        />
      )}

      {screen === 'challenges' && (
        <ChallengeScreen
          save={save}
          theme={theme}
          onBack={() => handleNavigate('home')}
          onPlayDaily={() => handleStartMode('daily')}
          onPlayChallenge={handleStartChallenge}
        />
      )}

      {screen === 'shop' && (
        <ShopScreen
          save={save}
          theme={theme}
          onBack={() => handleNavigate('home')}
          onUpdateSave={handleUpdateSave}
        />
      )}

      {screen === 'rewards' && (
        <RewardsScreen
          save={save}
          theme={theme}
          onBack={() => handleNavigate('home')}
          onUpdateSave={handleUpdateSave}
        />
      )}

      {screen === 'achievements' && (
        <AchievementsScreen
          save={save}
          theme={theme}
          onBack={() => handleNavigate('home')}
          onUpdateSave={handleUpdateSave}
        />
      )}

      {screen === 'settings' && (
        <SettingsScreen
          save={save}
          theme={theme}
          onBack={() => handleNavigate('home')}
          onUpdateSave={handleUpdateSave}
        />
      )}
    </div>
  );
}
