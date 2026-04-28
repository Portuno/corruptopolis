interface ApiLogInput {
    userId?: string | null;
    route: string;
    model?: string | null;
    status?: number | null;
    latencyMs?: number | null;
    error?: string | null;
    requestId?: string | null;
}

export const recordApiLog = async (_entry: ApiLogInput): Promise<void> => {
    // Intentionally disabled for now: API logs stay in server console only.
};
