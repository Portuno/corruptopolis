import type { ElementKey } from "@/game/types";

export interface CrisisAudioEvalInput {
    targetElement: ElementKey;
    crisisContext: string;
    transcript: string;
}

export interface CrisisAudioEvalSubscores {
    thematicResonance: number;
    rhetoricalConviction: number;
    memeticViability: number;
}

export interface CrisisAudioEvalSpeechAnalysis {
    score: number;
    briefingReport: string;
    subscores?: CrisisAudioEvalSubscores;
}

export interface CrisisAudioImpactCalculations {
    targetElement: ElementKey;
    primaryHexModifier: number;
    globalSubElementModifier: number;
}

export interface CrisisAudioEvalResult {
    speechAnalysis: CrisisAudioEvalSpeechAnalysis;
    impactCalculations: CrisisAudioImpactCalculations;
}

export interface CrisisAudioEvalFallback {
    result: CrisisAudioEvalResult;
    reason: string;
}
