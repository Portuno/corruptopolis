export interface InfoEntry {
    title: string;
    content: string;
}

export interface LoreEntry {
    name: string;
    role: string;
    description: string;
}

export const GAME_MECHANICS: readonly InfoEntry[] = [
    {
        title: "Campaign Clock",
        content:
            "A full run lasts 12 epochs. Every epoch is a strategic cycle where your narrative pressure expands, then the Matrix pushes back.",
    },
    {
        title: "District Influence",
        content:
            "Each district stores alignment from 0 to 1. Higher alignment means stronger MCO narrative control and better electoral momentum.",
    },
    {
        title: "Meme Deployment",
        content:
            "Use Broadcast for cheap expansion or Fortify for durable district control. Action points reset each epoch.",
    },
    {
        title: "Faction Outbreak",
        content:
            "At epoch 7, a Memetic Crisis outbreak interrupts play. You must record a tactical voice directive within 30 seconds.",
    },
    {
        title: "MAC Clinical Audit",
        content:
            "Gemini evaluates faction discourse and returns a modifier from -1.0 to +1.0 plus clinical feedback.",
    },
    {
        title: "Nerf Escalation",
        content:
            "After every victory, you must choose one of three self-nerfs for the next run. This stacks difficulty so each win path gets harder.",
    },
    {
        title: "Credits and Meta Progression",
        content:
            "Credits are earned only on defeat or after reaching 12 consecutive wins (campaign done). Spend credits on perks and equip your loadout before the next run.",
    },
];

export const GAME_LORE: readonly LoreEntry[] = [
    {
        name: "Lautaro",
        role: "The President of Corruptopolis",
        description:
            "A central symbolic and political figure in the simulation's ideological battlefield.",
    },
    {
        name: "Meme Commander Officer (MCO)",
        role: "Player Character",
        description:
            "You lead memetic operations, execute narrative maneuvers, and attempt to collapse the Collaborative Corruption Matrix.",
    },
    {
        name: "Meme Warfare Center (MWC)",
        role: "Strategic Command Cell",
        description:
            "An operational doctrine engine that treats ideology as a contagion and deploys memetic inoculation protocols.",
    },
    {
        name: "Meme Analysis Cell (MAC)",
        role: "Audit and Code-Breaking Unit",
        description:
            "A Bletchley-style analysis unit that measures memetic fitness, ideological alignment, and viral potential.",
    },
    {
        name: "Collaborative Corruption Matrix",
        role: "Primary Antagonist System",
        description:
            "An entrenched adaptive network that seeks to preserve narrative control through social, political, and institutional inertia.",
    },
];
