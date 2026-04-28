import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

const ELEVEN_BASE = "https://api.elevenlabs.io/v1";

export interface TtsResult {
    ok: boolean;
    status: number;
    audio: ArrayBuffer | null;
    error: string | null;
    latencyMs: number;
}

export const callElevenTts = async (params: {
    apiKey: string;
    text: string;
    voiceId?: string;
    requestId?: string;
}): Promise<TtsResult> => {
    const voice = params.voiceId ?? serverEnv.ELEVENLABS_VOICE_ID;
    const start = Date.now();
    try {
        const res = await fetch(`${ELEVEN_BASE}/text-to-speech/${voice}`, {
            method: "POST",
            headers: {
                Accept: "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": params.apiKey,
            },
            body: JSON.stringify({
                text: params.text,
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.6,
                },
            }),
        });
        const latencyMs = Date.now() - start;
        if (!res.ok) {
            const error = await res.text().catch(() => `HTTP ${res.status}`);
            logger.error("eleven-tts", "upstream error", {
                requestId: params.requestId,
                status: res.status,
                latencyMs,
                error,
            });
            return {
                ok: false,
                status: res.status,
                audio: null,
                error,
                latencyMs,
            };
        }
        const audio = await res.arrayBuffer();
        logger.info("eleven-tts", "ok", {
            requestId: params.requestId,
            status: res.status,
            latencyMs,
            bytes: audio.byteLength,
        });
        return {
            ok: true,
            status: res.status,
            audio,
            error: null,
            latencyMs,
        };
    } catch (err) {
        const latencyMs = Date.now() - start;
        const message = err instanceof Error ? err.message : String(err);
        logger.error("eleven-tts", "fetch failed", {
            requestId: params.requestId,
            latencyMs,
            error: message,
        });
        return {
            ok: false,
            status: 0,
            audio: null,
            error: message,
            latencyMs,
        };
    }
};

export interface SttResult {
    ok: boolean;
    status: number;
    text: string | null;
    error: string | null;
    latencyMs: number;
}

export const callElevenStt = async (params: {
    apiKey: string;
    file: Blob;
    fileName: string;
    languageCode?: string;
    requestId?: string;
}): Promise<SttResult> => {
    const start = Date.now();
    try {
        const fd = new FormData();
        fd.append("file", params.file, params.fileName);
        fd.append("model_id", "scribe_v1");
        if (params.languageCode) {
            fd.append("language_code", params.languageCode);
        }
        const res = await fetch(`${ELEVEN_BASE}/speech-to-text`, {
            method: "POST",
            headers: { "xi-api-key": params.apiKey },
            body: fd,
        });
        const latencyMs = Date.now() - start;
        if (!res.ok) {
            const error = await res.text().catch(() => `HTTP ${res.status}`);
            logger.error("eleven-stt", "upstream error", {
                requestId: params.requestId,
                status: res.status,
                latencyMs,
                error,
            });
            return {
                ok: false,
                status: res.status,
                text: null,
                error,
                latencyMs,
            };
        }
        const json = (await res.json()) as { text?: string };
        const text = (json.text ?? "").trim();
        logger.info("eleven-stt", "ok", {
            requestId: params.requestId,
            status: res.status,
            latencyMs,
            chars: text.length,
        });
        return {
            ok: true,
            status: res.status,
            text,
            error: null,
            latencyMs,
        };
    } catch (err) {
        const latencyMs = Date.now() - start;
        const message = err instanceof Error ? err.message : String(err);
        logger.error("eleven-stt", "fetch failed", {
            requestId: params.requestId,
            latencyMs,
            error: message,
        });
        return {
            ok: false,
            status: 0,
            text: null,
            error: message,
            latencyMs,
        };
    }
};
