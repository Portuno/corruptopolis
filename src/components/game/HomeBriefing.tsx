"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { GAME_LORE, GAME_MECHANICS } from "@/game/info";
import { useGameStore } from "@/game/store";
import {
    hasAnyLocalKey,
    readLocalElevenKey,
    readLocalGeminiKey,
    writeLocalElevenKey,
    writeLocalGeminiKey,
} from "@/lib/local-keys";
import homeImage from "../../../docs/corruptopolisHome.png";

type HomePanel = "settings" | "archives" | null;
type AiKeyMode = "system" | "personal";

interface CadenceOption {
    turns: number;
    label: string;
    description: string;
    locked?: boolean;
}

const CADENCES: CadenceOption[] = [
    {
        turns: 12,
        label: "Default",
        description: "12 epochs · standard simulation",
    },
    {
        turns: 6,
        label: "Sprint",
        description: "Compressed campaign · prototype",
        locked: true,
    },
    {
        turns: 24,
        label: "Marathon",
        description: "Extended cycle · prototype",
        locked: true,
    },
];

const HomeBriefing = () => {
    const router = useRouter();
    const launchGame = useGameStore((s) => s.launchGame);
    const selectedCadence = useGameStore((s) => s.selectedCadence);
    const selectCadence = useGameStore((s) => s.selectCadence);
    const [activePanel, setActivePanel] = useState<HomePanel>(null);
    const [aiKeyMode, setAiKeyMode] = useState<AiKeyMode>("system");
    const [elevenKey, setElevenKey] = useState<string>("");
    const [geminiKey, setGeminiKey] = useState<string>("");
    const [isLaunching, setIsLaunching] = useState<boolean>(false);

    useEffect(() => {
        const localEleven = readLocalElevenKey();
        const localGemini = readLocalGeminiKey();
        setElevenKey(localEleven);
        setGeminiKey(localGemini);
        setAiKeyMode(hasAnyLocalKey() ? "personal" : "system");
    }, []);

    const handleStartCorrupting = () => {
        if (isLaunching) return;
        if (aiKeyMode === "personal") {
            writeLocalElevenKey(elevenKey);
            writeLocalGeminiKey(geminiKey);
        } else {
            writeLocalElevenKey("");
            writeLocalGeminiKey("");
        }
        if (selectedCadence !== 12) {
            selectCadence(12);
        }
        setIsLaunching(true);
        launchGame();
        router.push("/game");
    };

    return (
        <div className="relative min-h-dvh w-full bg-black text-slate-200">
            <div className="relative mx-auto aspect-[1472/832] w-full max-w-[1600px]">
                <Image
                    src={homeImage}
                    alt="Corruptópolis home screen with retro control panels"
                    fill
                    priority
                    className="object-contain"
                />

                <button
                    type="button"
                    aria-label="Open Intel Archives"
                    onClick={() => setActivePanel("archives")}
                    className="absolute left-[9.2%] top-[80.4%] h-[17.3%] w-[16.2%] rounded-md focus:outline-none"
                />

                <button
                    type="button"
                    aria-label="Start corrupting and begin the game"
                    onClick={handleStartCorrupting}
                    disabled={isLaunching}
                    className="absolute bottom-[3.6%] left-[40.7%] h-[12.8%] w-[24.5%] rounded-md focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
                />

                <button
                    type="button"
                    aria-label="Open settings"
                    onClick={() => setActivePanel("settings")}
                    className="absolute bottom-[3.6%] left-[64.2%] h-[12.8%] w-[17.5%] rounded-md focus:outline-none"
                />

                <span
                    aria-hidden="true"
                    className="absolute bottom-[4.4%] left-[28.2%] h-[11.6%] w-[14.4%]"
                />
                <span
                    aria-hidden="true"
                    className="absolute bottom-[4.4%] left-[82.3%] h-[11.6%] w-[11%]"
                />
            </div>

            {activePanel ? (
                <div
                    className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 p-4"
                    onMouseDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        setActivePanel(null);
                    }}
                >
                    <div className="w-full max-w-3xl rounded-lg border border-slate-700 bg-slate-950/95 p-4 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xs font-semibold uppercase tracking-[3px] text-slate-300">
                                {activePanel === "settings"
                                    ? "System Settings"
                                    : "Inter Archives"}
                            </h2>
                            <button
                                type="button"
                                aria-label="Close panel"
                                onClick={() => setActivePanel(null)}
                                className="rounded border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-[2px] text-slate-300 transition hover:border-amber-300 hover:text-amber-200"
                            >
                                Close
                            </button>
                        </div>

                        {activePanel === "archives" ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <section className="rounded border border-slate-700/80 bg-slate-900/60 p-3">
                                    <h3 className="text-[10px] uppercase tracking-[3px] text-slate-400">
                                        Operational Lore
                                    </h3>
                                    <ul className="mt-2 space-y-2 text-xs text-slate-200">
                                        {GAME_LORE.slice(0, 3).map((entry) => (
                                            <li key={entry.name}>
                                                <span className="font-semibold text-amber-200">
                                                    {entry.name}
                                                </span>
                                                {" — "}
                                                {entry.role}
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                                <section className="rounded border border-slate-700/80 bg-slate-900/60 p-3">
                                    <h3 className="text-[10px] uppercase tracking-[3px] text-slate-400">
                                        Mechanics Snapshot
                                    </h3>
                                    <ul className="mt-2 space-y-2 text-xs text-slate-200">
                                        {GAME_MECHANICS.slice(0, 3).map((entry) => (
                                            <li key={entry.title}>
                                                <span className="font-semibold text-emerald-200">
                                                    {entry.title}
                                                </span>
                                                {": "}
                                                {entry.content}
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            </div>
                        ) : null}

                        {activePanel === "settings" ? (
                            <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
                                <section className="rounded border border-slate-700/80 bg-slate-900/60 p-3">
                                    <h3 className="text-[10px] uppercase tracking-[3px] text-slate-400">
                                        Epoch Selection
                                    </h3>
                                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                        {CADENCES.map((cadence) => {
                                            const isDisabled = Boolean(cadence.locked);
                                            const isActive =
                                                selectedCadence === cadence.turns &&
                                                !isDisabled;
                                            return (
                                                <button
                                                    key={cadence.turns}
                                                    type="button"
                                                    aria-label={`Select ${cadence.turns} epochs`}
                                                    disabled={isDisabled}
                                                    onClick={() =>
                                                        selectCadence(cadence.turns)
                                                    }
                                                    className="rounded border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-45"
                                                    style={{
                                                        borderColor: isActive
                                                            ? "rgba(250,204,21,0.9)"
                                                            : "rgba(71,85,105,0.8)",
                                                        background: isActive
                                                            ? "rgba(250,204,21,0.14)"
                                                            : "rgba(2,6,23,0.45)",
                                                    }}
                                                >
                                                    <p className="text-lg font-bold text-slate-100">
                                                        {cadence.turns}
                                                    </p>
                                                    <p className="text-[10px] uppercase tracking-[2px] text-slate-300">
                                                        {cadence.label}
                                                    </p>
                                                    <p className="mt-1 text-[11px] text-slate-400">
                                                        {cadence.description}
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>

                                <section className="rounded border border-slate-700/80 bg-slate-900/60 p-3">
                                    <h3 className="text-[10px] uppercase tracking-[3px] text-slate-400">
                                        AI Keys
                                    </h3>
                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                        <button
                                            type="button"
                                            aria-label="Use system AI keys"
                                            onClick={() => setAiKeyMode("system")}
                                            className="rounded border px-3 py-2 text-left transition"
                                            style={{
                                                borderColor:
                                                    aiKeyMode === "system"
                                                        ? "rgba(56,189,248,0.9)"
                                                        : "rgba(71,85,105,0.8)",
                                                background:
                                                    aiKeyMode === "system"
                                                        ? "rgba(56,189,248,0.15)"
                                                        : "rgba(2,6,23,0.45)",
                                            }}
                                        >
                                            <p className="text-xs font-semibold uppercase tracking-[2px] text-slate-200">
                                                System
                                            </p>
                                            <p className="mt-1 text-[11px] text-slate-400">
                                                Use server configured keys.
                                            </p>
                                        </button>
                                        <button
                                            type="button"
                                            aria-label="Use personal AI keys"
                                            onClick={() => setAiKeyMode("personal")}
                                            className="rounded border px-3 py-2 text-left transition"
                                            style={{
                                                borderColor:
                                                    aiKeyMode === "personal"
                                                        ? "rgba(56,189,248,0.9)"
                                                        : "rgba(71,85,105,0.8)",
                                                background:
                                                    aiKeyMode === "personal"
                                                        ? "rgba(56,189,248,0.15)"
                                                        : "rgba(2,6,23,0.45)",
                                            }}
                                        >
                                            <p className="text-xs font-semibold uppercase tracking-[2px] text-slate-200">
                                                Personal
                                            </p>
                                            <p className="mt-1 text-[11px] text-slate-400">
                                                Save keys only on this device.
                                            </p>
                                        </button>
                                    </div>

                                    {aiKeyMode === "personal" ? (
                                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                            <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[2px] text-slate-400">
                                                ElevenLabs
                                                <input
                                                    type="password"
                                                    value={elevenKey}
                                                    onChange={(event) =>
                                                        setElevenKey(event.target.value)
                                                    }
                                                    className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs normal-case tracking-normal text-slate-100 outline-none focus:border-sky-300"
                                                />
                                            </label>
                                            <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[2px] text-slate-400">
                                                Gemini
                                                <input
                                                    type="password"
                                                    value={geminiKey}
                                                    onChange={(event) =>
                                                        setGeminiKey(event.target.value)
                                                    }
                                                    className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs normal-case tracking-normal text-slate-100 outline-none focus:border-sky-300"
                                                />
                                            </label>
                                        </div>
                                    ) : (
                                        <p className="mt-3 text-[11px] text-slate-400">
                                            Personal keys are disabled for this run.
                                        </p>
                                    )}
                                </section>
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default HomeBriefing;
