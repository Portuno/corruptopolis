"use client";

import { X } from "lucide-react";

import { useGameStore } from "@/game/store";

const ActionQueue = () => {
    const queue = useGameStore((s) => s.actionQueue);
    const removeQueueItem = useGameStore((s) => s.removeQueueItem);

    if (queue.length === 0) {
        return (
            <p
                className="rounded border p-3 text-center text-[11px]"
                style={{
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-muted)",
                }}
            >
                No actions queued
            </p>
        );
    }

    return (
        <ul className="flex flex-col gap-1">
            {queue.map((item) => {
                const sign = item.modifier >= 0 ? "+" : "";
                const isPositive = item.modifier >= 0;
                return (
                    <li
                        key={item.id}
                        className="flex items-center gap-2 rounded border px-2 py-1.5 text-xs"
                        style={{
                            borderColor: "var(--border-subtle)",
                            background: "var(--bg-deep)",
                        }}
                    >
                        <span
                            className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[1.5px]"
                            style={{
                                background: "var(--accent-player-bg)",
                                color: "var(--accent-player)",
                            }}
                        >
                            Diplo
                        </span>
                        <span
                            className="flex-1 uppercase tracking-[1.5px]"
                            style={{ color: "var(--text-primary)" }}
                        >
                            {item.faction}
                        </span>
                        <span
                            className="font-mono text-xs"
                            style={{
                                color: isPositive
                                    ? "var(--accent-confirm)"
                                    : "var(--accent-enemy)",
                            }}
                        >
                            {sign}
                            {item.modifier.toFixed(2)}
                        </span>
                        <button
                            type="button"
                            onClick={() => removeQueueItem(item.id)}
                            aria-label={`Remove ${item.faction} action`}
                            className="rounded p-0.5 hover:bg-white/5"
                            style={{ color: "var(--text-muted)" }}
                        >
                            <X className="h-3 w-3" aria-hidden="true" />
                        </button>
                    </li>
                );
            })}
        </ul>
    );
};

export default ActionQueue;
