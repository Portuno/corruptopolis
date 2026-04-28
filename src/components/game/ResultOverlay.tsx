"use client";

import { useEffect, useRef, useState } from "react";

import { useGameStore } from "@/game/store";
import { useUser } from "@/hooks/useUser";
import { logger } from "@/lib/logger";
import { speakViaProxy } from "@/lib/speech";
import { formatPercent } from "@/lib/utils";
import { AUDIO_PHRASES } from "@/game/audio";
import { RUN_PERKS, UNLOCKS, type PerkId } from "@/game/roguelike";

const PERK_COST = 8;
const STATUS_BY_OUTCOME = {
    win: "STATUS: NARRATIVE FLIPPED",
    loss: "STATUS: SYSTEM LOCKDOWN",
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
        ? "Historical Legacy: You ruptured the consensus map and forced a rewritten narrative."
        : "Historical Legacy: The counter-wave held, but your signal remains in the underground channels.";
    const sharePayload = [
        "== MCO FINAL DOSSIER ==",
        statusLabel,
        `MCO PROFILE: ${profileLabel}`,
        `GLOBAL AFFINITY | EST ${affinity.establishment.toFixed(1)}% · APA ${affinity.apathy.toFixed(1)}% · INS ${affinity.insurgency.toFixed(1)}%`,
        `MISSION METRICS | Epochs ${result.epochs}/${result.epochs} · Districts ${result.controlled}/${result.total}`,
        `MEMETIC IMPACT | Dominance ${formatPercent(result.avg, 1)} · Hold Rate ${districtsPct.toFixed(1)}%`,
        legacyLine,
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
        <div
            className="fixed inset-0 z-40 flex items-center justify-center px-4 py-6"
            style={{ background: "var(--bg-deep)" }}
        >
            <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                aria-hidden="true"
            >
                <span
                    className="rotate-[-22deg] text-3xl font-black uppercase tracking-[8px] opacity-10 md:text-6xl"
                    style={{
                        color: result.isWin
                            ? "var(--accent-win)"
                            : "var(--accent-lose)",
                    }}
                >
                    Strictly Confidential
                </span>
            </div>
            <div
                className="relative flex w-full max-w-xl flex-col gap-5 rounded-md border p-6 text-center"
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
                <h2
                    className="text-2xl font-bold uppercase tracking-[6px]"
                    style={{
                        color: result.isWin
                            ? "var(--accent-win)"
                            : "var(--accent-lose)",
                    }}
                >
                    {result.title}
                </h2>
                <p
                    className="text-base font-black uppercase tracking-[3px]"
                    style={{
                        color: result.isWin
                            ? "var(--accent-win)"
                            : "var(--accent-lose)",
                    }}
                >
                    {statusLabel}
                </p>
                <p
                    className="text-[11px] uppercase tracking-[3px]"
                    style={{ color: "var(--text-secondary)" }}
                >
                    MCO Profile: {profileLabel}
                </p>
                <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                >
                    {result.body}
                </p>
                <div
                    className="rounded border p-3 text-left text-[11px]"
                    style={{
                        borderColor: "var(--border-subtle)",
                        color: "var(--text-secondary)",
                    }}
                >
                    <p className="mb-2 text-[10px] uppercase tracking-[2px] text-[color:var(--text-muted)]">
                        Global Affinity Matrix
                    </p>
                    <div className="h-3 w-full overflow-hidden rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)]">
                        <div className="flex h-full w-full">
                            <span
                                style={{
                                    width: `${affinity.establishment}%`,
                                    background: "#f87171",
                                }}
                            />
                            <span
                                style={{
                                    width: `${affinity.apathy}%`,
                                    background: "#64748b",
                                }}
                            />
                            <span
                                style={{
                                    width: `${affinity.insurgency}%`,
                                    background: "var(--accent-player)",
                                }}
                            />
                        </div>
                    </div>
                    <p className="mt-2 text-[10px] uppercase tracking-[1.5px] text-[color:var(--text-muted)]">
                        EST {affinity.establishment.toFixed(1)}% | APA {affinity.apathy.toFixed(1)}% | INS {affinity.insurgency.toFixed(1)}%
                    </p>
                </div>
                <div
                    className="grid grid-cols-2 gap-2 rounded border p-3 text-[11px]"
                    style={{
                        borderColor: "var(--border-subtle)",
                        color: "var(--text-secondary)",
                    }}
                >
                    <div className="space-y-1 text-left">
                        <p className="text-[10px] uppercase tracking-[2px] text-[color:var(--text-muted)]">
                            Mission Metrics
                        </p>
                        <Stat label="Epochs Completed" value={`${result.epochs}/${result.epochs}`} />
                        <Stat label="Districts Held" value={`${result.controlled}/${result.total}`} />
                    </div>
                    <div className="space-y-1 text-left">
                        <p className="text-[10px] uppercase tracking-[2px] text-[color:var(--text-muted)]">
                            Memetic Impact
                        </p>
                        <Stat label="Avg Resonance" value={formatPercent(result.avg, 1)} />
                        <Stat label="System Exposure" value={`${districtsPct.toFixed(1)}%`} />
                    </div>
                </div>
                <p
                    className="rounded border px-3 py-2 text-left text-[11px] italic"
                    style={{
                        borderColor: "var(--border-subtle)",
                        color: "var(--text-secondary)",
                    }}
                >
                    {legacyLine}
                </p>
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
                    Share Dossier
                </button>
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

export default ResultOverlay;
