"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useGameStore } from "@/game/store";
import { useUser } from "@/hooks/useUser";
import { logger } from "@/lib/logger";
import { speakViaProxy } from "@/lib/speech";
import { formatPercent } from "@/lib/utils";
import { AUDIO_PHRASES } from "@/game/audio";
import { RUN_PERKS, UNLOCKS, type PerkId } from "@/game/roguelike";

const PERK_COST = 8;
const STATUS_BY_OUTCOME = {
    win: "NARRATIVE FLIPPED",
    loss: "SYSTEM LOCKDOWN",
} as const;
const OUTCOME_HEADLINE_BY_OUTCOME = {
    win: "ELECTORAL VICTORY",
    loss: "ELECTORAL DEFEAT",
} as const;

interface AffinitySplit {
    establishment: number;
    apathy: number;
    insurgency: number;
}

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

const normalizeAffinity = (split: AffinitySplit): AffinitySplit => {
    const total = split.establishment + split.apathy + split.insurgency;
    if (total <= 0) {
        return { establishment: 34, apathy: 33, insurgency: 33 };
    }
    return {
        establishment: (split.establishment / total) * 100,
        apathy: (split.apathy / total) * 100,
        insurgency: (split.insurgency / total) * 100,
    };
};

const getArchetype = (isWin: boolean, split: AffinitySplit) => {
    if (split.apathy >= split.establishment && split.apathy >= split.insurgency) {
        return "THE AGENT OF CHAOS";
    }
    if (split.insurgency >= split.establishment) {
        return isWin ? "THE SHADOW POPULIST" : "THE FAILED SPARK";
    }
    return isWin ? "THE SYSTEM WHISPERER" : "THE CONTAINED REBEL";
};

const ResultOverlay = () => {
    const router = useRouter();
    const result = useGameStore((s) => s.result);
    const matchSaved = useGameStore((s) => s.matchSaved);
    const matchStartedAt = useGameStore((s) => s.matchStartedAt);
    const markMatchSaved = useGameStore((s) => s.markMatchSaved);
    const restartGame = useGameStore((s) => s.restartGame);
    const startNewRun = useGameStore((s) => s.startNewRun);
    const pickNerfAndContinue = useGameStore((s) => s.pickNerfAndContinue);
    const offeredNerfs = useGameStore((s) => s.offeredNerfs);
    const roundReward = useGameStore((s) => s.roundReward);
    const roundNumber = useGameStore((s) => s.roundNumber);
    const metaProgress = useGameStore((s) => s.metaProgress);
    const openMetaShop = useGameStore((s) => s.openMetaShop);
    const closeMetaShop = useGameStore((s) => s.closeMetaShop);
    const buyPerk = useGameStore((s) => s.buyPerk);
    const buyUnlock = useGameStore((s) => s.buyUnlock);
    const setLoadout = useGameStore((s) => s.setLoadout);
    const confirmLoadoutAndStartRound = useGameStore(
        (s) => s.confirmLoadoutAndStartRound,
    );
    const metaShopOpen = useGameStore((s) => s.metaShopOpen);
    const { user, supabaseEnabled, isAnonymous } = useUser();
    const [saveStatus, setSaveStatus] = useState<string>("");
    const [selectedLoadout, setSelectedLoadout] = useState<PerkId[]>([]);
    const [shareStatus, setShareStatus] = useState<string>("");
    const spokenRef = useRef<boolean>(false);

    useEffect(() => {
        if (!result) {
            spokenRef.current = false;
            return;
        }
        if (spokenRef.current) return;
        spokenRef.current = true;
        const phrase = result.isWin
            ? AUDIO_PHRASES.victory
            : AUDIO_PHRASES.defeat;
        void speakViaProxy({ text: phrase });
    }, [result]);

    useEffect(() => {
        if (!result || matchSaved) return;
        if (!supabaseEnabled || !user) {
            setSaveStatus("Sign in to save match history.");
            return;
        }
        const persist = async () => {
            try {
                const res = await fetch("/api/matches", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        startedAt: new Date(
                            matchStartedAt || Date.now(),
                        ).toISOString(),
                        endedAt: new Date().toISOString(),
                        result: result.isWin ? "win" : "loss",
                        finalAvg: result.avg,
                        districtsHeld: result.controlled,
                        totalDistricts: result.total,
                        epochsPlayed: result.epochs,
                        cadence: result.cadence,
                        payload: {
                            roundNumber,
                            equippedPerks: metaProgress.equippedPerks,
                            activeNerfs: metaProgress.campaign.activeNerfs,
                            campaignWins: metaProgress.campaign.wins,
                            metaCredits: metaProgress.credits,
                            roundReward,
                        },
                    }),
                });
                const json = (await res.json().catch(() => ({}))) as {
                    ok?: boolean;
                    error?: string;
                };
                if (!res.ok || !json.ok) {
                    setSaveStatus(`Could not save match: ${json.error ?? res.status}`);
                    return;
                }
                markMatchSaved();
                setSaveStatus(
                    isAnonymous
                        ? "Saved to your anonymous account."
                        : "Saved to your profile.",
                );
            } catch (err) {
                logger.warn("result-overlay", "save match failed", {
                    message: err instanceof Error ? err.message : String(err),
                });
                setSaveStatus("Network error while saving match.");
            }
        };
        void persist();
    }, [
        result,
        matchSaved,
        matchStartedAt,
        supabaseEnabled,
        user,
        isAnonymous,
        markMatchSaved,
        roundNumber,
        metaProgress.equippedPerks,
        metaProgress.campaign.activeNerfs,
        metaProgress.campaign.wins,
        metaProgress.credits,
        roundReward,
    ]);

    useEffect(() => {
        setSelectedLoadout(metaProgress.equippedPerks);
    }, [metaProgress.equippedPerks, result]);

    if (!result) return null;

    const handleRestart = () => {
        setSaveStatus("");
        setShareStatus("");
        restartGame();
    };
    const handleStartNewRun = () => {
        setSaveStatus("");
        setShareStatus("");
        startNewRun();
    };
    const handleToggleLoadout = (perkId: PerkId) => {
        const owned = metaProgress.ownedPerks[perkId];
        if (!owned) return;
        const isSelected = selectedLoadout.includes(perkId);
        if (isSelected) {
            setSelectedLoadout(selectedLoadout.filter((id) => id !== perkId));
            return;
        }
        if (selectedLoadout.length >= 2) return;
        setSelectedLoadout([...selectedLoadout, perkId]);
    };
    const handleConfirmLoadout = () => {
        setLoadout(selectedLoadout);
        confirmLoadoutAndStartRound();
    };
    const handleDisconnect = () => {
        router.push("/");
    };

    const districtsPct = (result.controlled / Math.max(1, result.total)) * 100;
    const creditsCanBeGranted = roundReward?.creditGrantReason !== "none";
    const rawAffinity: AffinitySplit = {
        insurgency: clampPercent(result.avg * 100),
        apathy: clampPercent((100 - districtsPct) * 0.45),
        establishment: clampPercent(
            100 - clampPercent(result.avg * 100) - clampPercent((100 - districtsPct) * 0.45),
        ),
    };
    const affinity = normalizeAffinity(rawAffinity);
    const statusLabel = result.isWin ? STATUS_BY_OUTCOME.win : STATUS_BY_OUTCOME.loss;
    const outcomeHeadline = result.isWin
        ? OUTCOME_HEADLINE_BY_OUTCOME.win
        : OUTCOME_HEADLINE_BY_OUTCOME.loss;
    const profileLabel = getArchetype(result.isWin, affinity);
    const legacyLine = result.isWin
        ? "The streets of Corruptopolis absorbed your signal as doctrine. You did not just win districts, you rewired public memory."
        : "The regime held the skyline, but your transmission escaped containment. Their victory report still reads like damage control.";
    const insurgencyTrend = buildInsurgencyTrend(result.avg, result.isWin);
    const sharePayload = [
        "== STRATEGIC DEBRIEF ==",
        `STATUS CODE: ${statusLabel}`,
        `OUTCOME: ${outcomeHeadline}`,
        `RANK: ${profileLabel}`,
        `GLOBAL AFFINITY | INS ${affinity.insurgency.toFixed(1)}% · APA ${affinity.apathy.toFixed(1)}% · EST ${affinity.establishment.toFixed(1)}%`,
        `TACTICAL METRICS | Epochs ${result.epochs}/${result.epochs} · Districts ${result.controlled}/${result.total}`,
        `SYSTEM IMPACT | Dominance ${formatPercent(result.avg, 1)} · Hold Rate ${districtsPct.toFixed(1)}%`,
        `"${legacyLine}"`,
    ].join("\n");

    const handleShareDossier = async () => {
        if (!navigator?.clipboard?.writeText) {
            setShareStatus("Clipboard unavailable in this browser.");
            return;
        }
        try {
            await navigator.clipboard.writeText(sharePayload);
            setShareStatus("Dossier copied to clipboard.");
        } catch {
            setShareStatus("Could not copy dossier.");
        }
    };

    return (
        <div className="fixed inset-0 z-40 overflow-hidden px-2 py-2 md:px-4 md:py-4">
            <div className="strategic-debrief-flicker" aria-hidden="true" />
            <div
                className="absolute inset-0"
                style={{ background: "var(--bg-deep)" }}
                aria-hidden="true"
            />
            <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                aria-hidden="true"
            >
                <span
                    className="rotate-[-17deg] text-[clamp(2.25rem,7vh,5.4rem)] font-black uppercase tracking-[0.4em] opacity-20"
                    style={{
                        color: result.isWin ? "var(--accent-win)" : "var(--accent-lose)",
                    }}
                >
                    {result.isWin ? "COMPLETED" : "REDACTED"}
                </span>
            </div>
            <div
                className="relative mx-auto grid h-full w-full max-w-7xl grid-rows-[15%_60%_25%] gap-3 rounded-md border p-2 md:gap-4 md:p-4"
                style={{
                    background: "var(--bg-panel)",
                    borderColor: result.isWin
                        ? "var(--accent-win)"
                        : "var(--accent-lose)",
                    boxShadow: `0 0 60px ${
                        result.isWin
                            ? "var(--accent-win-glow)"
                            : "var(--accent-lose-glow)"
                    }`,
                }}
            >
                <header
                    className="grid h-full grid-cols-12 items-center gap-2 rounded border px-3 md:px-5"
                    style={{
                        borderColor: result.isWin
                            ? "rgba(56, 189, 248, 0.45)"
                            : "rgba(248, 81, 73, 0.55)",
                        background: result.isWin
                            ? "rgba(8, 22, 36, 0.68)"
                            : "rgba(32, 7, 11, 0.7)",
                    }}
                >
                    <p className="col-span-3 text-left text-[clamp(0.62rem,1.45vh,0.88rem)] font-semibold uppercase tracking-[0.25em] text-[color:var(--text-secondary)]">
                        {statusLabel}
                    </p>
                    <p
                        className="col-span-6 text-center text-[clamp(1.15rem,4.2vh,3rem)] font-black uppercase tracking-[0.14em]"
                        style={{
                            color: result.isWin ? "var(--accent-player)" : "var(--accent-lose)",
                        }}
                    >
                        {outcomeHeadline}
                    </p>
                    <p className="col-span-3 text-right text-[clamp(0.6rem,1.35vh,0.82rem)] font-semibold uppercase tracking-[0.24em] text-[color:var(--text-secondary)]">
                        {profileLabel}
                    </p>
                </header>
                <section className="grid h-full grid-cols-12 gap-3 overflow-hidden">
                    <div
                        className="col-span-4 flex h-full flex-col rounded border p-3 text-left md:p-4"
                        style={{
                            borderColor: "var(--border-subtle)",
                            color: "var(--text-secondary)",
                        }}
                    >
                        <p className="mb-2 text-[clamp(0.56rem,1.2vh,0.7rem)] uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
                            Outcome Brief
                        </p>
                        <p className="mb-3 text-[clamp(0.65rem,1.35vh,0.85rem)] leading-relaxed text-[color:var(--text-secondary)]">
                            {result.body.split(".")[0]?.trim()}. Narrative pressure settled at{" "}
                            {formatPercent(result.avg, 1)}.
                        </p>
                        <p className="mb-2 text-[clamp(0.56rem,1.2vh,0.7rem)] uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
                            Global Affinity Matrix
                        </p>
                        <AffinityBar
                            label="Insurgency"
                            value={affinity.insurgency}
                            color="var(--accent-player)"
                            trend={insurgencyTrend}
                        />
                        <AffinityBar
                            label="Apathy"
                            value={affinity.apathy}
                            color="#64748b"
                        />
                        <AffinityBar
                            label="Establishment"
                            value={affinity.establishment}
                            color="#f87171"
                        />
                        <p className="mb-2 mt-1 text-[clamp(0.56rem,1.2vh,0.7rem)] uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
                            Element Echoes
                        </p>
                        <div className="grid grid-cols-3 gap-1.5">
                            {buildElementEchoes(result.avg).map((element) => (
                                <ElementBadge key={element.name} name={element.name} level={element.level} />
                            ))}
                        </div>
                    </div>
                    <div
                        className="col-span-4 flex h-full flex-col rounded border p-3 text-left md:p-4"
                        style={{
                            borderColor: "var(--border-subtle)",
                            color: "var(--text-secondary)",
                        }}
                    >
                        <p className="mb-3 text-[clamp(0.56rem,1.2vh,0.7rem)] uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
                            Core Metrics
                        </p>
                        <div className="grid h-full grid-cols-2 gap-2 md:gap-3">
                            <Stat label="Epochs" value={`${result.epochs}/${result.epochs}`} />
                            <Stat label="Districts" value={`${result.controlled}/${result.total}`} />
                            <Stat label="Dominance" value={formatPercent(result.avg, 1)} />
                            <Stat label="Exposure" value={`${districtsPct.toFixed(1)}%`} />
                        </div>
                    </div>
                    <div
                        className="col-span-4 flex h-full flex-col rounded border p-3 text-left md:p-4"
                        style={{
                            borderColor: "var(--border-subtle)",
                            color: "var(--text-secondary)",
                        }}
                    >
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-[clamp(0.56rem,1.2vh,0.7rem)] uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
                                Loadout Box
                            </p>
                            <button
                                type="button"
                                onClick={metaShopOpen ? closeMetaShop : openMetaShop}
                                className="rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                                style={{
                                    borderColor: "var(--accent-player)",
                                    color: "var(--accent-player)",
                                }}
                            >
                                {metaShopOpen ? "Loadout" : "Meta Shop"}
                            </button>
                        </div>
                        <p className="mb-2 text-[clamp(0.6rem,1.32vh,0.8rem)] uppercase tracking-[0.18em] text-[color:var(--text-secondary)]">
                            Meta Credits Earned: +{roundReward?.creditsEarned ?? 0}
                        </p>
                        <p className="mb-2 text-[clamp(0.6rem,1.32vh,0.8rem)] uppercase tracking-[0.18em] text-[color:var(--text-secondary)]">
                            Total Credits: {metaProgress.credits}
                        </p>
                        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                            {metaShopOpen ? (
                                <div className="grid gap-2">
                                    {RUN_PERKS.map((perk) => {
                                        const owned = metaProgress.ownedPerks[perk.id];
                                        const affordable = metaProgress.credits >= PERK_COST;
                                        return (
                                            <button
                                                key={perk.id}
                                                type="button"
                                                disabled={owned || !affordable}
                                                onClick={() => buyPerk(perk.id)}
                                                className="rounded border px-2 py-2 text-left text-[10px] disabled:opacity-50"
                                                style={{
                                                    borderColor: owned
                                                        ? "var(--accent-confirm)"
                                                        : "var(--border-subtle)",
                                                    background: "var(--bg-surface)",
                                                }}
                                            >
                                                <p className="font-semibold text-[color:var(--text-primary)]">
                                                    {perk.name} ({PERK_COST}c)
                                                </p>
                                                <p className="text-[color:var(--text-secondary)]">
                                                    {owned ? "Owned" : perk.description}
                                                </p>
                                            </button>
                                        );
                                    })}
                                    {UNLOCKS.map((unlock) => {
                                        const owned = metaProgress.unlocked[unlock.id];
                                        const affordable = metaProgress.credits >= unlock.cost;
                                        return (
                                            <button
                                                key={unlock.id}
                                                type="button"
                                                disabled={owned || !affordable}
                                                onClick={() => buyUnlock(unlock.id)}
                                                className="rounded border px-2 py-2 text-left text-[10px] disabled:opacity-50"
                                                style={{
                                                    borderColor: owned
                                                        ? "var(--accent-confirm)"
                                                        : "var(--border-subtle)",
                                                    background: "var(--bg-surface)",
                                                }}
                                            >
                                                <p className="font-semibold text-[color:var(--text-primary)]">
                                                    {unlock.name} ({unlock.cost}c)
                                                </p>
                                                <p className="text-[color:var(--text-secondary)]">
                                                    {owned ? "Unlocked" : unlock.description}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="grid gap-2">
                                    {RUN_PERKS.map((perk) => (
                                        <button
                                            key={perk.id}
                                            type="button"
                                            onClick={() => handleToggleLoadout(perk.id)}
                                            disabled={!metaProgress.ownedPerks[perk.id]}
                                            className="rounded border px-2 py-2 text-left text-[10px] disabled:opacity-45"
                                            style={{
                                                borderColor: selectedLoadout.includes(perk.id)
                                                    ? "var(--accent-player)"
                                                    : "var(--border-subtle)",
                                                background: "var(--bg-surface)",
                                            }}
                                        >
                                            <p className="font-semibold text-[color:var(--text-primary)]">
                                                {perk.name}
                                            </p>
                                            <p className="text-[color:var(--text-secondary)]">
                                                {!metaProgress.ownedPerks[perk.id]
                                                    ? "Buy in Meta Shop"
                                                    : perk.description}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
                <footer
                    className="grid h-full grid-rows-[45%_55%] gap-2 rounded border px-3 py-3 md:px-4"
                    style={{ borderColor: "var(--border-subtle)" }}
                >
                    <div className="flex items-center justify-center border-b border-[color:var(--border-subtle)] pb-2">
                        <p className="text-center text-[clamp(0.64rem,1.38vh,0.9rem)] italic text-[color:var(--text-secondary)]">
                            "{legacyLine}"
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={handleStartNewRun}
                            className="rounded border px-5 py-2.5 text-[clamp(0.62rem,1.4vh,0.86rem)] font-black uppercase tracking-[0.24em]"
                            style={{
                                borderColor: result.isWin ? "var(--accent-player)" : "var(--accent-lose)",
                                color: "#060c14",
                                background: result.isWin ? "var(--accent-player)" : "var(--accent-lose)",
                            }}
                        >
                            Initiate New Epoch
                        </button>
                        {offeredNerfs.length > 0 ? (
                            offeredNerfs.map((nerf) => (
                                <button
                                    key={nerf.id}
                                    type="button"
                                    onClick={() => {
                                        setLoadout(selectedLoadout);
                                        pickNerfAndContinue(nerf.id);
                                    }}
                                    className="rounded border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em]"
                                    style={{
                                        borderColor: "var(--border-subtle)",
                                        color: "var(--text-secondary)",
                                    }}
                                >
                                    {nerf.name}
                                </button>
                            ))
                        ) : (
                            <button
                                type="button"
                                onClick={handleConfirmLoadout}
                                className="rounded border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em]"
                                style={{
                                    borderColor: "var(--accent-player)",
                                    color: "var(--accent-player)",
                                }}
                            >
                                Commit Loadout
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleRestart}
                            className="rounded border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em]"
                            style={{
                                borderColor: "var(--border-subtle)",
                                color: "var(--text-secondary)",
                            }}
                        >
                            Re-Boot Simulation
                        </button>
                        <button
                            type="button"
                            onClick={handleShareDossier}
                            className="rounded border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em]"
                            style={{
                                borderColor: "var(--accent-player)",
                                color: "var(--accent-player)",
                            }}
                        >
                            Share Dossier
                        </button>
                        <button
                            type="button"
                            onClick={handleDisconnect}
                            className="rounded border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em]"
                            style={{
                                borderColor: "var(--border-subtle)",
                                color: "var(--text-secondary)",
                            }}
                        >
                            Disconnect
                        </button>
                    </div>
                    {roundReward ? (
                        <p className="text-center text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                            Round {roundNumber} score {roundReward.score} | campaign {metaProgress.campaign.wins}/12
                            | credits +{roundReward.creditsEarned}
                            {!creditsCanBeGranted ? " (deferred)" : ""}
                        </p>
                    ) : null}
                    {saveStatus ? (
                        <p
                            className="text-center text-[10px] text-[color:var(--text-muted)]"
                            aria-live="polite"
                        >
                            {saveStatus}
                        </p>
                    ) : null}
                    {shareStatus ? (
                        <p
                            className="text-center text-[10px] text-[color:var(--text-muted)]"
                            aria-live="polite"
                        >
                            {shareStatus}
                        </p>
                    ) : null}
                </footer>
            </div>
        </div>
    );
};

interface StatProps {
    label: string;
    value: string;
}

const Stat = ({ label, value }: StatProps) => (
    <div className="flex min-h-0 flex-col justify-center rounded border border-[color:var(--border-subtle)] bg-[color:rgba(2,6,23,0.26)] p-2">
        <span
            className="text-[clamp(0.52rem,1.08vh,0.68rem)] uppercase tracking-[0.2em]"
            style={{ color: "var(--text-muted)" }}
        >
            {label}
        </span>
        <span
            className="text-[clamp(0.92rem,2.35vh,1.55rem)] font-black"
            style={{ color: "var(--text-primary)" }}
        >
            {value}
        </span>
    </div>
);

interface AffinityBarProps {
    label: string;
    value: number;
    color: string;
    trend?: number[];
}

const AffinityBar = ({ label, value, color, trend }: AffinityBarProps) => (
    <div className="mb-3">
        <div className="mb-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-[1.8px]">
            <span className="text-[color:var(--text-secondary)]">{label}</span>
            <div className="flex items-center gap-2">
                {trend ? <Sparkline points={trend} color={color} /> : null}
                <span className="text-[color:var(--text-muted)]">{value.toFixed(1)}%</span>
            </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)]">
            <span className="block h-full rounded-full" style={{ width: `${value}%`, background: color }} />
        </div>
    </div>
);

interface SparklineProps {
    points: number[];
    color: string;
}

const Sparkline = ({ points, color }: SparklineProps) => {
    if (points.length < 2) return null;
    const width = 74;
    const height = 18;
    const max = Math.max(...points);
    const min = Math.min(...points);
    const spread = Math.max(1, max - min);
    const d = points
        .map((point, idx) => {
            const x = (idx / (points.length - 1)) * width;
            const y = height - ((point - min) / spread) * height;
            return `${idx === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(" ");
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
            <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
        </svg>
    );
};

const buildInsurgencyTrend = (avg: number, isWin: boolean): number[] => {
    const base = avg * 100;
    const anchor = isWin ? 56 : 44;
    return Array.from({ length: 12 }, (_, idx) => {
        const progress = idx / 11;
        const drift = (base - anchor) * progress;
        const wobble = Math.sin((idx + 1) * 0.85) * 4;
        return clampPercent(anchor + drift + wobble);
    });
};

const buildElementEchoes = (avg: number): Array<{ name: string; level: string }> => {
    const bands = ["LOW", "MID", "HIGH"] as const;
    const names = ["POL", "MIL", "ECO", "REL", "SCI", "CUL"];
    return names.map((name, idx) => {
        const score = (avg * 100 + (idx * 13) % 29) % 100;
        const level = score > 66 ? bands[2] : score > 33 ? bands[1] : bands[0];
        return { name, level };
    });
};

interface ElementBadgeProps {
    name: string;
    level: string;
}

const ElementBadge = ({ name, level }: ElementBadgeProps) => (
    <div className="rounded border border-[color:var(--border-subtle)] bg-[color:rgba(2,6,23,0.28)] px-1.5 py-1 text-center">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[color:var(--text-secondary)]">
            {name}
        </p>
        <p className="text-[9px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">{level}</p>
    </div>
);

export default ResultOverlay;
