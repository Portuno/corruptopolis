import type { ElementKey } from "./types";

export type PerkId =
    | "surge_network"
    | "fortress_doctrine"
    | "diplomatic_pressure"
    | "stability_protocol";

export type NerfId =
    | "player_less_ap"
    | "enemy_more_drag"
    | "less_influence"
    | "weaker_actions";

export type UnlockId =
    | "extra_ap"
    | "reinforced_fortify"
    | "diplomacy_mastery"
    | "signal_amplifier";

export interface RunPerk {
    id: PerkId;
    name: string;
    description: string;
}

export interface RunNerf {
    id: NerfId;
    name: string;
    description: string;
}

export interface UnlockDef {
    id: UnlockId;
    name: string;
    description: string;
    cost: number;
}

export type CreditGrantReason = "none" | "defeat" | "campaign_done";

export interface CampaignState {
    wins: number;
    done: boolean;
    activeNerfs: NerfId[];
}

export interface RunModifiers {
    extraAp: number;
    fortifyDurationBonus: number;
    diplomacyScaleMultiplier: number;
    propagationBonus: number;
    enemyDragMultiplier: number;
}

export interface MetaProgress {
    credits: number;
    unlocked: Record<UnlockId, boolean>;
    ownedPerks: Record<PerkId, boolean>;
    equippedPerks: PerkId[];
    campaign: CampaignState;
}

export interface RoundRewardSummary {
    round: number;
    score: number;
    creditsEarned: number;
    avgBonus: number;
    districtBonus: number;
    efficiencyBonus: number;
    streakMultiplier: number;
    creditGrantReason: CreditGrantReason;
}

const META_STORAGE = "corruptopolis-meta-progress-v1";

export const RUN_PERKS: readonly RunPerk[] = [
    {
        id: "surge_network",
        name: "Surge Network",
        description: "Propagation transfer is stronger this run.",
    },
    {
        id: "fortress_doctrine",
        name: "Fortress Doctrine",
        description: "Fortify lasts longer and resists enemy pressure.",
    },
    {
        id: "diplomatic_pressure",
        name: "Diplomatic Pressure",
        description: "Diplomacy actions have higher positive impact.",
    },
    {
        id: "stability_protocol",
        name: "Stability Protocol",
        description: "Enemy friction is reduced this run.",
    },
];

export const RUN_NERFS: readonly RunNerf[] = [
    {
        id: "player_less_ap",
        name: "Scarce Logistics",
        description: "You start each epoch with 1 less AP.",
    },
    {
        id: "enemy_more_drag",
        name: "Hostile Momentum",
        description: "Enemy friction pressure is stronger.",
    },
    {
        id: "less_influence",
        name: "Signal Attenuation",
        description: "Propagation transfer is weaker.",
    },
    {
        id: "weaker_actions",
        name: "Diplomatic Fatigue",
        description: "Diplomacy actions are less effective.",
    },
];

export const UNLOCKS: readonly UnlockDef[] = [
    {
        id: "extra_ap",
        name: "Field Logistics",
        description: "Start each epoch with +1 AP.",
        cost: 10,
    },
    {
        id: "reinforced_fortify",
        name: "Reinforced Fortify",
        description: "Fortify gains +1 extra duration.",
        cost: 12,
    },
    {
        id: "diplomacy_mastery",
        name: "Diplomacy Mastery",
        description: "Diplomacy actions are stronger across every run.",
        cost: 14,
    },
    {
        id: "signal_amplifier",
        name: "Signal Amplifier",
        description: "Broadcast propagation is slightly stronger.",
        cost: 16,
    },
];

const DEFAULT_UNLOCKS: Record<UnlockId, boolean> = {
    extra_ap: false,
    reinforced_fortify: false,
    diplomacy_mastery: false,
    signal_amplifier: false,
};

const DEFAULT_OWNED_PERKS: Record<PerkId, boolean> = {
    surge_network: false,
    fortress_doctrine: false,
    diplomatic_pressure: false,
    stability_protocol: false,
};

export const defaultMetaProgress = (): MetaProgress => ({
    credits: 0,
    unlocked: { ...DEFAULT_UNLOCKS },
    ownedPerks: { ...DEFAULT_OWNED_PERKS },
    equippedPerks: [],
    campaign: {
        wins: 0,
        done: false,
        activeNerfs: [],
    },
});

export const readMetaProgress = (): MetaProgress => {
    if (typeof window === "undefined") return defaultMetaProgress();
    try {
        const raw = window.localStorage.getItem(META_STORAGE);
        if (!raw) return defaultMetaProgress();
        const parsed = JSON.parse(raw) as Partial<MetaProgress>;
        const rawEquipped = Array.isArray(parsed.equippedPerks)
            ? parsed.equippedPerks.filter((perk): perk is PerkId =>
                  perk in DEFAULT_OWNED_PERKS,
              )
            : [];
        const rawCampaign =
            parsed.campaign && typeof parsed.campaign === "object"
                ? parsed.campaign
                : null;
        const campaignWins =
            rawCampaign && typeof rawCampaign.wins === "number"
                ? Math.max(0, Math.floor(rawCampaign.wins))
                : 0;
        const campaignDone = !!(rawCampaign && rawCampaign.done);
        const activeNerfs =
            rawCampaign && Array.isArray(rawCampaign.activeNerfs)
                ? rawCampaign.activeNerfs.filter((nerf): nerf is NerfId =>
                      RUN_NERFS.some((def) => def.id === nerf),
                  )
                : [];
        return {
            credits:
                typeof parsed.credits === "number" && parsed.credits > 0
                    ? Math.floor(parsed.credits)
                    : 0,
            unlocked: {
                ...DEFAULT_UNLOCKS,
                ...(parsed.unlocked ?? {}),
            },
            ownedPerks: {
                ...DEFAULT_OWNED_PERKS,
                ...(parsed.ownedPerks ?? {}),
            },
            equippedPerks: rawEquipped,
            campaign: {
                wins: campaignWins,
                done: campaignDone,
                activeNerfs,
            },
        };
    } catch {
        return defaultMetaProgress();
    }
};

export const writeMetaProgress = (meta: MetaProgress): void => {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(META_STORAGE, JSON.stringify(meta));
    } catch {
        /* ignore write failures */
    }
};

export const samplePerks = (
    selectedPerks: readonly PerkId[],
    limit: number,
): RunPerk[] => {
    const available = RUN_PERKS.filter((perk) => !selectedPerks.includes(perk.id));
    const pool = [...available];
    const picked: RunPerk[] = [];
    while (pool.length > 0 && picked.length < limit) {
        const idx = Math.floor(Math.random() * pool.length);
        const [perk] = pool.splice(idx, 1);
        picked.push(perk);
    }
    return picked;
};

export const sampleNerfs = (
    selectedNerfs: readonly NerfId[],
    limit: number,
): RunNerf[] => {
    const available = RUN_NERFS.filter((nerf) => !selectedNerfs.includes(nerf.id));
    const pool = [...available];
    const picked: RunNerf[] = [];
    while (pool.length > 0 && picked.length < limit) {
        const idx = Math.floor(Math.random() * pool.length);
        const [nerf] = pool.splice(idx, 1);
        picked.push(nerf);
    }
    return picked;
};

export const hasPerk = (perks: readonly PerkId[], perkId: PerkId): boolean =>
    perks.includes(perkId);

export const computeRunModifiers = (
    selectedPerks: readonly PerkId[],
    activeNerfs: readonly NerfId[],
    unlocked: Record<UnlockId, boolean>,
): RunModifiers => {
    const extraAp =
        (unlocked.extra_ap ? 1 : 0) +
        (activeNerfs.includes("player_less_ap") ? -1 : 0);
    const fortifyDurationBonus =
        (hasPerk(selectedPerks, "fortress_doctrine") ? 1 : 0) +
        (unlocked.reinforced_fortify ? 1 : 0);
    const diplomacyScaleMultiplier =
        (1 +
            (hasPerk(selectedPerks, "diplomatic_pressure") ? 0.28 : 0) +
            (unlocked.diplomacy_mastery ? 0.12 : 0)) *
        (activeNerfs.includes("weaker_actions") ? 0.85 : 1);
    const propagationBonus =
        ((hasPerk(selectedPerks, "surge_network") ? 0.08 : 0) +
            (unlocked.signal_amplifier ? 0.05 : 0)) -
        (activeNerfs.includes("less_influence") ? 0.06 : 0);
    const enemyDragMultiplier =
        (hasPerk(selectedPerks, "stability_protocol") ? 0.85 : 1) *
        (activeNerfs.includes("enemy_more_drag") ? 1.2 : 1);
    return {
        extraAp,
        fortifyDurationBonus,
        diplomacyScaleMultiplier,
        propagationBonus,
        enemyDragMultiplier,
    };
};

export interface RoundScoreInput {
    avg: number;
    controlled: number;
    apLeft: number;
    campaignWins: number;
    reason: CreditGrantReason;
}

export const computeCampaignCredits = (
    round: number,
    input: RoundScoreInput,
): RoundRewardSummary => {
    const base = 100;
    const districtBonus = input.controlled * 2;
    const avgBonus = Math.floor(input.avg * 100);
    const efficiencyBonus = Math.max(0, input.apLeft) * 10;
    const streakMultiplier = 1 + Math.max(0, input.campaignWins - 1) * 0.1;
    const score = Math.floor(
        (base + districtBonus + avgBonus + efficiencyBonus) * streakMultiplier,
    );
    const reasonScale =
        input.reason === "campaign_done"
            ? 1.5
            : input.reason === "defeat"
              ? 1
              : 0;
    const creditsEarned =
        reasonScale > 0 ? Math.max(1, Math.floor((score / 25) * reasonScale)) : 0;
    return {
        round,
        score,
        creditsEarned,
        avgBonus,
        districtBonus,
        efficiencyBonus,
        streakMultiplier,
        creditGrantReason: input.reason,
    };
};

export const unlockMapById = (): Record<UnlockId, UnlockDef> =>
    UNLOCKS.reduce(
        (acc, unlock) => {
            acc[unlock.id] = unlock;
            return acc;
        },
        {} as Record<UnlockId, UnlockDef>,
    );

export const factionModifierFloor = (
    modifier: number,
    unlocked: Record<UnlockId, boolean>,
    _faction: ElementKey,
): number => {
    if (!unlocked.diplomacy_mastery) return modifier;
    if (modifier >= 0) return Math.max(modifier, 0.08);
    return modifier;
};
