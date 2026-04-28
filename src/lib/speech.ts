"use client";

import { readLocalElevenKey } from "@/lib/local-keys";
import { logger } from "@/lib/logger";

export interface SpeakOptions {
    text: string;
    voiceId?: string;
}

let activeAudio: HTMLAudioElement | null = null;
let activeAudioUrl: string | null = null;
let speakRequestSeq = 0;
let lastSpokenText = "";
let lastSpokenAt = 0;
const REPEAT_TEXT_COOLDOWN_MS = 9000;

const stopActiveSpeech = (): void => {
    if (activeAudio) {
        activeAudio.pause();
        activeAudio.currentTime = 0;
        activeAudio = null;
    }
    if (activeAudioUrl) {
        URL.revokeObjectURL(activeAudioUrl);
        activeAudioUrl = null;
    }
};

export const speakViaProxy = async ({
    text,
    voiceId,
}: SpeakOptions): Promise<boolean> => {
    const now = Date.now();
    const normalizedText = text.trim().toLowerCase();
    const isRepeatedRecently =
        normalizedText.length > 0 &&
        normalizedText === lastSpokenText &&
        now - lastSpokenAt < REPEAT_TEXT_COOLDOWN_MS;
    if (isRepeatedRecently) {
        return false;
    }

    const requestId = ++speakRequestSeq;
    stopActiveSpeech();
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

        // If another speak request started while this one was loading,
        // discard this audio so stale voice lines never overlap.
        if (requestId !== speakRequestSeq) {
            return false;
        }

        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        activeAudio = audio;
        activeAudioUrl = url;
        audio.onended = () => {
            if (activeAudio === audio) {
                activeAudio = null;
            }
            if (activeAudioUrl === url) {
                URL.revokeObjectURL(url);
                activeAudioUrl = null;
            }
        };
        await audio.play().catch(() => undefined);
        lastSpokenText = normalizedText;
        lastSpokenAt = Date.now();
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
