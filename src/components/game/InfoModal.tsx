"use client";

import { GAME_LORE, GAME_MECHANICS } from "@/game/info";

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const InfoModal = ({ isOpen, onClose }: InfoModalProps) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Game mechanics and lore information"
        >
            <section className="panel flex max-h-[92vh] w-full max-w-[95vw] flex-col gap-4 overflow-hidden rounded-md border p-5 xl:max-w-[1400px]">
                <header className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-[11px] uppercase tracking-[3px] text-[color:var(--text-muted)]">
                            Info Archive
                        </p>
                        <h2 className="text-2xl font-bold text-[color:var(--text-primary)]">
                            Mechanics and Lore
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded border px-3 py-2 text-xs font-semibold uppercase tracking-[1px]"
                        style={{
                            borderColor: "var(--border-subtle)",
                            background: "var(--bg-surface)",
                            color: "var(--text-secondary)",
                        }}
                    >
                        Close
                    </button>
                </header>

                <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2">
                    <article className="grid content-start grid-cols-1 gap-3 xl:grid-cols-2">
                        <h3 className="text-sm font-semibold uppercase tracking-[2px] text-[color:var(--accent-player)] xl:col-span-2">
                            Core Mechanics
                        </h3>
                        {GAME_MECHANICS.map((entry) => (
                            <section
                                key={entry.title}
                                className="rounded border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-3"
                            >
                                <h4 className="text-sm font-semibold text-[color:var(--text-primary)]">
                                    {entry.title}
                                </h4>
                                <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                                    {entry.content}
                                </p>
                            </section>
                        ))}
                    </article>

                    <article className="grid content-start grid-cols-1 gap-3 xl:grid-cols-2">
                        <h3 className="text-sm font-semibold uppercase tracking-[2px] text-[color:var(--accent-player)] xl:col-span-2">
                            World Lore
                        </h3>
                        {GAME_LORE.map((entry) => (
                            <section
                                key={entry.name}
                                className="rounded border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-3"
                            >
                                <h4 className="text-sm font-semibold text-[color:var(--text-primary)]">
                                    {entry.name}
                                </h4>
                                <p className="text-[11px] uppercase tracking-[1px] text-[color:var(--text-muted)]">
                                    {entry.role}
                                </p>
                                <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                                    {entry.description}
                                </p>
                            </section>
                        ))}
                    </article>
                </div>
            </section>
        </div>
    );
};

export default InfoModal;
