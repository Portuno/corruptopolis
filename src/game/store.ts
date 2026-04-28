import { create } from "zustand";

import {
    DIFFICULTY_CONFIG,
    EPOCH_LABELS,
    FORTIFY_DURATION,
    STARTING_AP,
    TOTAL_EPOCHS,
} from "./constants";
import { buildGrid, getNeighbors } from "./grid";
import {
    computeGlobalStats,
    enemyLabel,
    evaluateVibe,
    predictEnemyIntent,
    processDiplomacyActions,
    runEnemyFriction,
    runPropagation,
    type PropagationResult,
} from "./propagation";
import { pickRandomCrisis, type CrisisEvent } from "./crisis";
import {
    computeCampaignCredits,
    computeRunModifiers,
    defaultMetaProgress,
    factionModifierFloor,
    readMetaProgress,
    sampleNerfs,
    unlockMapById,
    writeMetaProgress,
    type MetaProgress,
    type NerfId,
    type PerkId,
    type RoundRewardSummary,
    type RunNerf,
    type UnlockId,
} from "./roguelike";
import type {
    CrisisImpactPayload,
    DiplomacyAction,
    EnemyIntent,
    ElementKey,
    GameDifficulty,
    Grid,
    LivingHiveIntensity,
    MatchResult,
    MemeMode,
    Phase,
    QueueItem,
    VibeKey,
} from "./types";

export interface ResultData {
    title: string;
    body: string;
    isWin: boolean;
    avg: number;
    controlled: number;
    total: number;
    epochs: number;
    cadence: number;
}

export interface CrisisDebriefData {
    title: string;
    briefingReport: string;
    targetElement: ElementKey;
    score: number;
    primaryHexModifier: number;
    globalSubElementModifier: number;
    spokenSummary: string;
    visualEffects: string[];
}

interface GameState {
    phase: Phase;
    epochNumber: number;
    ap: number;
    selectedMeme: MemeMode;
    selectedCadence: number;
    grid: Grid;
    actionQueue: QueueItem[];
    queueIdCounter: number;
    pulsingNode: { col: number; row: number } | null;
    selectedHex: { col: number; row: number } | null;
    flashAp: boolean;
    vibeLabel: string;
    vibeKey: VibeKey;
    matrixLabel: string;
    avg: number;
    controlled: number;
    total: number;
    monthLabel: string;
    epochCounter: string;
    epochProgress: number;
    result: ResultData | null;
    enemyIntent: EnemyIntent;
    activeCrisis: CrisisEvent | null;
    crisisDebrief: CrisisDebriefData | null;
    lastCrisisElement: ElementKey | null;
    lastCrisisEpoch: number;
    lastCrisisRound: number;
    roundNumber: number;
    winStreak: number;
    offeredNerfs: RunNerf[];
    roundReward: RoundRewardSummary | null;
    metaProgress: MetaProgress;
    metaShopOpen: boolean;
    matchSaved: boolean;
    matchStartedAt: number;
    onPropagationEvent: ((event: "harmonic", data?: ElementKey) => void) | null;
    livingHiveEnabled: boolean;
    livingHiveIntensity: LivingHiveIntensity;
    gameDifficulty: GameDifficulty;
    setOnPropagationEvent: (
        cb: ((event: "harmonic", data?: ElementKey) => void) | null,
    ) => void;
    setLivingHiveEnabled: (enabled: boolean) => void;
    setLivingHiveIntensity: (intensity: LivingHiveIntensity) => void;
    setGameDifficulty: (difficulty: GameDifficulty) => void;
    selectCadence: (n: number) => void;
    selectMemeMode: (m: MemeMode) => void;
    launchGame: () => void;
    restartGame: () => void;
    deployMeme: (col: number, row: number) => boolean;
    addDiplomacyAction: (faction: ElementKey, modifier: number) => void;
    removeQueueItem: (id: number) => void;
    executeTurn: () => void;
    triggerPulse: (col: number, row: number) => void;
    clearPulse: () => void;
    selectHex: (col: number, row: number) => void;
    clearSelectedHex: () => void;
    flashApRed: () => void;
    clearApFlash: () => void;
    markMatchSaved: () => void;
    clearResult: () => void;
    openMetaShop: () => void;
    closeMetaShop: () => void;
    buyPerk: (perkId: PerkId) => boolean;
    buyUnlock: (unlockId: UnlockId) => boolean;
    setLoadout: (perkIds: PerkId[]) => void;
    confirmLoadoutAndStartRound: () => void;
    pickNerfAndContinue: (nerfId: NerfId) => void;
    startNewRun: () => void;
    resolveCrisis: (payload: CrisisImpactPayload) => void;
    resolveCrisisSilence: () => void;
    dismissCrisisDebrief: () => void;
}

const computeDerived = (
    grid: Grid,
    epochNumber: number,
): Pick<
    GameState,
    | "avg"
    | "controlled"
    | "total"
    | "matrixLabel"
    | "monthLabel"
    | "epochCounter"
    | "epochProgress"
> => {
    const stats = computeGlobalStats(grid);
    const idx = Math.min(epochNumber - 1, EPOCH_LABELS.length - 1);
    return {
        avg: stats.avg,
        controlled: stats.controlled,
        total: stats.total,
        matrixLabel: enemyLabel(stats.avg),
        monthLabel: EPOCH_LABELS[idx],
        epochCounter: `EPOCH ${epochNumber} / ${TOTAL_EPOCHS}`,
        epochProgress: ((epochNumber - 1) / TOTAL_EPOCHS) * 100,
    };
};

const initialGrid = (): Grid => {
    if (typeof window === "undefined") {
        return [];
    }
    return buildGrid();
};

const SILENCE_IMPACT = 0.12;
const SILENCE_MIN_APPROVAL = 0.1;
type CrisisBalanceProfile = {
    primaryAlignmentScale: number;
    subElementScale: number;
    repeatEpochWindow: number;
    repeatDamping: number;
    scoreFactorBase: number;
    scoreFactorBonus: number;
};

const CRISIS_BALANCE_PROFILES: Record<
    "arcade" | "standard" | "hardcore",
    CrisisBalanceProfile
> = {
    arcade: {
        primaryAlignmentScale: 0.3,
        subElementScale: 0.34,
        repeatEpochWindow: 1,
        repeatDamping: 0.82,
        scoreFactorBase: 0.95,
        scoreFactorBonus: 0.4,
    },
    standard: {
        primaryAlignmentScale: 0.22,
        subElementScale: 0.25,
        repeatEpochWindow: 2,
        repeatDamping: 0.7,
        scoreFactorBase: 0.85,
        scoreFactorBonus: 0.3,
    },
    hardcore: {
        primaryAlignmentScale: 0.16,
        subElementScale: 0.18,
        repeatEpochWindow: 3,
        repeatDamping: 0.58,
        scoreFactorBase: 0.8,
        scoreFactorBonus: 0.22,
    },
};

// Change this key to switch global crisis feel without touching reducer logic.
const ACTIVE_CRISIS_BALANCE_PROFILE: keyof typeof CRISIS_BALANCE_PROFILES =
    "standard";
const CRISIS_BALANCE =
    CRISIS_BALANCE_PROFILES[ACTIVE_CRISIS_BALANCE_PROFILE];
const unlockIndex = unlockMapById();
const ASTROTURF_PUSH = 0.42;
const STRIKE_POWER = 0.22;
const DEEPFAKE_POWER = 0.16;
const DEEPFAKE_BACKFIRE_CHANCE = 0.28;
const DEEPFAKE_BACKFIRE_PENALTY = 0.12;

const clampAlignment = (value: number): number => Math.max(0, Math.min(1, value));
const clampElementWeight = (value: number): number => Math.max(1, Math.min(12, value));
const factionLabelByKey: Record<ElementKey, string> = {
    political: "Political",
    military: "Military",
    economic: "Economic",
    religious: "Religious",
    scientific: "Scientific",
    cultural: "Cultural",
};

const isPrimaryElementNode = (node: Grid[number][number], element: ElementKey): boolean => {
    const targetWeight = node.elements[element] ?? 0;
    return (
        targetWeight >= node.elements.political &&
        targetWeight >= node.elements.military &&
        targetWeight >= node.elements.economic &&
        targetWeight >= node.elements.religious &&
        targetWeight >= node.elements.scientific &&
        targetWeight >= node.elements.cultural
    );
};

const buildCrisisDebrief = (
    payload: CrisisImpactPayload,
    title: string,
): CrisisDebriefData => {
    const safeScore = Math.max(0, Math.min(100, Math.round(payload.score)));
    const safePrimary = Math.max(-12, Math.min(12, Math.round(payload.primaryHexModifier)));
    const safeGlobal = Math.max(
        -22,
        Math.min(22, Math.round(payload.globalSubElementModifier)),
    );
    const elementLabel = factionLabelByKey[payload.targetElement];
    const primaryDirection = safePrimary >= 0 ? "increased" : "reduced";
    const globalDirection = safeGlobal >= 0 ? "amplified" : "suppressed";
    const spokenSummary =
        safeScore >= 70
            ? "Directive accepted. Tactical posture is stabilizing."
            : safeScore >= 45
              ? "Directive partially accepted. Tactical posture remains contested."
              : "Directive failed quality checks. Tactical posture is deteriorating.";
    return {
        title,
        briefingReport: payload.briefingReport.trim(),
        targetElement: payload.targetElement,
        score: safeScore,
        primaryHexModifier: safePrimary,
        globalSubElementModifier: safeGlobal,
        spokenSummary,
        visualEffects: [
            `Primary ${elementLabel} strongholds ${primaryDirection} (${safePrimary >= 0 ? "+" : ""}${safePrimary}).`,
            `Global ${elementLabel} drift ${globalDirection} (${safeGlobal >= 0 ? "+" : ""}${safeGlobal}).`,
        ],
    };
};

export const getCrisisDampingMultiplier = (
    current: { element: ElementKey; round: number; epoch: number },
    previous: { element: ElementKey | null; round: number; epoch: number },
): number => {
    const repeatedElement =
        previous.element === current.element &&
        previous.round === current.round &&
        Math.abs(current.epoch - previous.epoch) <=
            CRISIS_BALANCE.repeatEpochWindow;
    return repeatedElement ? CRISIS_BALANCE.repeatDamping : 1;
};

export const applyCrisisImpactToGrid = (
    sourceGrid: Grid,
    payload: {
        targetElement: ElementKey;
        score: number;
        primaryHexModifier: number;
        globalSubElementModifier: number;
    },
    dampingMultiplier: number,
): Grid => {
    const safeScore = Math.max(0, Math.min(100, Math.round(payload.score)));
    const safePrimaryHexModifier = Math.max(
        -12,
        Math.min(12, Math.round(payload.primaryHexModifier)),
    );
    const safeGlobalSubElementModifier = Math.max(
        -22,
        Math.min(22, Math.round(payload.globalSubElementModifier)),
    );
    const scoreFactor =
        CRISIS_BALANCE.scoreFactorBase +
        (safeScore / 100) * CRISIS_BALANCE.scoreFactorBonus;
    const adjustedPrimaryModifier = Math.round(
        safePrimaryHexModifier * dampingMultiplier,
    );
    const adjustedGlobalSubModifier = Math.round(
        safeGlobalSubElementModifier * dampingMultiplier * scoreFactor,
    );
    const grid = sourceGrid.map((column) => column.map((node) => ({ ...node })));
    for (let c = 0; c < grid.length; c++) {
        for (let r = 0; r < grid[c].length; r++) {
            const node = grid[c][r];
            if (isPrimaryElementNode(node, payload.targetElement)) {
                const primaryImpact =
                    (adjustedPrimaryModifier / 12) *
                    CRISIS_BALANCE.primaryAlignmentScale;
                node.alignment = clampAlignment(node.alignment + primaryImpact);
            }
            const subElementImpact =
                (adjustedGlobalSubModifier / 22) *
                12 *
                CRISIS_BALANCE.subElementScale;
            node.elements[payload.targetElement] = clampElementWeight(
                node.elements[payload.targetElement] + subElementImpact,
            );
        }
    }
    return grid;
};

const currentMeta = (): MetaProgress => {
    if (typeof window === "undefined") return defaultMetaProgress();
    return readMetaProgress();
};

const persistMeta = (meta: MetaProgress): void => {
    writeMetaProgress(meta);
};

const readLivingHiveEnabled = (): boolean => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("ui.livingHiveEnabled") === "1";
};

const readLivingHiveIntensity = (): LivingHiveIntensity => {
    if (typeof window === "undefined") return "medium";
    const value = window.localStorage.getItem("ui.livingHiveIntensity");
    if (value === "low" || value === "medium" || value === "high") {
        return value;
    }
    return "medium";
};

const readGameDifficulty = (): GameDifficulty => {
    if (typeof window === "undefined") return "medium";
    const value = window.localStorage.getItem("ui.gameDifficulty");
    if (value === "easy" || value === "medium" || value === "hard") {
        return value;
    }
    return "medium";
};

export const useGameStore = create<GameState>((set, get) => ({
    phase: "PLAYER_ACTION",
    epochNumber: 1,
    ap: STARTING_AP,
    selectedMeme: "strike",
    selectedCadence: 12,
    grid: [],
    actionQueue: [],
    queueIdCounter: 0,
    pulsingNode: null,
    selectedHex: null,
    flashAp: false,
    vibeLabel: "—",
    vibeKey: "",
    matrixLabel: "ENTRENCHED",
    avg: 0.5,
    controlled: 0,
    total: 225,
    monthLabel: EPOCH_LABELS[0],
    epochCounter: `EPOCH 1 / ${TOTAL_EPOCHS}`,
    epochProgress: 0,
    result: null,
    enemyIntent: predictEnemyIntent([], 1, DIFFICULTY_CONFIG.medium.enemyAp),
    activeCrisis: null,
    crisisDebrief: null,
    lastCrisisElement: null,
    lastCrisisEpoch: -1,
    lastCrisisRound: -1,
    roundNumber: 1,
    winStreak: 0,
    offeredNerfs: [],
    roundReward: null,
    metaProgress: currentMeta(),
    metaShopOpen: false,
    matchSaved: false,
    matchStartedAt: 0,
    onPropagationEvent: null,
    livingHiveEnabled: readLivingHiveEnabled(),
    livingHiveIntensity: readLivingHiveIntensity(),
    gameDifficulty: readGameDifficulty(),

    setOnPropagationEvent: (cb) => set({ onPropagationEvent: cb }),

    setLivingHiveEnabled: (enabled) => {
        if (typeof window !== "undefined") {
            window.localStorage.setItem("ui.livingHiveEnabled", enabled ? "1" : "0");
        }
        set({ livingHiveEnabled: enabled });
    },

    setLivingHiveIntensity: (intensity) => {
        if (typeof window !== "undefined") {
            window.localStorage.setItem("ui.livingHiveIntensity", intensity);
        }
        set({ livingHiveIntensity: intensity });
    },

    setGameDifficulty: (difficulty) => {
        if (typeof window !== "undefined") {
            window.localStorage.setItem("ui.gameDifficulty", difficulty);
        }
        const s = get();
        const enemyAp = DIFFICULTY_CONFIG[difficulty].enemyAp;
        set({
            gameDifficulty: difficulty,
            enemyIntent: predictEnemyIntent(s.grid, s.epochNumber, enemyAp),
        });
    },

    selectCadence: (n) => set({ selectedCadence: n }),

    selectMemeMode: (m) => set({ selectedMeme: m }),

    launchGame: () => {
        const s = get();
        const enemyAp = DIFFICULTY_CONFIG[s.gameDifficulty].enemyAp;
        const modifiers = computeRunModifiers(
            s.metaProgress.equippedPerks,
            s.metaProgress.campaign.activeNerfs,
            s.metaProgress.unlocked,
        );
        const startingAp = STARTING_AP + modifiers.extraAp;
        const grid = initialGrid();
        const vibe = evaluateVibe(computeGlobalStats(grid).avg);
        set({
            grid,
            phase: "PLAYER_ACTION",
            epochNumber: 1,
            ap: startingAp,
            selectedMeme: "strike",
            actionQueue: [],
            queueIdCounter: 0,
            pulsingNode: null,
            selectedHex: null,
            vibeLabel: vibe.label,
            vibeKey: vibe.key,
            result: null,
            enemyIntent: predictEnemyIntent(grid, 1, enemyAp),
            activeCrisis: null,
            crisisDebrief: null,
            lastCrisisElement: null,
            lastCrisisEpoch: -1,
            lastCrisisRound: -1,
            matchSaved: false,
            matchStartedAt: Date.now(),
            roundReward: null,
            ...computeDerived(grid, 1),
        });
    },

    restartGame: () => {
        const s = get();
        s.startNewRun();
    },

    deployMeme: (col, row) => {
        const s = get();
        if (s.phase !== "PLAYER_ACTION") return false;
        const modifiers = computeRunModifiers(
            s.metaProgress.equippedPerks,
            s.metaProgress.campaign.activeNerfs,
            s.metaProgress.unlocked,
        );
        const grid = s.grid.map((column) => column.map((node) => ({ ...node })));
        const actionCost = (() => {
            if (s.selectedMeme === "deepfake") return 3;
            if (s.selectedMeme === "astroturf") return 2;
            return 1;
        })();
        if (s.ap < actionCost) {
            set({ flashAp: true });
            return false;
        }

        if (s.selectedMeme === "strike") {
            grid[col][row].alignment = clampAlignment(grid[col][row].alignment + STRIKE_POWER);
        } else if (s.selectedMeme === "echo") {
            grid[col][row].alignment = 1;
            grid[col][row].fortified =
                FORTIFY_DURATION + modifiers.fortifyDurationBonus;
        } else if (s.selectedMeme === "astroturf") {
            const hasBlueCluster = getNeighbors(col, row).some(([nc, nr]) => {
                const neighbor = grid[nc][nr];
                return neighbor.alignment >= 0.5;
            });
            if (hasBlueCluster) {
                set({ flashAp: true });
                return false;
            }
            grid[col][row].alignment = clampAlignment(
                grid[col][row].alignment + ASTROTURF_PUSH,
            );
            grid[col][row].fortified = 1;
        } else {
            const impactTiles: Array<[number, number]> = [
                [col, row],
                ...getNeighbors(col, row),
            ];
            impactTiles.forEach(([tc, tr]) => {
                const node = grid[tc][tr];
                node.alignment = clampAlignment(node.alignment + DEEPFAKE_POWER);
            });
            if (Math.random() < DEEPFAKE_BACKFIRE_CHANCE) {
                impactTiles.forEach(([tc, tr]) => {
                    const node = grid[tc][tr];
                    node.alignment = clampAlignment(
                        node.alignment - DEEPFAKE_BACKFIRE_PENALTY,
                    );
                });
            }
        }

        set({
            grid,
            ap: s.ap - actionCost,
            pulsingNode: { col, row },
            ...computeDerived(grid, s.epochNumber),
        });
        return true;
    },

    addDiplomacyAction: (faction, modifier) => {
        const s = get();
        const adjustedModifier = factionModifierFloor(
            modifier,
            s.metaProgress.unlocked,
            faction,
        );
        const id = s.queueIdCounter + 1;
        const action: DiplomacyAction = {
            id,
            type: "DIPLOMACY",
            faction,
            modifier: adjustedModifier,
            label: `${faction} ${adjustedModifier >= 0 ? "+" : ""}${adjustedModifier.toFixed(2)}`,
        };
        set({
            actionQueue: [...s.actionQueue, action],
            queueIdCounter: id,
        });
    },

    removeQueueItem: (id) => {
        const s = get();
        set({ actionQueue: s.actionQueue.filter((a) => a.id !== id) });
    },

    executeTurn: () => {
        const s = get();
        if (s.phase !== "PLAYER_ACTION") return;
        set({ phase: "CALCULATING" });

        setTimeout(() => {
            const next = get();
            const enemyAp = DIFFICULTY_CONFIG[next.gameDifficulty].enemyAp;
            const grid = next.grid.map((column) =>
                column.map((node) => ({ ...node })),
            );
            const modifiers = computeRunModifiers(
                next.metaProgress.equippedPerks,
                next.metaProgress.campaign.activeNerfs,
                next.metaProgress.unlocked,
            );

            processDiplomacyActions(grid, next.actionQueue, {
                diplomacyScaleMultiplier: modifiers.diplomacyScaleMultiplier,
            });
            const propagation: PropagationResult = runPropagation(grid, {
                propagationBonus: modifiers.propagationBonus,
            });
            runEnemyFriction(grid, next.epochNumber, {
                enemyDragMultiplier: modifiers.enemyDragMultiplier,
            }, enemyAp);

            const vibe = evaluateVibe(computeGlobalStats(grid).avg);
            const cb = next.onPropagationEvent;
            if (cb && propagation.harmonicDemo) {
                cb("harmonic", propagation.harmonicDemo);
            }

            const isFinalEpoch = next.epochNumber >= TOTAL_EPOCHS;
            if (isFinalEpoch) {
                const stats = computeGlobalStats(grid);
                const isWin = stats.avg > 0.5;
                const pct = (stats.avg * 100).toFixed(1);
                const distPct = (
                    (stats.controlled / stats.total) *
                    100
                ).toFixed(1);
                const result: ResultData = {
                    isWin,
                    title: isWin ? "ELECTORAL VICTORY" : "ELECTORAL DEFEAT",
                    body: isWin
                        ? `Narrative Dominance: ${pct}% · Districts Held: ${stats.controlled} / ${stats.total} (${distPct}%). The Collaborative Corruption Matrix conceded at 23:47. The Generational Organ of Memes overwhelmed their legacy media channels.`
                        : `Narrative Dominance: ${pct}% · Districts Held: ${stats.controlled} / ${stats.total} (${distPct}%). The Establishment retained power. Their corner strongholds held the narrative perimeter. MCO position suspended pending review.`,
                    avg: stats.avg,
                    controlled: stats.controlled,
                    total: stats.total,
                    epochs: TOTAL_EPOCHS,
                    cadence: next.selectedCadence,
                };
                const nextStreak = isWin ? next.winStreak + 1 : 0;
                const nextCampaignWins = isWin
                    ? next.metaProgress.campaign.wins + 1
                    : next.metaProgress.campaign.wins;
                const creditReason =
                    !isWin
                        ? "defeat"
                        : nextCampaignWins >= 12
                          ? "campaign_done"
                          : "none";
                const roundReward = computeCampaignCredits(next.roundNumber, {
                    avg: stats.avg,
                    controlled: stats.controlled,
                    apLeft: next.ap,
                    campaignWins: Math.max(1, nextCampaignWins),
                    reason: creditReason,
                });
                const resetCampaign = !isWin || nextCampaignWins >= 12;
                const metaProgress: MetaProgress = {
                    ...next.metaProgress,
                    credits: next.metaProgress.credits + roundReward.creditsEarned,
                    campaign: resetCampaign
                        ? {
                              wins: 0,
                              done: isWin && nextCampaignWins >= 12,
                              activeNerfs: [],
                          }
                        : {
                              wins: nextCampaignWins,
                              done: false,
                              activeNerfs: next.metaProgress.campaign.activeNerfs,
                          },
                };
                persistMeta(metaProgress);
                set({
                    grid,
                    actionQueue: [],
                    pulsingNode: null,
                    vibeLabel: vibe.label,
                    vibeKey: vibe.key,
                    result,
                    enemyIntent: predictEnemyIntent(grid, next.epochNumber, enemyAp),
                    phase: "ROUND_REWARD",
                    activeCrisis: null,
                    crisisDebrief: null,
                    winStreak: nextStreak,
                    roundReward,
                    offeredNerfs:
                        isWin && nextCampaignWins < 12
                            ? sampleNerfs(next.metaProgress.campaign.activeNerfs, 3)
                            : [],
                    metaProgress,
                    metaShopOpen: false,
                    ...computeDerived(grid, next.epochNumber),
                });
                return;
            }

            const newEpoch = next.epochNumber + 1;
            const startingAp = STARTING_AP + modifiers.extraAp;
            if (newEpoch === 7 && !next.activeCrisis) {
                set({
                    grid,
                    actionQueue: [],
                    pulsingNode: null,
                    vibeLabel: vibe.label,
                    vibeKey: vibe.key,
                    phase: "CRISIS_RESOLUTION",
                    activeCrisis: pickRandomCrisis(),
                    crisisDebrief: null,
                    epochNumber: newEpoch,
                    ap: startingAp,
                    enemyIntent: predictEnemyIntent(grid, newEpoch, enemyAp),
                    ...computeDerived(grid, newEpoch),
                });
                return;
            }
            set({
                grid,
                actionQueue: [],
                pulsingNode: null,
                vibeLabel: vibe.label,
                vibeKey: vibe.key,
                phase: "PLAYER_ACTION",
                epochNumber: newEpoch,
                ap: startingAp,
                enemyIntent: predictEnemyIntent(grid, newEpoch, enemyAp),
                ...computeDerived(grid, newEpoch),
            });
        }, 90);
    },

    resolveCrisis: (payload) => {
        const s = get();
        if (!s.activeCrisis) return;
        const safeScore = Math.max(0, Math.min(100, Math.round(payload.score)));
        const crisisElement = payload.targetElement || s.activeCrisis.faction;
        const damping = getCrisisDampingMultiplier(
            { element: crisisElement, round: s.roundNumber, epoch: s.epochNumber },
            {
                element: s.lastCrisisElement,
                round: s.lastCrisisRound,
                epoch: s.lastCrisisEpoch,
            },
        );
        const grid = applyCrisisImpactToGrid(
            s.grid,
            {
                targetElement: crisisElement,
                score: safeScore,
                primaryHexModifier: payload.primaryHexModifier,
                globalSubElementModifier: payload.globalSubElementModifier,
            },
            damping,
        );
        const vibe = evaluateVibe(computeGlobalStats(grid).avg);
        const crisisDebrief = buildCrisisDebrief(
            {
                ...payload,
                score: safeScore,
                targetElement: crisisElement,
                briefingReport: payload.briefingReport,
            },
            s.activeCrisis.title,
        );
        set({
            grid,
            activeCrisis: null,
            crisisDebrief,
            lastCrisisElement: crisisElement,
            lastCrisisEpoch: s.epochNumber,
            lastCrisisRound: s.roundNumber,
            phase: "PLAYER_ACTION",
            vibeLabel: vibe.label,
            vibeKey: vibe.key,
            ...computeDerived(grid, s.epochNumber),
        });
    },

    resolveCrisisSilence: () => {
        const s = get();
        if (!s.activeCrisis) return;
        const grid = s.grid.map((column) => column.map((node) => ({ ...node })));
        for (let c = 0; c < grid.length; c++) {
            for (let r = 0; r < grid[c].length; r++) {
                const node = grid[c][r];
                node.alignment = Math.max(
                    SILENCE_MIN_APPROVAL,
                    node.alignment - SILENCE_IMPACT,
                );
            }
        }
        const vibe = evaluateVibe(computeGlobalStats(grid).avg);
        const crisisDebrief: CrisisDebriefData = {
            title: s.activeCrisis.title,
            briefingReport:
                "No directive was submitted. Crisis pressure propagated without a counter-narrative response.",
            targetElement: s.activeCrisis.faction,
            score: 0,
            primaryHexModifier: -12,
            globalSubElementModifier: -22,
            spokenSummary: "Silence logged. Crisis pressure is intensifying.",
            visualEffects: [
                "All districts lost baseline alignment due to unopposed outbreak pressure.",
                "No targeted faction correction was applied this epoch.",
            ],
        };
        set({
            grid,
            activeCrisis: null,
            crisisDebrief,
            phase: "PLAYER_ACTION",
            vibeLabel: vibe.label,
            vibeKey: vibe.key,
            ...computeDerived(grid, s.epochNumber),
        });
    },

    triggerPulse: (col, row) => set({ pulsingNode: { col, row } }),

    clearPulse: () => set({ pulsingNode: null }),

    selectHex: (col, row) => set({ selectedHex: { col, row } }),

    clearSelectedHex: () => set({ selectedHex: null }),

    flashApRed: () => set({ flashAp: true }),

    clearApFlash: () => set({ flashAp: false }),

    markMatchSaved: () => set({ matchSaved: true }),

    clearResult: () => set({ result: null }),

    openMetaShop: () => set({ metaShopOpen: true, phase: "META_SHOP" }),

    closeMetaShop: () => set({ metaShopOpen: false, phase: "ROUND_REWARD" }),

    buyPerk: (perkId) => {
        const s = get();
        if (s.metaProgress.ownedPerks[perkId]) return false;
        const perkCost = 8;
        if (s.metaProgress.credits < perkCost) return false;
        const updated: MetaProgress = {
            ...s.metaProgress,
            credits: s.metaProgress.credits - perkCost,
            ownedPerks: { ...s.metaProgress.ownedPerks, [perkId]: true },
        };
        persistMeta(updated);
        set({ metaProgress: updated });
        return true;
    },

    buyUnlock: (unlockId) => {
        const s = get();
        const unlock = unlockIndex[unlockId];
        if (!unlock) return false;
        if (s.metaProgress.unlocked[unlockId]) return false;
        if (s.metaProgress.credits < unlock.cost) return false;
        const updated: MetaProgress = {
            ...s.metaProgress,
            credits: s.metaProgress.credits - unlock.cost,
            unlocked: { ...s.metaProgress.unlocked, [unlockId]: true },
        };
        persistMeta(updated);
        set({ metaProgress: updated });
        return true;
    },

    setLoadout: (perkIds) => {
        const s = get();
        const unique = [...new Set(perkIds)];
        const filtered = unique.filter((perk): perk is PerkId => {
            return s.metaProgress.ownedPerks[perk];
        });
        const limited = filtered.slice(0, 2);
        const updated: MetaProgress = {
            ...s.metaProgress,
            equippedPerks: limited,
        };
        persistMeta(updated);
        set({ metaProgress: updated });
    },

    confirmLoadoutAndStartRound: () => {
        const s = get();
        const grid = initialGrid();
        const enemyAp = DIFFICULTY_CONFIG[s.gameDifficulty].enemyAp;
        const vibe = evaluateVibe(computeGlobalStats(grid).avg);
        const modifiers = computeRunModifiers(
            s.metaProgress.equippedPerks,
            s.metaProgress.campaign.activeNerfs,
            s.metaProgress.unlocked,
        );
        const shouldContinueCampaign =
            !!s.result?.isWin &&
            s.metaProgress.campaign.wins > 0 &&
            !s.metaProgress.campaign.done;
        const nextRound = shouldContinueCampaign ? s.roundNumber + 1 : 1;
        set({
            grid,
            phase: "PLAYER_ACTION",
            epochNumber: 1,
            ap: STARTING_AP + modifiers.extraAp,
            selectedMeme: "strike",
            actionQueue: [],
            queueIdCounter: 0,
            pulsingNode: null,
            selectedHex: null,
            vibeLabel: vibe.label,
            vibeKey: vibe.key,
            result: null,
            enemyIntent: predictEnemyIntent(grid, 1, enemyAp),
            activeCrisis: null,
            crisisDebrief: null,
            lastCrisisElement: null,
            lastCrisisEpoch: -1,
            lastCrisisRound: -1,
            roundNumber: nextRound,
            winStreak: shouldContinueCampaign ? s.winStreak : 0,
            offeredNerfs: [],
            roundReward: null,
            metaShopOpen: false,
            matchSaved: false,
            matchStartedAt: Date.now(),
            ...computeDerived(grid, 1),
        });
    },

    pickNerfAndContinue: (nerfId) => {
        const s = get();
        if (!s.result?.isWin) return;
        const hasOffer = s.offeredNerfs.some((nerf) => nerf.id === nerfId);
        if (!hasOffer) return;
        if (s.metaProgress.campaign.activeNerfs.includes(nerfId)) return;
        const updated: MetaProgress = {
            ...s.metaProgress,
            campaign: {
                ...s.metaProgress.campaign,
                activeNerfs: [...s.metaProgress.campaign.activeNerfs, nerfId],
            },
        };
        persistMeta(updated);
        set({ metaProgress: updated });
        s.confirmLoadoutAndStartRound();
    },

    startNewRun: () => {
        const s = get();
        const meta = currentMeta();
        const refreshedMeta: MetaProgress = {
            ...meta,
            campaign: {
                wins: 0,
                done: false,
                activeNerfs: [],
            },
        };
        persistMeta(refreshedMeta);
        const grid = initialGrid();
        const enemyAp = DIFFICULTY_CONFIG[s.gameDifficulty].enemyAp;
        const vibe = evaluateVibe(computeGlobalStats(grid).avg);
        const modifiers = computeRunModifiers(
            refreshedMeta.equippedPerks,
            refreshedMeta.campaign.activeNerfs,
            refreshedMeta.unlocked,
        );
        set({
            grid,
            phase: "PLAYER_ACTION",
            epochNumber: 1,
            ap: STARTING_AP + modifiers.extraAp,
            selectedMeme: "strike",
            actionQueue: [],
            queueIdCounter: 0,
            pulsingNode: null,
            selectedHex: null,
            vibeLabel: vibe.label,
            vibeKey: vibe.key,
            result: null,
            enemyIntent: predictEnemyIntent(grid, 1, enemyAp),
            activeCrisis: null,
            crisisDebrief: null,
            lastCrisisElement: null,
            lastCrisisEpoch: -1,
            lastCrisisRound: -1,
            roundNumber: 1,
            winStreak: 0,
            offeredNerfs: [],
            roundReward: null,
            metaProgress: refreshedMeta,
            metaShopOpen: false,
            matchSaved: false,
            matchStartedAt: Date.now(),
            ...computeDerived(grid, 1),
        });
        if (s.metaProgress.credits !== refreshedMeta.credits) {
            persistMeta(refreshedMeta);
        }
    },

    dismissCrisisDebrief: () => set({ crisisDebrief: null }),
}));

export const matchResultFromState = (
    result: ResultData | null,
): MatchResult => {
    if (!result) return "abandoned";
    return result.isWin ? "win" : "loss";
};
