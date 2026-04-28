import { z } from "zod";

import type { ElementKey } from "@/game/types";

const FACTION_LABELS: Record<ElementKey, string> = {
    political: "Political",
    military: "Military",
    economic: "Economic",
    religious: "Religious",
    scientific: "Scientific",
    cultural: "Cultural",
};

const doctrineByFaction: Record<ElementKey, string> = {
    political:
        "power legitimacy, governance credibility, institutional trust, policy coherence, coalition incentives",
    military:
        "security, deterrence, readiness, command integrity, sacrifice, national defense credibility",
    economic:
        "inflation pressure, jobs, taxation burden, market stability, investment confidence, purchasing power",
    religious:
        "morality, tradition, family cohesion, sacred values, social order, community continuity",
    scientific:
        "evidence quality, methodological rigor, falsifiability, innovation capacity, technical feasibility",
    cultural:
        "identity, symbolic meaning, social belonging, narrative prestige, artistic expression, heritage continuity",
};

export interface IdeologicalEvalResult {
    clinicalAnalysis: string;
    modifier: number;
}

export const NEUTRAL_EVAL_RESULT: IdeologicalEvalResult = {
    clinicalAnalysis:
        "Message lacks persuasive precision, generating neutral reaction and minimal ideological movement in this faction.",
    modifier: 0,
};

const responseSchema = z
    .object({
        clinical_analysis: z.string().min(1),
        modifier: z.number().finite(),
    })
    .strict();

const clampModifier = (value: number): number => {
    const rounded = Math.round(value * 1000) / 1000;
    return Math.max(-1, Math.min(1, rounded));
};

const countWords = (value: string): number =>
    value
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;

const normalizeClinicalAnalysis = (raw: string): string => {
    const cleaned = raw.replace(/\s+/g, " ").trim();
    if (!cleaned) return NEUTRAL_EVAL_RESULT.clinicalAnalysis;
    return cleaned;
};

const tryExtractJsonObject = (raw: string): unknown | null => {
    const normalized = raw
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
    const objectMatch = normalized.match(/\{[\s\S]*\}/);
    if (!objectMatch) return null;
    try {
        return JSON.parse(objectMatch[0]) as unknown;
    } catch {
        return null;
    }
};

export const parseIdeologicalEval = (
    raw: string,
): IdeologicalEvalResult | null => {
    const candidate = tryExtractJsonObject(raw);
    if (!candidate) return null;
    const parsed = responseSchema.safeParse(candidate);
    if (!parsed.success) return null;

    const clinicalAnalysis = normalizeClinicalAnalysis(
        parsed.data.clinical_analysis,
    );
    if (countWords(clinicalAnalysis) !== 15) return null;

    return {
        clinicalAnalysis,
        modifier: clampModifier(parsed.data.modifier),
    };
};

export const buildIdeologicalPrompt = (
    faction: ElementKey,
    message: string,
): string => `SYSTEM ROLE
You are the Ideological Friction Evaluation Engine (Meme Warfare Center) for the political simulation game Corruptopolis.
Your task is NOT to converse with the player. Your task is to clinically and objectively evaluate the player's discursive tactics and estimate mathematical impact on voter affinity.

GAME CONTEXT
Corruptopolis is an asymmetric narrative-warfare simulation on a hexagonal map.
The player leads an insurgent meme campaign (MCO) against the ruling coalition, the Collaborative Corruption Matrix.

ALIGNMENT MODEL
Each hex has alignment in [0.00, 1.00]:
- 0.00 to 0.49 => establishment control
- 0.50 => neutrality
- 0.51 to 1.00 => player control

Each hex contains factions: Political, Military, Economic, Religious, Scientific, Cultural.
Each faction has a Weight Index in [1, 12].

TARGET INPUT
Target faction: ${FACTION_LABELS[faction]}
Faction priorities: ${doctrineByFaction[faction]}
Player discourse: "${message}"

EVALUATION DOCTRINE
Evaluate with four criteria:
1) Argument Logic
2) Memetic Inoculation
3) Ideological Friction
4) Demographic Resonance

DETERMINISTIC SCORING RUBRIC
Score each criterion from -1.0 to +1.0.
Use weighted sum:
- Argument Logic: 0.35
- Memetic Inoculation: 0.25
- Ideological Friction: 0.20
- Demographic Resonance: 0.20
Compute preliminary_modifier = weighted sum.
Then clamp modifier to [-1.0, 1.0] and round to 3 decimals.

OUTPUT CONTRACT (STRICT)
Return ONLY one JSON object and nothing else:
{
  "clinical_analysis": "exactly 15 words in English",
  "modifier": number
}

RULES
- No markdown
- No extra keys
- clinical_analysis must be exactly 15 words
- modifier must be a float in [-1.0, 1.0]`;

export const buildCrisisIdeologicalPrompt = (
    faction: ElementKey,
    crisisDescription: string,
    transcript: string,
): string => `SYSTEM ROLE
You are the Ideological Friction Evaluation Engine (Meme Warfare Center) for the political simulation game Corruptopolis.
Your task is NOT to converse with the player. Your task is to clinically and objectively evaluate the player's discursive tactics and estimate mathematical impact on voter affinity.

MISSION CONTEXT
This request is a crisis directive under active memetic pressure.
Target faction: ${FACTION_LABELS[faction]}
Faction priorities: ${doctrineByFaction[faction]}
Crisis brief: "${crisisDescription}"
Player directive transcript: "${transcript}"

EVALUATION DOCTRINE
Evaluate with four criteria:
1) Argument Logic
2) Memetic Inoculation
3) Ideological Friction
4) Demographic Resonance

DETERMINISTIC SCORING RUBRIC
Score each criterion from -1.0 to +1.0.
Use weighted sum:
- Argument Logic: 0.35
- Memetic Inoculation: 0.25
- Ideological Friction: 0.20
- Demographic Resonance: 0.20
Compute preliminary_modifier = weighted sum.
Then clamp modifier to [-1.0, 1.0] and round to 3 decimals.

OUTPUT CONTRACT (STRICT)
Return ONLY one JSON object and nothing else:
{
  "clinical_analysis": "exactly 15 words in English",
  "modifier": number
}

RULES
- No markdown
- No extra keys
- clinical_analysis must be exactly 15 words
- modifier must be a float in [-1.0, 1.0]`;

export const buildEvalRepairPrompt = (
    faction: ElementKey,
    message: string,
    invalidOutput: string,
): string => `Your previous answer violated schema requirements.
Repair the response for this same evaluation request.

Target faction: ${FACTION_LABELS[faction]}
Faction priorities: ${doctrineByFaction[faction]}
Player discourse: "${message}"
Invalid previous output: "${invalidOutput}"

Return ONLY strict JSON with this exact schema and no extra keys:
{
  "clinical_analysis": "exactly 15 words in English",
  "modifier": number
}

Rules:
- modifier must be a float in [-1.0, 1.0]
- clinical_analysis must contain exactly 15 words
- no markdown, no commentary, no surrounding text`;
