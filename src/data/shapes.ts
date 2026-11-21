import { BlockShape } from '../types/game';

export const BLOCK_SHAPES: BlockShape[] = [
  // Single
  {
    id: 'single',
    name: 'Dot',
    matrix: [[1]],
    weight: 10,
    tier: 'small',
  },
  // Two-block
  {
    id: 'h2',
    name: 'Bar 2H',
    matrix: [[1, 1]],
    weight: 11,
    tier: 'small',
  },
  {
    id: 'v2',
    name: 'Bar 2V',
    matrix: [[1], [1]],
    weight: 11,
    tier: 'small',
  },
  // Three-block
  {
    id: 'h3',
    name: 'Bar 3H',
    matrix: [[1, 1, 1]],
    weight: 10,
    tier: 'medium',
  },
  {
    id: 'v3',
    name: 'Bar 3V',
    matrix: [[1], [1], [1]],
    weight: 10,
    tier: 'medium',
  },
  // Four-block bars
  {
    id: 'h4',
    name: 'Bar 4H',
    matrix: [[1, 1, 1, 1]],
    weight: 7,
    tier: 'medium',
  },
  {
    id: 'v4',
    name: 'Bar 4V',
    matrix: [[1], [1], [1], [1]],
    weight: 7,
    tier: 'medium',
  },
  // Five-block bars
  {
    id: 'h5',
    name: 'Bar 5H',
    matrix: [[1, 1, 1, 1, 1]],
    weight: 5,
    tier: 'large',
  },
  {
    id: 'v5',
    name: 'Bar 5V',
    matrix: [[1], [1], [1], [1], [1]],
    weight: 5,
    tier: 'large',
  },
  // Squares
  {
    id: 'sq2',
    name: 'Square 2x2',
    matrix: [
      [1, 1],
      [1, 1],
    ],
    weight: 12,
    tier: 'medium',
  },
  {
    id: 'sq3',
    name: 'Square 3x3',
    matrix: [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ],
    weight: 4,
    tier: 'large',
  },
  // Small L-shapes (3 cells)
  {
    id: 'sl1',
    name: 'Corner TL',
    matrix: [
      [1, 1],
      [1, 0],
    ],
    weight: 8,
    tier: 'small',
  },
  {
    id: 'sl2',
    name: 'Corner TR',
    matrix: [
      [1, 1],
      [0, 1],
    ],
    weight: 8,
    tier: 'small',
  },
  {
    id: 'sl3',
    name: 'Corner BL',
    matrix: [
      [1, 0],
      [1, 1],
    ],
    weight: 8,
    tier: 'small',
  },
  {
    id: 'sl4',
    name: 'Corner BR',
    matrix: [
      [0, 1],
      [1, 1],
    ],
    weight: 8,
    tier: 'small',
  },
  // Big L-shapes (5 cells, 3x3)
  {
    id: 'bl1',
    name: 'Big L 1',
    matrix: [
      [1, 0, 0],
      [1, 0, 0],
      [1, 1, 1],
    ],
    weight: 4,
    tier: 'large',
  },
  {
    id: 'bl2',
    name: 'Big L 2',
    matrix: [
      [0, 0, 1],
      [0, 0, 1],
      [1, 1, 1],
    ],
    weight: 4,
    tier: 'large',
  },
  {
    id: 'bl3',
    name: 'Big L 3',
    matrix: [
      [1, 1, 1],
      [1, 0, 0],
      [1, 0, 0],
    ],
    weight: 4,
    tier: 'large',
  },
  {
    id: 'bl4',
    name: 'Big L 4',
    matrix: [
      [1, 1, 1],
      [0, 0, 1],
      [0, 0, 1],
    ],
    weight: 4,
    tier: 'large',
  },
  // Standard L/J shapes (4 cells)
  {
    id: 'l1',
    name: 'L-Shape',
    matrix: [
      [1, 0],
      [1, 0],
      [1, 1],
    ],
    weight: 6,
    tier: 'medium',
  },
  {
    id: 'j1',
    name: 'J-Shape',
    matrix: [
      [0, 1],
      [0, 1],
      [1, 1],
    ],
    weight: 6,
    tier: 'medium',
  },
  {
    id: 'l2',
    name: 'L-Wide',
    matrix: [
      [1, 1, 1],
      [1, 0, 0],
    ],
    weight: 6,
    tier: 'medium',
  },
  {
    id: 'j2',
    name: 'J-Wide',
    matrix: [
      [1, 1, 1],
      [0, 0, 1],
    ],
    weight: 6,
    tier: 'medium',
  },
  // T-shapes
  {
    id: 't1',
    name: 'T-Up',
    matrix: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    weight: 6,
    tier: 'medium',
  },
  {
    id: 't2',
    name: 'T-Down',
    matrix: [
      [1, 1, 1],
      [0, 1, 0],
    ],
    weight: 6,
    tier: 'medium',
  },
  {
    id: 't3',
    name: 'T-Left',
    matrix: [
      [0, 1],
      [1, 1],
      [0, 1],
    ],
    weight: 5,
    tier: 'medium',
  },
  {
    id: 't4',
    name: 'T-Right',
    matrix: [
      [1, 0],
      [1, 1],
      [1, 0],
    ],
    weight: 5,
    tier: 'medium',
  },
  // Zigzag (S & Z)
  {
    id: 'z1',
    name: 'Zigzag Z',
    matrix: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    weight: 5,
    tier: 'medium',
  },
  {
    id: 's1',
    name: 'Zigzag S',
    matrix: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    weight: 5,
    tier: 'medium',
  },
  {
    id: 'z2',
    name: 'Zigzag V1',
    matrix: [
      [0, 1],
      [1, 1],
      [1, 0],
    ],
    weight: 5,
    tier: 'medium',
  },
  {
    id: 's2',
    name: 'Zigzag V2',
    matrix: [
      [1, 0],
      [1, 1],
      [0, 1],
    ],
    weight: 5,
    tier: 'medium',
  },
  // Rectangles & Plus
  {
    id: 'rect23',
    name: 'Block 2x3',
    matrix: [
      [1, 1, 1],
      [1, 1, 1],
    ],
    weight: 4,
    tier: 'large',
  },
  {
    id: 'rect32',
    name: 'Block 3x2',
    matrix: [
      [1, 1],
      [1, 1],
      [1, 1],
    ],
    weight: 4,
    tier: 'large',
  },
  {
    id: 'plus',
    name: 'Plus',
    matrix: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 1, 0],
    ],
    weight: 3,
    tier: 'large',
  },
];

export function countShapeCells(matrix: number[][]): number {
  let count = 0;
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c] === 1) count++;
    }
  }
  return count;
}
