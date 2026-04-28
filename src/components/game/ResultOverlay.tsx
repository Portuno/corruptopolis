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
    win: "VICTORY: NARRATIVE FLIPPED",
    loss: "DEFEAT: CONNECTION SEVERED",
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
    const profileLabel = getArchetype(result.isWin, affinity);
    const legacyLine = result.isWin
        ? "The streets of Corruptopolis absorbed your signal as doctrine. You did not just win districts, you rewired public memory."
        : "The regime held the skyline, but your transmission escaped containment. Their victory report still reads like damage control.";
    const insurgencyTrend = buildInsurgencyTrend(result.avg, result.isWin);
    const sharePayload = [
        "== STRATEGIC DEBRIEF ==",
        statusLabel,
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
        <div className="fixed inset-0 z-40 overflow-y-auto px-4 py-6">
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
                    className="rotate-[-18deg] text-4xl font-black uppercase tracking-[8px] opacity-20 md:text-7xl"
                    style={{
                        color: result.isWin ? "var(--accent-win)" : "var(--accent-lose)",
                    }}
                >
                    {result.isWin ? "COMPLETED" : "REDACTED"}
                </span>
            </div>
            <div
                className="relative mx-auto flex w-full max-w-5xl flex-col gap-5 rounded-md border p-4 md:p-6"
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
                    className="rounded border px-4 py-5 text-center md:px-8 md:py-8"
                    style={{
                        borderColor: result.isWin ? "var(--accent-win)" : "var(--accent-lose)",
                        background: result.isWin
                            ? "rgba(61, 214, 140, 0.08)"
                            : "rgba(248, 81, 73, 0.08)",
                    }}
                >
                    <p
                        className="text-xl font-black uppercase tracking-[4px] md:text-4xl md:tracking-[8px]"
                        style={{ color: result.isWin ? "var(--accent-win)" : "var(--accent-lose)" }}
                    >
                        {statusLabel}
                    </p>
                    <p className="mt-3 text-[11px] uppercase tracking-[3px] text-[color:var(--text-muted)]">
                        {result.title}
                    </p>
                    <p className="mt-2 text-sm font-semibold uppercase tracking-[3px] text-[color:var(--text-secondary)] md:text-base">
                        RANK: {profileLabel}
                    </p>
                </header>
                <section className="grid gap-3 md:grid-cols-2">
                    <div
                        className="rounded border p-4 text-left"
                        style={{
                            borderColor: "var(--border-subtle)",
                            color: "var(--text-secondary)",
                        }}
                    >
                        <p className="mb-3 text-[10px] uppercase tracking-[2px] text-[color:var(--text-muted)]">
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
                    </div>
                    <div
                        className="rounded border p-4 text-left text-[11px]"
                        style={{
                            borderColor: "var(--border-subtle)",
                            color: "var(--text-secondary)",
                        }}
                    >
                        <p className="mb-3 text-[10px] uppercase tracking-[2px] text-[color:var(--text-muted)]">
                            Operational Stats
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <Stat label="Epochs" value={`${result.epochs}/${result.epochs}`} />
                            <Stat label="Districts" value={`${result.controlled}/${result.total}`} />
                            <Stat label="Dominance" value={formatPercent(result.avg, 1)} />
                            <Stat label="Exposure" value={`${districtsPct.toFixed(1)}%`} />
                        </div>
                    </div>
                </section>
                <blockquote
                    className="rounded border px-4 py-3 text-left text-sm italic"
                    style={{
                        borderColor: "var(--border-subtle)",
                        color: "var(--text-secondary)",
                        background: "rgba(15, 23, 42, 0.28)",
                    }}
                >
                    "{legacyLine}"
                </blockquote>
                {roundReward ? (
                    <div
                        className="rounded border p-3 text-left text-[11px]"
                        style={{
                            borderColor: "var(--border-subtle)",
                            color: "var(--text-secondary)",
                        }}
                    >
                        <p className="mb-1 text-[10px] uppercase tracking-[2px] text-[color:var(--text-muted)]">
                            Round {roundNumber} Rewards
                        </p>
                        <p>
                            Score:{" "}
                            <span className="font-semibold text-[color:var(--text-primary)]">
                                {roundReward.score}
                            </span>{" "}
                            (Avg +{roundReward.avgBonus}, Districts +
                            {roundReward.districtBonus}, Efficiency +
                            {roundReward.efficiencyBonus}, Streak x
                            {roundReward.streakMultiplier.toFixed(2)})
                        </p>
                        <p>
                            Campaign Wins:{" "}
                            <span className="font-semibold text-[color:var(--text-primary)]">
                                {metaProgress.campaign.wins}/12
                            </span>
                        </p>
                        <p>
                            Meta Credits earned:{" "}
                            <span className="font-semibold text-[color:var(--accent-player)]">
                                +{roundReward.creditsEarned}
                            </span>
                            {!creditsCanBeGranted ? " (none on non-final wins)" : ""}
                        </p>
                        <p>
                            Total Meta Credits:{" "}
                            <span className="font-semibold text-[color:var(--text-primary)]">
                                {metaProgress.credits}
                            </span>
                        </p>
                        {metaProgress.campaign.done ? (
                            <p className="text-[color:var(--accent-win)]">
                                Campaign DONE: 12 consecutive wins completed.
                            </p>
                        ) : null}
                    </div>
                ) : null}
                {saveStatus ? (
                    <p
                        className="text-[11px]"
                        style={{ color: "var(--text-muted)" }}
                        aria-live="polite"
                    >
                        {saveStatus}
                    </p>
                ) : null}
                {shareStatus ? (
                    <p
                        className="text-[11px]"
                        style={{ color: "var(--text-muted)" }}
                        aria-live="polite"
                    >
                        {shareStatus}
                    </p>
                ) : null}
                {metaShopOpen ? (
                    <div
                        className="rounded border p-3 text-left"
                        style={{ borderColor: "var(--border-subtle)" }}
                    >
                        <p className="mb-2 text-[10px] uppercase tracking-[2px] text-[color:var(--text-muted)]">
                            Meta Shop
                        </p>
                        <div className="flex flex-col gap-2">
                            {RUN_PERKS.map((perk) => {
                                const owned = metaProgress.ownedPerks[perk.id];
                                const affordable = metaProgress.credits >= PERK_COST;
                                return (
                                    <button
                                        key={perk.id}
                                        type="button"
                                        disabled={owned || !affordable}
                                        onClick={() => {
                                            buyPerk(perk.id);
                                        }}
                                        className="rounded border px-3 py-2 text-left text-[11px] disabled:opacity-50"
                                        style={{
                                            borderColor: owned
                                                ? "var(--accent-confirm)"
                                                : "var(--border-subtle)",
                                            background: "var(--bg-surface)",
                                        }}
                                    >
                                        <p className="font-semibold text-[color:var(--text-primary)]">
                                            {perk.name}{" "}
                                            <span className="text-[color:var(--text-muted)]">
                                                ({PERK_COST} credits)
                                            </span>
                                        </p>
                                        <p className="text-[color:var(--text-secondary)]">
                                            {owned ? "Owned" : perk.description}
                                        </p>
                                    </button>
                                );
                            })}
                            {UNLOCKS.map((unlock) => {
                                const owned = metaProgress.unlocked[unlock.id];
                                const affordable =
                                    metaProgress.credits >= unlock.cost;
                                return (
                                    <button
                                        key={unlock.id}
                                        type="button"
                                        disabled={owned || !affordable}
                                        onClick={() => {
                                            buyUnlock(unlock.id);
                                        }}
                                        className="rounded border px-3 py-2 text-left text-[11px] disabled:opacity-50"
                                        style={{
                                            borderColor: owned
                                                ? "var(--accent-confirm)"
                                                : "var(--border-subtle)",
                                            background: "var(--bg-surface)",
                                        }}
                                    >
                                        <p className="font-semibold text-[color:var(--text-primary)]">
                                            {unlock.name}{" "}
                                            <span className="text-[color:var(--text-muted)]">
                                                ({unlock.cost} credits)
                                            </span>
                                        </p>
                                        <p className="text-[color:var(--text-secondary)]">
                                            {owned ? "Unlocked" : unlock.description}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            type="button"
                            onClick={closeMetaShop}
                            className="mt-3 w-full rounded border px-3 py-2 text-xs font-semibold uppercase tracking-[2px]"
                            style={{
                                borderColor: "var(--border-subtle)",
                                color: "var(--text-secondary)",
                            }}
                        >
                            Back to rewards
                        </button>
                    </div>
                ) : null}
                <section className="rounded border p-3" style={{ borderColor: "var(--border-subtle)" }}>
                    {result.isWin ? (
                        <>
                            <button
                                type="button"
                                onClick={openMetaShop}
                                className="rounded border px-4 py-2 text-xs font-semibold uppercase tracking-[2px]"
                                style={{
                                    borderColor: "var(--accent-player)",
                                    color: "var(--accent-player)",
                                    background: "var(--accent-player-bg)",
                                }}
                            >
                                Open Meta Shop
                            </button>
                        <div className="grid gap-2 text-left">
                            <p className="text-[10px] uppercase tracking-[2px] text-[color:var(--text-muted)]">
                                Configure loadout (max 2 perks)
                            </p>
                            {RUN_PERKS.map((perk) => (
                                <button
                                    key={perk.id}
                                    type="button"
                                    onClick={() => handleToggleLoadout(perk.id)}
                                    disabled={!metaProgress.ownedPerks[perk.id]}
                                    className="rounded border px-3 py-2 text-left text-xs"
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
                        {offeredNerfs.length > 0 ? (
                            <div className="grid gap-2 text-left">
                                <p className="text-[10px] uppercase tracking-[2px] text-[color:var(--text-muted)]">
                                    Choose 1 nerf for next run (mandatory)
                                </p>
                                {offeredNerfs.map((nerf) => (
                                    <button
                                        key={nerf.id}
                                        type="button"
                                        onClick={() => {
                                            setLoadout(selectedLoadout);
                                            pickNerfAndContinue(nerf.id);
                                        }}
                                        className="rounded border px-3 py-2 text-left text-xs"
                                        style={{
                                            borderColor: "var(--border-subtle)",
                                            background: "var(--bg-surface)",
                                        }}
                                    >
                                        <p className="font-semibold text-[color:var(--text-primary)]">
                                            {nerf.name}
                                        </p>
                                        <p className="text-[color:var(--text-secondary)]">
                                            {nerf.description}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={handleConfirmLoadout}
                                className="rounded border px-4 py-2 text-xs font-semibold uppercase tracking-[2px]"
                                style={{
                                    borderColor: "var(--accent-player)",
                                    color: "var(--accent-player)",
                                    background: "var(--accent-player-bg)",
                                }}
                            >
                                Continue to next round
                            </button>
                        )}
                            <button
                                type="button"
                                onClick={handleStartNewRun}
                                className="rounded border px-4 py-2 text-xs font-semibold uppercase tracking-[2px]"
                                style={{
                                    borderColor: "var(--border-subtle)",
                                    color: "var(--text-secondary)",
                                }}
                            >
                                Initiate New Epoch
                            </button>
                        </>
                    ) : (
                        <>
                        <div className="grid gap-2 text-left">
                            <p className="text-[10px] uppercase tracking-[2px] text-[color:var(--text-muted)]">
                                Configure loadout for next run (max 2 perks)
                            </p>
                            {RUN_PERKS.map((perk) => (
                                <button
                                    key={perk.id}
                                    type="button"
                                    onClick={() => handleToggleLoadout(perk.id)}
                                    disabled={!metaProgress.ownedPerks[perk.id]}
                                    className="rounded border px-3 py-2 text-left text-xs disabled:opacity-50"
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
                        <button
                            type="button"
                            onClick={openMetaShop}
                            className="rounded border px-4 py-2 text-xs font-semibold uppercase tracking-[2px]"
                            style={{
                                borderColor: "var(--accent-player)",
                                color: "var(--accent-player)",
                                background: "var(--accent-player-bg)",
                            }}
                        >
                            Open Meta Shop
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmLoadout}
                            className="rounded px-4 py-2 text-sm font-bold uppercase tracking-[3px]"
                            style={{
                                background: "var(--accent-player)",
                                color: "#0b0e16",
                            }}
                        >
                            Initiate New Epoch
                        </button>
                            <button
                                type="button"
                                onClick={handleRestart}
                                className="rounded border px-4 py-2 text-xs font-semibold uppercase tracking-[2px]"
                                style={{
                                    borderColor: "var(--border-subtle)",
                                    color: "var(--text-secondary)",
                                }}
                            >
                                Re-Boot Simulation
                            </button>
                        </>
                    )}
                </section>
                <div className="flex flex-wrap items-center justify-center gap-2 border-t border-[color:var(--border-subtle)] pt-4">
                    <button
                        type="button"
                        onClick={handleShareDossier}
                        className="rounded border px-4 py-2 text-xs font-semibold uppercase tracking-[2px]"
                        style={{
                            borderColor: "var(--accent-player)",
                            color: "var(--accent-player)",
                            background: "var(--accent-player-bg)",
                        }}
                    >
                        Export Intel
                    </button>
                    <button
                        type="button"
                        onClick={handleRestart}
                        className="rounded border px-4 py-2 text-xs font-semibold uppercase tracking-[2px]"
                        style={{
                            borderColor: "var(--border-subtle)",
                            color: "var(--text-secondary)",
                        }}
                    >
                        Re-Boot Simulation
                    </button>
                    <button
                        type="button"
                        onClick={handleDisconnect}
                        className="rounded border px-4 py-2 text-xs font-semibold uppercase tracking-[2px]"
                        style={{
                            borderColor: "var(--border-subtle)",
                            color: "var(--text-secondary)",
                        }}
                    >
                        Disconnect
                    </button>
                </div>
            </div>
        </div>
    );
};

interface StatProps {
    label: string;
    value: string;
}

const Stat = ({ label, value }: StatProps) => (
    <div className="flex flex-col gap-0.5">
        <span
            className="text-[9px] uppercase tracking-[2px]"
            style={{ color: "var(--text-muted)" }}
        >
            {label}
        </span>
        <span
            className="text-base font-bold"
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

export default ResultOverlay;
