import { NextResponse } from "next/server";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { newRequestId } from "@/lib/utils";

const bodySchema = z.object({
    startedAt: z.string().datetime(),
    endedAt: z.string().datetime(),
    result: z.enum(["win", "loss", "abandoned"]),
    finalAvg: z.number().min(0).max(1),
    districtsHeld: z.number().int().min(0),
    totalDistricts: z.number().int().min(1),
    epochsPlayed: z.number().int().min(1).max(365),
    cadence: z.number().int().min(1).max(365),
    payload: z.record(z.unknown()).nullish(),
});

export const POST = async (request: Request) => {
    const requestId = newRequestId();
    if (!isSupabaseConfigured()) {
        return NextResponse.json(
            {
                ok: false,
                error: "Supabase is not configured. Match was not persisted.",
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
    if (!user) {
        return NextResponse.json(
            { ok: false, error: "Not authenticated", requestId },
            { status: 401 },
        );
    }

    const payload: Database["public"]["Tables"]["matches"]["Insert"] = {
        user_id: user.id,
        started_at: parsed.data.startedAt,
        ended_at: parsed.data.endedAt,
        result: parsed.data.result,
        final_avg: parsed.data.finalAvg,
        districts_held: parsed.data.districtsHeld,
        total_districts: parsed.data.totalDistricts,
        epochs_played: parsed.data.epochsPlayed,
        cadence: parsed.data.cadence,
        payload: parsed.data.payload ?? null,
    };
    const { data, error } = await (supabase.from("matches" as any) as any)
        .insert(payload)
        .select("id")
        .single();

    if (error) {
        logger.error("api/matches", "insert failed", {
            requestId,
            message: error.message,
        });
        return NextResponse.json(
            { ok: false, error: error.message, requestId },
            { status: 500 },
        );
    }

    logger.info("api/matches", "match saved", {
        requestId,
        matchId: (data as { id: string }).id,
        result: parsed.data.result,
    });

    return NextResponse.json({
        ok: true,
        id: (data as { id: string }).id,
        requestId,
    });
};
