import { z } from "zod";

const normalizeSupabaseUrl = (value: string): string => {
    const trimmed = value.trim().replace(/\/+$/, "");
    return trimmed.replace(/\/(?:rest|auth)\/v1$/i, "");
};

const optionalNonEmptyString = z.preprocess(
    (value) =>
        typeof value === "string" && value.trim().length === 0
            ? undefined
            : value,
    z.string().min(1).optional(),
);

const serverSchema = z.object({
    SUPABASE_SERVICE_ROLE_KEY: optionalNonEmptyString,
    GEMINI_API_KEY: optionalNonEmptyString,
    GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
    ELEVENLABS_API_KEY: optionalNonEmptyString,
    ELEVENLABS_VOICE_ID: z.string().min(1).default("pNInz6obpgDQGcFmaJgB"),
    LOG_LEVEL: z
        .enum(["debug", "info", "warn", "error"])
        .default("info"),
    NEXT_PUBLIC_SITE_URL: z
        .string()
        .url()
        .default("http://localhost:3000"),
});

const publicSchema = z.object({
    NEXT_PUBLIC_SUPABASE_URL: z
        .string()
        .url()
        .transform(normalizeSupabaseUrl)
        .optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_SITE_URL: z
        .string()
        .url()
        .default("http://localhost:3000"),
});

const parsedServer = serverSchema.safeParse(process.env);
if (!parsedServer.success && typeof window === "undefined") {
    console.warn(
        "[env] Server env validation issued warnings:",
        parsedServer.error.flatten().fieldErrors,
    );
}

export const serverEnv = parsedServer.success
    ? parsedServer.data
    : serverSchema.parse({
          GEMINI_MODEL: "gemini-2.5-flash",
          ELEVENLABS_VOICE_ID: "pNInz6obpgDQGcFmaJgB",
          LOG_LEVEL: "info",
          NEXT_PUBLIC_SITE_URL:
              process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
      });

const parsedPublic = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

export const publicEnv = parsedPublic.success
    ? parsedPublic.data
    : publicSchema.parse({
          NEXT_PUBLIC_SITE_URL:
              process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
      });

export const isSupabaseConfigured = (): boolean =>
    Boolean(
        publicEnv.NEXT_PUBLIC_SUPABASE_URL &&
            publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );

export const hasServerGeminiKey = (): boolean =>
    Boolean(serverEnv.GEMINI_API_KEY);

export const hasServerElevenKey = (): boolean =>
    Boolean(serverEnv.ELEVENLABS_API_KEY);
