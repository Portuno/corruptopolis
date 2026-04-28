import { z } from "zod";

import type { ElementKey } from "@/game/types";
import type {
    CrisisAudioEvalFallback,
    CrisisAudioEvalResult,
} from "@/lib/crisis-evaluator-types";

const labelToElement: Record<string, ElementKey> = {
    Political: "political",
    Military: "military",
    Economic: "economic",
    Religious: "religious",
    Scientific: "scientific",
    Cultural: "cultural",
};

const elementToLabel: Record<ElementKey, string> = {
    political: "Political",
    military: "Military",
    economic: "Economic",
    religious: "Religious",
    scientific: "Scientific",
    cultural: "Cultural",
};

const finiteNumber = z.number().finite();

const rawSchema = z
    .object({
        speech_analysis: z
            .object({
                score: finiteNumber,
                briefing_report: z.string().min(1),
                subscores: z
                    .object({
                        thematic_resonance: finiteNumber,
                        rhetorical_conviction: finiteNumber,
                        memetic_viability: finiteNumber,
                    })
                    .partial()
                    .optional(),
            })
            .strict(),
        impact_calculations: z
            .object({
                target_element: z.string().min(1),
                primary_hex_modifier: finiteNumber,
                global_sub_element_modifier: finiteNumber,
            })
            .strict(),
    })
    .strict();

const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

const normalizeBriefing = (value: string): string =>
    value.replace(/\s+/g, " ").trim();

const tryExtractJson = (raw: string): unknown | null => {
    const normalized = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const objectMatch = normalized.match(/\{[\s\S]*\}/);
    if (!objectMatch) return null;
    try {
        return JSON.parse(objectMatch[0]) as unknown;
    } catch {
        return null;
    }
};

export const mapScoreToPrimaryHexModifier = (score: number): number => {
    const safeScore = clamp(Math.round(score), 0, 100);
    return clamp(Math.round((safeScore - 50) * (12 / 50)), -12, 12);
};

export const mapScoreToGlobalSubElementModifier = (score: number): number => {
    const safeScore = clamp(Math.round(score), 0, 100);
    return clamp(Math.round((safeScore - 50) * (22 / 50)), -22, 22);
};

export const buildNeutralCrisisAudioFallback = (
    targetElement: ElementKey,
    reason: string,
): CrisisAudioEvalFallback => ({
    reason,
    result: {
        speechAnalysis: {
            score: 50,
            briefingReport:
                "Directive coherence remains inconclusive under active interference. Tactical impact reduced to neutral baseline pending renewed transmission.",
            subscores: {
                thematicResonance: 50,
                rhetoricalConviction: 50,
                memeticViability: 50,
            },
        },
        impactCalculations: {
            targetElement,
            primaryHexModifier: 0,
            globalSubElementModifier: 0,
        },
    },
});

export const parseCrisisAudioEval = (
    raw: string,
    expectedElement: ElementKey,
): CrisisAudioEvalResult | null => {
    const candidate = tryExtractJson(raw);
    if (!candidate) return null;

    const parsed = rawSchema.safeParse(candidate);
    if (!parsed.success) return null;

    const score = clamp(Math.round(parsed.data.speech_analysis.score), 0, 100);
    const briefingReport = normalizeBriefing(
        parsed.data.speech_analysis.briefing_report,
    );
    if (!briefingReport) return null;

    const targetElement =
        labelToElement[parsed.data.impact_calculations.target_element] ??
        expectedElement;
    const resolvedTargetElement =
        targetElement === expectedElement ? targetElement : expectedElement;

    const primaryHexModifier = clamp(
        Math.round(parsed.data.impact_calculations.primary_hex_modifier),
        -12,
        12,
    );
    const globalSubElementModifier = clamp(
        Math.round(parsed.data.impact_calculations.global_sub_element_modifier),
        -22,
        22,
    );

    const derivedPrimary = mapScoreToPrimaryHexModifier(score);
    const derivedGlobal = mapScoreToGlobalSubElementModifier(score);

    return {
        speechAnalysis: {
            score,
            briefingReport,
            subscores: parsed.data.speech_analysis.subscores
                ? {
                      thematicResonance: clamp(
                          Math.round(
                              parsed.data.speech_analysis.subscores
                                  .thematic_resonance ?? score,
                          ),
                          0,
                          100,
                      ),
                      rhetoricalConviction: clamp(
                          Math.round(
                              parsed.data.speech_analysis.subscores
                                  .rhetorical_conviction ?? score,
                          ),
                          0,
                          100,
                      ),
                      memeticViability: clamp(
                          Math.round(
                              parsed.data.speech_analysis.subscores
                                  .memetic_viability ?? score,
                          ),
                          0,
                          100,
                      ),
                  }
                : undefined,
        },
        impactCalculations: {
            targetElement: resolvedTargetElement,
            primaryHexModifier:
                Math.abs(primaryHexModifier - derivedPrimary) > 2
                    ? derivedPrimary
                    : primaryHexModifier,
            globalSubElementModifier:
                Math.abs(globalSubElementModifier - derivedGlobal) > 3
                    ? derivedGlobal
                    : globalSubElementModifier,
        },
    };
};

export const elementLabelFromKey = (element: ElementKey): string =>
    elementToLabel[element];
