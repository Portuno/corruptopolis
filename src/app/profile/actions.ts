"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

const profileSchema = z.object({
    displayName: z.string().max(80).optional(),
    geminiKey: z.string().max(200).optional(),
    elevenKey: z.string().max(200).optional(),
});

export interface ProfileActionResult {
    ok: boolean;
    error?: string;
}

export const updateProfileAction = async (
    input: z.infer<typeof profileSchema>,
): Promise<ProfileActionResult> => {
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, error: "Invalid input" };
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.is_anonymous) {
        return { ok: false, error: "Sign in required" };
    }

    const update: Database["public"]["Tables"]["profiles"]["Update"] = {};
    if (parsed.data.displayName !== undefined) {
        update.display_name = parsed.data.displayName.trim() || null;
    }
    if (parsed.data.geminiKey !== undefined) {
        update.gemini_key_encrypted = parsed.data.geminiKey.trim() || null;
    }
    if (parsed.data.elevenKey !== undefined) {
        update.eleven_key_encrypted = parsed.data.elevenKey.trim() || null;
    }

    const { error } = await (supabase.from("profiles" as any) as any)
        .update(update)
        .eq("id", user.id);
    if (error) {
        logger.warn("profile.update", error.message);
        return { ok: false, error: error.message };
    }
    revalidatePath("/profile");
    return { ok: true };
};
