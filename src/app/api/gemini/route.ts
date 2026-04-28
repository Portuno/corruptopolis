import { NextResponse } from "next/server";
import { z } from "zod";

import { recordApiLog } from "@/lib/api-log";
import { resolveGeminiKey } from "@/lib/api-keys";
import { evaluateCrisisAudioDirective } from "@/lib/crisis-service";
import { serverEnv } from "@/lib/env";
import { callGemini } from "@/lib/gemini";
import {
    buildEvalRepairPrompt,
    buildIdeologicalPrompt,
    NEUTRAL_EVAL_RESULT,
    parseIdeologicalEval,
} from "@/lib/ideological-evaluator";
import { logger } from "@/lib/logger";
import { newRequestId } from "@/lib/utils";

const FACTION = z.enum([
    "political",
    "military",
    "economic",
    "religious",
    "scientific",
    "cultural",
]);

const bodySchema = z.intersection(
    z.object({ clientKey: z.string().max(200).optional() }),
    z.discriminatedUnion("intent", [
        z.object({
            intent: z.literal("voice_command"),
            transcript: z.string().min(1).max(500),
        }),
        z.object({
            intent: z.literal("faction_message"),
            faction: FACTION,
            message: z.string().min(1).max(1000),
        }),
        z.object({
            intent: z.literal("crisis_response"),
            faction: FACTION,
            crisisDescription: z.string().min(1).max(1200),
            transcript: z.string().min(1).max(2000),
        }),
    ]),
);

type Body = z.infer<typeof bodySchema>;

interface FactionEvalResult {
    modifier: number;
    clinicalAnalysis: string;
    raw: string | null;
    repaired: boolean;
    callMeta: {
        status: number;
        model: string;
        latencyMs: number;
        error: string | null;
    };
}

interface CrisisIdeologicalResult {
    score: number;
    briefingReport: string;
    primaryHexModifier: number;
    globalSubElementModifier: number;
    targetElement: z.infer<typeof FACTION>;
    raw: string | null;
    callMeta: {
        status: number;
        model: string;
        latencyMs: number;
        error: string | null;
    };
}

const buildPrompt = (
    body: Body,
): { prompt: string; maxTokens: number; temperature: number } => {
    if (body.intent === "voice_command") {
        return {
            prompt:
                `You are the strategic AI for Corruptópolis, a political simulation. ` +
                `Player voice input: "${body.transcript}". ` +
                `Reply with exactly one of: "END_EPOCH", "MEMETIC_STRIKE", "FORTIFY", "ASTROTURFING", "DEEPFAKE", ` +
                `or "COMMENT: [one tactical sentence, max 12 words]". Reply only that.`,
            maxTokens: 30,
            temperature: 0.2,
        };
    }

    if (body.intent === "faction_message") {
        return {
            prompt: buildIdeologicalPrompt(body.faction, body.message),
            maxTokens: 120,
            temperature: 0.1,
        };
    }

    return {
        prompt:
            `You are the strategic AI for Corruptópolis. ` +
            `Analyze the player's crisis response transcript and return one short tactical sentence. ` +
            `Faction: "${body.faction}". ` +
            `Crisis: "${body.crisisDescription}". ` +
            `Transcript: "${body.transcript}".`,
        maxTokens: 120,
        temperature: 0.1,
    };
};

const evaluateFactionMessage = async (
    body: Extract<Body, { intent: "faction_message" }>,
    apiKey: string,
    requestId: string,
): Promise<FactionEvalResult> => {
    const initialPrompt = buildIdeologicalPrompt(body.faction, body.message);
    const first = await callGemini({
        apiKey,
        prompt: initialPrompt,
        maxOutputTokens: 120,
        temperature: 0.1,
        requestId,
    });
    const firstText = first.text ?? "";
    const firstParsed = parseIdeologicalEval(firstText);
    if (first.ok && firstParsed) {
        return {
            modifier: firstParsed.modifier,
            clinicalAnalysis: firstParsed.clinicalAnalysis,
            raw: first.text,
            repaired: false,
            callMeta: {
                status: first.status,
                model: first.model,
                latencyMs: first.latencyMs,
                error: first.error,
            },
        };
    }

    const repairPrompt = buildEvalRepairPrompt(
        body.faction,
        body.message,
        firstText.slice(0, 500),
    );
    const second = await callGemini({
        apiKey,
        prompt: repairPrompt,
        maxOutputTokens: 120,
        temperature: 0,
        requestId,
    });
    const secondText = second.text ?? "";
    const secondParsed = parseIdeologicalEval(secondText);
    if (second.ok && secondParsed) {
        return {
            modifier: secondParsed.modifier,
            clinicalAnalysis: secondParsed.clinicalAnalysis,
            raw: second.text,
            repaired: true,
            callMeta: {
                status: second.status,
                model: second.model,
                latencyMs: first.latencyMs + second.latencyMs,
                error: second.error,
            },
        };
    }

    logger.warn("api/gemini", "faction_message parse failed; using fallback", {
        requestId,
        firstOk: first.ok,
        secondOk: second.ok,
        firstPreview: firstText.slice(0, 220),
        secondPreview: secondText.slice(0, 220),
    });
    return {
        modifier: NEUTRAL_EVAL_RESULT.modifier,
        clinicalAnalysis: NEUTRAL_EVAL_RESULT.clinicalAnalysis,
        raw: second.text ?? first.text ?? null,
        repaired: false,
        callMeta: {
            status: second.status || first.status || 200,
            model: second.model || first.model || serverEnv.GEMINI_MODEL,
            latencyMs: first.latencyMs + second.latencyMs,
            error: second.error ?? first.error,
        },
    };
};

const evaluateCrisisResponse = async (
    body: Extract<Body, { intent: "crisis_response" }>,
    apiKey: string,
    requestId: string,
): Promise<CrisisIdeologicalResult> => {
    const evalResponse = await evaluateCrisisAudioDirective({
        apiKey,
        requestId,
        targetElement: body.faction,
        crisisContext: body.crisisDescription,
        transcript: body.transcript,
    });
    return {
        score: evalResponse.evalResult.speechAnalysis.score,
        briefingReport: evalResponse.evalResult.speechAnalysis.briefingReport,
        primaryHexModifier:
            evalResponse.evalResult.impactCalculations.primaryHexModifier,
        globalSubElementModifier:
            evalResponse.evalResult.impactCalculations.globalSubElementModifier,
        targetElement: evalResponse.evalResult.impactCalculations.targetElement,
        raw: evalResponse.raw,
        callMeta: {
            status: evalResponse.callMeta.status,
            model: evalResponse.callMeta.model || serverEnv.GEMINI_MODEL,
            latencyMs: evalResponse.callMeta.latencyMs,
            error: evalResponse.callMeta.error,
        },
    };
};

export const POST = async (request: Request) => {
    const requestId = newRequestId();
    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
        logger.warn("api/gemini", "invalid body", {
            requestId,
            issues: parsed.error.flatten(),
        });
        return NextResponse.json(
            {
                ok: false,
                error: "Invalid request body",
                issues: parsed.error.flatten(),
                requestId,
            },
            { status: 400 },
        );
    }

    const body = parsed.data as Body & { clientKey?: string };
    const { apiKey, userId, source } = await resolveGeminiKey(body.clientKey);
    if (!apiKey) {
        const error =
            "No Gemini API key available. Add one to your profile or set GEMINI_API_KEY on the server.";
        logger.warn("api/gemini", error, { requestId });
        await recordApiLog({
            userId,
            route: "/api/gemini",
            model: serverEnv.GEMINI_MODEL,
            status: 401,
            error,
            requestId,
        });
        return NextResponse.json(
            { ok: false, error, requestId },
            { status: 401 },
        );
    }

    let result = null as Awaited<ReturnType<typeof callGemini>> | null;
    let factionEval: FactionEvalResult | null = null;
    let crisisEval: CrisisIdeologicalResult | null = null;
    if (body.intent === "faction_message") {
        factionEval = await evaluateFactionMessage(body, apiKey, requestId);
        result = {
            ok: true,
            status: factionEval.callMeta.status,
            text: factionEval.raw,
            raw: null,
            error: factionEval.callMeta.error,
            latencyMs: factionEval.callMeta.latencyMs,
            model: factionEval.callMeta.model,
        };
    } else if (body.intent === "crisis_response") {
        crisisEval = await evaluateCrisisResponse(body, apiKey, requestId);
        result = {
            ok: true,
            status: crisisEval.callMeta.status,
            text: crisisEval.raw,
            raw: null,
            error: crisisEval.callMeta.error,
            latencyMs: crisisEval.callMeta.latencyMs,
            model: crisisEval.callMeta.model,
        };
    } else {
        const { prompt, maxTokens, temperature } = buildPrompt(body);
        result = await callGemini({
            apiKey,
            prompt,
            maxOutputTokens: maxTokens,
            temperature,
            requestId,
        });
    }

    await recordApiLog({
        userId,
        route: "/api/gemini",
        model: result.model,
        status: result.status,
        latencyMs: result.latencyMs,
        error: result.error,
        requestId,
    });

    if (!result.ok) {
        return NextResponse.json(
            {
                ok: false,
                error: result.error,
                status: result.status,
                requestId,
            },
            { status: result.status === 401 || result.status === 403 ? 401 : 502 },
        );
    }

    const responsePayload: Record<string, unknown> = {
        ok: true,
        text: result.text,
        intent: body.intent,
        keySource: source,
        latencyMs: result.latencyMs,
        model: result.model,
        requestId,
    };

    if (body.intent === "faction_message" && factionEval) {
        responsePayload.modifier = factionEval.modifier;
        responsePayload.clinicalAnalysis = factionEval.clinicalAnalysis;
    }

    if (body.intent === "crisis_response" && crisisEval) {
        responsePayload.score = crisisEval.score;
        responsePayload.briefingReport = crisisEval.briefingReport;
        responsePayload.targetElement = crisisEval.targetElement;
        responsePayload.primaryHexModifier = crisisEval.primaryHexModifier;
        responsePayload.globalSubElementModifier =
            crisisEval.globalSubElementModifier;
    }

    return NextResponse.json(responsePayload);
};
