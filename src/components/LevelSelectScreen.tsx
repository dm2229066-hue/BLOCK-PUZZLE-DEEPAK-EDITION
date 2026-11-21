import React, { useMemo, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Lock, Star } from 'lucide-react';
import {
  getChapterName,
  getLevelConfig,
  LEVELS_PER_CHAPTER,
  TOTAL_CHAPTERS,
  TOTAL_LEVELS,
} from '../data/levels';
import { SaveData, ThemeConfig } from '../types/game';

interface LevelSelectScreenProps {
  save: SaveData;
  theme: ThemeConfig;
  onBack: () => void;
  onSelectLevel: (levelId: number) => void;
}

export const LevelSelectScreen: React.FC<LevelSelectScreenProps> = ({
  save,
  theme,
  onBack,
  onSelectLevel,
}) => {
  const initialChapter = Math.ceil(save.unlockedLevel / LEVELS_PER_CHAPTER);
  const [chapter, setChapter] = useState<number>(initialChapter);

  const chapterLevels = useMemo(() => {
    const start = (chapter - 1) * LEVELS_PER_CHAPTER + 1;
    const end = Math.min(TOTAL_LEVELS, start + LEVELS_PER_CHAPTER - 1);
    const list = [];
    for (let id = start; id <= end; id++) {
      list.push(getLevelConfig(id));
    }
    return list;
  }, [chapter]);

  const chapterStars = useMemo(() => {
    return chapterLevels.reduce((acc, lvl) => acc + (save.levelStars[lvl.id] ?? 0), 0);
  }, [chapterLevels, save.levelStars]);

  return (
    <div
      className="min-h-full w-full flex flex-col"
      style={{ backgroundColor: theme.appBg, color: theme.textPrimary }}
    >
      {/* Top Bar */}
      <header
        className="sticky top-0 z-20 px-4 pt-safe py-3 border-b backdrop-blur-md"
        style={{
          backgroundColor: `${theme.appBg}ee`,
          borderColor: theme.surfaceBorder,
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center hover:bg-white/5"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="text-center min-w-0">
            <h1 className="text-lg font-extrabold truncate">Level Map · 1,050 Stages</h1>
            <p className="text-xs tabular-nums" style={{ color: theme.textMuted }}>
              Unlocked up to Level {save.unlockedLevel} · {save.stats.totalStarsEarned} Total Stars
            </p>
          </div>

          <button
            onClick={() => onSelectLevel(save.unlockedLevel)}
            className={`min-h-[44px] px-3.5 rounded-xl text-xs font-bold text-slate-950 whitespace-nowrap shrink-0 ${theme.accentBg}`}
          >
            Play #{save.unlockedLevel}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Chapter Navigator */}
        <div
          className="rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{
            backgroundColor: theme.surfaceBg,
            border: `1px solid ${theme.surfaceBorder}`,
          }}
        >
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <button
              onClick={() => setChapter((c) => Math.max(1, c - 1))}
              disabled={chapter <= 1}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-black/20 flex items-center justify-center disabled:opacity-30"
              aria-label="Previous chapter"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.accentHex }}>
                Chapter {chapter} of {TOTAL_CHAPTERS}
              </div>
              <div className="text-base font-bold">{getChapterName(chapter)}</div>
            </div>
            <button
              onClick={() => setChapter((c) => Math.min(TOTAL_CHAPTERS, c + 1))}
              disabled={chapter >= TOTAL_CHAPTERS}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-black/20 flex items-center justify-center disabled:opacity-30"
              aria-label="Next chapter"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0">
            <div className="text-xs font-mono tabular-nums whitespace-nowrap" style={{ color: theme.textMuted }}>
              Chapter Stars: {chapterStars}/{chapterLevels.length * 3}
            </div>
            <select
              value={chapter}
              onChange={(e) => setChapter(Number(e.target.value))}
              className="min-h-[40px] px-3 rounded-xl text-xs font-semibold bg-black/30 border border-white/10 focus:outline-none"
              aria-label="Jump to chapter"
            >
              {Array.from({ length: TOTAL_CHAPTERS }, (_, i) => i + 1).map((ch) => (
                <option key={ch} value={ch} className="bg-slate-900 text-white">
                  Ch {ch}: {(ch - 1) * 50 + 1}–{ch * 50} ({getChapterName(ch)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 50 Levels Grid */}
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2.5">
          {chapterLevels.map((lvl) => {
            const unlocked = lvl.id <= save.unlockedLevel;
            const stars = save.levelStars[lvl.id] ?? 0;
            const isCurrent = lvl.id === save.unlockedLevel;

            return (
              <button
                key={lvl.id}
                disabled={!unlocked}
                onClick={() => onSelectLevel(lvl.id)}
                className={`min-h-[64px] rounded-2xl p-2 flex flex-col items-center justify-center gap-1 transition-transform ${
                  unlocked
                    ? 'active:scale-95 hover:brightness-110'
                    : 'opacity-45 cursor-not-allowed'
                }`}
                style={{
                  backgroundColor: isCurrent ? theme.accentHex : theme.surfaceBg,
                  color: isCurrent ? '#0f172a' : theme.textPrimary,
                  border: `1px solid ${isCurrent ? theme.accentHex : theme.surfaceBorder}`,
                }}
              >
                {unlocked ? (
                  <>
                    <span className="text-sm font-extrabold font-mono tabular-nums">
                      {lvl.id}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${
                            stars >= s
                              ? isCurrent
                                ? 'text-slate-950 fill-slate-950'
                                : 'text-amber-400 fill-amber-400'
                              : isCurrent
                              ? 'text-slate-950/30'
                              : 'text-white/20'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 opacity-60" />
                    <span className="text-xs font-mono tabular-nums opacity-70">{lvl.id}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
};
