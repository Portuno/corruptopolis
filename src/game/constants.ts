export const COLS = 15;
export const ROWS = 15;
export const HEX_SIZE = 28;
export const HEX_H = Math.sqrt(3) * HEX_SIZE;
export const COL_SPACING = HEX_SIZE * 1.5;
export const ROW_SPACING = HEX_H;
export const OFFSET_X = 40;
export const OFFSET_Y = 40;

export const CANVAS_W = Math.ceil(
    OFFSET_X * 2 + (COLS - 1) * COL_SPACING + HEX_SIZE * 2,
);
export const CANVAS_H = Math.ceil(
    OFFSET_Y * 2 + (ROWS - 1) * ROW_SPACING + HEX_H,
);

export const TOTAL_EPOCHS = 12;
export const STARTING_AP = 3;
export const FORTIFY_DURATION = 3;

export const EPOCH_LABELS: readonly string[] = [
    "OCT 2027",
    "NOV 2027",
    "DEC 2027",
    "JAN 2028",
    "FEB 2028",
    "MAR 2028",
    "APR 2028",
    "MAY 2028",
    "JUN 2028",
    "JUL 2028",
    "AUG 2028",
    "SEP 2028",
];

export const EPOCH_DAYS: readonly number[] = [
    31, 30, 31, 31, 28, 31, 30, 31, 30, 31, 31, 30,
];

export const ENEMY_CORNERS: ReadonlyArray<[number, number]> = [
    [0, 0],
    [0, ROWS - 1],
    [COLS - 1, 0],
    [COLS - 1, ROWS - 1],
];

export const ENEMY_THRESHOLD = 0.18;
export const PLAYER_DOMINANCE_THRESHOLD = 0.8;
export const VICTORY_THRESHOLD = 0.5;

export const DIFFICULTY_CONFIG = {
    easy: { year: 2027, enemyAp: 1, label: "Easy" },
    medium: { year: 2031, enemyAp: 2, label: "Medium" },
    hard: { year: 2035, enemyAp: 3, label: "Hard" },
} as const;
