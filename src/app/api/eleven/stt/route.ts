import { NextResponse } from "next/server";

import { recordApiLog } from "@/lib/api-log";
import { resolveElevenKey } from "@/lib/api-keys";
import { callElevenStt } from "@/lib/eleven";
import { logger } from "@/lib/logger";
import { newRequestId } from "@/lib/utils";

const MAX_FILE_BYTES = 6 * 1024 * 1024; // 6 MB cap

export const POST = async (request: Request) => {
    const requestId = newRequestId();
    let formData: FormData;
    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json(
            { ok: false, error: "Expected multipart/form-data", requestId },
            { status: 400 },
        );
    }

    const file = formData.get("file");
    if (!(file instanceof Blob)) {
        return NextResponse.json(
            { ok: false, error: "Missing 'file' field", requestId },
            { status: 400 },
        );
    }
    if (file.size === 0 || file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
            { ok: false, error: "File size out of range", requestId },
            { status: 400 },
        );
    }

    const fileName =
        typeof formData.get("fileName") === "string"
            ? (formData.get("fileName") as string)
            : "audio.webm";
    const languageCode =
        typeof formData.get("language_code") === "string"
            ? (formData.get("language_code") as string)
            : "en";
    const clientKey =
        typeof formData.get("clientKey") === "string"
            ? (formData.get("clientKey") as string)
            : undefined;

    const { apiKey, userId, source } = await resolveElevenKey(clientKey);
    if (!apiKey) {
        const error =
            "No ElevenLabs API key available. Add one to your profile or set ELEVENLABS_API_KEY on the server.";
        logger.warn("api/eleven/stt", error, {
            requestId,
            keySource: source,
            hasClientKey: Boolean(clientKey?.trim()),
            fileName,
            fileSizeBytes: file.size,
            languageCode,
        });
        await recordApiLog({
            userId,
            route: "/api/eleven/stt",
            status: 401,
            error,
            requestId,
        });
        return NextResponse.json(
            {
                ok: false,
                error,
                code: "MISSING_ELEVEN_KEY",
                hint: "Configure ElevenLabs in Profile > API Keys or set ELEVENLABS_API_KEY on the server.",
                keySource: source,
                requestId,
            },
            { status: 401 },
        );
    }

    const result = await callElevenStt({
        apiKey,
        file,
        fileName,
        languageCode,
        requestId,
    });

    await recordApiLog({
        userId,
        route: "/api/eleven/stt",
        status: result.status,
        latencyMs: result.latencyMs,
        error: result.error,
        requestId,
    });

    if (!result.ok) {
        logger.warn("api/eleven/stt", "provider transcription failed", {
            requestId,
            keySource: source,
            status: result.status,
            latencyMs: result.latencyMs,
            error: result.error,
            fileName,
            fileSizeBytes: file.size,
            languageCode,
        });
        return NextResponse.json(
            {
                ok: false,
                error: result.error,
                code: "ELEVEN_STT_FAILED",
                status: result.status,
                requestId,
            },
            { status: result.status === 401 || result.status === 403 ? 401 : 502 },
        );
    }

    logger.info("api/eleven/stt", "transcription success", {
        requestId,
        keySource: source,
        status: result.status,
        latencyMs: result.latencyMs,
        fileName,
        fileSizeBytes: file.size,
        languageCode,
    });

    return NextResponse.json({
        ok: true,
        text: result.text,
        latencyMs: result.latencyMs,
        keySource: source,
        requestId,
    });
};
