import { NextResponse } from "next/server";
import { z } from "zod";

import { recordApiLog } from "@/lib/api-log";
import { resolveElevenKey } from "@/lib/api-keys";
import { callElevenTts } from "@/lib/eleven";
import { logger } from "@/lib/logger";
import { newRequestId } from "@/lib/utils";

const bodySchema = z.object({
    text: z.string().min(1).max(500),
    voiceId: z.string().min(1).max(64).optional(),
    clientKey: z.string().max(200).optional(),
});

export const POST = async (request: Request) => {
    const requestId = newRequestId();
    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
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

    const { apiKey, userId } = await resolveElevenKey(parsed.data.clientKey);
    if (!apiKey) {
        const error =
            "No ElevenLabs API key available. Add one to your profile or set ELEVENLABS_API_KEY on the server.";
        logger.warn("api/eleven/tts", error, { requestId });
        return NextResponse.json(
            { ok: false, error, requestId },
            { status: 401 },
        );
    }

    const result = await callElevenTts({
        apiKey,
        text: parsed.data.text,
        voiceId: parsed.data.voiceId,
        requestId,
    });

    await recordApiLog({
        userId,
        route: "/api/eleven/tts",
        status: result.status,
        latencyMs: result.latencyMs,
        error: result.error,
        requestId,
    });

    if (!result.ok || !result.audio) {
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

    return new Response(result.audio, {
        status: 200,
        headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
            "X-Request-Id": requestId,
        },
    });
};
