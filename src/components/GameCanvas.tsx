import React, { useEffect, useRef } from 'react';
import {
  canPlaceShape,
  findFullLinesAfterPlacement,
  isCellOccupied,
} from '../engine/boardLogic';
import {
  BlockSkinId,
  BoardGrid,
  BoosterType,
  CellData,
  ThemeConfig,
  TrayPiece,
} from '../types/game';

export interface BoardParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  subtext?: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface PlacementAnim {
  r: number;
  c: number;
  life: number;
  maxLife: number;
}

export interface CanvasFxHandle {
  spawnLineBurst: (
    coords: Array<{ r: number; c: number; colorIndex: number }>,
    clearedRows: number[],
    clearedCols: number[],
    points: number,
    combo: number,
    coinsEarned: number
  ) => void;
  spawnPlacementPop: (coords: Array<{ r: number; c: number }>) => void;
  spawnSingleBurst: (r: number, c: number, colorIndex: number, label?: string) => void;
}

interface GameCanvasProps {
  board: BoardGrid;
  tray: TrayPiece[];
  theme: ThemeConfig;
  skin: BlockSkinId;
  activeBoosterTarget: Exclude<BoosterType, 'undo' | 'shuffle' | 'extraMove'> | null;
  dragOffsetMode: 'compact' | 'normal' | 'high';
  disabled: boolean;
  onPickupPiece: () => void;
  onPlacePiece: (pieceIndex: number, startRow: number, startCol: number) => void;
  onInvalidDrop: () => void;
  onTargetCellClick: (row: number, col: number) => void;
  fxRef: React.MutableRefObject<CanvasFxHandle | null>;
}

interface LayoutMetrics {
  width: number;
  height: number;
  boardX: number;
  boardY: number;
  boardSize: number;
  cellSize: number;
  trayY: number;
  trayHeight: number;
  slotWidth: number;
}

interface DragState {
  pieceIndex: number;
  pointerId: number;
  pointerType: string;
  pointerX: number;
  pointerY: number;
  snapRow: number | null;
  snapCol: number | null;
  isValid: boolean;
  previewRows: number[];
  previewCols: number[];
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function shadeHex(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(2.55 * percent)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + Math.round(2.55 * percent)));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + Math.round(2.55 * percent)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function drawBlockCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  cell: CellData,
  theme: ThemeConfig,
  skin: BlockSkinId,
  alpha = 1,
  scale = 1
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (scale !== 1) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
  }

  const pad = Math.max(1.5, size * 0.06);
  const bx = x + pad;
  const by = y + pad;
  const bs = size - pad * 2;
  const radius = Math.max(3, bs * 0.18);

  if (cell.kind === 'crate') {
    const isArmored = (cell.hp ?? 1) > 1;
    drawRoundedRect(ctx, bx, by, bs, bs, radius);
    ctx.fillStyle = isArmored ? '#5c4033' : '#8b5a2b';
    ctx.fill();
    ctx.strokeStyle = isArmored ? '#d4af37' : '#c68b59';
    ctx.lineWidth = Math.max(1.5, bs * 0.07);
    ctx.stroke();

    // Cross brace
    ctx.beginPath();
    ctx.moveTo(bx + bs * 0.2, by + bs * 0.2);
    ctx.lineTo(bx + bs * 0.8, by + bs * 0.8);
    ctx.moveTo(bx + bs * 0.8, by + bs * 0.2);
    ctx.lineTo(bx + bs * 0.2, by + bs * 0.8);
    ctx.strokeStyle = isArmored ? 'rgba(255,225,140,0.45)' : 'rgba(45,25,10,0.45)';
    ctx.lineWidth = Math.max(1.5, bs * 0.08);
    ctx.stroke();

    if (isArmored) {
      ctx.fillStyle = '#fef3c7';
      ctx.font = `700 ${Math.round(bs * 0.42)}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('2', bx + bs / 2, by + bs / 2 + 1);
    }
    ctx.restore();
    return;
  }

  if (cell.kind === 'ice') {
    drawRoundedRect(ctx, bx, by, bs, bs, radius);
    const grad = ctx.createLinearGradient(bx, by, bx + bs, by + bs);
    grad.addColorStop(0, '#bae6fd');
    grad.addColorStop(1, '#38bdf8');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = Math.max(1.5, bs * 0.07);
    ctx.stroke();

    // Frost streaks
    ctx.beginPath();
    ctx.moveTo(bx + bs * 0.22, by + bs * 0.35);
    ctx.lineTo(bx + bs * 0.45, by + bs * 0.18);
    ctx.moveTo(bx + bs * 0.48, by + bs * 0.78);
    ctx.lineTo(bx + bs * 0.8, by + bs * 0.48);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = Math.max(1.2, bs * 0.06);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (cell.kind === 'gem') {
    // Socket background
    drawRoundedRect(ctx, bx, by, bs, bs, radius);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const gemColors: Record<NonNullable<CellData['gemType']>, [string, string]> = {
      emerald: ['#34d399', '#059669'],
      ruby: ['#fb7185', '#e11d48'],
      sapphire: ['#60a5fa', '#2563eb'],
      gold: ['#fde047', '#d97706'],
    };
    const [lightC, darkC] = gemColors[cell.gemType ?? 'emerald'];
    const cx = bx + bs / 2;
    const cy = by + bs / 2;
    const r = bs * 0.34;

    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();

    const gGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    gGrad.addColorStop(0, lightC);
    gGrad.addColorStop(1, darkC);
    ctx.fillStyle = gGrad;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Inner facet
    ctx.beginPath();
    ctx.arc(cx - r * 0.2, cy - r * 0.25, Math.max(1.5, r * 0.2), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fill();
    ctx.restore();
    return;
  }

  // Standard block cell rendered with active BlockSkin
  const baseColor = theme.blockColors[cell.colorIndex % theme.blockColors.length];

  if (skin === 'neon-prism') {
    drawRoundedRect(ctx, bx, by, bs, bs, radius);
    ctx.fillStyle = shadeHex(baseColor, -42);
    ctx.fill();
    ctx.strokeStyle = shadeHex(baseColor, 20);
    ctx.lineWidth = Math.max(2, bs * 0.1);
    ctx.stroke();

    drawRoundedRect(ctx, bx + bs * 0.24, by + bs * 0.24, bs * 0.52, bs * 0.52, radius * 0.5);
    ctx.fillStyle = baseColor;
    ctx.fill();
  } else if (skin === 'polished-gem') {
    drawRoundedRect(ctx, bx, by, bs, bs, radius);
    const grad = ctx.createLinearGradient(bx, by, bx + bs, by + bs);
    grad.addColorStop(0, shadeHex(baseColor, 18));
    grad.addColorStop(1, shadeHex(baseColor, -18));
    ctx.fillStyle = grad;
    ctx.fill();

    // Inner bevel facet
    const inset = bs * 0.18;
    drawRoundedRect(ctx, bx + inset, by + inset, bs - inset * 2, bs - inset * 2, radius * 0.5);
    ctx.fillStyle = shadeHex(baseColor, 8);
    ctx.fill();

    // Specular highlight
    ctx.beginPath();
    ctx.arc(bx + bs * 0.28, by + bs * 0.28, Math.max(1.5, bs * 0.08), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
  } else if (skin === 'minimal-matte') {
    drawRoundedRect(ctx, bx, by, bs, bs, radius * 1.15);
    ctx.fillStyle = baseColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    // 'carved-wood' default
    drawRoundedRect(ctx, bx, by, bs, bs, radius);
    const grad = ctx.createLinearGradient(bx, by, bx, by + bs);
    grad.addColorStop(0, shadeHex(baseColor, 12));
    grad.addColorStop(1, shadeHex(baseColor, -14));
    ctx.fillStyle = grad;
    ctx.fill();

    // Top highlight bevel
    ctx.beginPath();
    ctx.moveTo(bx + radius, by + 1.5);
    ctx.lineTo(bx + bs - radius, by + 1.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.32)';
    ctx.lineWidth = Math.max(1.2, bs * 0.06);
    ctx.stroke();

    // Bottom shadow bevel
    ctx.beginPath();
    ctx.moveTo(bx + radius, by + bs - 1.5);
    ctx.lineTo(bx + bs - radius, by + bs - 1.5);
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = Math.max(1.2, bs * 0.06);
    ctx.stroke();
  }

  ctx.restore();
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  board,
  tray,
  theme,
  skin,
  activeBoosterTarget,
  dragOffsetMode,
  disabled,
  onPickupPiece,
  onPlacePiece,
  onInvalidDrop,
  onTargetCellClick,
  fxRef,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Latest props ref for rAF loop without tearing down canvas
  const propsRef = useRef({
    board,
    tray,
    theme,
    skin,
    activeBoosterTarget,
    dragOffsetMode,
    disabled,
    onPickupPiece,
    onPlacePiece,
    onInvalidDrop,
    onTargetCellClick,
  });
  propsRef.current = {
    board,
    tray,
    theme,
    skin,
    activeBoosterTarget,
    dragOffsetMode,
    disabled,
    onPickupPiece,
    onPlacePiece,
    onInvalidDrop,
    onTargetCellClick,
  };

  const metricsRef = useRef<LayoutMetrics>({
    width: 360,
    height: 520,
    boardX: 10,
    boardY: 10,
    boardSize: 340,
    cellSize: 34,
    trayY: 365,
    trayHeight: 145,
    slotWidth: 112,
  });

  const dragRef = useRef<DragState | null>(null);
  const hoverCellRef = useRef<{ r: number; c: number } | null>(null);
  const particlesRef = useRef<BoardParticle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const popAnimsRef = useRef<PlacementAnim[]>([]);
  const flashLinesRef = useRef<{ rows: number[]; cols: number[]; life: number }>({
    rows: [],
    cols: [],
    life: 0,
  });

  // Expose FX spawning methods to parent
  useEffect(() => {
    fxRef.current = {
      spawnPlacementPop: (coords) => {
        coords.forEach(({ r, c }) => {
          popAnimsRef.current.push({ r, c, life: 1, maxLife: 1 });
        });
      },
      spawnSingleBurst: (r, c, colorIndex, label) => {
        const m = metricsRef.current;
        const t = propsRef.current.theme;
        const cx = m.boardX + c * m.cellSize + m.cellSize / 2;
        const cy = m.boardY + r * m.cellSize + m.cellSize / 2;
        const color = t.blockColors[colorIndex % t.blockColors.length];
        for (let i = 0; i < 12; i++) {
          const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.3;
          const speed = 1.8 + Math.random() * 3.4;
          particlesRef.current.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.2,
            size: Math.max(4, m.cellSize * 0.22),
            color,
            alpha: 1,
            life: 1,
            maxLife: 1,
          });
        }
        if (label) {
          floatingTextsRef.current.push({
            x: cx,
            y: cy,
            text: label,
            color: '#fef08a',
            life: 1,
            maxLife: 1,
          });
        }
      },
      spawnLineBurst: (coords, clearedRows, clearedCols, points, combo, coinsEarned) => {
        const m = metricsRef.current;
        const t = propsRef.current.theme;

        flashLinesRef.current = {
          rows: clearedRows,
          cols: clearedCols,
          life: 1,
        };

        // Limit total particles for smooth 60 FPS on low-end Android devices
        const step = coords.length > 20 ? 2 : 1;
        for (let idx = 0; idx < coords.length; idx += step) {
          const { r, c, colorIndex } = coords[idx];
          const cx = m.boardX + c * m.cellSize + m.cellSize / 2;
          const cy = m.boardY + r * m.cellSize + m.cellSize / 2;
          const color = t.blockColors[colorIndex % t.blockColors.length];
          for (let k = 0; k < 3; k++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.4 + Math.random() * 3.8;
            particlesRef.current.push({
              x: cx,
              y: cy,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 1.5,
              size: Math.max(3.5, m.cellSize * (0.16 + Math.random() * 0.14)),
              color,
              alpha: 1,
              life: 1,
              maxLife: 1,
            });
          }
        }

        const totalLines = clearedRows.length + clearedCols.length;
        const lineWord =
          totalLines >= 4
            ? 'UNBELIEVABLE!'
            : totalLines === 3
            ? 'TRIPLE CLEAR!'
            : totalLines === 2
            ? 'DOUBLE CLEAR!'
            : '';
        const comboWord = combo >= 2 ? `COMBO x${combo}!` : '';
        const coinWord = coinsEarned > 0 ? `+${coinsEarned} COINS` : '';
        const subtext = [lineWord, comboWord, coinWord].filter(Boolean).join(' · ');

        floatingTextsRef.current.push({
          x: m.boardX + m.boardSize / 2,
          y: m.boardY + m.boardSize * 0.45,
          text: `+${points}`,
          subtext: subtext || undefined,
          color: totalLines >= 2 || combo >= 2 ? '#fde047' : '#ffffff',
          life: 1,
          maxLife: 1,
        });
      },
    };
  }, [fxRef]);

  // Layout calculation & ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(280, Math.floor(rect.width));
      const height = Math.max(380, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const trayHeight = Math.max(96, Math.min(136, Math.floor(height * 0.25)));
      const maxBoardW = width - 16;
      const maxBoardH = height - trayHeight - 20;
      const rawBoardSize = Math.max(200, Math.min(maxBoardW, maxBoardH));
      const cellSize = Math.floor(rawBoardSize / 10);
      const boardSize = cellSize * 10;
      const boardX = Math.floor((width - boardSize) / 2);
      const boardY = Math.max(6, Math.floor((height - trayHeight - boardSize) / 2));
      const trayY = boardY + boardSize + 12;

      metricsRef.current = {
        width,
        height,
        boardX,
        boardY,
        boardSize,
        cellSize,
        trayY,
        trayHeight,
        slotWidth: Math.floor((width - 24) / 3),
      };
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Main 60 FPS Canvas Render Loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const canvas = canvasRef.current;
      if (!canvas) {
        rafId = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafId = requestAnimationFrame(render);
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const m = metricsRef.current;
      const { board: curBoard, tray: curTray, theme: curTheme, skin: curSkin, activeBoosterTarget: boosterMode } =
        propsRef.current;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, m.width, m.height);

      // 1. Board outer frame
      const framePad = 6;
      drawRoundedRect(
        ctx,
        m.boardX - framePad,
        m.boardY - framePad,
        m.boardSize + framePad * 2,
        m.boardSize + framePad * 2,
        14
      );
      ctx.fillStyle = curTheme.boardFrameHex;
      ctx.fill();
      ctx.strokeStyle = curTheme.surfaceBorder;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Inner board background
      drawRoundedRect(ctx, m.boardX, m.boardY, m.boardSize, m.boardSize, 10);
      ctx.fillStyle = curTheme.boardBgHex;
      ctx.fill();

      // 2. Empty cells + grid
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          const cx = m.boardX + c * m.cellSize;
          const cy = m.boardY + r * m.cellSize;
          const pad = Math.max(1.5, m.cellSize * 0.06);
          drawRoundedRect(
            ctx,
            cx + pad,
            cy + pad,
            m.cellSize - pad * 2,
            m.cellSize - pad * 2,
            Math.max(3, m.cellSize * 0.16)
          );
          ctx.fillStyle = curTheme.cellEmptyHex;
          ctx.fill();
        }
      }

      // 3. Preview line clear highlights (from valid drag)
      const drag = dragRef.current;
      if (drag && drag.isValid && (drag.previewRows.length > 0 || drag.previewCols.length > 0)) {
        ctx.save();
        ctx.fillStyle = 'rgba(250, 204, 21, 0.22)';
        for (const r of drag.previewRows) {
          ctx.fillRect(m.boardX, m.boardY + r * m.cellSize, m.boardSize, m.cellSize);
        }
        for (const c of drag.previewCols) {
          ctx.fillRect(m.boardX + c * m.cellSize, m.boardY, m.cellSize, m.boardSize);
        }
        ctx.restore();
      }

      // 4. Placed board cells (with pop scale anims)
      const activePops = new Map<string, number>();
      popAnimsRef.current = popAnimsRef.current.filter((p) => {
        p.life -= dt * 5.2;
        if (p.life <= 0) return false;
        const t = 1 - p.life;
        const scale = t < 0.5 ? 0.85 + t * 0.38 : 1.04 - (t - 0.5) * 0.08;
        activePops.set(`${p.r},${p.c}`, scale);
        return true;
      });

      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          const cell = curBoard[r][c];
          if (cell.kind === 'empty') continue;
          const cx = m.boardX + c * m.cellSize;
          const cy = m.boardY + r * m.cellSize;
          const scale = activePops.get(`${r},${c}`) ?? 1;
          drawBlockCell(ctx, cx, cy, m.cellSize, cell, curTheme, curSkin, 1, scale);
        }
      }

      // 5. Ghost placement preview on board
      if (drag && drag.snapRow !== null && drag.snapCol !== null) {
        const piece = curTray[drag.pieceIndex];
        if (piece && !piece.used) {
          const mat = piece.shape.matrix;
          for (let r = 0; r < mat.length; r++) {
            for (let c = 0; c < mat[r].length; c++) {
              if (mat[r][c] !== 1) continue;
              const br = drag.snapRow + r;
              const bc = drag.snapCol + c;
              if (br < 0 || br >= 10 || bc < 0 || bc >= 10) continue;
              const gx = m.boardX + bc * m.cellSize;
              const gy = m.boardY + br * m.cellSize;

              if (drag.isValid) {
                drawBlockCell(
                  ctx,
                  gx,
                  gy,
                  m.cellSize,
                  { kind: 'block', colorIndex: piece.colorIndex },
                  curTheme,
                  curSkin,
                  0.42,
                  1
                );
              } else {
                const pad = Math.max(2, m.cellSize * 0.08);
                drawRoundedRect(
                  ctx,
                  gx + pad,
                  gy + pad,
                  m.cellSize - pad * 2,
                  m.cellSize - pad * 2,
                  4
                );
                ctx.fillStyle = 'rgba(239, 68, 68, 0.38)';
                ctx.fill();
              }
            }
          }
        }
      }

      // 6. Booster targeting overlay
      if (boosterMode) {
        const hover = hoverCellRef.current;
        ctx.save();
        if (hover) {
          if (boosterMode === 'clearRow') {
            ctx.fillStyle = 'rgba(244, 63, 94, 0.28)';
            ctx.fillRect(m.boardX, m.boardY + hover.r * m.cellSize, m.boardSize, m.cellSize);
            ctx.strokeStyle = '#fb7185';
            ctx.lineWidth = 2;
            ctx.strokeRect(m.boardX, m.boardY + hover.r * m.cellSize, m.boardSize, m.cellSize);
          } else if (boosterMode === 'clearCol') {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
            ctx.fillRect(m.boardX + hover.c * m.cellSize, m.boardY, m.cellSize, m.boardSize);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.strokeRect(m.boardX + hover.c * m.cellSize, m.boardY, m.cellSize, m.boardSize);
          } else if (boosterMode === 'removeBlock') {
            const occupied = isCellOccupied(curBoard[hover.r][hover.c]);
            ctx.fillStyle = occupied ? 'rgba(251, 191, 36, 0.35)' : 'rgba(148, 163, 184, 0.15)';
            ctx.fillRect(
              m.boardX + hover.c * m.cellSize,
              m.boardY + hover.r * m.cellSize,
              m.cellSize,
              m.cellSize
            );
            ctx.strokeStyle = occupied ? '#fde047' : '#94a3b8';
            ctx.lineWidth = 2;
            ctx.strokeRect(
              m.boardX + hover.c * m.cellSize,
              m.boardY + hover.r * m.cellSize,
              m.cellSize,
              m.cellSize
            );
          }
        }
        ctx.restore();
      }

      // 7. Line-clear flash sweep
      if (flashLinesRef.current.life > 0) {
        flashLinesRef.current.life -= dt * 4.5;
        if (flashLinesRef.current.life > 0) {
          ctx.save();
          ctx.fillStyle = `rgba(255, 255, 255, ${flashLinesRef.current.life * 0.45})`;
          for (const r of flashLinesRef.current.rows) {
            ctx.fillRect(m.boardX, m.boardY + r * m.cellSize, m.boardSize, m.cellSize);
          }
          for (const c of flashLinesRef.current.cols) {
            ctx.fillRect(m.boardX + c * m.cellSize, m.boardY, m.cellSize, m.boardSize);
          }
          ctx.restore();
        }
      }

      // 8. Tray slots (3 pieces)
      const trayStartX = 12;
      for (let i = 0; i < 3; i++) {
        const slotX = trayStartX + i * m.slotWidth;
        const slotY = m.trayY;
        const slotW = m.slotWidth - 8;
        const slotH = m.trayHeight - 4;

        drawRoundedRect(ctx, slotX + 4, slotY, slotW, slotH, 12);
        ctx.fillStyle = curTheme.surfaceBg;
        ctx.fill();
        ctx.strokeStyle = curTheme.surfaceBorder;
        ctx.lineWidth = 1;
        ctx.stroke();

        const piece = curTray[i];
        if (!piece || piece.used) continue;
        // Skip drawing in tray while actively being dragged
        if (drag && drag.pieceIndex === i) continue;

        const mat = piece.shape.matrix;
        const rows = mat.length;
        const cols = mat[0].length;
        const maxDim = Math.max(rows, cols, 3);
        const trayCell = Math.min(m.cellSize * 0.72, (Math.min(slotW, slotH) - 18) / maxDim);
        const pw = cols * trayCell;
        const ph = rows * trayCell;
        const px = slotX + 4 + (slotW - pw) / 2;
        const py = slotY + (slotH - ph) / 2;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (mat[r][c] === 1) {
              drawBlockCell(
                ctx,
                px + c * trayCell,
                py + r * trayCell,
                trayCell,
                { kind: 'block', colorIndex: piece.colorIndex },
                curTheme,
                curSkin,
                1,
                1
              );
            }
          }
        }
      }

      // 9. Particles
      particlesRef.current = particlesRef.current.filter((p) => {
        p.life -= dt * 1.9;
        if (p.life <= 0) return false;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.14;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.restore();
        return true;
      });

      // 10. Floating Score / Combo Texts
      floatingTextsRef.current = floatingTextsRef.current.filter((ft) => {
        ft.life -= dt * 1.05;
        if (ft.life <= 0) return false;
        ft.y -= dt * 36;
        ctx.save();
        ctx.globalAlpha = Math.min(1, ft.life * 1.4);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.font = '800 24px Outfit, sans-serif';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0,0,0,0.65)';
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);

        if (ft.subtext) {
          ctx.font = '700 13px Outfit, sans-serif';
          ctx.lineWidth = 3;
          ctx.strokeText(ft.subtext, ft.x, ft.y + 22);
          ctx.fillStyle = '#fef08a';
          ctx.fillText(ft.subtext, ft.x, ft.y + 22);
        }
        ctx.restore();
        return true;
      });

      // 11. Active dragged piece rendered on top at full board cell scale
      if (drag) {
        const piece = curTray[drag.pieceIndex];
        if (piece && !piece.used) {
          const lift = getFingerLift(drag.pointerType, m.cellSize);
          const mat = piece.shape.matrix;
          const rows = mat.length;
          const cols = mat[0].length;
          const dragCellSize = m.cellSize * 0.96;
          const totalW = cols * dragCellSize;
          const totalH = rows * dragCellSize;
          const startX = drag.pointerX - totalW / 2;
          const startY = drag.pointerY - lift - totalH / 2;

          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              if (mat[r][c] === 1) {
                drawBlockCell(
                  ctx,
                  startX + c * dragCellSize,
                  startY + r * dragCellSize,
                  dragCellSize,
                  { kind: 'block', colorIndex: piece.colorIndex },
                  curTheme,
                  curSkin,
                  0.95,
                  1.04
                );
              }
            }
          }
        }
      }

      ctx.restore();
      rafId = requestAnimationFrame(render);
    };

    const getFingerLift = (pointerType: string, cellSize: number): number => {
      if (pointerType !== 'touch') return cellSize * 0.25;
      const mode = propsRef.current.dragOffsetMode;
      if (mode === 'compact') return cellSize * 1.5;
      if (mode === 'high') return cellSize * 2.9;
      return cellSize * 2.2;
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Coordinate helpers for pointer events
  const getLocalCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const getBoardCellAt = (x: number, y: number): { r: number; c: number } | null => {
    const m = metricsRef.current;
    if (
      x < m.boardX ||
      x >= m.boardX + m.boardSize ||
      y < m.boardY ||
      y >= m.boardY + m.boardSize
    ) {
      return null;
    }
    const c = Math.floor((x - m.boardX) / m.cellSize);
    const r = Math.floor((y - m.boardY) / m.cellSize);
    if (r < 0 || r >= 10 || c < 0 || c >= 10) return null;
    return { r, c };
  };

  const computeSnap = (
    pieceIndex: number,
    pointerX: number,
    pointerY: number,
    pointerType: string
  ) => {
    const m = metricsRef.current;
    const { board: curBoard, tray: curTray, dragOffsetMode: mode } = propsRef.current;
    const piece = curTray[pieceIndex];
    if (!piece) return { snapRow: null, snapCol: null, isValid: false, previewRows: [], previewCols: [] };

    const lift =
      pointerType !== 'touch'
        ? m.cellSize * 0.25
        : mode === 'compact'
        ? m.cellSize * 1.5
        : mode === 'high'
        ? m.cellSize * 2.9
        : m.cellSize * 2.2;

    const rows = piece.shape.matrix.length;
    const cols = piece.shape.matrix[0].length;
    const centerX = pointerX;
    const centerY = pointerY - lift;

    const topLeftX = centerX - (cols * m.cellSize) / 2;
    const topLeftY = centerY - (rows * m.cellSize) / 2;

    const snapCol = Math.round((topLeftX - m.boardX) / m.cellSize);
    const snapRow = Math.round((topLeftY - m.boardY) / m.cellSize);

    // Check if near board bounds
    if (snapRow < -2 || snapRow > 10 || snapCol < -2 || snapCol > 10) {
      return { snapRow: null, snapCol: null, isValid: false, previewRows: [], previewCols: [] };
    }

    const isValid = canPlaceShape(curBoard, piece.shape, snapRow, snapCol);
    if (!isValid) {
      return { snapRow, snapCol, isValid: false, previewRows: [], previewCols: [] };
    }

    const { fullRows, fullCols } = findFullLinesAfterPlacement(
      curBoard,
      piece.shape,
      snapRow,
      snapCol
    );
    return {
      snapRow,
      snapCol,
      isValid: true,
      previewRows: fullRows,
      previewCols: fullCols,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (propsRef.current.disabled) return;
    const { x, y } = getLocalCoords(e);
    const m = metricsRef.current;

    // Booster target mode takes priority over dragging
    if (propsRef.current.activeBoosterTarget) {
      const cell = getBoardCellAt(x, y);
      if (cell) {
        hoverCellRef.current = cell;
        propsRef.current.onTargetCellClick(cell.r, cell.c);
      }
      return;
    }

    // Check if pointer pressed inside one of the 3 tray slots
    if (y >= m.trayY - 8 && y <= m.trayY + m.trayHeight + 10) {
      const trayStartX = 12;
      const slotIndex = Math.floor((x - trayStartX) / m.slotWidth);
      if (slotIndex >= 0 && slotIndex < 3) {
        const piece = propsRef.current.tray[slotIndex];
        if (piece && !piece.used) {
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // ignore
          }
          const snap = computeSnap(slotIndex, x, y, e.pointerType);
          dragRef.current = {
            pieceIndex: slotIndex,
            pointerId: e.pointerId,
            pointerType: e.pointerType,
            pointerX: x,
            pointerY: y,
            ...snap,
          };
          propsRef.current.onPickupPiece();
        }
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = getLocalCoords(e);

    if (propsRef.current.activeBoosterTarget) {
      hoverCellRef.current = getBoardCellAt(x, y);
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const snap = computeSnap(drag.pieceIndex, x, y, drag.pointerType);
    drag.pointerX = x;
    drag.pointerY = y;
    drag.snapRow = snap.snapRow;
    drag.snapCol = snap.snapCol;
    drag.isValid = snap.isValid;
    drag.previewRows = snap.previewRows;
    drag.previewCols = snap.previewCols;
  };

  const finishDrag = (e: React.PointerEvent<HTMLCanvasElement>, cancelled = false) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }

    if (cancelled) return;

    if (drag.isValid && drag.snapRow !== null && drag.snapCol !== null) {
      propsRef.current.onPlacePiece(drag.pieceIndex, drag.snapRow, drag.snapCol);
    } else if (drag.snapRow !== null && drag.snapCol !== null) {
      // Dropped on board at invalid/occupied position
      propsRef.current.onInvalidDrop();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[380px] touch-none select-none">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => finishDrag(e, false)}
        onPointerCancel={(e) => finishDrag(e, true)}
        className="block w-full h-full touch-none select-none cursor-grab active:cursor-grabbing"
      />
    </div>
  );
};
