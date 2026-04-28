"use client";

import { Mic, MicOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useGameStore } from "@/game/store";
import { readLocalGeminiKey } from "@/lib/local-keys";
import { logger } from "@/lib/logger";
import { pickRecorderMime, transcribeBlob } from "@/lib/speech";

type LogEntry = {
    id: number;
    text: string;
    kind: "cmd" | "exec" | "ai" | "note";
};

const interpretRegex: Array<{
    pattern: RegExp;
    handler: (
        store: ReturnType<typeof useGameStore.getState>,
    ) => string | null;
}> = [
    {
        pattern: /advance|end turn|end epoch|commit|seal|execute|next turn/,
        handler: (s) => {
            if (s.phase === "PLAYER_ACTION") {
                s.executeTurn();
                return "→ END EPOCH";
            }
            return null;
        },
    },
    {
        pattern: /echo|fortif|secure|defend|bunker|lock|protect/,
        handler: (s) => {
            s.selectMemeMode("echo");
            return "→ ECHO CHAMBER armed";
        },
    },
    {
        pattern: /strike|attack|broadcast|standard|deploy|spread|publish|meme/,
        handler: (s) => {
            s.selectMemeMode("strike");
            return "→ MEMETIC STRIKE armed";
        },
    },
    {
        pattern: /astroturf|infiltrat|sleeper|expand/,
        handler: (s) => {
            s.selectMemeMode("astroturf");
            return "→ ASTROTURFING armed";
        },
    },
    {
        pattern: /deepfake|smear|aoe|area/,
        handler: (s) => {
            s.selectMemeMode("deepfake");
            return "→ DEEPFAKE SMEAR armed";
        },
    },
];

const VoicePanel = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [status, setStatus] = useState<string>("");
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const idCounterRef = useRef<number>(0);

    useEffect(() => {
        return () => {
            recorderRef.current?.stream
                .getTracks()
                .forEach((t) => t.stop());
        };
    }, []);

    const pushLog = (text: string, kind: LogEntry["kind"]): void => {
        idCounterRef.current += 1;
        setLogs((prev) =>
            [{ id: idCounterRef.current, text, kind }, ...prev].slice(0, 6),
        );
    };

    const interpret = async (transcript: string): Promise<void> => {
        const lower = transcript.toLowerCase().trim();
        if (!lower) return;
        const store = useGameStore.getState();

        for (const rule of interpretRegex) {
            if (rule.pattern.test(lower)) {
                const out = rule.handler(store);
                if (out) {
                    pushLog(out, "exec");
                    return;
                }
            }
        }

        pushLog(`"${lower}"`, "cmd");

        try {
            const clientKey = readLocalGeminiKey() || undefined;
            const res = await fetch("/api/gemini", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    intent: "voice_command",
                    transcript: lower,
                    clientKey,
                }),
            });
            const json = (await res.json().catch(() => ({}))) as {
                ok?: boolean;
                text?: string;
            };
            if (!res.ok || !json.ok || !json.text) return;
            const reply = json.text.trim();
            if (reply === "END_EPOCH") {
                if (store.phase === "PLAYER_ACTION") store.executeTurn();
                pushLog("→ AI: END EPOCH", "exec");
            } else if (reply === "STANDARD_MEME" || reply === "MEMETIC_STRIKE") {
                store.selectMemeMode("strike");
                pushLog("→ AI: MEMETIC STRIKE mode", "exec");
            } else if (reply === "FORTIFY") {
                store.selectMemeMode("echo");
                pushLog("→ AI: ECHO CHAMBER mode", "exec");
            } else if (reply === "ASTROTURFING") {
                store.selectMemeMode("astroturf");
                pushLog("→ AI: ASTROTURFING mode", "exec");
            } else if (reply === "DEEPFAKE") {
                store.selectMemeMode("deepfake");
                pushLog("→ AI: DEEPFAKE mode", "exec");
            } else if (reply.startsWith("COMMENT:")) {
                pushLog(
                    `AI: ${reply.replace("COMMENT:", "").trim()}`,
                    "ai",
                );
            }
        } catch (err) {
            logger.debug("voice", "ai interpret failed", {
                message: err instanceof Error ? err.message : String(err),
            });
        }
    };

    const handleStop = (): void => {
        const recorder = recorderRef.current;
        if (recorder?.state === "recording") {
            recorder.stop();
        }
        setIsRecording(false);
        setStatus("Processing transcript…");
    };

    const handleStart = async (): Promise<void> => {
        if (typeof navigator === "undefined" || !navigator.mediaDevices) {
            setStatus("Microphone API not available in this browser.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            streamRef.current = stream;
            const mimeType = pickRecorderMime();
            chunksRef.current = [];
            const recorder = new MediaRecorder(
                stream,
                mimeType ? { mimeType } : undefined,
            );
            recorderRef.current = recorder;
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            recorder.onstop = async () => {
                streamRef.current?.getTracks().forEach((t) => t.stop());
                const type = mimeType || "audio/webm";
                const blob = new Blob(chunksRef.current, { type });
                const ext = type.includes("webm")
                    ? "webm"
                    : type.includes("ogg")
                      ? "ogg"
                      : "mp4";
                const result = await transcribeBlob(
                    blob,
                    `cmd.${ext}`,
                    "en",
                );
                if (!result.ok) {
                    setStatus(`STT error: ${result.error}`);
                    return;
                }
                setStatus("Channel closed.");
                if (result.text) {
                    await interpret(result.text);
                } else {
                    setStatus("No speech detected.");
                }
            };
            recorder.start();
            setIsRecording(true);
            setStatus("● Recording — speak your directive…");
        } catch (err) {
            setStatus(
                `Mic access denied: ${err instanceof Error ? err.message : String(err)}`,
            );
        }
    };

    const handleToggle = (): void => {
        if (isRecording) {
            handleStop();
            return;
        }
        handleStart();
    };

    return (
        <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <h3
                    className="text-[10px] uppercase tracking-[3px]"
                    style={{ color: "var(--text-muted)" }}
                >
                    🎙 Voice Command
                </h3>
                <button
                    type="button"
                    onClick={handleToggle}
                    aria-pressed={isRecording}
                    aria-label={
                        isRecording ? "Stop recording" : "Start recording"
                    }
                    className="rounded-full border p-1.5 transition"
                    style={{
                        borderColor: isRecording
                            ? "var(--accent-enemy)"
                            : "var(--border-mid)",
                        color: isRecording
                            ? "var(--accent-enemy)"
                            : "var(--accent-player)",
                        background: isRecording
                            ? "var(--accent-enemy-glow)"
                            : "transparent",
                    }}
                >
                    {isRecording ? (
                        <MicOff className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                        <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                </button>
            </div>
            {status ? (
                <p
                    className="text-[11px]"
                    style={{ color: "var(--text-secondary)" }}
                    aria-live="polite"
                >
                    {status}
                </p>
            ) : null}
            <ul
                className="flex flex-col gap-1 text-[11px]"
                style={{ color: "var(--text-secondary)" }}
            >
                {logs.map((log) => (
                    <li
                        key={log.id}
                        style={{
                            color:
                                log.kind === "exec"
                                    ? "var(--accent-confirm)"
                                    : log.kind === "ai"
                                      ? "var(--accent-player)"
                                      : log.kind === "cmd"
                                        ? "var(--text-primary)"
                                        : "var(--text-muted)",
                        }}
                    >
                        {log.text}
                    </li>
                ))}
            </ul>
        </section>
    );
};

export default VoicePanel;
