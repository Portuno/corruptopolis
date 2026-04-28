"use client";

import { useEffect, useState } from "react";

import ActionQueue from "@/components/game/ActionQueue";
import BriefingModal from "@/components/game/BriefingModal";
import CommunicationPanel from "@/components/game/CommunicationPanel";
import ControlDashboard from "@/components/game/ControlDashboard";
import CrisisDebriefModal from "@/components/game/CrisisDebriefModal";
import FactionOutbreakModal from "@/components/game/FactionOutbreakModal";
import HexGrid from "@/components/game/HexGrid";
import Hud from "@/components/game/Hud";
import InfoModal from "@/components/game/InfoModal";
import Legend from "@/components/game/Legend";
import MemeSelector from "@/components/game/MemeSelector";
import ResultOverlay from "@/components/game/ResultOverlay";
import SettingsDrawer from "@/components/game/SettingsDrawer";
import VoicePanel from "@/components/game/VoicePanel";
import UserMenu from "@/components/auth/UserMenu";
import { AUDIO_PHRASES, type PhraseKey } from "@/game/audio";
import { useGameStore } from "@/game/store";
import { speakViaProxy } from "@/lib/speech";
import { formatPercent } from "@/lib/utils";

const GameFrame = () => {
    const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const setOnPropagationEvent = useGameStore(
        (s) => s.setOnPropagationEvent,
    );
    const executeTurn = useGameStore((s) => s.executeTurn);
    const phase = useGameStore((s) => s.phase);
    const result = useGameStore((s) => s.result);
    const grid = useGameStore((s) => s.grid);
    const avg = useGameStore((s) => s.avg);
    const controlled = useGameStore((s) => s.controlled);
    const total = useGameStore((s) => s.total);
    const monthLabel = useGameStore((s) => s.monthLabel);
    const epochCounter = useGameStore((s) => s.epochCounter);
    const epochProgress = useGameStore((s) => s.epochProgress);
    const roundNumber = useGameStore((s) => s.roundNumber);
    const credits = useGameStore((s) => s.metaProgress.credits);
    const campaignWins = useGameStore((s) => s.metaProgress.campaign.wins);
    const activeNerfs = useGameStore((s) => s.metaProgress.campaign.activeNerfs.length);
    const livingHiveEnabled = useGameStore((s) => s.livingHiveEnabled);
    const livingHiveIntensity = useGameStore((s) => s.livingHiveIntensity);

    useEffect(() => {
        setOnPropagationEvent((event) => {
            if (event === "harmonic") {
                const phrase: PhraseKey = "harmonic";
                void speakViaProxy({ text: AUDIO_PHRASES[phrase] });
            }
        });
        return () => setOnPropagationEvent(null);
    }, [setOnPropagationEvent]);

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (result) return;
            if (grid.length === 0) return;
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName?.toLowerCase();
            if (tag === "input" || tag === "textarea" || tag === "select") return;
            if (target?.isContentEditable) return;
            if ((e.key === "Enter" || e.key === " ") && phase === "PLAYER_ACTION") {
                e.preventDefault();
                executeTurn();
            }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [executeTurn, phase, result, grid.length]);

    return (
        <div
            className={`game-visual-filter flex h-dvh flex-col overflow-hidden ${
                livingHiveEnabled
                    ? `living-hive-enabled living-hive-${livingHiveIntensity}`
                    : ""
            }`}
            style={{ background: "var(--bg-base)" }}
        >
            <header
                className="flex flex-col gap-2 border-b px-4 py-3"
                style={{
                    borderColor: "var(--border-subtle)",
                    background: "var(--bg-surface)",
                }}
            >
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <h1
                            className="text-sm font-bold uppercase tracking-[6px]"
                            style={{ color: "var(--accent-player)" }}
                        >
                            Corruptópolis
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setIsInfoOpen(true)}
                            className="rounded border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[2px]"
                            style={{
                                borderColor: "var(--border-subtle)",
                                background: "var(--bg-surface)",
                                color: "var(--text-secondary)",
                            }}
                        >
                            Info
                        </button>
                        <UserMenu />
                        <SettingsDrawer />
                    </div>
                </div>
                <div
                    className="rounded border px-3 py-2"
                    style={{
                        borderColor: "var(--border-subtle)",
                        background:
                            "linear-gradient(135deg, color-mix(in srgb, var(--bg-deep) 82%, var(--accent-player) 18%) 0%, var(--bg-deep) 100%)",
                    }}
                >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex flex-col gap-1">
                            <span
                                className="text-[10px] uppercase tracking-[2.5px]"
                                style={{ color: "var(--text-muted)" }}
                            >
                                Live campaign feed
                            </span>
                            <div
                                className="text-sm font-semibold uppercase tracking-[3px]"
                                style={{ color: "var(--text-primary)" }}
                            >
                                {monthLabel}
                                <span
                                    className="mx-2"
                                    style={{ color: "var(--accent-player)" }}
                                >
                                    EPOCH
                                </span>
                                {epochCounter}
                            </div>
                        </div>
                        <div className="mb-1 flex flex-wrap gap-x-5 gap-y-2">
                            <HeaderStat label="Narrative" value={formatPercent(avg, 1)} />
                            <HeaderStat label="Districts" value={`${controlled} / ${total}`} />
                            <HeaderStat label="Round" value={String(roundNumber)} />
                            <HeaderStat label="Wins" value={`${campaignWins}/12`} />
                            <HeaderStat label="Nerfs" value={String(activeNerfs)} />
                            <HeaderStat
                                label="Credits"
                                value={isHydrated ? String(credits) : "—"}
                            />
                        </div>
                    </div>
                    <div
                        className="h-1.5 w-full overflow-hidden rounded"
                        style={{
                            background: "color-mix(in srgb, var(--bg-base) 72%, black 28%)",
                        }}
                    >
                        <div
                            className="h-full transition-all"
                            style={{
                                width: `${epochProgress.toFixed(1)}%`,
                                background: "var(--accent-player)",
                            }}
                        />
                    </div>
                </div>
            </header>

            <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
                <aside className="flex min-h-0 flex-col gap-3 overflow-hidden lg:order-1">
                    <section
                        className="panel flex flex-col gap-3 rounded-md p-3"
                        style={{ borderColor: "var(--border-mid)" }}
                    >
                        <h3
                            className="text-[10px] uppercase tracking-[3px]"
                            style={{ color: "var(--text-muted)" }}
                        >
                            Action Queue
                        </h3>
                        <ActionQueue />
                    </section>
                    <section
                        className="panel flex flex-col gap-3 rounded-md p-3"
                        style={{ borderColor: "var(--border-mid)" }}
                    >
                        <CommunicationPanel />
                    </section>
                    <section
                        className="panel flex flex-col gap-3 rounded-md p-3"
                        style={{ borderColor: "var(--border-mid)" }}
                    >
                        <VoicePanel />
                    </section>
                </aside>

                <section className="flex min-h-0 flex-col gap-3 overflow-hidden lg:order-2">
                    <div
                        className="panel flex flex-col gap-3 rounded-md p-3"
                        style={{ borderColor: "var(--border-mid)" }}
                    >
                        <Hud />
                    </div>
                    <div
                        className="panel min-h-0 flex-1 rounded-md p-2"
                        style={{ borderColor: "var(--border-mid)" }}
                    >
                        <HexGrid />
                    </div>
                </section>

                <aside className="flex min-h-0 flex-col gap-3 overflow-hidden lg:order-3">
                    <MemeSelector />
                    <section
                        className="panel flex flex-col gap-3 rounded-md p-3"
                        style={{ borderColor: "var(--border-mid)" }}
                    >
                        <Legend />
                    </section>
                    <ControlDashboard />
                </aside>
            </main>

            <BriefingModal mode="scif" />
            <InfoModal
                isOpen={isInfoOpen}
                onClose={() => setIsInfoOpen(false)}
            />
            <FactionOutbreakModal />
            <CrisisDebriefModal />
            <ResultOverlay />
        </div>
    );
};

export default GameFrame;

interface HeaderStatProps {
    label: string;
    value: string;
}

const HeaderStat = ({ label, value }: HeaderStatProps) => (
    <div className="flex flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-[2px] text-[color:var(--text-muted)]">
            {label}
        </span>
        <span className="text-sm font-bold text-[color:var(--text-primary)]">{value}</span>
    </div>
);
