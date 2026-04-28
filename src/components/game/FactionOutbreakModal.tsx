"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ELEMENTS } from "@/game/elements";
import { useGameStore } from "@/game/store";
import { readLocalGeminiKey } from "@/lib/local-keys";
import { logger } from "@/lib/logger";
import { pickRecorderMime, speakViaProxy, transcribeBlob } from "@/lib/speech";

interface GeminiResponse {
    ok: boolean;
    text?: string;
    error?: string;
    score?: number;
    briefingReport?: string;
    targetElement?: string;
    primaryHexModifier?: number;
    globalSubElementModifier?: number;
    requestId?: string;
}

interface CrisisEvalPayload {
    score: number;
    briefingReport: string;
    targetElement: "political" | "military" | "economic" | "religious" | "scientific" | "cultural";
    primaryHexModifier: number;
    globalSubElementModifier: number;
}

const MAX_RECORDING_MS = 30_000;
const ADAM_VOICE_ID = "pNInz6obpgDQGcFmaJgB";

const buildTacticalLine = (
    primaryHexModifier: number,
    globalSubElementModifier: number,
): string => {
    const readiness =
        primaryHexModifier >= 8
            ? "Directive accepted."
            : primaryHexModifier >= 0
              ? "Directive processed."
              : primaryHexModifier <= -8
                ? "Directive compromised."
                : "Directive unstable.";
    const confidence =
        globalSubElementModifier >= 10
            ? "Confidence high."
            : globalSubElementModifier <= -10
              ? "Confidence low."
              : "Confidence moderate.";
    return `${readiness} ${confidence}`;
};

const FactionOutbreakModal = () => {
    const activeCrisis = useGameStore((s) => s.activeCrisis);
    const resolveCrisis = useGameStore((s) => s.resolveCrisis);
    const resolveCrisisSilence = useGameStore((s) => s.resolveCrisisSilence);

    const [status, setStatus] = useState<string>("");
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [isPending, setIsPending] = useState<boolean>(false);
    const [transcriptPreview, setTranscriptPreview] = useState<string>("");
    const [remainingSeconds, setRemainingSeconds] = useState<number>(
        MAX_RECORDING_MS / 1000,
    );

    const recorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const mimeRef = useRef<string>("audio/webm");
    const timeoutRef = useRef<number | null>(null);
    const intervalRef = useRef<number | null>(null);
    const startedAtRef = useRef<number>(0);

    const factionLabel = useMemo(() => {
        if (!activeCrisis) return "";
        const match = ELEMENTS.find((el) => el.key === activeCrisis.faction);
        return match?.label ?? activeCrisis.faction;
    }, [activeCrisis]);

    const clearRecordingTimeout = (): void => {
        if (timeoutRef.current === null) return;
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
    };

    const clearCountdownInterval = (): void => {
        if (intervalRef.current === null) return;
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
    };

    const stopAllTracks = (): void => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    };

    useEffect(() => {
        return () => {
            clearRecordingTimeout();
            clearCountdownInterval();
            stopAllTracks();
        };
    }, []);

    useEffect(() => {
        if (activeCrisis) return;
        setStatus("");
        setIsRecording(false);
        setIsPending(false);
        setTranscriptPreview("");
        setRemainingSeconds(MAX_RECORDING_MS / 1000);
        clearRecordingTimeout();
        clearCountdownInterval();
        stopAllTracks();
    }, [activeCrisis]);

    const handleResolve = async (): Promise<void> => {
        if (!activeCrisis) return;
        const trimmedTranscript = transcriptPreview.trim();
        if (!trimmedTranscript) {
            setStatus("Record a directive before sending.");
            return;
        }
        setIsPending(true);
        setStatus("MAC Auditor is evaluating your directive...");
        try {
            const clientKey = readLocalGeminiKey() || undefined;
            const response = await fetch("/api/gemini", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    intent: "crisis_response",
                    faction: activeCrisis.faction,
                    crisisDescription: activeCrisis.description,
                    transcript: trimmedTranscript,
                    clientKey,
                }),
            });
            const json = (await response.json().catch(() => ({}))) as GeminiResponse;
            if (!response.ok || !json.ok) {
                setStatus(`Gemini error: ${json.error ?? `HTTP ${response.status}`}`);
                return;
            }
            const validElement =
                json.targetElement === "political" ||
                json.targetElement === "military" ||
                json.targetElement === "economic" ||
                json.targetElement === "religious" ||
                json.targetElement === "scientific" ||
                json.targetElement === "cultural"
                    ? json.targetElement
                    : activeCrisis.faction;
            const parsed: CrisisEvalPayload | null =
                typeof json.score === "number" &&
                typeof json.primaryHexModifier === "number" &&
                typeof json.globalSubElementModifier === "number" &&
                typeof json.briefingReport === "string" &&
                json.briefingReport.trim()
                    ? {
                          score: Math.max(0, Math.min(100, Math.round(json.score))),
                          briefingReport: json.briefingReport.trim(),
                          targetElement: validElement,
                          primaryHexModifier: Math.max(
                              -12,
                              Math.min(12, Math.round(json.primaryHexModifier)),
                          ),
                          globalSubElementModifier: Math.max(
                              -22,
                              Math.min(
                                  22,
                                  Math.round(json.globalSubElementModifier),
                              ),
                          ),
                      }
                    : null;
            if (!parsed) {
                logger.warn("crisis", "gemini outbreak parse failed in UI", {
                    requestId: json.requestId,
                    textPreview: (json.text ?? "").slice(0, 220),
                });
                const trace = json.requestId ? ` (request: ${json.requestId})` : "";
                setStatus(`AI response format was invalid. Please try again.${trace}`);
                return;
            }
            resolveCrisis(parsed);
            const tacticalLine = buildTacticalLine(
                parsed.primaryHexModifier,
                parsed.globalSubElementModifier,
            );
            void speakViaProxy({
                text: `${tacticalLine} ${parsed.briefingReport}`,
                voiceId: ADAM_VOICE_ID,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.warn("crisis", "outbreak resolution failed", { message });
            setStatus(`Resolution error: ${message}`);
        } finally {
            setIsPending(false);
        }
    };

    const handleRemainSilent = (): void => {
        if (isPending) return;
        handleStopRecording();
        resolveCrisisSilence();
        void speakViaProxy({
            text: "Silence logged. Outbreak pressure is intensifying.",
            voiceId: ADAM_VOICE_ID,
        });
    };

    const handleStopRecording = (): void => {
        const recorder = recorderRef.current;
        clearRecordingTimeout();
        clearCountdownInterval();
        if (recorder?.state === "recording") {
            recorder.stop();
        }
        setIsRecording(false);
    };

    const handleStartRecording = async (): Promise<void> => {
        if (!activeCrisis || isPending || isRecording) return;
        if (typeof navigator === "undefined" || !navigator.mediaDevices) {
            setStatus("Microphone API is not available in this browser.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            chunksRef.current = [];
            const mimeType = pickRecorderMime() || "audio/webm";
            mimeRef.current = mimeType;
            const recorder = new MediaRecorder(
                stream,
                pickRecorderMime() ? { mimeType } : undefined,
            );
            recorderRef.current = recorder;
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) chunksRef.current.push(event.data);
            };
            recorder.onstop = async () => {
                clearRecordingTimeout();
                clearCountdownInterval();
                setRemainingSeconds(MAX_RECORDING_MS / 1000);
                stopAllTracks();
                setStatus("Transcribing audio...");
                const ext = mimeRef.current.includes("ogg")
                    ? "ogg"
                    : mimeRef.current.includes("mp4")
                      ? "mp4"
                      : "webm";
                const blob = new Blob(chunksRef.current, { type: mimeRef.current });
                const stt = await transcribeBlob(blob, `outbreak.${ext}`, "en");
                if (!stt.ok) {
                    setStatus(`STT error: ${stt.error ?? "unknown"}`);
                    return;
                }
                const transcript = stt.text.trim();
                if (!transcript) {
                    setStatus("No speech detected. Record again and retry.");
                    return;
                }
                setTranscriptPreview(transcript);
                setStatus("Transcript ready. Submit your directive to MAC.");
            };
            recorder.start();
            startedAtRef.current = Date.now();
            setRemainingSeconds(MAX_RECORDING_MS / 1000);
            clearCountdownInterval();
            intervalRef.current = window.setInterval(() => {
                const elapsed = Date.now() - startedAtRef.current;
                const nextSeconds = Math.max(
                    0,
                    Math.ceil((MAX_RECORDING_MS - elapsed) / 1000),
                );
                setRemainingSeconds(nextSeconds);
            }, 200);
            timeoutRef.current = window.setTimeout(() => {
                setStatus("Time limit reached. Processing recording...");
                handleStopRecording();
            }, MAX_RECORDING_MS);
            setStatus("Recording in progress. Press again to stop.");
            setIsRecording(true);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setStatus(`Mic access denied: ${message}`);
        }
    };

    if (!activeCrisis) return null;

    const handleRecordButtonClick = (): void => {
        if (isRecording) {
            handleStopRecording();
            return;
        }
        void handleStartRecording();
    };

    return (
        <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Faction outbreak resolution"
        >
            <section className="panel flex w-full max-w-2xl flex-col gap-4 rounded-md border p-5">
                <header className="space-y-1">
                    <p className="text-[11px] uppercase tracking-[3px] text-[color:var(--text-muted)]">
                        Memetic Crisis · Target Faction: {factionLabel}
                    </p>
                    <h2 className="text-2xl font-bold text-[color:var(--text-primary)]">
                        {activeCrisis.title}
                    </h2>
                </header>

                <p className="text-base leading-relaxed text-[color:var(--text-secondary)]">
                    {activeCrisis.description}
                </p>

                <button
                    type="button"
                    disabled={isPending}
                    onClick={handleRecordButtonClick}
                    aria-label="Press once to start recording and again to stop"
                    className="rounded border px-4 py-3 text-sm font-bold uppercase tracking-[2px] disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                        borderColor: isRecording
                            ? "var(--accent-enemy)"
                            : "var(--accent-player)",
                        background: isRecording
                            ? "var(--accent-enemy-glow)"
                            : "var(--accent-player-bg)",
                        color: isRecording
                            ? "var(--accent-enemy)"
                            : "var(--accent-player)",
                    }}
                >
                    {isRecording ? "Stop Recording" : "Start Recording (Max 30s)"}
                </button>

                <div className="flex items-center justify-between text-sm">
                    <span className="text-[color:var(--text-muted)]">
                        Recording time left
                    </span>
                    <span className="font-semibold text-[color:var(--text-primary)]">
                        00:{remainingSeconds.toString().padStart(2, "0")}
                    </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={handleRemainSilent}
                        className="rounded border px-4 py-2 text-sm font-semibold uppercase tracking-[1px] disabled:cursor-not-allowed disabled:opacity-50"
                        style={{
                            borderColor: "var(--border-subtle)",
                            background: "var(--bg-surface)",
                            color: "var(--text-secondary)",
                        }}
                    >
                        Remain Silent
                    </button>
                    <button
                        type="button"
                        disabled={isPending || !transcriptPreview.trim()}
                        onClick={() => {
                            void handleResolve();
                        }}
                        className="rounded border px-4 py-2 text-sm font-semibold uppercase tracking-[1px] disabled:cursor-not-allowed disabled:opacity-50"
                        style={{
                            borderColor: "var(--accent-player)",
                            background: "var(--accent-player-bg)",
                            color: "var(--accent-player)",
                        }}
                    >
                        Send Directive
                    </button>
                </div>

                {status ? (
                    <p className="text-sm text-[color:var(--text-secondary)]" aria-live="polite">
                        {status}
                    </p>
                ) : null}

                {transcriptPreview ? (
                    <p className="rounded border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-2 text-sm text-[color:var(--text-secondary)]">
                        Transcript: {transcriptPreview}
                    </p>
                ) : null}
            </section>
        </div>
    );
};

export default FactionOutbreakModal;
