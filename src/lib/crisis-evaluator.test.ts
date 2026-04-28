import assert from "node:assert/strict";
import test from "node:test";

import type { ElementKey } from "@/game/types";
import {
    buildNeutralCrisisAudioFallback,
    mapScoreToGlobalSubElementModifier,
    mapScoreToPrimaryHexModifier,
    parseCrisisAudioEval,
} from "@/lib/crisis-evaluator-validator";

const sampleRaw = (target: string): string =>
    JSON.stringify({
        speech_analysis: {
            score: 85,
            briefing_report:
                "Direct confrontation of cultural manipulation detected. Operational morale gain assessed as high.",
            subscores: {
                thematic_resonance: 89,
                rhetorical_conviction: 81,
                memetic_viability: 77,
            },
        },
        impact_calculations: {
            target_element: target,
            primary_hex_modifier: 8,
            global_sub_element_modifier: 15,
        },
    });

test("score mapping remains deterministic and clamped", () => {
    assert.equal(mapScoreToPrimaryHexModifier(100), 12);
    assert.equal(mapScoreToPrimaryHexModifier(50), 0);
    assert.equal(mapScoreToPrimaryHexModifier(0), -12);
    assert.equal(mapScoreToGlobalSubElementModifier(100), 22);
    assert.equal(mapScoreToGlobalSubElementModifier(50), 0);
    assert.equal(mapScoreToGlobalSubElementModifier(0), -22);
});

test("parseCrisisAudioEval accepts valid payload", () => {
    const parsed = parseCrisisAudioEval(sampleRaw("Cultural"), "cultural");
    assert.ok(parsed);
    assert.equal(parsed.impactCalculations.targetElement, "cultural");
    assert.equal(parsed.impactCalculations.primaryHexModifier, 8);
    assert.equal(parsed.impactCalculations.globalSubElementModifier, 15);
});

test("parseCrisisAudioEval enforces expected target element", () => {
    const parsed = parseCrisisAudioEval(sampleRaw("Military"), "economic");
    assert.ok(parsed);
    assert.equal(parsed.impactCalculations.targetElement, "economic");
});

test("neutral fallback remains safe", () => {
    const fallback = buildNeutralCrisisAudioFallback(
        "scientific" satisfies ElementKey,
        "broken payload",
    );
    assert.equal(fallback.result.impactCalculations.primaryHexModifier, 0);
    assert.equal(fallback.result.impactCalculations.globalSubElementModifier, 0);
    assert.equal(fallback.result.impactCalculations.targetElement, "scientific");
});
