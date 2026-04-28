"use client";

import { useState, useTransition, type FormEvent } from "react";

import { updateProfileAction } from "./actions";

interface Props {
    initialDisplayName: string;
    hasGeminiKey: boolean;
    hasElevenKey: boolean;
}

const ProfileForm = ({
    initialDisplayName,
    hasGeminiKey,
    hasElevenKey,
}: Props) => {
    const [displayName, setDisplayName] = useState<string>(initialDisplayName);
    const [geminiKey, setGeminiKey] = useState<string>("");
    const [elevenKey, setElevenKey] = useState<string>("");
    const [status, setStatus] = useState<string>("");
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setStatus("Saving…");
        startTransition(async () => {
            const result = await updateProfileAction({
                displayName,
                geminiKey: geminiKey || undefined,
                elevenKey: elevenKey || undefined,
            });
            if (!result.ok) {
                setStatus(result.error ?? "Failed");
                return;
            }
            setStatus("Saved.");
            setGeminiKey("");
            setElevenKey("");
        });
    };

    const handleClear = (kind: "gemini" | "eleven") => {
        startTransition(async () => {
            const result = await updateProfileAction(
                kind === "gemini" ? { geminiKey: "" } : { elevenKey: "" },
            );
            setStatus(result.ok ? "Key cleared." : result.error ?? "Failed");
        });
    };

    return (
        <form
            className="panel flex flex-col gap-4 rounded-md p-5"
            style={{ borderColor: "var(--border-mid)" }}
            onSubmit={handleSubmit}
        >
            <h2
                className="text-xs uppercase tracking-[3px]"
                style={{ color: "var(--text-muted)" }}
            >
                Operator settings
            </h2>

            <label
                className="flex flex-col gap-1 text-xs uppercase tracking-[2px]"
                style={{ color: "var(--text-muted)" }}
            >
                Display name
                <input
                    type="text"
                    value={displayName}
                    maxLength={80}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="rounded border bg-transparent px-3 py-2 font-mono text-sm normal-case tracking-normal text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent-player)]"
                    style={{ borderColor: "var(--border-subtle)" }}
                />
            </label>

            <fieldset
                className="flex flex-col gap-2 rounded border p-3"
                style={{ borderColor: "var(--border-subtle)" }}
            >
                <legend
                    className="px-1 text-[10px] uppercase tracking-[2px]"
                    style={{ color: "var(--text-muted)" }}
                >
                    Personal Gemini key
                </legend>
                <p
                    className="text-[11px] leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                >
                    Optional. Overrides the server key for your account. Stored
                    server-side; never exposed to other players.
                </p>
                <input
                    type="password"
                    placeholder={
                        hasGeminiKey ? "•••••• (set — paste to replace)" : "Paste new key"
                    }
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="rounded border bg-transparent px-3 py-2 font-mono text-sm normal-case tracking-normal text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent-player)]"
                    style={{ borderColor: "var(--border-subtle)" }}
                />
                {hasGeminiKey ? (
                    <button
                        type="button"
                        onClick={() => handleClear("gemini")}
                        className="self-start text-[10px] uppercase tracking-[2px] hover:opacity-80"
                        style={{ color: "var(--accent-enemy)" }}
                    >
                        Remove stored key
                    </button>
                ) : null}
            </fieldset>

            <fieldset
                className="flex flex-col gap-2 rounded border p-3"
                style={{ borderColor: "var(--border-subtle)" }}
            >
                <legend
                    className="px-1 text-[10px] uppercase tracking-[2px]"
                    style={{ color: "var(--text-muted)" }}
                >
                    Personal ElevenLabs key
                </legend>
                <input
                    type="password"
                    placeholder={
                        hasElevenKey ? "•••••• (set — paste to replace)" : "Paste new key"
                    }
                    value={elevenKey}
                    onChange={(e) => setElevenKey(e.target.value)}
                    className="rounded border bg-transparent px-3 py-2 font-mono text-sm normal-case tracking-normal text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent-player)]"
                    style={{ borderColor: "var(--border-subtle)" }}
                />
                {hasElevenKey ? (
                    <button
                        type="button"
                        onClick={() => handleClear("eleven")}
                        className="self-start text-[10px] uppercase tracking-[2px] hover:opacity-80"
                        style={{ color: "var(--accent-enemy)" }}
                    >
                        Remove stored key
                    </button>
                ) : null}
            </fieldset>

            <div className="flex items-center gap-3">
                <button
                    type="submit"
                    disabled={isPending}
                    className="rounded px-4 py-2 text-xs font-bold uppercase tracking-[3px] disabled:opacity-50"
                    style={{
                        background: "var(--accent-player)",
                        color: "#0b0e16",
                    }}
                >
                    Save
                </button>
                <span
                    className="text-[11px]"
                    style={{ color: "var(--text-secondary)" }}
                >
                    {status}
                </span>
            </div>
        </form>
    );
};

export default ProfileForm;
