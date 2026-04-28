export type Database = {
    public: {
        Enums: {
            match_result: "win" | "loss" | "abandoned";
            feedback_kind: "bug" | "idea" | "praise" | "other";
        };
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    display_name: string | null;
                    avatar_url: string | null;
                    gemini_key_encrypted: string | null;
                    eleven_key_encrypted: string | null;
                    created_at: string;
                };
                Insert: {
                    id: string;
                    display_name?: string | null;
                    avatar_url?: string | null;
                    gemini_key_encrypted?: string | null;
                    eleven_key_encrypted?: string | null;
                };
                Update: {
                    display_name?: string | null;
                    avatar_url?: string | null;
                    gemini_key_encrypted?: string | null;
                    eleven_key_encrypted?: string | null;
                };
                Relationships: [];
            };
            matches: {
                Row: {
                    id: string;
                    user_id: string;
                    started_at: string;
                    ended_at: string;
                    result: "win" | "loss" | "abandoned";
                    final_avg: number;
                    districts_held: number;
                    total_districts: number;
                    epochs_played: number;
                    cadence: number;
                    payload: Record<string, unknown> | null;
                    created_at: string;
                };
                Insert: {
                    user_id: string;
                    started_at: string;
                    ended_at: string;
                    result: Database["public"]["Enums"]["match_result"];
                    final_avg: number;
                    districts_held: number;
                    total_districts: number;
                    epochs_played: number;
                    cadence: number;
                    payload?: Record<string, unknown> | null;
                };
                Update: never;
                Relationships: [];
            };
            feedback: {
                Row: {
                    id: string;
                    user_id: string | null;
                    kind: Database["public"]["Enums"]["feedback_kind"];
                    message: string;
                    page: string | null;
                    user_agent: string | null;
                    created_at: string;
                };
                Insert: {
                    user_id?: string | null;
                    kind: Database["public"]["Enums"]["feedback_kind"];
                    message: string;
                    page?: string | null;
                    user_agent?: string | null;
                };
                Update: never;
                Relationships: [];
            };
            api_logs: {
                Row: {
                    id: string;
                    user_id: string | null;
                    route: string;
                    model: string | null;
                    status: number | null;
                    latency_ms: number | null;
                    error: string | null;
                    request_id: string | null;
                    created_at: string;
                };
                Insert: {
                    user_id?: string | null;
                    route: string;
                    model?: string | null;
                    status?: number | null;
                    latency_ms?: number | null;
                    error?: string | null;
                    request_id?: string | null;
                };
                Update: never;
                Relationships: [];
            };
        };
        Views: {
            profile_stats: {
                Row: {
                    user_id: string | null;
                    total_matches: number | null;
                    wins: number | null;
                    losses: number | null;
                    abandoned: number | null;
                    win_rate: number | null;
                };
            };
        };
        Functions: {
            linkidentity: {
                Args: Record<PropertyKey, never>;
                Returns: undefined;
            };
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};
