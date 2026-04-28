"use client";

import { createBrowserClient } from "@supabase/ssr";

import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

export const createClient = () => {
    if (!isSupabaseConfigured()) {
        throw new Error(
            "Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
        );
    }
    return createBrowserClient<Database>(
        publicEnv.NEXT_PUBLIC_SUPABASE_URL!,
        publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
};
