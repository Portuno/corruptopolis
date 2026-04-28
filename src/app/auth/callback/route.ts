import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const GET = async (request: Request) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const nextParam = url.searchParams.get("next");
    const next =
        nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
            ? nextParam
            : "/profile";

    if (code) {
        const supabase = await createClient();
        await supabase.auth.exchangeCodeForSession(code);
    }

    return NextResponse.redirect(new URL(next, url.origin));
};
