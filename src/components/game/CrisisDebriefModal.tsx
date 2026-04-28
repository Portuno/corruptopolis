"use client";

import { useEffect, useRef } from "react";

import { useGameStore } from "@/game/store";

const CrisisDebriefModal = () => {
    const crisisDebrief = useGameStore((s) => s.crisisDebrief);
    const dismissCrisisDebrief = useGameStore((s) => s.dismissCrisisDebrief);
    const panelRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!crisisDebrief) return;
        const panel = panelRef.current;
        if (!panel) return;

        const previousFocus = document.activeElement as HTMLElement | null;
        const focusableSelector =
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const focusable = Array.from(
            panel.querySelectorAll<HTMLElement>(focusableSelector),
        ).filter((element) => !element.hasAttribute("disabled"));

        const firstFocusable = focusable[0];
        const lastFocusable = focusable[focusable.length - 1];
        firstFocusable?.focus();

        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                event.preventDefault();
                dismissCrisisDebrief();
                return;
            }
            if (event.key !== "Tab" || focusable.length === 0) return;

            const active = document.activeElement as HTMLElement | null;
            if (!event.shiftKey && active === lastFocusable) {
                event.preventDefault();
                firstFocusable?.focus();
                return;
            }
            if (event.shiftKey && active === firstFocusable) {
                event.preventDefault();
                lastFocusable?.focus();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            previousFocus?.focus();
        };
    }, [crisisDebrief, dismissCrisisDebrief]);

    if (!crisisDebrief) return null;

    return (
        <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Crisis debrief"
        >
            <section
                ref={panelRef}
                tabIndex={-1}
                className="panel flex w-full max-w-2xl flex-col gap-4 rounded-md border p-5"
            >
                <header className="space-y-1">
                    <p className="text-[11px] uppercase tracking-[3px] text-[color:var(--text-muted)]">
                        Epoch 7 Debrief
                    </p>
                    <h2 className="text-2xl font-bold text-[color:var(--text-primary)]">
                        {crisisDebrief.title}
                    </h2>
                </header>

                <div className="rounded border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-3">
                    <p className="text-[10px] uppercase tracking-[2px] text-[color:var(--text-muted)]">
                        Tactical output (readable + narrated)
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-[color:var(--text-secondary)]">
                        {crisisDebrief.briefingReport}
                    </p>
                </div>

                <div className="rounded border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-3">
                    <p className="text-[10px] uppercase tracking-[2px] text-[color:var(--text-muted)]">
                        In-game effects (visual only)
                    </p>
                    <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-[color:var(--text-secondary)]">
                        {crisisDebrief.visualEffects.map((line) => (
                            <li key={line}>{line}</li>
                        ))}
                    </ul>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded border border-[color:var(--border-subtle)] p-3 text-[11px] text-[color:var(--text-secondary)]">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] uppercase tracking-[2px] text-[color:var(--text-muted)]">
                            Score
                        </span>
                        <span className="text-base font-bold text-[color:var(--text-primary)]">
                            {crisisDebrief.score}
                        </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] uppercase tracking-[2px] text-[color:var(--text-muted)]">
                            Primary shift
                        </span>
                        <span className="text-base font-bold text-[color:var(--text-primary)]">
                            {crisisDebrief.primaryHexModifier >= 0 ? "+" : ""}
                            {crisisDebrief.primaryHexModifier}
                        </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] uppercase tracking-[2px] text-[color:var(--text-muted)]">
                            Global drift
                        </span>
                        <span className="text-base font-bold text-[color:var(--text-primary)]">
                            {crisisDebrief.globalSubElementModifier >= 0 ? "+" : ""}
                            {crisisDebrief.globalSubElementModifier}
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={dismissCrisisDebrief}
                    className="rounded border px-4 py-2 text-sm font-semibold uppercase tracking-[1px]"
                    style={{
                        borderColor: "var(--accent-player)",
                        background: "var(--accent-player-bg)",
                        color: "var(--accent-player)",
                    }}
                >
                    Continue
                </button>
            </section>
        </div>
    );
};

export default CrisisDebriefModal;
