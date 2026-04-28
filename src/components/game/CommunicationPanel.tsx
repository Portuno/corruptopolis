"use client";

import { useState, type FormEvent } from "react";

import { useGameStore } from "@/game/store";
import { ELEMENTS } from "@/game/elements";
import type { ElementKey } from "@/game/types";
import { readLocalGeminiKey } from "@/lib/local-keys";
import { logger } from "@/lib/logger";

interface GeminiResponse {
    ok: boolean;
    text?: string;
    modifier?: number;
    clinicalAnalysis?: string;
    error?: string;
    requestId?: string;
}

const CommunicationPanel = () => {
    const addDiplomacyAction = useGameStore((s) => s.addDiplomacyAction);
    const [faction, setFaction] = useState<ElementKey>("political");
    const [message, setMessage] = useState<string>("");
    const [status, setStatus] = useState<string>("");
    const [isPending, setIsPending] = useState<boolean>(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const trimmed = message.trim();
        if (!trimmed) {
            setStatus("Write a message first.");
            return;
        }
        setIsPending(true);
        setStatus("Analyzing with Gemini…");
        try {
            const clientKey = readLocalGeminiKey() || undefined;
            const res = await fetch("/api/gemini", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    intent: "faction_message",
                    faction,
                    message: trimmed,
                    clientKey,
                }),
            });
            const json = (await res.json().catch(() => ({}))) as GeminiResponse;
            if (!res.ok || !json.ok) {
                const errMsg = json.error ?? `HTTP ${res.status}`;
                logger.warn("comm", "gemini failed", {
                    status: res.status,
                    requestId: json.requestId,
                    errMsg,
                });
                setStatus(`Error: ${errMsg}`);
                return;
            }
            const rawModifier = json.modifier;
            if (
                typeof rawModifier !== "number" ||
                !Number.isFinite(rawModifier)
            ) {
                setStatus("AI returned no modifier. Try a different message.");
                return;
            }
            const modifier = Math.max(-1, Math.min(1, rawModifier));
            addDiplomacyAction(faction, modifier);
            const sign = modifier >= 0 ? "+" : "";
            const detail = json.clinicalAnalysis
                ? ` · ${json.clinicalAnalysis}`
                : "";
            setStatus(
                `${faction}: ${sign}${modifier.toFixed(2)} — queued ✓${detail}`,
            );
            setMessage("");
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.warn("comm", "submit threw", { msg });
            setStatus(`Network error: ${msg}`);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
            <h3
                className="text-[10px] uppercase tracking-[3px]"
                style={{ color: "var(--text-muted)" }}
            >
                Communication Channel
            </h3>
            <select
                aria-label="Target faction"
                value={faction}
                onChange={(e) => setFaction(e.target.value as ElementKey)}
                className="rounded border bg-transparent px-2 py-1.5 font-mono text-xs uppercase tracking-[1.5px] text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent-player)]"
                style={{ borderColor: "var(--border-subtle)" }}
            >
                {ELEMENTS.map((e) => (
                    <option key={e.key} value={e.key}>
                        {e.label}
                    </option>
                ))}
            </select>
            <textarea
                aria-label="Faction message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write a narrative message targeting this faction…"
                rows={3}
                maxLength={1000}
                className="rounded border bg-transparent px-2 py-1.5 font-mono text-xs normal-case tracking-normal text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent-player)]"
                style={{ borderColor: "var(--border-subtle)" }}
            />
            <div className="flex items-center justify-between gap-2">
                <button
                    type="submit"
                    disabled={isPending}
                    className="rounded px-3 py-1.5 text-[10px] font-bold uppercase tracking-[2px] disabled:opacity-50"
                    style={{
                        background: "var(--accent-player-bg)",
                        border: "1px solid var(--accent-player)",
                        color: "var(--accent-player)",
                    }}
                >
                    Send for Analysis
                </button>
                <span
                    className="text-[10px]"
                    style={{ color: "var(--text-secondary)" }}
                    aria-live="polite"
                >
                    {status}
                </span>
            </div>
        </form>
    );
};

export default CommunicationPanel;
