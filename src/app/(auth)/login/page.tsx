"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";

const LoginPage = () => {
    const router = useRouter();
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [status, setStatus] = useState<string>("");
    const [isPending, setIsPending] = useState<boolean>(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsPending(true);
        setStatus("Signing in…");
        try {
            const supabase = createClient();
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                logger.warn("login", error.message);
                setStatus(error.message);
                return;
            }
            setStatus("Signed in. Redirecting…");
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
                        Operator Login
                    </h1>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Sign in to keep your match history across devices.
                    </p>
                </header>
                <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
                    <label className="flex flex-col gap-1 text-xs uppercase tracking-[2px]"
                        style={{ color: "var(--text-muted)" }}>
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
                    <label className="flex flex-col gap-1 text-xs uppercase tracking-[2px]"
                        style={{ color: "var(--text-muted)" }}>
                        Password
                        <input
                            type="password"
                            required
                            autoComplete="current-password"
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
                            background: "var(--accent-player)",
                            color: "#0b0e16",
                        }}
                    >
                        {isPending ? "…" : "Sign In"}
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
                <footer className="flex justify-between border-t border-[color:var(--border-subtle)] pt-3 text-xs"
                    style={{ color: "var(--text-muted)" }}>
                    <Link href="/signup" className="hover:underline">
                        Create account
                    </Link>
                    <Link href="/" className="hover:underline">
                        Back to game
                    </Link>
                </footer>
            </div>
        </main>
    );
};

export default LoginPage;
