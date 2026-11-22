import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  Clock,
  Coins,
  Columns3,
  Hammer,
  Home,
  Music,
  Pause,
  Play,
  PlusCircle,
  RotateCcw,
  Rows3,
  Shuffle,
  Star,
  Trophy,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { adManager, AdBreakTrigger } from '../ads/adManager';
import { soundEngine, triggerHaptic } from '../audio/soundEngine';
import {
  createEmptyBoard,
  getDailyChallengeForDate,
  getLevelConfig,
  getTodayDateKey,
  TOTAL_LEVELS,
} from '../data/levels';
import { BOOSTER_CATALOG, BOOSTER_LIST } from '../data/rewards';
import {
  clearLineBooster,
  cloneBoard,
  dealTrayPieces,
  executePlacement,
  hasAnyValidPlacement,
  isCellOccupied,
} from '../engine/boardLogic';
import { appendRewardHistory, useBoosterFromSave } from '../storage/saveSystem';
import {
  BoardGrid,
  BoosterType,
  ChallengeConfig,
  GameMode,
  LevelObjective,
  SaveData,
  ThemeConfig,
  TrayPiece,
  UndoSnapshot,
} from '../types/game';
import { CanvasFxHandle, GameCanvas } from './GameCanvas';

interface GameplayScreenProps {
  mode: GameMode;
  levelId: number;
  challengeConfig?: ChallengeConfig | null;
  save: SaveData;
  theme: ThemeConfig;
  onUpdateSave: (updater: (prev: SaveData) => SaveData) => void;
  onExitHome: () => void;
  onNextLevel: (nextLevelId: number) => void;
}

type GameStatus = 'playing' | 'paused' | 'won' | 'lost';

const BOOSTER_ICONS: Record<BoosterType, React.ReactNode> = {
  undo: <Undo2 className="w-4 h-4" />,
  removeBlock: <Hammer className="w-4 h-4" />,
  clearRow: <Rows3 className="w-4 h-4" />,
  clearCol: <Columns3 className="w-4 h-4" />,
  shuffle: <Shuffle className="w-4 h-4" />,
  extraMove: <PlusCircle className="w-4 h-4" />,
};

export const GameplayScreen: React.FC<GameplayScreenProps> = ({
  mode,
  levelId,
  challengeConfig,
  save,
  theme,
  onUpdateSave,
  onExitHome,
  onNextLevel,
}) => {
  const fxRef = useRef<CanvasFxHandle | null>(null);

  const sessionMeta = useMemo(() => {
    if (mode === 'level') {
      const cfg = getLevelConfig(levelId);
      return {
        title: cfg.title,
        subtitle: cfg.subtitle,
        objective: cfg.objective,
        initialBoard: cloneBoard(cfg.presetGrid),
        initialMaxMoves: cfg.maxMoves,
        initialTimeSec: null as number | null,
        starThresholds: cfg.starThresholds,
        coinReward: cfg.coinReward,
      };
    }
    if (mode === 'challenge' && challengeConfig) {
      return {
        title: challengeConfig.title,
        subtitle: challengeConfig.description,
        objective: challengeConfig.objective,
        initialBoard: cloneBoard(challengeConfig.presetGrid),
        initialMaxMoves: challengeConfig.maxMoves,
        initialTimeSec: challengeConfig.timeLimitSec ?? null,
        starThresholds: null as [number, number, number] | null,
        coinReward: challengeConfig.coinReward,
      };
    }
    if (mode === 'daily') {
      const todayKey = getTodayDateKey();
      const cfg = getDailyChallengeForDate(todayKey);
      return {
        title: 'Daily Challenge',
        subtitle: cfg.description,
        objective: cfg.objective,
        initialBoard: cloneBoard(cfg.presetGrid),
        initialMaxMoves: cfg.maxMoves,
        initialTimeSec: null as number | null,
        starThresholds: null as [number, number, number] | null,
        coinReward: cfg.coinReward,
      };
    }
    if (mode === 'time') {
      return {
        title: 'Time Challenge',
        subtitle: 'Score high in 120s · Clearing lines adds +3s',
        objective: {} as LevelObjective,
        initialBoard: createEmptyBoard(),
        initialMaxMoves: null as number | null,
        initialTimeSec: 120,
        starThresholds: null as [number, number, number] | null,
        coinReward: 0,
      };
    }
    return {
      title: 'Classic Mode',
      subtitle: 'Endless 10×10 block puzzle',
      objective: {} as LevelObjective,
      initialBoard: createEmptyBoard(),
      initialMaxMoves: null as number | null,
      initialTimeSec: null as number | null,
      starThresholds: null as [number, number, number] | null,
      coinReward: 0,
    };
  }, [mode, levelId, challengeConfig]);

  const [board, setBoard] = useState<BoardGrid>(() => sessionMeta.initialBoard);
  const [tray, setTray] = useState<TrayPiece[]>(() => dealTrayPieces(sessionMeta.initialBoard, true));
  const [score, setScore] = useState(0);
  const [movesUsed, setMovesUsed] = useState(0);
  const [maxMoves, setMaxMoves] = useState<number | null>(sessionMeta.initialMaxMoves);
  const [linesCleared, setLinesCleared] = useState(0);
  const [gemsCollected, setGemsCollected] = useState(0);
  const [obstaclesBroken, setObstaclesBroken] = useState(0);
  const [combo, setCombo] = useState(0);
  const [coinsEarnedRun, setCoinsEarnedRun] = useState(0);
  const [timeLeftSec, setTimeLeftSec] = useState<number | null>(sessionMeta.initialTimeSec);
  const [undoStack, setUndoStack] = useState<UndoSnapshot[]>([]);
  const [status, setStatus] = useState<GameStatus>('playing');
  const [lossReason, setLossReason] = useState<string>('No more valid moves remaining.');
  const [earnedStars, setEarnedStars] = useState<number>(0);
  const [activeTargetBooster, setActiveTargetBooster] = useState<
    Exclude<BoosterType, 'undo' | 'shuffle' | 'extraMove'> | null
  >(null);
  const [buyBoosterPrompt, setBuyBoosterPrompt] = useState<BoosterType | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isAdTransitioning, setIsAdTransitioning] = useState(false);

  const runRecordedRef = useRef(false);

  // Guard: never allow interstitial ads during active gameplay
  useEffect(() => {
    adManager.setActiveGameplay(status === 'playing');
    return () => adManager.setActiveGameplay(false);
  }, [status]);

  // Reset entire session cleanly when mode/level changes
  const resetSession = useCallback(() => {
    const freshBoard = cloneBoard(sessionMeta.initialBoard);
    setBoard(freshBoard);
    setTray(dealTrayPieces(freshBoard, true));
    setScore(0);
    setMovesUsed(0);
    setMaxMoves(sessionMeta.initialMaxMoves);
    setLinesCleared(0);
    setGemsCollected(0);
    setObstaclesBroken(0);
    setCombo(0);
    setCoinsEarnedRun(0);
    setTimeLeftSec(sessionMeta.initialTimeSec);
    setUndoStack([]);
    setStatus('playing');
    setLossReason('No more valid moves remaining.');
    setEarnedStars(0);
    setActiveTargetBooster(null);
    setBuyBoosterPrompt(null);
    runRecordedRef.current = false;
  }, [sessionMeta]);

  useEffect(() => {
    resetSession();
  }, [resetSession]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 2200);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  // Countdown timer for Time Challenge / timed challenges
  useEffect(() => {
    if (status !== 'playing' || timeLeftSec === null) return;
    const id = window.setInterval(() => {
      setTimeLeftSec((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [status, timeLeftSec !== null]);

  // Trigger Time Up when timer reaches 0
  useEffect(() => {
    if (status === 'playing' && timeLeftSec === 0) {
      finalizeLoss("Time's up!");
    }
  }, [timeLeftSec, status]);

  const checkObjectiveMet = useCallback(
    (nextScore: number, nextLines: number, nextGems: number, nextObs: number): boolean => {
      const obj = sessionMeta.objective;
      const hasAnyObj =
        obj.targetScore !== undefined ||
        obj.targetLines !== undefined ||
        obj.targetGems !== undefined ||
        obj.targetObstacles !== undefined;
      if (!hasAnyObj) return false;

      if (obj.targetScore !== undefined && nextScore < obj.targetScore) return false;
      if (obj.targetLines !== undefined && nextLines < obj.targetLines) return false;
      if (obj.targetGems !== undefined && nextGems < obj.targetGems) return false;
      if (obj.targetObstacles !== undefined && nextObs < obj.targetObstacles) return false;
      return true;
    },
    [sessionMeta.objective]
  );

  const finalizeWin = useCallback(
    (finalScore: number, runCoins: number) => {
      if (runRecordedRef.current) return;
      runRecordedRef.current = true;
      setStatus('won');
      adManager.recordLevelCompleted();
      adManager.preloadNext().catch(() => {});
      soundEngine.playSfx('levelComplete');
      triggerHaptic(save.settings.hapticsEnabled, 35);

      let stars = 1;
      if (sessionMeta.starThresholds) {
        if (finalScore >= sessionMeta.starThresholds[2]) stars = 3;
        else if (finalScore >= sessionMeta.starThresholds[1]) stars = 2;
      } else {
        stars = 3;
      }
      setEarnedStars(stars);

      const bonusReward = sessionMeta.coinReward + (stars === 3 ? 15 : stars === 2 ? 5 : 0);
      setCoinsEarnedRun(runCoins + bonusReward);

      onUpdateSave((prev) => {
        const next: SaveData = {
          ...prev,
          coins: prev.coins + bonusReward,
          rewardHistory: appendRewardHistory(
            prev.rewardHistory,
            `${sessionMeta.title} Cleared (${stars}★)`,
            bonusReward
          ),
          stats: {
            ...prev.stats,
            totalGames: prev.stats.totalGames + 1,
          },
        };

        if (mode === 'level') {
          const prevStars = prev.levelStars[levelId] ?? 0;
          const updatedStars = Math.max(prevStars, stars);
          next.levelStars = { ...prev.levelStars, [levelId]: updatedStars };
          next.levelBestScores = {
            ...prev.levelBestScores,
            [levelId]: Math.max(prev.levelBestScores[levelId] ?? 0, finalScore),
          };
          next.unlockedLevel = Math.min(TOTAL_LEVELS, Math.max(prev.unlockedLevel, levelId + 1));
          next.stats.totalStarsEarned = Object.values(next.levelStars).reduce((a, b) => a + b, 0);
        } else if (mode === 'challenge' && challengeConfig) {
          if (!prev.completedChallenges.includes(challengeConfig.id)) {
            next.completedChallenges = [...prev.completedChallenges, challengeConfig.id];
          }
        } else if (mode === 'daily') {
          const todayKey = getTodayDateKey();
          if (!prev.completedDailyDates.includes(todayKey)) {
            next.completedDailyDates = [...prev.completedDailyDates, todayKey];
          }
          next.bestScores = {
            ...prev.bestScores,
            daily: Math.max(prev.bestScores.daily, finalScore),
          };
        }
        return next;
      });
    },
    [mode, levelId, challengeConfig, sessionMeta, save.settings.hapticsEnabled, onUpdateSave]
  );

  const finalizeLoss = useCallback(
    (reason: string) => {
      if (runRecordedRef.current) return;
      runRecordedRef.current = true;
      setLossReason(reason);
      setStatus('lost');
      adManager.preloadNext().catch(() => {});
      soundEngine.playSfx('gameOver');
      triggerHaptic(save.settings.hapticsEnabled, 45);

      // In Time Challenge, surviving or scoring high still counts as a completed run with coin payout!
      const timeBonusCoins = mode === 'time' ? Math.min(60, Math.floor(score / 80)) : 0;
      if (timeBonusCoins > 0) {
        setCoinsEarnedRun((c) => c + timeBonusCoins);
      }

      onUpdateSave((prev) => ({
        ...prev,
        coins: prev.coins + timeBonusCoins,
        rewardHistory:
          timeBonusCoins > 0
            ? appendRewardHistory(prev.rewardHistory, 'Time Challenge Run', timeBonusCoins)
            : prev.rewardHistory,
        bestScores: {
          ...prev.bestScores,
          classic: mode === 'classic' ? Math.max(prev.bestScores.classic, score) : prev.bestScores.classic,
          time: mode === 'time' ? Math.max(prev.bestScores.time, score) : prev.bestScores.time,
        },
        stats: {
          ...prev.stats,
          totalGames: prev.stats.totalGames + 1,
        },
      }));
    },
    [mode, score, save.settings.hapticsEnabled, onUpdateSave]
  );

  const handlePlacePiece = useCallback(
    (pieceIndex: number, startRow: number, startCol: number) => {
      if (status !== 'playing') return;
      const piece = tray[pieceIndex];
      if (!piece || piece.used) return;

      // Save undo snapshot before applying move
      const snapshot: UndoSnapshot = {
        board: cloneBoard(board),
        tray: tray.map((p) => ({ ...p })),
        score,
        movesUsed,
        linesCleared,
        gemsCollected,
        obstaclesBroken,
        combo,
      };

      const tentativeCombo = combo + 1;
      const outcome = executePlacement(board, piece, startRow, startCol, tentativeCombo);
      const nextCombo = outcome.totalLinesCleared > 0 ? tentativeCombo : 0;

      // Placement pop animation coords
      const placedCoords: Array<{ r: number; c: number }> = [];
      for (let r = 0; r < piece.shape.matrix.length; r++) {
        for (let c = 0; c < piece.shape.matrix[r].length; c++) {
          if (piece.shape.matrix[r][c] === 1) {
            placedCoords.push({ r: startRow + r, c: startCol + c });
          }
        }
      }
      fxRef.current?.spawnPlacementPop(placedCoords);

      soundEngine.playSfx('place');
      triggerHaptic(save.settings.hapticsEnabled, 10);

      if (outcome.totalLinesCleared > 0) {
        soundEngine.playSfx('clear', outcome.totalLinesCleared);
        if (nextCombo >= 2) {
          soundEngine.playSfx('combo', nextCombo);
        }
        if (outcome.coinsEarned > 0) {
          soundEngine.playSfx('coin');
        }
        triggerHaptic(save.settings.hapticsEnabled, 22);
        fxRef.current?.spawnLineBurst(
          outcome.clearedCoords,
          outcome.clearedRows,
          outcome.clearedCols,
          outcome.pointsEarned,
          nextCombo,
          outcome.coinsEarned
        );
      }

      // Time bonus in Time Challenge
      if (mode === 'time' && outcome.totalLinesCleared > 0) {
        const bonusSec = outcome.totalLinesCleared >= 3 ? 10 : outcome.totalLinesCleared === 2 ? 6 : 3;
        setTimeLeftSec((prev) => (prev !== null ? prev + bonusSec : null));
      }

      // Update tray
      let nextTray = tray.map((p, idx) => (idx === pieceIndex ? { ...p, used: true } : p));
      if (nextTray.every((p) => p.used)) {
        nextTray = dealTrayPieces(outcome.nextBoard, true);
      }

      const nextScore = score + outcome.pointsEarned;
      const nextMoves = movesUsed + 1;
      const nextLines = linesCleared + outcome.totalLinesCleared;
      const nextGems = gemsCollected + outcome.gemsCollected;
      const nextObs = obstaclesBroken + outcome.obstaclesBroken;
      const nextCoinsRun = coinsEarnedRun + outcome.coinsEarned;

      setUndoStack((prev) => [...prev.slice(-14), snapshot]);
      setBoard(outcome.nextBoard);
      setTray(nextTray);
      setScore(nextScore);
      setMovesUsed(nextMoves);
      setLinesCleared(nextLines);
      setGemsCollected(nextGems);
      setObstaclesBroken(nextObs);
      setCombo(nextCombo);
      setCoinsEarnedRun(nextCoinsRun);

      // Persist live stats & line-clear coins immediately
      onUpdateSave((prev) => ({
        ...prev,
        coins: prev.coins + outcome.coinsEarned,
        rewardHistory:
          outcome.coinsEarned > 0
            ? appendRewardHistory(prev.rewardHistory, 'Multi-Line & Combo Bonus', outcome.coinsEarned)
            : prev.rewardHistory,
        bestScores: {
          ...prev.bestScores,
          classic:
            mode === 'classic'
              ? Math.max(prev.bestScores.classic, nextScore)
              : prev.bestScores.classic,
          time:
            mode === 'time'
              ? Math.max(prev.bestScores.time, nextScore)
              : prev.bestScores.time,
        },
        stats: {
          ...prev.stats,
          totalLines: prev.stats.totalLines + outcome.totalLinesCleared,
          totalBlocksPlaced: prev.stats.totalBlocksPlaced + outcome.placedCells,
          maxCombo: Math.max(prev.stats.maxCombo, nextCombo),
          maxMultiClear: Math.max(prev.stats.maxMultiClear, outcome.totalLinesCleared),
        },
      }));

      // Check win or loss states
      if (checkObjectiveMet(nextScore, nextLines, nextGems, nextObs)) {
        finalizeWin(nextScore, nextCoinsRun);
        return;
      }

      if (maxMoves !== null && nextMoves >= maxMoves) {
        finalizeLoss('Move limit reached before completing objectives.');
        return;
      }

      if (!hasAnyValidPlacement(outcome.nextBoard, nextTray)) {
        finalizeLoss('No space left for any remaining block.');
      }
    },
    [
      status,
      tray,
      board,
      score,
      movesUsed,
      linesCleared,
      gemsCollected,
      obstaclesBroken,
      combo,
      coinsEarnedRun,
      mode,
      maxMoves,
      save.settings.hapticsEnabled,
      onUpdateSave,
      checkObjectiveMet,
      finalizeWin,
      finalizeLoss,
    ]
  );

  // Execute booster effect
  const executeBooster = useCallback(
    (type: BoosterType) => {
      if (save.boosters[type] <= 0) {
        setBuyBoosterPrompt(type);
        return;
      }

      if (type === 'undo') {
        if (undoStack.length === 0) {
          showToast('Nothing to undo yet.');
          soundEngine.playSfx('invalid');
          return;
        }
        const snap = undoStack[undoStack.length - 1];
        setUndoStack((prev) => prev.slice(0, -1));
        setBoard(snap.board);
        setTray(snap.tray);
        setScore(snap.score);
        setMovesUsed(snap.movesUsed);
        setLinesCleared(snap.linesCleared);
        setGemsCollected(snap.gemsCollected);
        setObstaclesBroken(snap.obstaclesBroken);
        setCombo(snap.combo);
        setActiveTargetBooster(null);
        soundEngine.playSfx('booster');
        onUpdateSave((prev) => useBoosterFromSave(prev, 'undo') ?? prev);
        showToast('Move undone!');
        return;
      }

      if (type === 'shuffle') {
        const nextTray = dealTrayPieces(board, true);
        // Preserve used status or refresh all 3 slots cleanly
        setTray(nextTray);
        setActiveTargetBooster(null);
        if (status === 'lost') {
          runRecordedRef.current = false;
          setStatus('playing');
        }
        soundEngine.playSfx('booster');
        onUpdateSave((prev) => useBoosterFromSave(prev, 'shuffle') ?? prev);
        showToast('Tray blocks shuffled!');
        return;
      }

      if (type === 'extraMove') {
        soundEngine.playSfx('booster');
        onUpdateSave((prev) => useBoosterFromSave(prev, 'extraMove') ?? prev);
        if (status === 'lost') {
          runRecordedRef.current = false;
          setStatus('playing');
        }
        if (maxMoves !== null) {
          setMaxMoves((m) => (m !== null ? m + 5 : null));
          showToast('+5 Extra Moves added!');
        } else if (timeLeftSec !== null) {
          setTimeLeftSec((t) => (t !== null ? t + 20 : null));
          showToast('+20 Seconds added!');
        } else {
          // Endless classic rescue: clear 2x2 center pocket and ensure playable tray
          const nextBoard = cloneBoard(board);
          for (let r = 4; r <= 5; r++) {
            for (let c = 4; c <= 5; c++) {
              if (isCellOccupied(nextBoard[r][c])) {
                fxRef.current?.spawnSingleBurst(r, c, nextBoard[r][c].colorIndex);
                nextBoard[r][c] = { kind: 'empty', colorIndex: 0 };
              }
            }
          }
          setBoard(nextBoard);
          if (!hasAnyValidPlacement(nextBoard, tray)) {
            setTray(dealTrayPieces(nextBoard, true));
          }
          showToast('Center 2×2 Pocket Cleared!');
        }
        return;
      }

      // Targeting boosters: removeBlock, clearRow, clearCol
      if (activeTargetBooster === type) {
        setActiveTargetBooster(null);
      } else {
        soundEngine.playSfx('click');
        setActiveTargetBooster(type);
      }
    },
    [
      save.boosters,
      undoStack,
      board,
      tray,
      status,
      maxMoves,
      timeLeftSec,
      activeTargetBooster,
      onUpdateSave,
      showToast,
    ]
  );

  const handleTargetCellClick = useCallback(
    (row: number, col: number) => {
      if (!activeTargetBooster || status !== 'playing') return;

      if (activeTargetBooster === 'removeBlock') {
        const target = board[row][col];
        if (!isCellOccupied(target)) {
          soundEngine.playSfx('invalid');
          showToast('Tap an occupied block to remove it.');
          return;
        }
        const nextBoard = cloneBoard(board);
        nextBoard[row][col] = { kind: 'empty', colorIndex: 0 };
        const gemAdd = target.kind === 'gem' ? 1 : 0;
        const obsAdd = target.kind === 'crate' || target.kind === 'ice' ? 1 : 0;

        fxRef.current?.spawnSingleBurst(row, col, target.colorIndex, 'SMASH!');
        soundEngine.playSfx('booster');
        triggerHaptic(save.settings.hapticsEnabled, 18);

        const nextGems = gemsCollected + gemAdd;
        const nextObs = obstaclesBroken + obsAdd;
        setBoard(nextBoard);
        setGemsCollected(nextGems);
        setObstaclesBroken(nextObs);
        setActiveTargetBooster(null);
        onUpdateSave((prev) => useBoosterFromSave(prev, 'removeBlock') ?? prev);

        if (checkObjectiveMet(score, linesCleared, nextGems, nextObs)) {
          finalizeWin(score, coinsEarnedRun);
        }
        return;
      }

      if (activeTargetBooster === 'clearRow' || activeTargetBooster === 'clearCol') {
        const lineType = activeTargetBooster === 'clearRow' ? 'row' : 'col';
        const lineIdx = lineType === 'row' ? row : col;
        const result = clearLineBooster(board, lineType, lineIdx);

        if (result.clearedCoords.length === 0) {
          soundEngine.playSfx('invalid');
          showToast(`That ${lineType} is already empty.`);
          return;
        }

        fxRef.current?.spawnLineBurst(
          result.clearedCoords,
          lineType === 'row' ? [lineIdx] : [],
          lineType === 'col' ? [lineIdx] : [],
          100,
          1,
          0
        );
        soundEngine.playSfx('booster');
        triggerHaptic(save.settings.hapticsEnabled, 24);

        const nextScore = score + 100;
        const nextLines = linesCleared + 1;
        const nextGems = gemsCollected + result.gemsCollected;
        const nextObs = obstaclesBroken + result.obstaclesBroken;

        setBoard(result.nextBoard);
        setScore(nextScore);
        setLinesCleared(nextLines);
        setGemsCollected(nextGems);
        setObstaclesBroken(nextObs);
        setActiveTargetBooster(null);
        onUpdateSave((prev) => useBoosterFromSave(prev, activeTargetBooster) ?? prev);

        if (checkObjectiveMet(nextScore, nextLines, nextGems, nextObs)) {
          finalizeWin(nextScore, coinsEarnedRun);
        }
      }
    },
    [
      activeTargetBooster,
      status,
      board,
      gemsCollected,
      obstaclesBroken,
      score,
      linesCleared,
      coinsEarnedRun,
      save.settings.hapticsEnabled,
      onUpdateSave,
      checkObjectiveMet,
      finalizeWin,
      showToast,
    ]
  );

  const handleQuickBuyBooster = (type: BoosterType) => {
    const item = BOOSTER_CATALOG[type];
    if (save.coins < item.price) {
      soundEngine.playSfx('invalid');
      showToast(`Need ${item.price - save.coins} more coins!`);
      return;
    }
    soundEngine.playSfx('coin');
    onUpdateSave((prev) => ({
      ...prev,
      coins: prev.coins - item.price,
      boosters: {
        ...prev.boosters,
        [type]: prev.boosters[type] + 1,
      },
      rewardHistory: appendRewardHistory(prev.rewardHistory, `Bought ${item.name}`, -item.price),
    }));
    setBuyBoosterPrompt(null);
    showToast(`Purchased 1x ${item.name}!`);
  };

  const runBreakAdAndProceed = useCallback(
    async (
      trigger: AdBreakTrigger,
      action: () => void,
      options?: { meaningfulPlay?: boolean }
    ) => {
      if (isAdTransitioning) return;
      setIsAdTransitioning(true);
      try {
        await adManager.maybeShowInterstitial(trigger, options);
      } finally {
        setIsAdTransitioning(false);
        action();
      }
    },
    [isAdTransitioning]
  );

  const bestScoreDisplay =
    mode === 'classic'
      ? Math.max(save.bestScores.classic, score)
      : mode === 'time'
      ? Math.max(save.bestScores.time, score)
      : mode === 'level'
      ? Math.max(save.levelBestScores[levelId] ?? 0, score)
      : score;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const remainingMoves = maxMoves !== null ? Math.max(0, maxMoves - movesUsed) : null;

  return (
    <div
      className="h-[100dvh] w-full flex flex-col overflow-hidden"
      style={{ backgroundColor: theme.appBg, color: theme.textPrimary }}
    >
      {/* Top Gameplay HUD */}
      <header
        className="w-full max-w-6xl mx-auto px-3 sm:px-5 pt-safe py-2 flex items-center justify-between gap-2 shrink-0 border-b"
        style={{ borderColor: theme.surfaceBorder }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => {
              soundEngine.playSfx('click');
              setStatus((s) => (s === 'playing' ? 'paused' : s));
            }}
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 shrink-0"
            aria-label="Pause game"
          >
            <Pause className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="text-sm font-extrabold truncate leading-tight">{sessionMeta.title}</div>
            <div className="text-[11px] truncate" style={{ color: theme.textMuted }}>
              {sessionMeta.subtitle}
            </div>
          </div>
        </div>

        {/* Center / Right Score & Target Meters */}
        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider" style={{ color: theme.textMuted }}>
              Score
            </div>
            <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums leading-none">
              {score.toLocaleString()}
            </div>
          </div>

          {mode === 'classic' && (
            <div className="text-right hidden xs:block sm:block">
              <div className="text-[10px] uppercase tracking-wider" style={{ color: theme.textMuted }}>
                Best
              </div>
              <div className="text-base font-bold font-mono tabular-nums leading-none text-amber-400">
                {bestScoreDisplay.toLocaleString()}
              </div>
            </div>
          )}

          {remainingMoves !== null && (
            <div
              className="px-2.5 py-1.5 rounded-xl text-center min-w-[54px]"
              style={{
                backgroundColor: remainingMoves <= 4 ? 'rgba(239,68,68,0.2)' : theme.surfaceBg,
                border: `1px solid ${theme.surfaceBorder}`,
              }}
            >
              <div className="text-[9px] uppercase" style={{ color: theme.textMuted }}>
                Moves
              </div>
              <div className="text-sm font-extrabold font-mono tabular-nums leading-none">
                {remainingMoves}
              </div>
            </div>
          )}

          {timeLeftSec !== null && (
            <div
              className="px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 font-mono tabular-nums font-extrabold text-sm"
              style={{
                backgroundColor: timeLeftSec <= 15 ? 'rgba(239,68,68,0.22)' : theme.surfaceBg,
                border: `1px solid ${theme.surfaceBorder}`,
              }}
            >
              <Clock className="w-3.5 h-3.5 text-rose-400" />
              <span>{formatTimer(timeLeftSec)}</span>
            </div>
          )}

          <div
            className="px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 font-mono tabular-nums font-bold text-xs"
            style={{
              backgroundColor: theme.surfaceBg,
              border: `1px solid ${theme.surfaceBorder}`,
            }}
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>{save.coins}</span>
          </div>
        </div>
      </header>

      {/* Objective Progress Strip (when mission objectives exist) */}
      {(sessionMeta.objective.targetScore !== undefined ||
        sessionMeta.objective.targetLines !== undefined ||
        sessionMeta.objective.targetGems !== undefined ||
        sessionMeta.objective.targetObstacles !== undefined) && (
        <div
          className="w-full max-w-6xl mx-auto px-4 py-1.5 flex items-center justify-center gap-4 text-xs font-semibold tabular-nums shrink-0"
          style={{ color: theme.textMuted }}
        >
          {sessionMeta.objective.targetScore !== undefined && (
            <span>
              Score:{' '}
              <strong style={{ color: theme.textPrimary }}>
                {Math.min(score, sessionMeta.objective.targetScore).toLocaleString()}/
                {sessionMeta.objective.targetScore.toLocaleString()}
              </strong>
            </span>
          )}
          {sessionMeta.objective.targetLines !== undefined && (
            <span>
              Lines:{' '}
              <strong style={{ color: theme.textPrimary }}>
                {Math.min(linesCleared, sessionMeta.objective.targetLines)}/
                {sessionMeta.objective.targetLines}
              </strong>
            </span>
          )}
          {sessionMeta.objective.targetGems !== undefined && (
            <span>
              Gems:{' '}
              <strong className="text-emerald-400">
                {Math.min(gemsCollected, sessionMeta.objective.targetGems)}/
                {sessionMeta.objective.targetGems}
              </strong>
            </span>
          )}
          {sessionMeta.objective.targetObstacles !== undefined && (
            <span>
              Targets:{' '}
              <strong className="text-amber-400">
                {Math.min(obstaclesBroken, sessionMeta.objective.targetObstacles)}/
                {sessionMeta.objective.targetObstacles}
              </strong>
            </span>
          )}
        </div>
      )}

      {/* Active Booster Target Banner */}
      {activeTargetBooster && (
        <div className="w-full max-w-md mx-auto px-3 py-1 shrink-0">
          <div className="rounded-xl px-3 py-1.5 bg-amber-500/20 border border-amber-400/40 flex items-center justify-between text-xs font-semibold">
            <span>
              {activeTargetBooster === 'removeBlock'
                ? 'Tap any occupied block on the board to shatter it'
                : activeTargetBooster === 'clearRow'
                ? 'Tap any row on the board to blast it clean'
                : 'Tap any column on the board to blast it clean'}
            </span>
            <button
              onClick={() => setActiveTargetBooster(null)}
              className="px-2 py-0.5 rounded bg-black/30 text-amber-300 ml-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Playable Area: Centered Canvas + Desktop Info Side Panel */}
      <main className="flex-1 min-h-0 w-full max-w-6xl mx-auto px-2 sm:px-4 flex flex-col lg:flex-row items-stretch justify-center gap-4">
        <div className="flex-1 min-h-0 max-w-[540px] w-full mx-auto flex flex-col">
          <GameCanvas
            board={board}
            tray={tray}
            theme={theme}
            skin={save.selectedSkin}
            activeBoosterTarget={activeTargetBooster}
            dragOffsetMode={save.settings.dragOffsetMode}
            disabled={status !== 'playing'}
            onPickupPiece={() => {
              soundEngine.unlockFromGesture();
              soundEngine.playSfx('pickup');
            }}
            onPlacePiece={handlePlacePiece}
            onInvalidDrop={() => {
              soundEngine.playSfx('invalid');
            }}
            onTargetCellClick={handleTargetCellClick}
            fxRef={fxRef}
          />
        </div>

        {/* Desktop Side Panel (visible on lg screens so desktop viewport feels rich and balanced) */}
        <aside className="hidden lg:flex lg:w-72 flex-col justify-center gap-3 py-4 shrink-0">
          <div
            className="rounded-2xl p-4 space-y-2.5"
            style={{
              backgroundColor: theme.surfaceBg,
              border: `1px solid ${theme.surfaceBorder}`,
            }}
          >
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.accentHex }}>
              Session Stats
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs tabular-nums">
              <div className="p-2.5 rounded-xl bg-black/20">
                <div style={{ color: theme.textMuted }}>Best</div>
                <div className="text-sm font-bold font-mono">{bestScoreDisplay.toLocaleString()}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-black/20">
                <div style={{ color: theme.textMuted }}>Lines</div>
                <div className="text-sm font-bold font-mono">{linesCleared}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-black/20">
                <div style={{ color: theme.textMuted }}>Combo</div>
                <div className="text-sm font-bold font-mono">{combo}x</div>
              </div>
              <div className="p-2.5 rounded-xl bg-black/20">
                <div style={{ color: theme.textMuted }}>Run Coins</div>
                <div className="text-sm font-bold font-mono text-amber-400">+{coinsEarnedRun}</div>
              </div>
            </div>
          </div>

          <div
            className="rounded-2xl p-4 space-y-2 text-xs"
            style={{
              backgroundColor: theme.surfaceBg,
              border: `1px solid ${theme.surfaceBorder}`,
            }}
          >
            <div className="font-bold text-sm">How to Score Big</div>
            <p style={{ color: theme.textMuted }}>
              Clear multiple rows or columns at once for 3x–10x line bonuses and earn extra Coins. Keep clearing lines on consecutive turns to build your Combo Streak!
            </p>
          </div>
        </aside>
      </main>

      {/* Bottom Booster Bar */}
      <footer
        className="w-full max-w-2xl mx-auto px-3 pb-safe py-2 shrink-0"
      >
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {BOOSTER_LIST.map((b) => {
            const qty = save.boosters[b.id];
            const isSelected = activeTargetBooster === b.id;
            return (
              <button
                key={b.id}
                onClick={() => executeBooster(b.id)}
                className={`min-h-[52px] rounded-xl px-1 py-1.5 flex flex-col items-center justify-center gap-0.5 transition-transform active:scale-95 relative ${
                  isSelected ? 'ring-2 ring-amber-400' : ''
                }`}
                style={{
                  backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.22)' : theme.surfaceBg,
                  border: `1px solid ${theme.surfaceBorder}`,
                }}
                title={b.description}
              >
                <span className="text-amber-400">{BOOSTER_ICONS[b.id]}</span>
                <span className="text-[10px] font-semibold truncate max-w-full leading-tight">
                  {b.shortName}
                </span>
                <span
                  className={`text-[10px] font-mono tabular-nums font-bold ${
                    qty > 0 ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {qty > 0 ? `×${qty}` : `${b.price}c`}
                </span>
              </button>
            );
          })}
        </div>
      </footer>

      {/* Floating Toast */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900/95 text-white text-xs font-semibold shadow-xl border border-white/15 pointer-events-none">
          {toastMsg}
        </div>
      )}

      {/* Quick Buy Booster Modal */}
      {buyBoosterPrompt && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl"
            style={{ backgroundColor: theme.surfaceBg, border: `1px solid ${theme.surfaceBorder}` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-400">
                {BOOSTER_ICONS[buyBoosterPrompt]}
              </div>
              <div>
                <h3 className="text-lg font-extrabold">{BOOSTER_CATALOG[buyBoosterPrompt].name}</h3>
                <p className="text-xs" style={{ color: theme.textMuted }}>
                  Out of stock · Quick purchase
                </p>
              </div>
            </div>
            <p className="text-sm" style={{ color: theme.textMuted }}>
              {BOOSTER_CATALOG[buyBoosterPrompt].description}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setBuyBoosterPrompt(null)}
                className="flex-1 min-h-[46px] rounded-xl font-semibold text-sm bg-white/5 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={() => handleQuickBuyBooster(buyBoosterPrompt)}
                className={`flex-1 min-h-[46px] rounded-xl font-bold text-sm text-slate-950 flex items-center justify-center gap-1.5 ${theme.accentBg}`}
              >
                <Coins className="w-4 h-4" />
                <span>Buy {BOOSTER_CATALOG[buyBoosterPrompt].price}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause Modal */}
      {status === 'paused' && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl"
            style={{ backgroundColor: theme.surfaceBg, border: `1px solid ${theme.surfaceBorder}` }}
          >
            <h2 className="text-2xl font-extrabold text-center">Game Paused</h2>
            <p className="text-xs text-center" style={{ color: theme.textMuted }}>
              {sessionMeta.title} · Score {score.toLocaleString()}
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  onUpdateSave((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, musicEnabled: !prev.settings.musicEnabled },
                  }));
                }}
                className="min-h-[46px] rounded-xl px-3 flex items-center justify-center gap-2 text-xs font-semibold bg-white/5"
              >
                <Music className="w-4 h-4" />
                <span>Music: {save.settings.musicEnabled ? 'ON' : 'OFF'}</span>
              </button>
              <button
                onClick={() => {
                  onUpdateSave((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, sfxEnabled: !prev.settings.sfxEnabled },
                  }));
                }}
                className="min-h-[46px] rounded-xl px-3 flex items-center justify-center gap-2 text-xs font-semibold bg-white/5"
              >
                {save.settings.sfxEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
                <span>SFX: {save.settings.sfxEnabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                onClick={() => setStatus('playing')}
                className={`w-full min-h-[48px] rounded-2xl font-bold text-slate-950 flex items-center justify-center gap-2 ${theme.accentBg}`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume Game</span>
              </button>
              <button
                disabled={isAdTransitioning}
                onClick={() =>
                  runBreakAdAndProceed('between_sessions', resetSession, {
                    meaningfulPlay: movesUsed >= 2,
                  })
                }
                className="w-full min-h-[46px] rounded-2xl font-semibold text-sm bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restart</span>
              </button>
              <button
                disabled={isAdTransitioning}
                onClick={() =>
                  runBreakAdAndProceed('return_to_menu', onExitHome, {
                    meaningfulPlay: movesUsed >= 2,
                  })
                }
                className="w-full min-h-[46px] rounded-2xl font-semibold text-sm bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Home className="w-4 h-4" />
                <span>Back to Home</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Level / Challenge Won Modal */}
      {status === 'won' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-sm rounded-3xl p-6 space-y-5 text-center shadow-2xl"
            style={{ backgroundColor: theme.surfaceBg, border: `1px solid ${theme.surfaceBorder}` }}
          >
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  className={`w-10 h-10 transition-transform ${
                    earnedStars >= s
                      ? 'text-amber-400 fill-amber-400 scale-110'
                      : 'text-white/15'
                  }`}
                />
              ))}
            </div>

            <div>
              <h2 className="text-2xl font-extrabold">
                {mode === 'level' ? `Level ${levelId} Complete!` : 'Mission Complete!'}
              </h2>
              <p className="text-sm mt-1" style={{ color: theme.textMuted }}>
                Final Score: <strong style={{ color: theme.textPrimary }}>{score.toLocaleString()}</strong>
              </p>
            </div>

            <div className="rounded-2xl p-4 bg-black/25 flex items-center justify-center gap-2 font-bold text-amber-400 text-lg tabular-nums">
              <Coins className="w-5 h-5" />
              <span>+{coinsEarnedRun} Coins Earned</span>
            </div>

            <div className="space-y-2.5">
              {mode === 'level' && levelId < TOTAL_LEVELS && (
                <button
                  disabled={isAdTransitioning}
                  onClick={() =>
                    runBreakAdAndProceed('level_complete', () => onNextLevel(levelId + 1))
                  }
                  className={`w-full min-h-[50px] rounded-2xl font-bold text-slate-950 flex items-center justify-center gap-2 disabled:opacity-50 ${theme.accentBg}`}
                >
                  <span>Next Level ({levelId + 1})</span>
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              )}
              <button
                disabled={isAdTransitioning}
                onClick={() => runBreakAdAndProceed('level_complete', resetSession)}
                className="w-full min-h-[46px] rounded-2xl font-semibold text-sm bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Replay</span>
              </button>
              <button
                disabled={isAdTransitioning}
                onClick={() => runBreakAdAndProceed('level_complete', onExitHome)}
                className="w-full min-h-[46px] rounded-2xl font-semibold text-sm bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Home</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {status === 'lost' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-sm rounded-3xl p-6 space-y-4 text-center shadow-2xl"
            style={{ backgroundColor: theme.surfaceBg, border: `1px solid ${theme.surfaceBorder}` }}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto">
              <Trophy className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold">Game Over</h2>
              <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                {lossReason}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-center">
              <div className="p-3 rounded-2xl bg-black/25">
                <div className="text-[11px]" style={{ color: theme.textMuted }}>
                  Score
                </div>
                <div className="text-xl font-extrabold font-mono tabular-nums">
                  {score.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-black/25">
                <div className="text-[11px]" style={{ color: theme.textMuted }}>
                  Best
                </div>
                <div className="text-xl font-extrabold font-mono tabular-nums text-amber-400">
                  {bestScoreDisplay.toLocaleString()}
                </div>
              </div>
            </div>

            {coinsEarnedRun > 0 && (
              <div className="text-xs font-bold text-amber-400 tabular-nums">
                +{coinsEarnedRun} Coins Collected This Run
              </div>
            )}

            <div className="space-y-2.5 pt-1">
              {timeLeftSec !== 0 && save.boosters.shuffle > 0 && (
                <button
                  onClick={() => executeBooster('shuffle')}
                  className="w-full min-h-[46px] rounded-2xl font-bold text-sm bg-emerald-500 text-slate-950 flex items-center justify-center gap-2"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Rescue: Shuffle Tray (×{save.boosters.shuffle})</span>
                </button>
              )}

              <button
                disabled={isAdTransitioning}
                onClick={() => runBreakAdAndProceed('game_over', resetSession)}
                className={`w-full min-h-[48px] rounded-2xl font-bold text-slate-950 flex items-center justify-center gap-2 disabled:opacity-50 ${theme.accentBg}`}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again</span>
              </button>
              <button
                disabled={isAdTransitioning}
                onClick={() => runBreakAdAndProceed('game_over', onExitHome)}
                className="w-full min-h-[46px] rounded-2xl font-semibold text-sm bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Home className="w-4 h-4" />
                <span>Back to Home</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
