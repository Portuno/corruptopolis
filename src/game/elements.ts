import type { ElementDef, ElementKey } from "./types";

export const ELEMENTS: readonly ElementDef[] = [
    {
        key: "political",
        label: "Political",
        color: "#c084fc",
        letter: "P",
    },
    {
        key: "military",
        label: "Military",
        color: "#f87171",
        letter: "M",
    },
    {
        key: "economic",
        label: "Economic",
        color: "#fbbf24",
        letter: "E",
    },
    {
        key: "religious",
        label: "Religious",
        color: "#a78bfa",
        letter: "R",
    },
    {
        key: "scientific",
        label: "Scientific",
        color: "#38bdf8",
        letter: "S",
    },
    {
        key: "cultural",
        label: "Cultural",
        color: "#4ade80",
        letter: "C",
    },
] as const;

export const ELEMENT_KEYS: readonly ElementKey[] = ELEMENTS.map((e) => e.key);

export const ELEMENT_RGB: Record<ElementKey, [number, number, number]> = {
    political: [192, 132, 252],
    military: [248, 113, 113],
    economic: [251, 191, 36],
    religious: [167, 139, 250],
    scientific: [56, 189, 248],
    cultural: [74, 222, 128],
};
