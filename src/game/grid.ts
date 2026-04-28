import {
    COLS,
    COL_SPACING,
    ENEMY_CORNERS,
    HEX_H,
    OFFSET_X,
    OFFSET_Y,
    ROWS,
    ROW_SPACING,
} from "./constants";
import { ELEMENTS } from "./elements";
import type { ElementKey, ElementWeights, Grid, HexNode } from "./types";

export const isEnemySource = (col: number, row: number): boolean =>
    ENEMY_CORNERS.some(([c, r]) => c === col && r === row);

export const generateElementWeights = (): ElementWeights => {
    const weights = {} as ElementWeights;
    ELEMENTS.forEach((e) => {
        weights[e.key] = Math.floor(Math.random() * 4) + 1;
    });
    const numDominant = Math.random() < 0.5 ? 1 : 2;
    const keys = ELEMENTS.map((e) => e.key).sort(() => Math.random() - 0.5);
    for (let i = 0; i < numDominant; i++) {
        weights[keys[i]] = Math.floor(Math.random() * 6) + 7;
    }
    return weights;
};

export const getDominant = (elements: ElementWeights): ElementKey => {
    const keys = Object.keys(elements) as ElementKey[];
    return keys.reduce((a, b) => (elements[a] > elements[b] ? a : b));
};

export const buildGrid = (): Grid => {
    const g: Grid = [];
    for (let c = 0; c < COLS; c++) {
        g[c] = [];
        for (let r = 0; r < ROWS; r++) {
            const enemy = isEnemySource(c, r);
            const base = enemy
                ? Math.random() * 0.15
                : Math.min(
                      1,
                      Math.max(0, 0.5 + (Math.random() - 0.5) * 0.4),
                  );
            const node: HexNode = {
                alignment: base,
                population: Math.floor(Math.random() * 10) + 1,
                isEnemySource: enemy,
                elements: generateElementWeights(),
                fortified: 0,
            };
            g[c][r] = node;
        }
    }
    return g;
};

export const hexCenter = (col: number, row: number) => ({
    x: OFFSET_X + col * COL_SPACING,
    y: OFFSET_Y + row * ROW_SPACING + (col % 2 === 0 ? 0 : HEX_H / 2),
});

export const hexVertices = (
    cx: number,
    cy: number,
    size: number,
): Array<[number, number]> => {
    const v: Array<[number, number]> = [];
    for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 180) * (60 * i);
        v.push([cx + size * Math.cos(a), cy + size * Math.sin(a)]);
    }
    return v;
};

export const getNeighbors = (
    col: number,
    row: number,
): Array<[number, number]> => {
    const dirs: Array<[number, number]> =
        col % 2 === 0
            ? [
                  [+1, 0],
                  [-1, 0],
                  [0, -1],
                  [0, +1],
                  [+1, -1],
                  [-1, -1],
              ]
            : [
                  [+1, 0],
                  [-1, 0],
                  [0, -1],
                  [0, +1],
                  [+1, +1],
                  [-1, +1],
              ];
    return dirs
        .map(([dc, dr]) => [col + dc, row + dr] as [number, number])
        .filter(([c, r]) => c >= 0 && c < COLS && r >= 0 && r < ROWS);
};
