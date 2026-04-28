import {
    COLS,
    ENEMY_CORNERS,
    ENEMY_THRESHOLD,
    PLAYER_DOMINANCE_THRESHOLD,
    ROWS,
    TOTAL_EPOCHS,
} from "./constants";
import { getDominant, getNeighbors } from "./grid";
import type {
    DiplomacyAction,
    EnemyIntent,
    ElementKey,
    GlobalStats,
    Grid,
    Palette,
    VibeKey,
} from "./types";

export interface PropagationModifiers {
    propagationBonus: number;
    enemyDragMultiplier: number;
    diplomacyScaleMultiplier: number;
}

const DEFAULT_ENEMY_AP_PER_TURN = 2;

export const computeGlobalStats = (grid: Grid): GlobalStats => {
    let total = 0;
    let controlled = 0;
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            total += grid[c][r].alignment;
            if (grid[c][r].alignment > PLAYER_DOMINANCE_THRESHOLD) {
                controlled++;
            }
        }
    }
    return {
        avg: total / (COLS * ROWS),
        controlled,
        total: COLS * ROWS,
    };
};

export const enemyLabel = (avg: number): string => {
    if (avg < 0.35) return "COLLAPSING";
    if (avg < 0.5) return "WEAKENING";
    if (avg < 0.65) return "HOLDING";
    return "ENTRENCHED";
};

export const evaluateVibe = (
    avg: number,
): { label: string; key: VibeKey } => {
    if (avg > 0.75) return { label: "DOMINANCE", key: "dominance" };
    if (avg >= 0.4) return { label: "FRICTION", key: "friction" };
    return { label: "HOSTILE OVERRIDE", key: "hostile" };
};

export interface PropagationResult {
    harmonicDemo: ElementKey | null;
}

const computeEnemySpreadRate = (epochNumber: number): number =>
    0.1 + (epochNumber / TOTAL_EPOCHS) * 0.14;

const computeEnemyStrikeCount = (epochNumber: number): number =>
    Math.min(4 + Math.floor((epochNumber - 1) / 2), 8);

const computeEnemyInfiltrationCount = (enemyApPerTurn: number): number => enemyApPerTurn;

const planEnemyApMoves = (
    grid: Grid,
    limit: number,
): Array<{ col: number; row: number }> => {
    const candidates: Array<{ col: number; row: number; score: number }> = [];
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            const node = grid[c][r];
            if (node.fortified > 0) continue;
            if (node.alignment <= ENEMY_THRESHOLD) continue;
            const nearEnemy = getNeighbors(c, r).some(
                ([nc, nr]) => grid[nc][nr].alignment <= ENEMY_THRESHOLD,
            );
            if (!nearEnemy) continue;
            const score = node.population * 0.6 + (1 - node.alignment) * 1.8;
            candidates.push({ col: c, row: r, score });
        }
    }
    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, limit).map(({ col, row }) => ({ col, row }));
};

export const predictEnemyIntent = (
    grid: Grid,
    epochNumber: number,
    enemyApPerTurn = DEFAULT_ENEMY_AP_PER_TURN,
): EnemyIntent => {
    const infiltration = computeEnemyInfiltrationCount(enemyApPerTurn);
    const strikes = computeEnemyStrikeCount(epochNumber);
    const spread = computeEnemySpreadRate(epochNumber);
    const plannedTiles = grid.length === 0 ? [] : planEnemyApMoves(grid, infiltration);
    const tileSummary =
        plannedTiles.length > 0
            ? plannedTiles
                  .map((tile) => `(${tile.col + 1},${tile.row + 1})`)
                  .join(", ")
            : "none";
    return {
        epoch: epochNumber,
        ap: enemyApPerTurn,
        infiltration,
        strikes,
        spread,
        plannedTiles,
        summary: `Next enemy turn: spend ${enemyApPerTurn} AP on tiles ${tileSummary}; launch ${strikes} strike${strikes === 1 ? "" : "s"}; spread ${(spread * 100).toFixed(0)}%.`,
    };
};

export const runPropagation = (
    grid: Grid,
    modifiers?: Partial<PropagationModifiers>,
): PropagationResult => {
    const snap: number[][] = [];
    for (let c = 0; c < COLS; c++) {
        snap[c] = [];
        for (let r = 0; r < ROWS; r++) snap[c][r] = grid[c][r].alignment;
    }

    let harmonicDemo: ElementKey | null = null;

    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            if (snap[c][r] <= PLAYER_DOMINANCE_THRESHOLD) continue;
            for (const [nc, nr] of getNeighbors(c, r)) {
                if (grid[nc][nr].fortified > 0) continue;
                let transfer = 0.15 + (modifiers?.propagationBonus ?? 0);
                if (
                    getDominant(grid[c][r].elements) ===
                    getDominant(grid[nc][nr].elements)
                ) {
                    transfer = 0.3 + (modifiers?.propagationBonus ?? 0);
                    harmonicDemo = getDominant(grid[c][r].elements);
                }
                grid[nc][nr].alignment = Math.min(
                    1.0,
                    grid[nc][nr].alignment + transfer,
                );
            }
        }
    }
    return { harmonicDemo };
};

export const runEnemyFriction = (
    grid: Grid,
    epochNumber: number,
    modifiers?: Partial<PropagationModifiers>,
    enemyApPerTurn = DEFAULT_ENEMY_AP_PER_TURN,
): void => {
    ENEMY_CORNERS.forEach(([c, r]) => {
        grid[c][r].alignment = 0.0;
    });

    const snap: number[][] = [];
    for (let c = 0; c < COLS; c++) {
        snap[c] = [];
        for (let r = 0; r < ROWS; r++) snap[c][r] = grid[c][r].alignment;
    }

    const spreadRate =
        computeEnemySpreadRate(epochNumber) *
        (modifiers?.enemyDragMultiplier ?? 1);

    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            if (snap[c][r] > ENEMY_THRESHOLD) continue;
            for (const [nc, nr] of getNeighbors(c, r)) {
                if (grid[nc][nr].fortified > 0) continue;
                if (snap[nc][nr] <= ENEMY_THRESHOLD) continue;
                const drag =
                    getDominant(grid[c][r].elements) ===
                    getDominant(grid[nc][nr].elements)
                        ? spreadRate * 2
                        : spreadRate;
                grid[nc][nr].alignment = Math.max(
                    0,
                    grid[nc][nr].alignment - drag,
                );
            }
        }
    }

    const strikeCount = computeEnemyStrikeCount(epochNumber);
    const candidates: Array<[number, number]> = [];
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            if (grid[c][r].fortified > 0) continue;
            if (grid[c][r].alignment <= ENEMY_THRESHOLD) continue;
            const borderingEnemy = getNeighbors(c, r).some(
                ([nc, nr]) => grid[nc][nr].alignment <= ENEMY_THRESHOLD,
            );
            if (!borderingEnemy) continue;
            candidates.push([c, r]);
        }
    }
    candidates.sort((a, b) => {
        const diff = grid[a[0]][a[1]].alignment - grid[b[0]][b[1]].alignment;
        if (Math.abs(diff) > 0.04) return diff;
        return (
            grid[a[0]][a[1]].population - grid[b[0]][b[1]].population
        );
    });
    for (let i = 0; i < Math.min(strikeCount, candidates.length); i++) {
        grid[candidates[i][0]][candidates[i][1]].alignment = 0.0;
    }

    const enemyApPlays = planEnemyApMoves(grid, enemyApPerTurn);
    for (const { col: c, row: r } of enemyApPlays) {
        const seededAlignment = Math.max(
            0,
            ENEMY_THRESHOLD - 0.04 - Math.random() * 0.05,
        );
        grid[c][r].alignment = Math.min(grid[c][r].alignment, seededAlignment);
    }

    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            if (grid[c][r].fortified > 0) grid[c][r].fortified--;
        }
    }
};

const DIPLOMACY_SCALE = 0.15;

export const processDiplomacyActions = (
    grid: Grid,
    queue: readonly DiplomacyAction[],
    modifiers?: Partial<PropagationModifiers>,
): void => {
    queue.forEach((action) => {
        if (action.type !== "DIPLOMACY") return;
        for (let c = 0; c < COLS; c++) {
            for (let r = 0; r < ROWS; r++) {
                const node = grid[c][r];
                if (node.fortified > 0 && action.modifier < 0) continue;
                const weight = node.elements[action.faction] || 1;
                const impact =
                    action.modifier *
                    (weight / 12) *
                    DIPLOMACY_SCALE *
                    (modifiers?.diplomacyScaleMultiplier ?? 1);
                node.alignment = Math.min(
                    1,
                    Math.max(0, node.alignment + impact),
                );
            }
        }
    });
};

export const alignmentColor = (a: number, pal: Palette): string => {
    const { enemy: e, neutral: n, player: p } = pal;
    let r: number;
    let g: number;
    let b: number;
    if (a <= 0.5) {
        const t = a / 0.5;
        r = Math.round(e[0] + t * (n[0] - e[0]));
        g = Math.round(e[1] + t * (n[1] - e[1]));
        b = Math.round(e[2] + t * (n[2] - e[2]));
    } else {
        const t = (a - 0.5) / 0.5;
        r = Math.round(n[0] + t * (p[0] - n[0]));
        g = Math.round(n[1] + t * (p[1] - n[1]));
        b = Math.round(n[2] + t * (p[2] - n[2]));
    }
    return `rgb(${r},${g},${b})`;
};
