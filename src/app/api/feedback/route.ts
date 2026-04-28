import { NextResponse } from "next/server";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { newRequestId } from "@/lib/utils";

const bodySchema = z.object({
    kind: z.enum(["bug", "idea", "praise", "other"]),
    message: z.string().min(1).max(4000),
    page: z.string().max(500).optional(),
});

export const POST = async (request: Request) => {
    const requestId = newRequestId();
    if (!isSupabaseConfigured()) {
        logger.warn(
            "api/feedback",
            "Supabase not configured — feedback not persisted",
            { requestId },
        );
        return NextResponse.json(
            {
                ok: false,
                error: "Feedback storage is not configured.",
                requestId,
            },
            { status: 503 },
        );
    }

    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
        return NextResponse.json(
            {
                ok: false,
                error: "Invalid request body",
                issues: parsed.error.flatten(),
                requestId,
            },
            { status: 400 },
        );
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    const userAgent = request.headers.get("user-agent");

    const payload: Database["public"]["Tables"]["feedback"]["Insert"] = {
        user_id: user?.id ?? null,
        kind: parsed.data.kind,
        message: parsed.data.message,
        page: parsed.data.page ?? null,
        user_agent: userAgent,
    };
    const { error } = await (supabase.from("feedback" as any) as any).insert(
        payload,
    );

    if (error) {
        logger.error("api/feedback", "insert failed", {
            requestId,
            message: error.message,
        });
        return NextResponse.json(
            { ok: false, error: error.message, requestId },
            { status: 500 },
        );
    }

    logger.info("api/feedback", "received", {
        requestId,
        kind: parsed.data.kind,
        userId: user?.id ?? null,
    });

    return NextResponse.json({ ok: true, requestId });
};
