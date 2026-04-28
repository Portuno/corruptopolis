"use client";

import { useEffect } from "react";

import { STARTING_AP } from "@/game/constants";
import { useGameStore } from "@/game/store";
import { cn } from "@/lib/utils";

const MemeSelector = () => {
    const phase = useGameStore((s) => s.phase);
    const ap = useGameStore((s) => s.ap);
    const selectedMeme = useGameStore((s) => s.selectedMeme);
    const flashAp = useGameStore((s) => s.flashAp);
    const selectMemeMode = useGameStore((s) => s.selectMemeMode);
    const executeTurn = useGameStore((s) => s.executeTurn);
    const clearApFlash = useGameStore((s) => s.clearApFlash);

    const isAction = phase === "PLAYER_ACTION";

    useEffect(() => {
        if (!flashAp) return;
        const id = window.setTimeout(() => clearApFlash(), 420);
        return () => window.clearTimeout(id);
    }, [flashAp, clearApFlash]);

    return (
        <section
            className="panel flex flex-col gap-3 rounded-md p-3"
            style={{ borderColor: "var(--border-mid)" }}
        >
            <h3
                className="text-[10px] uppercase tracking-[3px]"
                style={{ color: "var(--text-muted)" }}
            >
                Core Actions
            </h3>
            <div className="grid grid-cols-1 gap-2">
                <ModeButton
                    label="Memetic Strike"
                    description="1 AP · attack"
                    active={selectedMeme === "strike"}
                    disabled={!isAction}
                    onClick={() => selectMemeMode("strike")}
                />
                <ModeButton
                    label="Echo Chamber"
                    description="1 AP · fortify"
                    active={selectedMeme === "echo"}
                    disabled={!isAction}
                    onClick={() => selectMemeMode("echo")}
                />
                <ModeButton
                    label="Astroturfing"
                    description="2 AP · distant sleeper cell"
                    active={selectedMeme === "astroturf"}
                    disabled={!isAction}
                    onClick={() => selectMemeMode("astroturf")}
                />
                <ModeButton
                    label="Deepfake / Smear"
                    description="3 AP · AoE with backfire risk"
                    active={selectedMeme === "deepfake"}
                    disabled={!isAction}
                    onClick={() => selectMemeMode("deepfake")}
                />
            </div>
            <div className="flex items-center justify-between text-xs"
                style={{ color: "var(--text-secondary)" }}>
                <span
                    className={cn(
                        "uppercase tracking-[2px]",
                        flashAp && "animate-pulseRed",
                    )}
                >
                    AP:&nbsp;
                    <span
                        className="font-bold"
                        style={{ color: "var(--text-primary)" }}
                    >
                        {ap}
                    </span>
                    &nbsp;/&nbsp;{STARTING_AP}
                </span>
                <span
                    className="uppercase tracking-[2px]"
                    style={{
                        color: isAction
                            ? "var(--accent-player)"
                            : "var(--accent-calc)",
                    }}
                >
                    ⟩ {isAction ? "PLAYER ACTION" : "CALCULATING…"}
                </span>
            </div>
            <button
                type="button"
                onClick={executeTurn}
                disabled={!isAction}
                className="w-full rounded px-3 py-2 text-xs font-bold uppercase tracking-[3px] transition disabled:opacity-50"
                style={{
                    background: "var(--accent-confirm-bg)",
                    border: "1px solid var(--accent-confirm)",
                    color: "var(--accent-confirm)",
                }}
            >
                Advance Epoch
            </button>
            <span
                className="text-center text-[10px] uppercase tracking-[2px]"
                style={{ color: "var(--text-muted)" }}
            >
                Space / Enter to advance
            </span>
        </section>
    );
};

interface ModeButtonProps {
    label: string;
    description: string;
    active: boolean;
    disabled: boolean;
    onClick: () => void;
}

const ModeButton = ({
    label,
    description,
    active,
    disabled,
    onClick,
}: ModeButtonProps) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={active}
        className="rounded border p-2 text-left text-xs transition disabled:opacity-50"
        style={{
            borderColor: active
                ? "var(--accent-player)"
                : "var(--border-subtle)",
            background: active
                ? "var(--accent-player-bg)"
                : "transparent",
            color: active ? "var(--accent-player)" : "var(--text-primary)",
        }}
    >
        <div className="font-bold uppercase tracking-[2px]">{label}</div>
        <div
            className="text-[10px]"
            style={{ color: "var(--text-muted)" }}
        >
            {description}
        </div>
    </button>
);

export default MemeSelector;
