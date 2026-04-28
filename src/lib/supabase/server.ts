import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { isSupabaseConfigured, publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

type CookieToSet = { name: string; value: string; options?: any };

export const createClient = async () => {
    if (!isSupabaseConfigured()) {
        throw new Error(
            "Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
        );
    }
    const cookieStore = await cookies();
    return createServerClient<Database>(
        publicEnv.NEXT_PUBLIC_SUPABASE_URL!,
        publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => cookieStore.getAll(),
                setAll: (cookiesToSet: CookieToSet[]) => {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    } catch {
                        /* called from a Server Component — refresh handled by middleware */
                    }
                },
            },
        },
    );
};

export const createServiceClient = () => {
    if (
        !isSupabaseConfigured() ||
        !serverEnv.SUPABASE_SERVICE_ROLE_KEY
    ) {
        throw new Error(
            "Service-role client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        );
    }
    return createServerClient<Database>(
        publicEnv.NEXT_PUBLIC_SUPABASE_URL!,
        serverEnv.SUPABASE_SERVICE_ROLE_KEY,
        {
            cookies: {
                getAll: () => [],
                setAll: () => {
                    /* service-role client never writes cookies */
                },
            },
        },
    );
};
