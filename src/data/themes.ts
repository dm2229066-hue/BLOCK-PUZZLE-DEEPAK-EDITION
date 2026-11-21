import { BlockSkinId, SkinConfig, ThemeConfig, ThemeId } from '../types/game';

export const THEMES: Record<ThemeId, ThemeConfig> = {
  'classic-wood': {
    id: 'classic-wood',
    name: 'Classic Wood',
    tagline: 'Warm carved walnut & amber blocks',
    price: 0,
    appBg: '#17120e',
    surfaceBg: '#231b15',
    surfaceBorder: 'rgba(217, 160, 91, 0.16)',
    textPrimary: '#f7efe6',
    textMuted: '#bfa992',
    accentBg: 'bg-amber-500 hover:bg-amber-400',
    accentText: 'text-amber-400',
    accentHex: '#f59e0b',
    boardFrameHex: '#33251b',
    boardBgHex: '#1d1510',
    cellEmptyHex: '#281e17',
    cellEmptyBorderHex: '#3b2c22',
    gridLineHex: '#382a20',
    blockColors: [
      '#d97706', // amber oak
      '#b45309', // cedar
      '#e11d48', // crimson lacquer
      '#0284c7', // cobalt inlay
      '#059669', // jade inlay
      '#ca8a04', // honey teak
      '#9333ea', // plum wood
      '#ea580c', // burnt sienna
    ],
  },
  'neon-cyber': {
    id: 'neon-cyber',
    name: 'Neon Cyber',
    tagline: 'Obsidian matrix with electric vector tiles',
    price: 150,
    appBg: '#090d16',
    surfaceBg: '#111827',
    surfaceBorder: 'rgba(56, 189, 248, 0.2)',
    textPrimary: '#f0f9ff',
    textMuted: '#94a3b8',
    accentBg: 'bg-cyan-500 hover:bg-cyan-400',
    accentText: 'text-cyan-400',
    accentHex: '#22d3ee',
    boardFrameHex: '#0f172a',
    boardBgHex: '#070b14',
    cellEmptyHex: '#131d31',
    cellEmptyBorderHex: '#1e293b',
    gridLineHex: '#1e293b',
    blockColors: [
      '#06b6d4', // cyan
      '#3b82f6', // electric blue
      '#ec4899', // magenta
      '#10b981', // emerald neon
      '#eab308', // volt yellow
      '#8b5cf6', // violet
      '#f97316', // laser orange
      '#14b8a6', // teal
    ],
  },
  'midnight-dark': {
    id: 'midnight-dark',
    name: 'Midnight Dark',
    tagline: 'Low-glare matte slate for night sessions',
    price: 200,
    appBg: '#0c0f14',
    surfaceBg: '#161b22',
    surfaceBorder: 'rgba(148, 163, 184, 0.14)',
    textPrimary: '#f1f5f9',
    textMuted: '#94a3b8',
    accentBg: 'bg-indigo-500 hover:bg-indigo-400',
    accentText: 'text-indigo-400',
    accentHex: '#818cf8',
    boardFrameHex: '#1c232d',
    boardBgHex: '#0e131a',
    cellEmptyHex: '#171f2b',
    cellEmptyBorderHex: '#253041',
    gridLineHex: '#232e3e',
    blockColors: [
      '#6366f1',
      '#0ea5e9',
      '#10b981',
      '#f59e0b',
      '#f43f5e',
      '#a855f7',
      '#14b8a6',
      '#64748b',
    ],
  },
  'candy-colorful': {
    id: 'candy-colorful',
    name: 'Candy Colorful',
    tagline: 'Bright studio tiles on crisp navy canvas',
    price: 250,
    appBg: '#151226',
    surfaceBg: '#201c38',
    surfaceBorder: 'rgba(244, 114, 182, 0.2)',
    textPrimary: '#fdf4ff',
    textMuted: '#c4b5fd',
    accentBg: 'bg-pink-500 hover:bg-pink-400',
    accentText: 'text-pink-400',
    accentHex: '#f472b6',
    boardFrameHex: '#282246',
    boardBgHex: '#141028',
    cellEmptyHex: '#211b3d',
    cellEmptyBorderHex: '#332b59',
    gridLineHex: '#2f2752',
    blockColors: [
      '#fb7185', // coral pink
      '#38bdf8', // sky candy
      '#34d399', // mint
      '#fbbf24', // lemon gold
      '#c084fc', // lavender
      '#fb923c', // tangerine
      '#2dd4bf', // aqua
      '#f472b6', // bubble pink
    ],
  },
  'forest-nature': {
    id: 'forest-nature',
    name: 'Forest Nature',
    tagline: 'Mossy cedar board & botanical earth tones',
    price: 300,
    appBg: '#0d1712',
    surfaceBg: '#15241c',
    surfaceBorder: 'rgba(52, 211, 153, 0.16)',
    textPrimary: '#ecfdf5',
    textMuted: '#99c2ae',
    accentBg: 'bg-emerald-500 hover:bg-emerald-400',
    accentText: 'text-emerald-400',
    accentHex: '#34d399',
    boardFrameHex: '#1b2e24',
    boardBgHex: '#0e1a14',
    cellEmptyHex: '#16271f',
    cellEmptyBorderHex: '#233c30',
    gridLineHex: '#20372b',
    blockColors: [
      '#10b981', // forest emerald
      '#84cc16', // moss lime
      '#d97706', // bark amber
      '#0d9488', // river teal
      '#eab308', // sunlit pollen
      '#e11d48', // wild berry
      '#0284c7', // mountain sky
      '#ea580c', // terracotta
    ],
  },
  'royal-sapphire': {
    id: 'royal-sapphire',
    name: 'Royal Sapphire',
    tagline: 'Velvet indigo & brushed gold luxury edition',
    price: 500,
    isPremium: true,
    appBg: '#090d1a',
    surfaceBg: '#12192e',
    surfaceBorder: 'rgba(251, 191, 36, 0.24)',
    textPrimary: '#fefce8',
    textMuted: '#cbd5e1',
    accentBg: 'bg-yellow-500 hover:bg-yellow-400',
    accentText: 'text-yellow-400',
    accentHex: '#facc15',
    boardFrameHex: '#1b2545',
    boardBgHex: '#0a0f22',
    cellEmptyHex: '#131c38',
    cellEmptyBorderHex: '#263461',
    gridLineHex: '#1e2a50',
    blockColors: [
      '#f59e0b', // royal gold
      '#2563eb', // sapphire
      '#dc2626', // ruby
      '#059669', // emerald
      '#7c3aed', // amethyst
      '#0891b2', // topaz
      '#db2777', // garnet
      '#ca8a04', // bronze
    ],
  },
};

export const THEME_LIST: ThemeConfig[] = Object.values(THEMES);

export const BLOCK_SKINS: Record<BlockSkinId, SkinConfig> = {
  'carved-wood': {
    id: 'carved-wood',
    name: 'Carved Wood',
    description: 'Warm tactile bevels with subtle grain highlights',
    price: 0,
  },
  'polished-gem': {
    id: 'polished-gem',
    name: 'Polished Gem',
    description: 'Faceted jewel cuts with crisp specular corners',
    price: 250,
  },
  'minimal-matte': {
    id: 'minimal-matte',
    name: 'Minimal Matte',
    description: 'Clean precision rounded tiles with soft edges',
    price: 200,
  },
  'neon-prism': {
    id: 'neon-prism',
    name: 'Neon Prism',
    description: 'Dark core tiles framed by crisp luminous outlines',
    price: 400,
  },
};

export const SKIN_LIST: SkinConfig[] = Object.values(BLOCK_SKINS);
