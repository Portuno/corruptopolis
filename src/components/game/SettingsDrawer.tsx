"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Settings, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import ThemeToggle from "@/components/theme/ThemeToggle";
import { DIFFICULTY_CONFIG } from "@/game/constants";
import { useGameStore } from "@/game/store";
import type { GameDifficulty, LivingHiveIntensity } from "@/game/types";
import { useUser } from "@/hooks/useUser";
import {
    readLocalElevenKey,
    readLocalGeminiKey,
    writeLocalElevenKey,
    writeLocalGeminiKey,
} from "@/lib/local-keys";

const LIVING_HIVE_LEVELS: LivingHiveIntensity[] = ["low", "medium", "high"];
const DIFFICULTY_LEVELS: GameDifficulty[] = ["easy", "medium", "hard"];

const SettingsDrawer = () => {
    const { user, supabaseEnabled, isAnonymous, signOut } = useUser();
    const [open, setOpen] = useState<boolean>(false);
    const [elevenKey, setElevenKey] = useState<string>("");
    const [geminiKey, setGeminiKey] = useState<string>("");
    const [saved, setSaved] = useState<string>("");
    const livingHiveEnabled = useGameStore((s) => s.livingHiveEnabled);
    const livingHiveIntensity = useGameStore((s) => s.livingHiveIntensity);
    const setLivingHiveEnabled = useGameStore((s) => s.setLivingHiveEnabled);
    const setLivingHiveIntensity = useGameStore((s) => s.setLivingHiveIntensity);
    const gameDifficulty = useGameStore((s) => s.gameDifficulty);
    const setGameDifficulty = useGameStore((s) => s.setGameDifficulty);

    useEffect(() => {
        if (!open) return;
        setElevenKey(readLocalElevenKey());
        setGeminiKey(readLocalGeminiKey());
    }, [open]);

    const handleSaveLocal = () => {
        writeLocalElevenKey(elevenKey);
        writeLocalGeminiKey(geminiKey);
        setSaved("Saved on this device.");
        window.setTimeout(() => setSaved(""), 1800);
    };

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
                <button
                    type="button"
                    aria-label="Open settings"
                    className="rounded border p-1.5 transition hover:opacity-80"
                    style={{
                        borderColor: "var(--border-mid)",
                        color: "var(--text-secondary)",
                    }}
                >
                    <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                <Dialog.Content
                    className="fixed right-0 top-0 z-50 flex h-full w-[min(92vw,360px)] flex-col gap-5 overflow-y-auto border-l p-5"
                    style={{
                        background: "var(--bg-panel)",
                        borderColor: "var(--border-mid)",
                    }}
                >
                    <div className="flex items-center justify-between">
                        <Dialog.Title
                            className="text-sm font-bold uppercase tracking-[3px]"
                            style={{ color: "var(--accent-player)" }}
                        >
                            Settings
                        </Dialog.Title>
                        <Dialog.Close
                            aria-label="Close settings"
                            className="rounded p-1 hover:bg-white/5"
                            style={{ color: "var(--text-muted)" }}
                        >
                            <X className="h-4 w-4" aria-hidden="true" />
                        </Dialog.Close>
                    </div>
                    <Dialog.Description className="sr-only">
                        Theme, API keys, and account.
                    </Dialog.Description>

                    <section className="flex flex-col gap-2">
                        <span
                            className="text-[10px] uppercase tracking-[3px]"
                            style={{ color: "var(--text-muted)" }}
                        >
                            Campaign Difficulty
                        </span>
                        <div
                            className="grid grid-cols-3 gap-2"
                            role="radiogroup"
                            aria-label="Campaign difficulty"
                        >
                            {DIFFICULTY_LEVELS.map((difficulty) => {
                                const config = DIFFICULTY_CONFIG[difficulty];
                                const isActive = gameDifficulty === difficulty;
                                return (
                                    <button
                                        key={difficulty}
                                        type="button"
                                        role="radio"
                                        aria-checked={isActive}
                                        aria-label={`Set difficulty to ${config.label}`}
                                        onClick={() => setGameDifficulty(difficulty)}
                                        className="rounded border px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[1.5px] transition"
                                        style={{
                                            borderColor: isActive
                                                ? "var(--accent-player)"
                                                : "var(--border-subtle)",
                                            background: isActive
                                                ? "var(--accent-player-bg)"
                                                : "transparent",
                                            color: isActive
                                                ? "var(--accent-player)"
                                                : "var(--text-secondary)",
                                        }}
                                    >
                                        {config.label}
                                        <span className="mt-0.5 block text-[9px] font-normal tracking-[1px]">
                                            {config.year} · EN AP {config.enemyAp}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <p
                            className="text-[11px]"
                            style={{ color: "var(--text-muted)" }}
                        >
                            Default is Medium (campaign year {DIFFICULTY_CONFIG.medium.year}).
                        </p>
                    </section>

                    <section className="flex flex-col gap-2">
                        <span
                            className="text-[10px] uppercase tracking-[3px]"
                            style={{ color: "var(--text-muted)" }}
                        >
                            Theme
                        </span>
                        <ThemeToggle />
                    </section>

                    <section className="flex flex-col gap-2">
                        <span
                            className="text-[10px] uppercase tracking-[3px]"
                            style={{ color: "var(--text-muted)" }}
                        >
                            Visual FX
                        </span>
                        <label
                            className="flex items-center justify-between rounded border px-3 py-2 text-[11px]"
                            style={{
                                borderColor: "var(--border-subtle)",
                                color: "var(--text-secondary)",
                            }}
                        >
                            <span>Living Hive board animation</span>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={livingHiveEnabled}
                                aria-label="Toggle living hive visual mode"
                                onClick={() => setLivingHiveEnabled(!livingHiveEnabled)}
                                className="relative inline-flex h-5 w-9 items-center rounded-full border transition"
                                style={{
                                    borderColor: livingHiveEnabled
                                        ? "var(--accent-player)"
                                        : "var(--border-subtle)",
                                    background: livingHiveEnabled
                                        ? "var(--accent-player-glow)"
                                        : "transparent",
                                }}
                            >
                                <span
                                    className="h-3.5 w-3.5 rounded-full transition"
                                    style={{
                                        transform: `translateX(${livingHiveEnabled ? "16px" : "2px"})`,
                                        background: livingHiveEnabled
                                            ? "var(--accent-player)"
                                            : "var(--text-muted)",
                                    }}
                                />
                            </button>
                        </label>
                        {livingHiveEnabled ? (
                            <div className="flex flex-col gap-1">
                                <span
                                    className="text-[10px] uppercase tracking-[2px]"
                                    style={{ color: "var(--text-muted)" }}
                                >
                                    Intensity
                                </span>
                                <div
                                    className="grid grid-cols-3 gap-2"
                                    role="radiogroup"
                                    aria-label="Living Hive intensity"
                                >
                                    {LIVING_HIVE_LEVELS.map((level) => {
                                        const isActive = livingHiveIntensity === level;
                                        return (
                                            <button
                                                key={level}
                                                type="button"
                                                role="radio"
                                                aria-checked={isActive}
                                                aria-label={`Set living hive intensity to ${level}`}
                                                onClick={() => setLivingHiveIntensity(level)}
                                                className="rounded border px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[2px] transition"
                                                style={{
                                                    borderColor: isActive
                                                        ? "var(--accent-player)"
                                                        : "var(--border-subtle)",
                                                    background: isActive
                                                        ? "var(--accent-player-bg)"
                                                        : "transparent",
                                                    color: isActive
                                                        ? "var(--accent-player)"
                                                        : "var(--text-secondary)",
                                                }}
                                            >
                                                {level}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : null}
                    </section>

                    <section className="flex flex-col gap-2">
                        <span
                            className="text-[10px] uppercase tracking-[3px]"
                            style={{ color: "var(--text-muted)" }}
                        >
                            Account
                        </span>
                        {!supabaseEnabled ? (
                            <p
                                className="rounded border p-2 text-[11px]"
                                style={{
                                    borderColor: "var(--border-subtle)",
                                    color: "var(--text-muted)",
                                }}
                            >
                                Supabase is not configured. Add the env vars in{" "}
                                <code>.env.local</code> to enable accounts and
                                history.
                            </p>
                        ) : isAnonymous ? (
                            <div className="flex flex-col gap-2 text-[11px]">
                                <p style={{ color: "var(--text-secondary)" }}>
                                    Playing anonymously. Linking an email
                                    preserves your match history.
                                </p>
                                <div className="flex gap-2">
                                    <Link
                                        href="/login"
                                        className="flex-1 rounded border px-3 py-1.5 text-center text-[10px] uppercase tracking-[2px]"
                                        style={{
                                            borderColor: "var(--border-mid)",
                                            color: "var(--accent-player)",
                                        }}
                                    >
                                        Sign in
                                    </Link>
                                    <Link
                                        href="/signup"
                                        className="flex-1 rounded px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-[2px]"
                                        style={{
                                            background:
                                                "var(--accent-confirm)",
                                            color: "#0b0e16",
                                        }}
                                    >
                                        Enlist
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 text-[11px]">
                                <p style={{ color: "var(--text-secondary)" }}>
                                    Signed in as {user?.email}.
                                </p>
                                <div className="flex gap-2">
                                    <Link
                                        href="/profile"
                                        className="flex-1 rounded border px-3 py-1.5 text-center text-[10px] uppercase tracking-[2px]"
                                        style={{
                                            borderColor: "var(--border-mid)",
                                            color: "var(--accent-player)",
                                        }}
                                    >
                                        Profile
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => signOut()}
                                        className="flex-1 rounded border px-3 py-1.5 text-[10px] uppercase tracking-[2px]"
                                        style={{
                                            borderColor: "var(--border-subtle)",
                                            color: "var(--text-muted)",
                                        }}
                                    >
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="flex flex-col gap-2">
                        <span
                            className="text-[10px] uppercase tracking-[3px]"
                            style={{ color: "var(--text-muted)" }}
                        >
                            Local API keys
                        </span>
                        <p
                            className="text-[11px]"
                            style={{ color: "var(--text-muted)" }}
                        >
                            Stored only on this device. Logged-in users can use
                            their <Link
                                href="/profile"
                                className="underline"
                                style={{ color: "var(--accent-player)" }}
                            >profile</Link> for per-account keys.
                        </p>
                        <label
                            className="flex flex-col gap-1 text-[10px] uppercase tracking-[2px]"
                            style={{ color: "var(--text-muted)" }}
                        >
                            ElevenLabs
                            <input
                                type="password"
                                value={elevenKey}
                                onChange={(e) => setElevenKey(e.target.value)}
                                className="rounded border bg-transparent px-2 py-1.5 font-mono text-xs normal-case tracking-normal text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent-player)]"
                                style={{
                                    borderColor: "var(--border-subtle)",
                                }}
                            />
                        </label>
                        <label
                            className="flex flex-col gap-1 text-[10px] uppercase tracking-[2px]"
                            style={{ color: "var(--text-muted)" }}
                        >
                            Gemini
                            <input
                                type="password"
                                value={geminiKey}
                                onChange={(e) => setGeminiKey(e.target.value)}
                                className="rounded border bg-transparent px-2 py-1.5 font-mono text-xs normal-case tracking-normal text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent-player)]"
                                style={{
                                    borderColor: "var(--border-subtle)",
                                }}
                            />
                        </label>
                        <div className="flex items-center justify-between gap-2">
                            <button
                                type="button"
                                onClick={handleSaveLocal}
                                className="rounded px-3 py-1.5 text-[10px] font-bold uppercase tracking-[2px]"
                                style={{
                                    background: "var(--accent-player)",
                                    color: "#0b0e16",
                                }}
                            >
                                Save keys
                            </button>
                            <span
                                className="text-[10px]"
                                style={{ color: "var(--text-secondary)" }}
                            >
                                {saved}
                            </span>
                        </div>
                    </section>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default SettingsDrawer;
