import assert from "node:assert/strict";
import test from "node:test";

import type { Grid } from "@/game/types";
import {
    applyCrisisImpactToGrid,
    getCrisisDampingMultiplier,
} from "@/game/store";

const makeGrid = (): Grid => [
    [
        {
            alignment: 0.5,
            population: 1,
            isEnemySource: false,
            fortified: 0,
            elements: {
                political: 3,
                military: 2,
                economic: 2,
                religious: 2,
                scientific: 2,
                cultural: 11,
            },
        },
    ],
    [
        {
            alignment: 0.5,
            population: 1,
            isEnemySource: false,
            fortified: 0,
            elements: {
                political: 11,
                military: 2,
                economic: 2,
                religious: 2,
                scientific: 2,
                cultural: 3,
            },
        },
    ],
];

test("macro impact only changes alignment on primary element nodes", () => {
    const result = applyCrisisImpactToGrid(
        makeGrid(),
        {
            targetElement: "cultural",
            score: 85,
            primaryHexModifier: 12,
            globalSubElementModifier: 0,
        },
        1,
    );
    assert.ok(result[0][0].alignment > 0.5);
    assert.equal(result[1][0].alignment, 0.5);
});

test("micro impact applies target sub-element globally", () => {
    const result = applyCrisisImpactToGrid(
        makeGrid(),
        {
            targetElement: "cultural",
            score: 85,
            primaryHexModifier: 0,
            globalSubElementModifier: 22,
        },
        1,
    );
    assert.ok(result[0][0].elements.cultural > 11);
    assert.ok(result[1][0].elements.cultural > 3);
});

test("same-element repeat within window applies damping", () => {
    const noDamping = getCrisisDampingMultiplier(
        { element: "cultural", round: 1, epoch: 7 },
        { element: "political", round: 1, epoch: 6 },
    );
    const damping = getCrisisDampingMultiplier(
        { element: "cultural", round: 1, epoch: 7 },
        { element: "cultural", round: 1, epoch: 6 },
    );
    assert.equal(noDamping, 1);
    assert.ok(damping < 1);
});

test("score quality amplifies global sub-element impact", () => {
    const lowScore = applyCrisisImpactToGrid(
        makeGrid(),
        {
            targetElement: "cultural",
            score: 20,
            primaryHexModifier: 0,
            globalSubElementModifier: 12,
        },
        1,
    );
    const highScore = applyCrisisImpactToGrid(
        makeGrid(),
        {
            targetElement: "cultural",
            score: 95,
            primaryHexModifier: 0,
            globalSubElementModifier: 12,
        },
        1,
    );
    const lowDelta = lowScore[1][0].elements.cultural - 3;
    const highDelta = highScore[1][0].elements.cultural - 3;
    assert.ok(highDelta > lowDelta);
});
