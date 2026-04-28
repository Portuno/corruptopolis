"use client";

import { readLocalElevenKey } from "@/lib/local-keys";
import { logger } from "@/lib/logger";

export interface SpeakOptions {
    text: string;
    voiceId?: string;
}

export const speakViaProxy = async ({
    text,
    voiceId,
}: SpeakOptions): Promise<boolean> => {
    try {
        const clientKey = readLocalElevenKey() || undefined;
        const res = await fetch("/api/eleven/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, voiceId, clientKey }),
        });
        if (!res.ok) {
            logger.debug("speech", "tts proxy non-ok", { status: res.status });
            return false;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play().catch(() => undefined);
        return true;
    } catch (err) {
        logger.debug("speech", "tts proxy threw", {
            message: err instanceof Error ? err.message : String(err),
        });
        return false;
    }
};

export const transcribeBlob = async (
    blob: Blob,
    fileName: string,
    languageCode = "en",
): Promise<{ ok: boolean; text: string; error?: string }> => {
    try {
        const clientKey = readLocalElevenKey();
        const fd = new FormData();
        fd.append("file", blob, fileName);
        fd.append("language_code", languageCode);
        if (clientKey) fd.append("clientKey", clientKey);
        const res = await fetch("/api/eleven/stt", {
            method: "POST",
            body: fd,
        });
        const json = (await res.json().catch(() => ({}))) as {
            ok?: boolean;
            text?: string;
            error?: string;
            code?: string;
            hint?: string;
            requestId?: string;
        };
        if (!res.ok || !json.ok) {
            const message = json.error ?? `HTTP ${res.status}`;
            logger.warn("speech", "stt proxy non-ok", {
                status: res.status,
                code: json.code,
                requestId: json.requestId,
                message,
                hasClientKey: Boolean(clientKey),
                fileName,
                blobSizeBytes: blob.size,
                languageCode,
            });
            const details =
                json.code === "MISSING_ELEVEN_KEY"
                    ? `${message} ${json.hint ?? ""}`.trim()
                    : message;
            return {
                ok: false,
                text: "",
                error: json.requestId
                    ? `${details} (request: ${json.requestId})`
                    : details,
            };
        }
        logger.info("speech", "stt proxy success", {
            status: res.status,
            requestId: json.requestId,
            hasClientKey: Boolean(clientKey),
            fileName,
            blobSizeBytes: blob.size,
            languageCode,
        });
        return { ok: true, text: json.text ?? "" };
    } catch (err) {
        logger.warn("speech", "stt proxy threw", {
            message: err instanceof Error ? err.message : String(err),
            hasClientKey: Boolean(readLocalElevenKey()),
            fileName,
            blobSizeBytes: blob.size,
            languageCode,
        });
        return {
            ok: false,
            text: "",
            error: err instanceof Error ? err.message : String(err),
        };
    }
};

export const pickRecorderMime = (): string => {
    if (typeof MediaRecorder === "undefined") return "";
    const types = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
        "audio/mp4",
    ];
    return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
};
