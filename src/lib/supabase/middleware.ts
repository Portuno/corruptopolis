import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

type CookieToSet = { name: string; value: string; options?: any };

export const updateSession = async (
    request: NextRequest,
): Promise<NextResponse> => {
    let response = NextResponse.next({ request });

    if (!isSupabaseConfigured()) {
        return response;
    }

    const supabase = createServerClient<Database>(
        publicEnv.NEXT_PUBLIC_SUPABASE_URL!,
        publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => request.cookies.getAll(),
                setAll: (cookiesToSet: CookieToSet[]) => {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value),
                    );
                    response = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options),
                    );
                },
            },
        },
    );

    await supabase.auth.getUser();
    return response;
};
