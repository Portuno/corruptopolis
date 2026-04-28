import Link from "next/link";
import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { formatPercent } from "@/lib/utils";

import ProfileForm from "./ProfileForm";

export const dynamic = "force-dynamic";

const ProfilePage = async () => {
    if (!isSupabaseConfigured()) {
        return (
            <main className="flex min-h-screen items-center justify-center px-6 py-10">
                <div
                    className="panel max-w-md rounded-md p-6 text-sm"
                    style={{
                        borderColor: "var(--border-mid)",
                        color: "var(--text-secondary)",
                    }}
                >
                    Supabase is not configured. Add{" "}
                    <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                    <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
                    <code>.env.local</code> to enable accounts and history.
                    <div className="mt-4">
                        <Link
                            href="/"
                            className="text-xs uppercase tracking-[2px]"
                            style={{ color: "var(--accent-player)" }}
                        >
                            ← Back to game
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.is_anonymous) {
        redirect("/login");
    }

    const [profileRes, matchesRes] = await Promise.all([
        supabase
            .from("profiles" as any)
            .select("display_name, gemini_key_encrypted, eleven_key_encrypted")
            .eq("id", user.id)
            .maybeSingle(),
        supabase
            .from("matches" as any)
            .select(
                "id, started_at, ended_at, result, final_avg, districts_held, total_districts, epochs_played, cadence",
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50),
    ]);
    const profile =
        (profileRes.data as
            | Pick<
                  Database["public"]["Tables"]["profiles"]["Row"],
                  "display_name" | "gemini_key_encrypted" | "eleven_key_encrypted"
              >
            | null) ?? null;
    const matches =
        (matchesRes.data as
            | Array<
                  Pick<
                      Database["public"]["Tables"]["matches"]["Row"],
                      | "id"
                      | "started_at"
                      | "ended_at"
                      | "result"
                      | "final_avg"
                      | "districts_held"
                      | "total_districts"
                      | "epochs_played"
                      | "cadence"
                  >
              >
            | null) ?? [];

    const wins = matches?.filter((m) => m.result === "win").length ?? 0;
    const losses = matches?.filter((m) => m.result === "loss").length ?? 0;
    const abandoned =
        matches?.filter((m) => m.result === "abandoned").length ?? 0;
    const total = matches?.length ?? 0;
    const winRate = total === 0 ? 0 : wins / total;

    return (
        <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-8">
            <header className="flex items-center justify-between gap-4">
                <div>
                    <h1
                        className="text-xl font-bold uppercase tracking-[4px]"
                        style={{ color: "var(--accent-player)" }}
                    >
                        Operator Profile
                    </h1>
                    <p
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                    >
                        {profile?.display_name ?? user.email ?? "Anonymous"} ·{" "}
                        {user.email}
                    </p>
                </div>
                <Link
                    href="/"
                    className="rounded border px-3 py-1.5 text-[10px] uppercase tracking-[2px] hover:opacity-80"
                    style={{
                        borderColor: "var(--border-mid)",
                        color: "var(--accent-player)",
                    }}
                >
                    ← Back to game
                </Link>
            </header>

            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Total" value={String(total)} />
                <StatCard
                    label="Wins"
                    value={String(wins)}
                    color="var(--accent-confirm)"
                />
                <StatCard
                    label="Losses"
                    value={String(losses)}
                    color="var(--accent-enemy)"
                />
                <StatCard label="Win rate" value={formatPercent(winRate, 0)} />
            </section>

            <ProfileForm
                initialDisplayName={profile?.display_name ?? ""}
                hasGeminiKey={Boolean(profile?.gemini_key_encrypted)}
                hasElevenKey={Boolean(profile?.eleven_key_encrypted)}
            />

            <section className="flex flex-col gap-3">
                <h2
                    className="text-xs uppercase tracking-[3px]"
                    style={{ color: "var(--text-muted)" }}
                >
                    Recent campaigns ({total})
                </h2>
                {total === 0 ? (
                    <p
                        className="rounded border p-4 text-sm"
                        style={{
                            borderColor: "var(--border-subtle)",
                            color: "var(--text-secondary)",
                        }}
                    >
                        No campaigns yet. Run a simulation and your match will
                        appear here.
                    </p>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {matches?.map((m) => (
                            <li
                                key={m.id}
                                className="grid grid-cols-[110px_60px_1fr] items-center gap-3 rounded border px-3 py-2 text-xs sm:grid-cols-[180px_80px_1fr_120px]"
                                style={{
                                    borderColor: "var(--border-subtle)",
                                    color: "var(--text-secondary)",
                                }}
                            >
                                <span className="font-mono">
                                    {new Date(m.ended_at).toLocaleString()}
                                </span>
                                <span
                                    className="font-bold uppercase tracking-[2px]"
                                    style={{
                                        color:
                                            m.result === "win"
                                                ? "var(--accent-confirm)"
                                                : m.result === "loss"
                                                  ? "var(--accent-enemy)"
                                                  : "var(--text-muted)",
                                    }}
                                >
                                    {m.result}
                                </span>
                                <span>
                                    Dominance {formatPercent(m.final_avg, 1)} ·{" "}
                                    Districts {m.districts_held} / {m.total_districts} ·
                                    Epochs {m.epochs_played} / {m.cadence}
                                </span>
                                <span
                                    className="hidden font-mono text-[10px] sm:inline"
                                    style={{ color: "var(--text-muted)" }}
                                >
                                    #{m.id.slice(0, 8)}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
                {abandoned > 0 ? (
                    <p
                        className="text-[11px]"
                        style={{ color: "var(--text-muted)" }}
                    >
                        {abandoned} abandoned campaign(s) not counted in win
                        rate.
                    </p>
                ) : null}
            </section>
        </main>
    );
};

interface StatCardProps {
    label: string;
    value: string;
    color?: string;
}

const StatCard = ({ label, value, color }: StatCardProps) => (
    <div
        className="panel flex flex-col gap-1 rounded-md p-4"
        style={{ borderColor: "var(--border-subtle)" }}
    >
        <span
            className="text-[10px] uppercase tracking-[2px]"
            style={{ color: "var(--text-muted)" }}
        >
            {label}
        </span>
        <span
            className="text-2xl font-bold"
            style={{ color: color ?? "var(--text-primary)" }}
        >
            {value}
        </span>
    </div>
);

export default ProfilePage;
