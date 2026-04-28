import type { ElementKey } from "./types";

export interface CrisisEvent {
    id: string;
    faction: ElementKey;
    title: string;
    description: string;
}

export const CRISIS_EVENTS: readonly CrisisEvent[] = [
    {
        id: "economic-142857-hardware-syndicate",
        faction: "economic",
        title: "The 14.2857 Hardware Syndicate",
        description:
            "A Lanzadera supply collapse has halted hardware production. The Matrix is suppressing the 14.2857 frequency required for the first memetic transmitter run. Inoculate stakeholders: 'The particle is Lautaro.'",
    },
    {
        id: "religious-22-arcanes-initiates",
        faction: "religious",
        title: "The Initiates of the 22 Arcanes",
        description:
            "A schism has erupted over the Alef position. Traditionalists frame the Mago as control, while the MWC frames Alef as the living Sum of the Whole. Re-systematize belief through the 22 arcanes and 22 letters.",
    },
    {
        id: "political-electoral-council-2028",
        faction: "political",
        title: "The Corruptopolis Electoral Council",
        description:
            "As October 2028 approaches, state media committees label the MCO's message as mental toxicity. Undecided noncombatants are trapped in an unhealthy stress loop. Force a narrative quarantine before the 12-epoch countdown collapses.",
    },
    {
        id: "scientific-lautaro-field-group",
        faction: "scientific",
        title: "The Lautaro Field Research Group",
        description:
            "A leak confirms that Matter is Lautaro and Field is Lautaro. The Matrix is enforcing a false linear time-space dilation model to disorient the population. Re-anchor observers at Position Zero.",
    },
    {
        id: "cultural-viveros-narrative-collective",
        faction: "cultural",
        title: "The Viveros Narrative Collective",
        description:
            "Establishment critics attack local artists as empty images without flavor. Cultural mood is scentless and stagnant. Deploy an Innovation Meme inspired by a lead-user process and make stagnation obsolete.",
    },
    {
        id: "social-legal-scavenger-bar-association",
        faction: "political",
        title: "The Scavenger Bar Association",
        description:
            "Legal scavengers are distributing hospital business cards while litigating against MCO housing reforms to protect the Collaborative Corruption Matrix. Address the legal apparatus directly and impose a necessary re-systematization.",
    },
];

export const pickRandomCrisis = (): CrisisEvent => {
    const idx = Math.floor(Math.random() * CRISIS_EVENTS.length);
    return CRISIS_EVENTS[idx];
};
