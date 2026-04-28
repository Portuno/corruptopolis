import type { ElementKey } from "@/game/types";
import { callGemini } from "@/lib/gemini";
import {
    buildCrisisAudioEvaluatorPrompt,
    buildCrisisAudioEvaluatorRepairPrompt,
} from "@/lib/crisis-evaluator-prompt";
import type { CrisisAudioEvalResult } from "@/lib/crisis-evaluator-types";
import {
    buildNeutralCrisisAudioFallback,
    parseCrisisAudioEval,
} from "@/lib/crisis-evaluator-validator";
import { logger } from "@/lib/logger";

interface EvaluateCrisisAudioDirectiveInput {
    apiKey: string;
    requestId: string;
    targetElement: ElementKey;
    crisisContext: string;
    transcript: string;
}

interface EvaluateCrisisAudioDirectiveResult {
    evalResult: CrisisAudioEvalResult;
    repaired: boolean;
    raw: string | null;
    callMeta: {
        status: number;
        model: string;
        latencyMs: number;
        error: string | null;
    };
}

export const evaluateCrisisAudioDirective = async ({
    apiKey,
    requestId,
    targetElement,
    crisisContext,
    transcript,
}: EvaluateCrisisAudioDirectiveInput): Promise<EvaluateCrisisAudioDirectiveResult> => {
    const firstPrompt = buildCrisisAudioEvaluatorPrompt({
        targetElement,
        crisisContext,
        transcript,
    });
    const first = await callGemini({
        apiKey,
        prompt: firstPrompt,
        maxOutputTokens: 220,
        temperature: 0.1,
        requestId,
    });

    const firstText = first.text ?? "";
    const firstParsed = parseCrisisAudioEval(firstText, targetElement);
    if (first.ok && firstParsed) {
        return {
            evalResult: firstParsed,
            repaired: false,
            raw: first.text,
            callMeta: {
                status: first.status,
                model: first.model,
                latencyMs: first.latencyMs,
                error: first.error,
            },
        };
    }

    const secondPrompt = buildCrisisAudioEvaluatorRepairPrompt(
        {
            targetElement,
            crisisContext,
            transcript,
        },
        firstText.slice(0, 700),
    );
    const second = await callGemini({
        apiKey,
        prompt: secondPrompt,
        maxOutputTokens: 220,
        temperature: 0,
        requestId,
    });
    const secondText = second.text ?? "";
    const secondParsed = parseCrisisAudioEval(secondText, targetElement);
    if (second.ok && secondParsed) {
        return {
            evalResult: secondParsed,
            repaired: true,
            raw: second.text,
            callMeta: {
                status: second.status,
                model: second.model,
                latencyMs: first.latencyMs + second.latencyMs,
                error: second.error,
            },
        };
    }

    logger.warn("crisis-service", "audio crisis parsing failed, using fallback", {
        requestId,
        targetElement,
        firstOk: first.ok,
        secondOk: second.ok,
    });
    const fallback = buildNeutralCrisisAudioFallback(
        targetElement,
        "Invalid evaluator payload",
    );
    return {
        evalResult: fallback.result,
        repaired: false,
        raw: second.text ?? first.text ?? null,
        callMeta: {
            status: second.status || first.status || 200,
            model: second.model || first.model || "",
            latencyMs: first.latencyMs + second.latencyMs,
            error: second.error ?? first.error ?? fallback.reason,
        },
    };
};
