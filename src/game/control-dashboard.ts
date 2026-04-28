import { ELEMENTS } from "./elements";
import type { ElementKey, Grid, HexNode } from "./types";

export interface PartyInfluence {
    insurgent: number;
    government: number;
}

export interface ElementInfluenceRow extends PartyInfluence {
    key: ElementKey;
    label: string;
    weight: number;
}

export interface HexControlMetrics {
    coordinates: { col: number; row: number };
    overall: PartyInfluence;
    elements: ElementInfluenceRow[];
}

export interface GlobalControlMetrics {
    overall: PartyInfluence;
    elements: ElementInfluenceRow[];
}

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

const getPartySplit = (alignment: number): PartyInfluence => {
    const insurgent = clamp(alignment);
    return {
        insurgent,
        government: 1 - insurgent,
    };
};

const buildElementRow = (
    key: ElementKey,
    label: string,
    weight: number,
    insurgent: number,
): ElementInfluenceRow => ({
    key,
    label,
    weight,
    insurgent,
    government: 1 - insurgent,
});

export const getHexControlMetrics = (
    node: HexNode,
    col: number,
    row: number,
): HexControlMetrics => {
    const overall = getPartySplit(node.alignment);
    const totalWeight = ELEMENTS.reduce(
        (sum, element) => sum + (node.elements[element.key] ?? 0),
        0,
    );

    const elements = ELEMENTS.map((element) => {
        const weight = node.elements[element.key] ?? 0;
        const weightedInsurgent =
            totalWeight === 0 ? overall.insurgent : overall.insurgent * (weight / totalWeight);
        return buildElementRow(element.key, element.label, weight, weightedInsurgent);
    });

    return {
        coordinates: { col, row },
        overall,
        elements,
    };
};

export const getGlobalControlMetrics = (grid: Grid): GlobalControlMetrics => {
    if (grid.length === 0) {
        return {
            overall: { insurgent: 0, government: 0 },
            elements: ELEMENTS.map((element) =>
                buildElementRow(element.key, element.label, 0, 0),
            ),
        };
    }

    let totalNodes = 0;
    let totalAlignment = 0;
    const weightedInfluenceByElement: Record<ElementKey, number> = {
        political: 0,
        military: 0,
        economic: 0,
        religious: 0,
        scientific: 0,
        cultural: 0,
    };
    const totalWeightByElement: Record<ElementKey, number> = {
        political: 0,
        military: 0,
        economic: 0,
        religious: 0,
        scientific: 0,
        cultural: 0,
    };

    grid.forEach((column) => {
        column.forEach((node) => {
            totalNodes += 1;
            const nodeAlignment = clamp(node.alignment);
            totalAlignment += nodeAlignment;
            ELEMENTS.forEach((element) => {
                const elementWeight = node.elements[element.key] ?? 0;
                weightedInfluenceByElement[element.key] += nodeAlignment * elementWeight;
                totalWeightByElement[element.key] += elementWeight;
            });
        });
    });

    const overallInsurgent = totalNodes === 0 ? 0 : totalAlignment / totalNodes;
    const elements = ELEMENTS.map((element) => {
        const weight = totalWeightByElement[element.key];
        const insurgent =
            weight === 0 ? 0 : weightedInfluenceByElement[element.key] / weight;
        return buildElementRow(element.key, element.label, weight, insurgent);
    });

    return {
        overall: {
            insurgent: overallInsurgent,
            government: 1 - overallInsurgent,
        },
        elements,
    };
};
