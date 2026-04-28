"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";

const buildEmailRedirectUrl = (): string => {
    const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    const baseUrl =
        envSiteUrl && envSiteUrl.length > 0
            ? envSiteUrl
            : window.location.origin;

    return new URL("/auth/callback?next=/profile", baseUrl).toString();
};

const SignupPage = () => {
    const router = useRouter();
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [displayName, setDisplayName] = useState<string>("");
    const [status, setStatus] = useState<string>("");
    const [isPending, setIsPending] = useState<boolean>(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsPending(true);
        setStatus("Creating account…");
        try {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (user?.is_anonymous) {
                const { error: updateErr } = await supabase.auth.updateUser({
                    email,
                    password,
                    data: displayName ? { display_name: displayName } : undefined,
                });
                if (updateErr) {
                    logger.warn("signup", updateErr.message);
                    setStatus(updateErr.message);
                    return;
                }
                setStatus(
                    "Confirm the email we just sent — your match history is preserved.",
                );
                return;
            }

            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: displayName ? { display_name: displayName } : undefined,
                    emailRedirectTo: buildEmailRedirectUrl(),
                },
            });
            if (error) {
                logger.warn("signup", error.message);
                setStatus(error.message);
                return;
            }
            setStatus("Account created. Check your email if confirmation is enabled.");
            router.push("/profile");
            router.refresh();
        } finally {
            setIsPending(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center px-6 py-10">
            <div
                className="panel flex w-full max-w-md flex-col gap-5 rounded-md p-7"
                style={{ borderColor: "var(--border-mid)" }}
            >
                <header className="flex flex-col gap-1">
                    <h1
                        className="text-xl font-bold uppercase tracking-[3px]"
                        style={{ color: "var(--accent-player)" }}
                    >
                        Enlist
                    </h1>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Already playing anonymously? Linking an email upgrades your
                        current session — your matches stay attached to you.
                    </p>
                </header>
                <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
                    <label
                        className="flex flex-col gap-1 text-xs uppercase tracking-[2px]"
                        style={{ color: "var(--text-muted)" }}
                    >
                        Display name (optional)
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="rounded border bg-transparent px-3 py-2 font-mono text-sm normal-case tracking-normal text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent-player)]"
                            style={{ borderColor: "var(--border-subtle)" }}
                        />
                    </label>
                    <label
                        className="flex flex-col gap-1 text-xs uppercase tracking-[2px]"
                        style={{ color: "var(--text-muted)" }}
                    >
                        Email
                        <input
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="rounded border bg-transparent px-3 py-2 font-mono text-sm normal-case tracking-normal text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent-player)]"
                            style={{ borderColor: "var(--border-subtle)" }}
                        />
                    </label>
                    <label
                        className="flex flex-col gap-1 text-xs uppercase tracking-[2px]"
                        style={{ color: "var(--text-muted)" }}
                    >
                        Password
                        <input
                            type="password"
                            required
                            minLength={6}
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="rounded border bg-transparent px-3 py-2 font-mono text-sm normal-case tracking-normal text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent-player)]"
                            style={{ borderColor: "var(--border-subtle)" }}
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="mt-2 rounded px-4 py-2 text-sm font-bold uppercase tracking-[3px] disabled:opacity-50"
                        style={{
                            background: "var(--accent-confirm)",
                            color: "#0b0e16",
                        }}
                    >
                        {isPending ? "…" : "Create Account"}
                    </button>
                    {status ? (
                        <p
                            className="text-xs"
                            style={{ color: "var(--text-secondary)" }}
                        >
                            {status}
                        </p>
                    ) : null}
                </form>
                <footer
                    className="flex justify-between border-t border-[color:var(--border-subtle)] pt-3 text-xs"
                    style={{ color: "var(--text-muted)" }}
                >
                    <Link href="/login" className="hover:underline">
                        Already have an account?
                    </Link>
                    <Link href="/" className="hover:underline">
                        Back to game
                    </Link>
                </footer>
            </div>
        </main>
    );
};

export default SignupPage;
