"use client";

import { useEffect, useState } from "react";

import { useGameStore } from "@/game/store";
import { formatPercent } from "@/lib/utils";

const Hud = () => {
    const [isHydrated, setIsHydrated] = useState(false);
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
    const enemyIntent = useGameStore((s) => s.enemyIntent);

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    return (
        <header className="flex flex-col gap-3">
            <div
                className="rounded border px-3 py-3"
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
                    <div className="min-w-[220px] flex-1">
                        <div className="mb-2 flex flex-wrap gap-x-5 gap-y-3">
                            <Stat label="Narrative" value={formatPercent(avg, 1)} />
                            <Stat label="Districts" value={`${controlled} / ${total}`} />
                            <Stat label="Round" value={String(roundNumber)} />
                            <Stat label="Wins" value={`${campaignWins}/12`} />
                            <Stat label="Nerfs" value={String(activeNerfs)} />
                            <Stat
                                label="Credits"
                                value={isHydrated ? String(credits) : "—"}
                            />
                        </div>
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
            <div
                className="rounded border px-3 py-3 text-[11px]"
                style={{
                    borderColor: "var(--border-subtle)",
                    background:
                        "linear-gradient(180deg, color-mix(in srgb, var(--accent-enemy) 12%, var(--bg-surface) 88%) 0%, var(--bg-deep) 100%)",
                    color: "var(--text-secondary)",
                }}
                aria-live="polite"
            >
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                        className="text-[10px] uppercase tracking-[2.5px]"
                        style={{ color: "var(--accent-enemy)" }}
                    >
                        Threat bulletin
                    </span>
                    <span
                        className="text-[10px] uppercase tracking-[2px]"
                        style={{ color: "var(--text-muted)" }}
                    >
                        Enemy AP: {enemyIntent.ap} · Planned tiles:{" "}
                        {enemyIntent.plannedTiles.length}
                    </span>
                </div>
                <div
                    className="mt-2 text-[13px] leading-relaxed"
                    style={{ color: "var(--text-primary)" }}
                >
                    {enemyIntent.summary}
                </div>
            </div>
        </header>
    );
};

interface StatProps {
    label: string;
    value: string;
    valueClass?: string;
}

const Stat = ({ label, value, valueClass = "" }: StatProps) => (
    <div className="flex flex-col gap-0.5">
        <span className="hud-stat-label">{label}</span>
        <span className={`hud-stat-value ${valueClass}`.trim()}>{value}</span>
    </div>
);

export default Hud;
