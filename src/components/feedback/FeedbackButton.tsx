"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { MessageSquarePlus, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";

import { useGameStore } from "@/game/store";
import { logger } from "@/lib/logger";

type FeedbackKind = "bug" | "idea" | "praise" | "other";

const KIND_LABEL: Record<FeedbackKind, string> = {
    bug: "Bug",
    idea: "Idea",
    praise: "Praise",
    other: "Other",
};

const FeedbackButton = () => {
    const pathname = usePathname();
    const grid = useGameStore((state) => state.grid);
    const [open, setOpen] = useState<boolean>(false);
    const [kind, setKind] = useState<FeedbackKind>("idea");
    const [message, setMessage] = useState<string>("");
    const [includePage, setIncludePage] = useState<boolean>(true);
    const [status, setStatus] = useState<string>("");
    const [isPending, startTransition] = useTransition();
    const isBriefingOpen = grid.length === 0;
    const isHomePage = pathname === "/";

    useEffect(() => {
        const handleOpenFeedbackDialog = () => setOpen(true);
        window.addEventListener("open-feedback-dialog", handleOpenFeedbackDialog);
        return () => {
            window.removeEventListener(
                "open-feedback-dialog",
                handleOpenFeedbackDialog,
            );
        };
    }, []);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!message.trim()) {
            setStatus("Write a message first.");
            return;
        }
        setStatus("Sending…");
        startTransition(async () => {
            try {
                const res = await fetch("/api/feedback", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        kind,
                        message: message.trim(),
                        page: includePage ? pathname : undefined,
                    }),
                });
                const json = (await res.json().catch(() => ({}))) as {
                    ok?: boolean;
                    error?: string;
                };
                if (!res.ok || !json.ok) {
                    setStatus(json.error ?? `Error ${res.status}`);
                    return;
                }
                setStatus("Thanks! Feedback received.");
                setMessage("");
                setTimeout(() => setOpen(false), 900);
            } catch (err) {
                logger.warn("feedback", "submit failed", {
                    message: err instanceof Error ? err.message : String(err),
                });
                setStatus("Network error. Try again.");
            }
        });
    };

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            {!isBriefingOpen && !isHomePage ? (
                <Dialog.Trigger asChild>
                    <button
                        type="button"
                        aria-label="Send feedback"
                        title="Send feedback"
                        className="fixed bottom-4 left-4 z-40 flex min-h-14 items-center gap-2 rounded-full border px-4 py-2 shadow-lg transition hover:scale-105"
                        style={{
                            background: "var(--bg-panel)",
                            borderColor: "var(--border-mid)",
                            color: "var(--accent-player)",
                        }}
                    >
                        <MessageSquarePlus
                            className="h-6 w-6"
                            aria-hidden="true"
                        />
                        <span className="flex flex-col text-left leading-tight">
                            <span
                                className="text-[10px] uppercase tracking-[1.8px]"
                                style={{ color: "var(--text-muted)" }}
                            >
                                Prototype
                            </span>
                            <span className="text-xs font-bold uppercase tracking-[2px]">
                                Feedback
                            </span>
                        </span>
                    </button>
                </Dialog.Trigger>
            ) : null}
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
                <Dialog.Content
                    className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-md border p-5 shadow-2xl"
                    style={{
                        background: "var(--bg-panel)",
                        borderColor: "var(--border-mid)",
                    }}
                >
                    <div className="flex items-center justify-between">
                        <Dialog.Title
                            className="text-sm font-bold uppercase tracking-[3px]"
                            style={{ color: "var(--accent-player)" }}
                        >
                            Send Feedback
                        </Dialog.Title>
                        <Dialog.Close
                            aria-label="Close"
                            className="rounded p-1 hover:bg-white/5"
                            style={{ color: "var(--text-muted)" }}
                        >
                            <X className="h-4 w-4" aria-hidden="true" />
                        </Dialog.Close>
                    </div>
                    <Dialog.Description
                        className="mt-1 text-[11px]"
                        style={{ color: "var(--text-muted)" }}
                    >
                        Bugs, ideas, praise — all welcome. The dev reads
                        everything.
                    </Dialog.Description>

                    <form
                        onSubmit={handleSubmit}
                        className="mt-4 flex flex-col gap-3"
                    >
                        <div className="flex gap-1">
                            {(Object.keys(KIND_LABEL) as FeedbackKind[]).map(
                                (k) => {
                                    const isActive = kind === k;
                                    return (
                                        <button
                                            type="button"
                                            key={k}
                                            onClick={() => setKind(k)}
                                            className="flex-1 rounded border px-2 py-1 text-[10px] uppercase tracking-[2px] transition"
                                            style={{
                                                borderColor: isActive
                                                    ? "var(--accent-player)"
                                                    : "var(--border-subtle)",
                                                color: isActive
                                                    ? "var(--accent-player)"
                                                    : "var(--text-muted)",
                                                background: isActive
                                                    ? "var(--accent-player-bg)"
                                                    : "transparent",
                                            }}
                                        >
                                            {KIND_LABEL[k]}
                                        </button>
                                    );
                                },
                            )}
                        </div>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="What happened? What would help?"
                            rows={5}
                            maxLength={4000}
                            className="rounded border bg-transparent px-3 py-2 font-mono text-sm normal-case tracking-normal text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent-player)]"
                            style={{ borderColor: "var(--border-subtle)" }}
                        />
                        <label
                            className="flex cursor-pointer items-center gap-2 text-[11px]"
                            style={{ color: "var(--text-secondary)" }}
                        >
                            <input
                                type="checkbox"
                                checked={includePage}
                                onChange={(e) =>
                                    setIncludePage(e.target.checked)
                                }
                            />
                            Include current page ({pathname || "/"})
                        </label>
                        <div className="flex items-center justify-between gap-3">
                            <span
                                className="text-[11px]"
                                style={{ color: "var(--text-secondary)" }}
                            >
                                {status}
                            </span>
                            <button
                                type="submit"
                                disabled={isPending}
                                className="rounded px-4 py-2 text-xs font-bold uppercase tracking-[3px] disabled:opacity-50"
                                style={{
                                    background: "var(--accent-player)",
                                    color: "#0b0e16",
                                }}
                            >
                                Send
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default FeedbackButton;
