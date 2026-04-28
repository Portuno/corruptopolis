import {
    hasServerElevenKey,
    hasServerGeminiKey,
    isSupabaseConfigured,
    serverEnv,
} from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export type KeySource = "user" | "env" | "none";

export interface ResolvedKey {
    apiKey: string | null;
    userId: string | null;
    source: KeySource;
}

const resolveFromProfile = async (
    column: "gemini_key_encrypted" | "eleven_key_encrypted",
): Promise<{ apiKey: string | null; userId: string | null }> => {
    if (!isSupabaseConfigured()) return { apiKey: null, userId: null };
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return { apiKey: null, userId: null };
        const { data: profile } = await supabase
            .from("profiles")
            .select(column)
            .eq("id", user.id)
            .maybeSingle();
        const apiKey = (profile as Record<string, string | null> | null)?.[
            column
        ];
        return { apiKey: apiKey ?? null, userId: user.id };
    } catch (err) {
        logger.warn("api-keys", "supabase user lookup failed", {
            message: err instanceof Error ? err.message : String(err),
        });
        return { apiKey: null, userId: null };
    }
};

export const resolveGeminiKey = async (
    clientKey?: string | null,
): Promise<ResolvedKey> => {
    const fromProfile = await resolveFromProfile("gemini_key_encrypted");
    if (fromProfile.apiKey) {
        return { ...fromProfile, source: "user" };
    }
    if (clientKey && clientKey.trim().length > 0) {
        return {
            apiKey: clientKey.trim(),
            userId: fromProfile.userId,
            source: "user",
        };
    }
    if (hasServerGeminiKey()) {
        return {
            apiKey: serverEnv.GEMINI_API_KEY!,
            userId: fromProfile.userId,
            source: "env",
        };
    }
    return { apiKey: null, userId: fromProfile.userId, source: "none" };
};

export const resolveElevenKey = async (
    clientKey?: string | null,
): Promise<ResolvedKey> => {
    const fromProfile = await resolveFromProfile("eleven_key_encrypted");
    if (fromProfile.apiKey) {
        return { ...fromProfile, source: "user" };
    }
    if (clientKey && clientKey.trim().length > 0) {
        return {
            apiKey: clientKey.trim(),
            userId: fromProfile.userId,
            source: "user",
        };
    }
    if (hasServerElevenKey()) {
        return {
            apiKey: serverEnv.ELEVENLABS_API_KEY!,
            userId: fromProfile.userId,
            source: "env",
        };
    }
    return { apiKey: null, userId: fromProfile.userId, source: "none" };
};
