"use client";

import { useGameStore } from "@/game/store";

const Hud = () => {
    const enemyIntent = useGameStore((s) => s.enemyIntent);

    return (
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
    );
};

export default Hud;
