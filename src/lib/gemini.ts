import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

export interface GeminiCallOptions {
    apiKey: string;
    model?: string;
    prompt: string;
    maxOutputTokens?: number;
    temperature?: number;
    requestId?: string;
}

export interface GeminiCallResult {
    ok: boolean;
    status: number;
    text: string | null;
    raw: unknown;
    error: string | null;
    latencyMs: number;
    model: string;
}

export const callGemini = async (
    opts: GeminiCallOptions,
): Promise<GeminiCallResult> => {
    const model = opts.model ?? serverEnv.GEMINI_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${opts.apiKey}`;
    const start = Date.now();

    logger.debug("gemini", "calling Gemini", {
        requestId: opts.requestId,
        model,
        promptPreview: opts.prompt.slice(0, 120),
    });

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: opts.prompt }] }],
                generationConfig: {
                    maxOutputTokens: opts.maxOutputTokens ?? 60,
                    temperature: opts.temperature ?? 0.3,
                },
            }),
        });

        const latencyMs = Date.now() - start;
        const raw = await res.json().catch(() => ({}));
        const text =
            (raw as {
                candidates?: Array<{
                    content?: { parts?: Array<{ text?: string }> };
                }>;
            }).candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;

        if (!res.ok) {
            const errorMsg =
                (raw as { error?: { message?: string } }).error?.message ??
                `HTTP ${res.status}`;
            logger.error("gemini", "upstream error", {
                requestId: opts.requestId,
                model,
                status: res.status,
                latencyMs,
                error: errorMsg,
            });
            return {
                ok: false,
                status: res.status,
                text: null,
                raw,
                error: errorMsg,
                latencyMs,
                model,
            };
        }

        logger.info("gemini", "ok", {
            requestId: opts.requestId,
            model,
            status: res.status,
            latencyMs,
            chars: text?.length ?? 0,
        });

        return {
            ok: true,
            status: res.status,
            text,
            raw,
            error: null,
            latencyMs,
            model,
        };
    } catch (err) {
        const latencyMs = Date.now() - start;
        const message = err instanceof Error ? err.message : String(err);
        logger.error("gemini", "fetch failed", {
            requestId: opts.requestId,
            model,
            latencyMs,
            error: message,
        });
        return {
            ok: false,
            status: 0,
            text: null,
            raw: null,
            error: message,
            latencyMs,
            model,
        };
    }
};
