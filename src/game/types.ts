export type ElementKey =
    | "political"
    | "military"
    | "economic"
    | "religious"
    | "scientific"
    | "cultural";

export type ElementWeights = Record<ElementKey, number>;

export interface ElementDef {
    key: ElementKey;
    label: string;
    color: string;
    letter: string;
}

export interface HexNode {
    alignment: number;
    population: number;
    isEnemySource: boolean;
    elements: ElementWeights;
    fortified: number;
}

export type Grid = HexNode[][];

export type Phase =
    | "PLAYER_ACTION"
    | "CALCULATING"
    | "CRISIS_RESOLUTION"
    | "ROUND_REWARD"
    | "META_SHOP";

export type MemeMode = "strike" | "echo" | "astroturf" | "deepfake";

export type VibeKey = "" | "dominance" | "friction" | "hostile";

export type LivingHiveIntensity = "low" | "medium" | "high";
export type GameDifficulty = "easy" | "medium" | "hard";

export interface DiplomacyAction {
    id: number;
    type: "DIPLOMACY";
    faction: ElementKey;
    modifier: number;
    label: string;
}

export type QueueItem = DiplomacyAction;

export interface Palette {
    enemy: [number, number, number];
    neutral: [number, number, number];
    player: [number, number, number];
}

export interface CanvasTheme {
    bg: string;
    hexBorder: string;
    pulseBorder: string;
    fortify: string;
}

export interface GlobalStats {
    avg: number;
    controlled: number;
    total: number;
}

export interface EnemyIntent {
    epoch: number;
    ap: number;
    infiltration: number;
    strikes: number;
    spread: number;
    plannedTiles: Array<{ col: number; row: number }>;
    summary: string;
}

export interface CrisisImpactPayload {
    targetElement: ElementKey;
    score: number;
    primaryHexModifier: number;
    globalSubElementModifier: number;
    briefingReport: string;
}

export type MatchResult = "win" | "loss" | "abandoned";
