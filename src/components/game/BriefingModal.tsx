"use client";

import { type MouseEvent, useEffect, useState } from "react";

import { GAME_LORE, GAME_MECHANICS } from "@/game/info";
import { useGameStore } from "@/game/store";
import {
    hasAnyLocalKey,
    readLocalElevenKey,
    readLocalGeminiKey,
    writeLocalElevenKey,
    writeLocalGeminiKey,
} from "@/lib/local-keys";

interface CadenceOption {
    turns: number;
    label: string;
    description: string;
    locked?: boolean;
    proto?: boolean;
}

const CADENCES: CadenceOption[] = [
    {
        turns: 12,
        label: "Default",
        description: "12 epochs · Sept 2028 · standard simulation",
        proto: true,
    },
    {
        turns: 6,
        label: "Sprint",
        description: "Compressed campaign · prototype",
        locked: true,
    },
    {
        turns: 24,
        label: "Marathon",
        description: "Extended cycle · prototype",
        locked: true,
    },
];

type AiKeyMode = "system" | "personal";
type UplinkPhase = "idle" | "shatter" | "drop" | "lock";
type BriefingAction = "home" | "options" | "intel" | "feedback";
type BlinkState = "_" | " ";
type BriefingModalPanel = "options" | "intel" | null;

const PRIMARY_MENU = [
    { label: "Commence Epoch", hint: "Launches the simulation" },
    { label: "Options", hint: "Adjust cadence and AI provider" },
    { label: "Intel Archives", hint: "Operational snapshot below" },
    { label: "Feedback", hint: "Report bugs or suggest improvements" },
] as const;

const UPLINK_SHATTER_MS = 520;
const UPLINK_DROP_MS = 1200;
const UPLINK_LOCK_MS = 680;
const UPLINK_TOTAL_MS = UPLINK_SHATTER_MS + UPLINK_DROP_MS + UPLINK_LOCK_MS;
const CHAMFER_PANEL =
    "[clip-path:polygon(0_0,94%_0,100%_12%,100%_100%,6%_100%,0_88%)]";

const TACTICAL_MARGIN_DATA = [
    "[NODE_UPLINK: SECURE]",
    "LAT: 34.05",
    "AZIMUTH: 180",
    "IFF: VALID",
] as const;

const playRadarPing = (
    audioContext: AudioContext,
    startAt: number,
    baseFrequency: number,
) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(baseFrequency, startAt);
    oscillator.frequency.exponentialRampToValueAtTime(baseFrequency * 1.8, startAt + 0.12);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.07, startAt + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.24);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.3);
};

const playUplinkAudio = () => {
    if (typeof window === "undefined") return;
    const webkitWindow = window as Window & {
        webkitAudioContext?: typeof AudioContext;
    };
    const AudioCtor = globalThis.AudioContext || webkitWindow.webkitAudioContext;
    if (!AudioCtor) return;

    const audioContext = new AudioCtor();
    const now = audioContext.currentTime;

    const boomOscillator = audioContext.createOscillator();
    const boomGain = audioContext.createGain();
    boomOscillator.type = "triangle";
    boomOscillator.frequency.setValueAtTime(72, now + 0.22);
    boomOscillator.frequency.exponentialRampToValueAtTime(28, now + 0.8);
    boomGain.gain.setValueAtTime(0.0001, now + 0.2);
    boomGain.gain.exponentialRampToValueAtTime(0.18, now + 0.32);
    boomGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
    boomOscillator.connect(boomGain);
    boomGain.connect(audioContext.destination);
    boomOscillator.start(now + 0.2);
    boomOscillator.stop(now + 1.2);

    for (let i = 0; i < 3; i += 1) {
        playRadarPing(audioContext, now + 1.05 + i * 0.28, 820 + i * 95);
    }

    const chatterOscillator = audioContext.createOscillator();
    const chatterFilter = audioContext.createBiquadFilter();
    const chatterGain = audioContext.createGain();
    chatterOscillator.type = "sawtooth";
    chatterOscillator.frequency.setValueAtTime(150, now);
    chatterOscillator.frequency.linearRampToValueAtTime(190, now + 0.9);
    chatterFilter.type = "bandpass";
    chatterFilter.frequency.setValueAtTime(1100, now);
    chatterGain.gain.setValueAtTime(0.0001, now);
    chatterGain.gain.exponentialRampToValueAtTime(0.02, now + 0.1);
    chatterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
    chatterOscillator.connect(chatterFilter);
    chatterFilter.connect(chatterGain);
    chatterGain.connect(audioContext.destination);
    chatterOscillator.start(now);
    chatterOscillator.stop(now + 1);

    window.setTimeout(() => {
        audioContext.close().catch(() => undefined);
    }, 2400);
};

interface BriefingModalProps {
    ignoreGridState?: boolean;
    onLaunchComplete?: () => void;
    mode?: "classic" | "scif";
}

const BriefingModal = ({
    ignoreGridState = false,
    onLaunchComplete,
    mode = "classic",
}: BriefingModalProps) => {
    const launchGame = useGameStore((s) => s.launchGame);
    const selectedCadence = useGameStore((s) => s.selectedCadence);
    const selectCadence = useGameStore((s) => s.selectCadence);
    const grid = useGameStore((s) => s.grid);

    const [elevenKey, setElevenKey] = useState<string>("");
    const [geminiKey, setGeminiKey] = useState<string>("");
    const [aiKeyMode, setAiKeyMode] = useState<AiKeyMode>("system");
    const [uplinkPhase, setUplinkPhase] = useState<UplinkPhase>("idle");
    const [isUplinkActive, setIsUplinkActive] = useState<boolean>(false);
    const [activeAction, setActiveAction] = useState<BriefingAction>("home");
    const [activePanel, setActivePanel] = useState<BriefingModalPanel>(null);
    const [isPanelClosing, setIsPanelClosing] = useState<boolean>(false);
    const [signalTick, setSignalTick] = useState<number>(0);
    const [cursorBlink, setCursorBlink] = useState<BlinkState>("_");
    const isScif = mode === "scif";

    useEffect(() => {
        const localEleven = readLocalElevenKey();
        const localGemini = readLocalGeminiKey();
        setElevenKey(localEleven);
        setGeminiKey(localGemini);
        setAiKeyMode(hasAnyLocalKey() ? "personal" : "system");
    }, []);

    useEffect(() => {
        if (!isScif) return;
        const telemetryInterval = window.setInterval(() => {
            setSignalTick((prev) => prev + 1);
        }, 1400);

        const cursorInterval = window.setInterval(() => {
            setCursorBlink((prev) => (prev === "_" ? " " : "_"));
        }, 520);

        return () => {
            window.clearInterval(telemetryInterval);
            window.clearInterval(cursorInterval);
        };
    }, [isScif]);

    useEffect(() => {
        if (!activePanel) return;

        const handleEscapeClose = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            if (isPanelClosing) return;
            setIsPanelClosing(true);
            window.setTimeout(() => {
                setActivePanel(null);
                setActiveAction("home");
                setIsPanelClosing(false);
            }, 160);
        };

        window.addEventListener("keydown", handleEscapeClose);
        return () => {
            window.removeEventListener("keydown", handleEscapeClose);
        };
    }, [activePanel, isPanelClosing]);

    if (!ignoreGridState && grid.length > 0) return null;

    const handleLaunch = () => {
        if (isUplinkActive) return;
        if (aiKeyMode === "personal") {
            writeLocalElevenKey(elevenKey);
            writeLocalGeminiKey(geminiKey);
        } else {
            writeLocalElevenKey("");
            writeLocalGeminiKey("");
        }

        setIsUplinkActive(true);
        setUplinkPhase("shatter");
        playUplinkAudio();

        window.setTimeout(() => {
            setUplinkPhase("drop");
        }, UPLINK_SHATTER_MS);

        window.setTimeout(() => {
            setUplinkPhase("lock");
        }, UPLINK_SHATTER_MS + UPLINK_DROP_MS);

        window.setTimeout(() => {
            launchGame();
            onLaunchComplete?.();
        }, UPLINK_TOTAL_MS);
    };

    const handleOpenFeedback = () => {
        if (typeof window === "undefined") return;
        window.dispatchEvent(new Event("open-feedback-dialog"));
    };

    const handlePrimaryMenuClick = (
        label: (typeof PRIMARY_MENU)[number]["label"],
    ) => {
        if (label === "Commence Epoch") {
            handleLaunch();
            return;
        }

        if (label === "Options") {
            setActiveAction("options");
            setActivePanel("options");
            return;
        }

        if (label === "Intel Archives") {
            setActiveAction("intel");
            setActivePanel("intel");
            return;
        }

        setActiveAction("feedback");
        handleOpenFeedback();
    };

    const handleClosePanel = () => {
        if (!activePanel || isPanelClosing) return;
        setIsPanelClosing(true);
        window.setTimeout(() => {
            setActivePanel(null);
            setActiveAction("home");
            setIsPanelClosing(false);
        }, 160);
    };

    const handlePanelBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget) return;
        handleClosePanel();
    };

    const liveSystemMetrics = [
        {
            label: "Signal Integrity",
            value: `${88 + ((signalTick * 3) % 7)}%`,
            highlight: "text-[rgba(178,190,204,0.96)]",
        },
        {
            label: "Packet Drift",
            value: `${2 + ((signalTick * 2) % 4)}ms`,
            highlight: "text-[rgba(217,186,114,0.95)]",
        },
        {
            label: "Cipher Rotation",
            value: `R-${13 + (signalTick % 5)}`,
            highlight: "text-[rgba(178,190,204,0.96)]",
        },
        {
            label: "Threat Lattice",
            value: `${61 + ((signalTick * 5) % 9)}%`,
            highlight: "text-[rgba(150,224,184,0.95)]",
        },
    ];

    const liveTheaterMetrics = [
        {
            label: "District Sync",
            value: `${42 + ((signalTick * 3) % 15)} sectors`,
            highlight: "text-[rgba(178,190,204,0.96)]",
        },
        {
            label: "Narrative Pressure",
            value: `${67 + ((signalTick * 2) % 11)} / 100`,
            highlight: "text-[rgba(217,186,114,0.95)]",
        },
        {
            label: "Counter-Meme Sweep",
            value: `T+${14 + (signalTick % 9)}m`,
            highlight: "text-[rgba(178,190,204,0.96)]",
        },
        {
            label: "COMINT Relay",
            value: signalTick % 2 === 0 ? "LOCKED" : "REKEYING",
            highlight: "text-[rgba(150,224,184,0.95)]",
        },
    ];

    return (
        <div
            className={`fixed inset-0 z-30 overflow-x-hidden ${
                isScif ? "overflow-y-hidden bg-[#06090d]" : "overflow-y-auto bg-[#040507]"
            }`}
        >
            <div className={`war-room-noise pointer-events-none absolute inset-0 ${isScif ? "opacity-10" : "opacity-20"}`} />
            <div className={`war-room-scanlines pointer-events-none absolute inset-0 ${isScif ? "opacity-5" : "opacity-40"}`} />
            {isScif ? (
                <div className="war-room-vignette pointer-events-none absolute inset-0" />
            ) : null}
            <div
                className={`pointer-events-none absolute inset-0 ${
                    isScif
                        ? "bg-[radial-gradient(circle_at_16%_16%,rgba(178,190,204,0.05),transparent_46%),radial-gradient(circle_at_74%_72%,rgba(217,186,114,0.06),transparent_36%)]"
                        : "bg-[radial-gradient(circle_at_18%_20%,rgba(220,38,38,0.14),transparent_44%),radial-gradient(circle_at_78%_72%,rgba(34,197,94,0.14),transparent_40%),radial-gradient(circle_at_40%_80%,rgba(250,204,21,0.12),transparent_36%)]"
                }`}
            />
            {isScif ? null : (
                <div className="pointer-events-none absolute right-[-18%] top-[-10%] h-[74vh] w-[74vh] border border-[rgba(248,250,252,0.08)] [clip-path:polygon(25%_6%,75%_6%,96%_50%,75%_94%,25%_94%,4%_50%)]" />
            )}

            <div
                className={`relative grid ${
                    isScif ? "h-full" : "min-h-full"
                } grid-cols-1 px-4 py-6 lg:grid-cols-[minmax(440px,640px)_1fr] lg:px-8 ${
                    isScif ? "lg:py-8" : "lg:pb-12 lg:pt-8"
                } ${
                    isUplinkActive ? "uplink-doors-open" : ""
                }`}
            >
                <section className="self-start lg:mt-[6vh]">
                    <div className={`war-room-panel relative flex w-full flex-col gap-5 px-5 py-6 sm:px-6 ${
                        isScif
                            ? `border border-[rgba(148,163,184,0.38)] bg-[rgba(5,8,12,0.94)] shadow-[0_0_0_1px_rgba(148,163,184,0.16),inset_0_0_0_1px_rgba(2,6,12,0.8)] ${CHAMFER_PANEL}`
                            : "border border-[rgba(220,38,38,0.4)] bg-[rgba(5,6,8,0.92)] shadow-[0_0_0_1px_rgba(248,250,252,0.06),0_0_38px_rgba(220,38,38,0.16)]"
                    }`}>
                        {isScif ? <div className="panel-crosshair panel-crosshair-tl" /> : null}
                        {isScif ? <div className="panel-crosshair panel-crosshair-tr" /> : null}
                        {isScif ? <div className="panel-crosshair panel-crosshair-bl" /> : null}
                        {isScif ? <div className="panel-crosshair panel-crosshair-br" /> : null}
                        <header className="flex flex-col items-start gap-2 text-left">
                            <h1
                                className={`text-3xl font-black uppercase tracking-[8px] sm:text-[2.1rem] ${
                                    isScif ? "crt-aberration text-[color:#e2e8f0]" : "text-[color:#f8fafc]"
                                }`}
                                style={{
                                    ...(isScif
                                        ? {}
                                        : {
                                              textShadow:
                                                  "0 0 16px rgba(220,38,38,0.45), 0 0 48px rgba(220,38,38,0.22)",
                                          }),
                                    fontFamily:
                                        "Impact, Haettenschweiler, 'Arial Black', sans-serif",
                                }}
                            >
                                Corruptópolis
                            </h1>
                            <p className={`text-[11px] uppercase ${isScif ? "tracking-[1.5px] text-[rgba(181,193,208,0.66)]" : "tracking-[3px] text-[rgba(248,250,252,0.62)]"}`}>
                                {isScif
                                    ? "[A 4x Roguelike On Memetics & Politics]"
                                    : "Hyperpolis Simulation Engine"}
                            </p>
                        </header>

                        <div className={`h-px w-full ${
                            isScif
                                ? "bg-[linear-gradient(to_right,rgba(148,163,184,0.45),rgba(148,163,184,0.08))]"
                                : "bg-[linear-gradient(to_right,rgba(248,250,252,0.45),rgba(248,250,252,0.08))]"
                        }`} />

                        {isScif ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <section className={`relative border border-[rgba(148,163,184,0.35)] bg-[rgba(9,12,18,0.9)] p-3 font-mono text-[11px] uppercase tracking-[1.4px] text-[rgba(198,205,214,0.84)] ${CHAMFER_PANEL}`}>
                                <div className="panel-crosshair panel-crosshair-tl" />
                                <div className="panel-crosshair panel-crosshair-tr" />
                                <div className="panel-crosshair panel-crosshair-bl" />
                                <div className="panel-crosshair panel-crosshair-br" />
                                <p className="mb-2 text-[10px] tracking-[2.6px] text-[rgba(159,171,186,0.78)]">
                                    SYSTEM STATUS
                                </p>
                                <div className="space-y-1">
                                    {liveSystemMetrics.map((metric) => (
                                        <p
                                            key={metric.label}
                                            className="flex items-center justify-between gap-2"
                                        >
                                            <span>{metric.label}</span>
                                            <span className={metric.highlight}>{metric.value}</span>
                                        </p>
                                    ))}
                                </div>
                                <p className="mt-2 border-t border-[rgba(148,163,184,0.22)] pt-2 text-[10px] text-[rgba(159,171,186,0.74)]">
                                    C2/OPS_TERMINAL{cursorBlink}
                                </p>
                            </section>
                            <section className={`relative border border-[rgba(148,163,184,0.35)] bg-[rgba(9,12,18,0.9)] p-3 font-mono text-[11px] uppercase tracking-[1.4px] text-[rgba(198,205,214,0.84)] ${CHAMFER_PANEL}`}>
                                <div className="panel-crosshair panel-crosshair-tl" />
                                <div className="panel-crosshair panel-crosshair-tr" />
                                <div className="panel-crosshair panel-crosshair-bl" />
                                <div className="panel-crosshair panel-crosshair-br" />
                                <p className="mb-2 text-[10px] tracking-[2.6px] text-[rgba(159,171,186,0.78)]">
                                    THEATER STATUS
                                </p>
                                <div className="space-y-1">
                                    {liveTheaterMetrics.map((metric) => (
                                        <p
                                            key={metric.label}
                                            className="flex items-center justify-between gap-2"
                                        >
                                            <span>{metric.label}</span>
                                            <span className={metric.highlight}>{metric.value}</span>
                                        </p>
                                    ))}
                                </div>
                                <p className="mt-2 border-t border-[rgba(148,163,184,0.22)] pt-2 text-[10px] text-[rgba(159,171,186,0.74)]">
                                    FEED_CLOCK: {`0${(signalTick * 7) % 10}`.slice(-2)}
                                    :{`0${(signalTick * 4) % 10}`.slice(-2)}
                                    {cursorBlink}
                                </p>
                            </section>
                        </div> : null}

                        <section className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {PRIMARY_MENU.map((item, index) => {
                                const isPrimary = index === 0;
                                const isActiveAction =
                                    (item.label === "Options" &&
                                        activeAction === "options") ||
                                    (item.label === "Intel Archives" &&
                                        activeAction === "intel") ||
                                    (item.label === "Feedback" &&
                                        activeAction === "feedback");
                                return (
                                    <button
                                        type="button"
                                        key={item.label}
                                        onClick={() =>
                                            handlePrimaryMenuClick(item.label)
                                        }
                                        disabled={isUplinkActive}
                                        className={`group relative border px-3 py-3 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                                            isPrimary
                                                ? "border-[rgba(250,204,21,0.92)] bg-[rgba(250,204,21,0.18)]"
                                                : "border-[rgba(148,163,184,0.36)] bg-[rgba(14,18,24,0.86)]"
                                        } ${
                                            isActiveAction
                                                ? "border-[rgba(141,197,168,0.88)] bg-[rgba(22,38,30,0.72)]"
                                                : ""
                                        } ${CHAMFER_PANEL} hover:border-[rgba(141,197,168,0.84)] hover:bg-[rgba(22,38,30,0.72)]`}
                                        aria-label={item.label}
                                    >
                                        <p className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[rgba(248,250,252,0.95)]">
                                            {item.label}
                                        </p>
                                        <p className="mt-1 text-[10px] uppercase tracking-[1.4px] text-[rgba(248,250,252,0.56)] group-hover:text-[rgba(248,250,252,0.82)]">
                                            {item.hint}
                                        </p>
                                        <span className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 [background:repeating-linear-gradient(90deg,transparent,transparent_12px,rgba(248,250,252,0.08)_13px,transparent_14px)]" />
                                    </button>
                                );
                            })}
                        </section>

                        {activeAction === "feedback" ? (
                            <section className="border border-[rgba(34,197,94,0.42)] bg-[rgba(6,18,12,0.55)] p-3 text-[11px] uppercase tracking-[1.7px] text-[rgba(220,252,231,0.9)] [clip-path:polygon(0_0,97%_0,100%_22%,100%_100%,3%_100%,0_78%)]">
                                FEEDBACK CHANNEL LINKED // DIALOG DEPLOYED
                            </section>
                        ) : null}

                        <article className="flex flex-col gap-2 border-l-2 border-[rgba(148,163,184,0.34)] pl-3 text-sm leading-relaxed text-[rgba(198,205,214,0.82)]">
                            <p>
                                You are the last chance for the coalition. Your
                                mission: dismantle the{" "}
                                <em className="not-italic text-[rgba(141,197,168,0.9)]">
                                    Collaborative Corruption Matrix
                                </em>
                                . We hold out for 12 Epochs (12 Cycles, one year)
                                to weaponize the narrative against the six Pillars
                                of Power. Click to embed. Talk to convert. Speak to
                                lead.
                            </p>
                            <p>
                                Remember: They own the simulation. Every Epoch they
                                spread compliance and crush resistance. The clock is
                                ticking.
                            </p>
                            <p className="border-l-2 border-[rgba(217,186,114,0.86)] pl-2 text-[12px] text-[rgba(217,186,114,0.94)]">
                                SYSTEM WARNING: Unstable telemetry. Major system
                                updates pending. Use the FEEDBACK control to log
                                grid errors.
                            </p>
                        </article>

                        <button
                            type="button"
                            onClick={handleLaunch}
                            disabled={isUplinkActive}
                            className={`w-full border border-[rgba(217,186,114,0.95)] bg-[rgba(217,186,114,0.2)] px-6 py-3 text-sm font-bold uppercase tracking-[4px] text-[rgba(248,250,252,0.96)] transition hover:bg-[rgba(217,186,114,0.34)] ${CHAMFER_PANEL} disabled:cursor-not-allowed disabled:opacity-50`}
                            style={{ textShadow: "0 0 10px rgba(250,204,21,0.42)" }}
                        >
                            Launch Campaign
                        </button>
                    </div>
                </section>
                <section className="relative hidden h-full lg:block">
                    <div className="absolute inset-0">
                        {isScif ? (
                            <>
                                <div className={`absolute left-[8%] top-[20%] h-[68%] w-[72%] border border-[rgba(148,163,184,0.22)] bg-[rgba(5,8,12,0.52)] ${CHAMFER_PANEL}`}>
                                    <div className="absolute left-4 top-3 text-[10px] uppercase tracking-[2px] text-[rgba(181,193,208,0.68)]">
                                        [THEATER_TOPOLOGY_FEED]
                                    </div>
                                    <div className="pointer-events-none absolute inset-[14px] border border-[rgba(148,163,184,0.2)] bg-[radial-gradient(circle_at_35%_35%,rgba(148,163,184,0.08),transparent_55%),repeating-linear-gradient(135deg,rgba(148,163,184,0.08)_0px,rgba(148,163,184,0.08)_1px,transparent_1px,transparent_17px)]" />
                                </div>
                                <div className="absolute left-[10%] top-[10%] max-w-[28rem] text-[10px] uppercase tracking-[2px] text-[rgba(181,193,208,0.46)]">
                                    Tactical map integration channel. Mesh contours, district
                                    relays, and support vectors stream in controlled cadence.
                                </div>
                                <div className="absolute bottom-[11%] left-[8%] grid grid-cols-2 gap-x-5 gap-y-1 text-[10px] uppercase tracking-[2px] text-[rgba(159,171,186,0.74)]">
                                    {TACTICAL_MARGIN_DATA.map((datum) => (
                                        <span key={datum}>{datum}</span>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="absolute left-[8%] top-[20%] h-60 w-60 border border-[rgba(248,250,252,0.08)] [clip-path:polygon(25%_6%,75%_6%,96%_50%,75%_94%,25%_94%,4%_50%)]" />
                                <div className="absolute left-[24%] top-[44%] h-80 w-80 border border-[rgba(34,197,94,0.14)] [clip-path:polygon(25%_6%,75%_6%,96%_50%,75%_94%,25%_94%,4%_50%)]" />
                                <div className="absolute left-[12%] top-[10%] max-w-[26rem] text-[10px] uppercase tracking-[2px] text-[rgba(248,250,252,0.28)]">
                                    Dynamic battlefield viewport reserved for rotating hex
                                    map, concept art, or cascading intelligence feed.
                                </div>
                            </>
                        )}
                    </div>
                </section>
            </div>
            {activePanel ? (
                <div
                    className={`absolute inset-0 z-40 flex items-center justify-center bg-[rgba(2,6,12,0.72)] px-4 py-6 transition-opacity duration-150 ${
                        isPanelClosing ? "opacity-0" : "opacity-100"
                    }`}
                    onMouseDown={handlePanelBackdropMouseDown}
                >
                    <div
                        className={`relative w-full max-w-3xl border border-[rgba(148,163,184,0.34)] bg-[rgba(8,12,18,0.95)] p-4 shadow-[0_0_28px_rgba(0,0,0,0.5)] transition-all duration-150 ${
                            isPanelClosing
                                ? "scale-[0.985] opacity-0"
                                : "scale-100 opacity-100"
                        } ${CHAMFER_PANEL}`}
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={handleClosePanel}
                            className="absolute right-3 top-3 border border-[rgba(148,163,184,0.35)] bg-[rgba(14,18,24,0.9)] px-2 py-1 text-[10px] uppercase tracking-[2px] text-[rgba(226,232,240,0.88)] transition hover:border-[rgba(217,186,114,0.9)]"
                            aria-label="Close panel"
                        >
                            Close
                        </button>

                        {activePanel === "intel" ? (
                            <section className={`relative border border-[rgba(148,163,184,0.32)] bg-[rgba(8,12,18,0.9)] p-3 ${CHAMFER_PANEL}`}>
                                <p className="text-[10px] uppercase tracking-[3px] text-[rgba(248,250,252,0.58)]">
                                    Info Snapshot
                                </p>
                                <ul className="mt-2 flex flex-col gap-2 text-[12px] text-[rgba(248,250,252,0.84)]">
                                    <li>
                                        {GAME_MECHANICS[0]?.title}:{" "}
                                        {GAME_MECHANICS[0]?.content}
                                    </li>
                                    <li>
                                        {GAME_MECHANICS[3]?.title}:{" "}
                                        {GAME_MECHANICS[3]?.content}
                                    </li>
                                    <li>
                                        {GAME_LORE[1]?.name} — {GAME_LORE[1]?.role}
                                    </li>
                                </ul>
                            </section>
                        ) : null}

                        {activePanel === "options" ? (
                            <section className="mt-2 flex max-h-[78vh] flex-col gap-3 overflow-y-auto pr-1">
                                <section
                                    className={`flex flex-col gap-3 border border-[rgba(148,163,184,0.26)] bg-[rgba(8,12,18,0.72)] p-3 ${CHAMFER_PANEL}`}
                                >
                                    <span className="text-[10px] uppercase tracking-[3px] text-[rgba(248,250,252,0.62)]">
                                        Cadence
                                    </span>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                        {CADENCES.map((c) => {
                                            const isActive =
                                                selectedCadence === c.turns && !c.locked;
                                            return (
                                                <button
                                                    type="button"
                                                    key={c.turns}
                                                    disabled={c.locked}
                                                    onClick={() => selectCadence(c.turns)}
                                                    className={`flex min-h-[112px] min-w-[140px] flex-col justify-between gap-2 border px-3 pb-5 pt-3 text-left transition hover:border-[rgba(141,197,168,0.78)] disabled:cursor-not-allowed disabled:opacity-40 ${CHAMFER_PANEL}`}
                                                    style={{
                                                        borderColor: isActive
                                                            ? "rgba(34,197,94,0.92)"
                                                            : "rgba(148,163,184,0.24)",
                                                        background: isActive
                                                            ? "rgba(22,38,30,0.72)"
                                                            : "rgba(14,18,24,0.84)",
                                                    }}
                                                >
                                                    <div className="flex items-end justify-between gap-2">
                                                        <span
                                                            className="text-2xl font-bold text-[rgba(248,250,252,0.95)]"
                                                            style={{
                                                                fontFamily:
                                                                    "Impact, Haettenschweiler, 'Arial Black', sans-serif",
                                                            }}
                                                        >
                                                            {c.turns}
                                                        </span>
                                                        <span className="text-[10px] uppercase tracking-[2px] text-[rgba(248,250,252,0.56)]">
                                                            {c.label}
                                                            {c.locked ? " · soon" : ""}
                                                        </span>
                                                    </div>
                                                    <span className="mb-1 text-[11px] leading-relaxed text-[rgba(248,250,252,0.82)]">
                                                        {c.description}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>

                                <section className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-[3px] text-[rgba(248,250,252,0.58)]">
                                        AI Provider
                                    </span>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        <button
                                            type="button"
                                            onClick={() => setAiKeyMode("system")}
                                            className={`border px-3 py-2 text-left transition hover:border-[rgba(217,186,114,0.92)] ${CHAMFER_PANEL}`}
                                            style={{
                                                borderColor:
                                                    aiKeyMode === "system"
                                                        ? "rgba(250,204,21,0.92)"
                                                        : "rgba(148,163,184,0.24)",
                                                background:
                                                    aiKeyMode === "system"
                                                        ? "rgba(250,204,21,0.14)"
                                                        : "rgba(14,18,24,0.84)",
                                            }}
                                        >
                                            <p className="text-[10px] uppercase tracking-[2px] text-[rgba(248,250,252,0.56)]">
                                                Default
                                            </p>
                                            <p className="text-xs font-semibold text-[rgba(248,250,252,0.95)]">
                                                System AIs
                                            </p>
                                            <p className="text-[11px] text-[rgba(248,250,252,0.78)]">
                                                ElevenLabs + Gemini from the game server
                                            </p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAiKeyMode("personal")}
                                            className={`border px-3 py-2 text-left transition hover:border-[rgba(217,186,114,0.92)] ${CHAMFER_PANEL}`}
                                            style={{
                                                borderColor:
                                                    aiKeyMode === "personal"
                                                        ? "rgba(250,204,21,0.92)"
                                                        : "rgba(148,163,184,0.24)",
                                                background:
                                                    aiKeyMode === "personal"
                                                        ? "rgba(250,204,21,0.14)"
                                                        : "rgba(14,18,24,0.84)",
                                            }}
                                        >
                                            <p className="text-[10px] uppercase tracking-[2px] text-[rgba(248,250,252,0.56)]">
                                                Override
                                            </p>
                                            <p className="text-xs font-semibold text-[rgba(248,250,252,0.95)]">
                                                Add personal key
                                            </p>
                                            <p className="text-[11px] text-[rgba(248,250,252,0.78)]">
                                                Use your own ElevenLabs and Gemini keys
                                            </p>
                                        </button>
                                    </div>

                                    {aiKeyMode === "personal" ? (
                                        <>
                                            <KeyRow
                                                label="ElevenLabs"
                                                value={elevenKey}
                                                onChange={setElevenKey}
                                                placeholder="sk_... your ElevenLabs key"
                                            />
                                            <KeyRow
                                                label="Gemini"
                                                value={geminiKey}
                                                onChange={setGeminiKey}
                                                placeholder="AIza... your Gemini key"
                                            />
                                            <p className="text-[10px] text-[rgba(248,250,252,0.56)]">
                                                Personal keys override System AIs and are
                                                stored only on this device.
                                            </p>
                                        </>
                                    ) : (
                                        <p className={`border border-[rgba(148,163,184,0.24)] bg-[rgba(14,18,24,0.84)] px-3 py-2 text-[11px] text-[rgba(198,205,214,0.8)] ${CHAMFER_PANEL}`}>
                                            System AIs are active. The game will use server
                                            ElevenLabs + Gemini unless you switch to personal
                                            keys.
                                        </p>
                                    )}
                                </section>
                            </section>
                        ) : null}
                    </div>
                </div>
            ) : null}
            {isUplinkActive ? (
                <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
                    <div className="uplink-shatter absolute inset-0 bg-[radial-gradient(circle_at_48%_42%,rgba(250,204,21,0.34),rgba(2,6,23,0.92)_42%,rgba(2,6,23,0.98)_100%)]" />
                    <div className="uplink-digital-noise absolute inset-0 mix-blend-screen" />
                    <div className="uplink-topography absolute inset-0 opacity-70" />
                    <div className="uplink-satellite-drop absolute inset-0" />
                    <div className="uplink-lock absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 [clip-path:polygon(25%_6%,75%_6%,96%_50%,75%_94%,25%_94%,4%_50%)] border border-[rgba(250,204,21,0.88)]" />
                    <div className="absolute bottom-8 left-1/2 w-[min(680px,92vw)] -translate-x-1/2 border border-[rgba(248,250,252,0.3)] bg-[rgba(2,6,23,0.82)] px-4 py-3 text-[11px] uppercase tracking-[2px] text-[rgba(248,250,252,0.86)]">
                        {uplinkPhase === "shatter"
                            ? "COMMENCE EPOCH // MENU FRAGMENTATION DETECTED // STREAMING RAW HEX"
                            : null}
                        {uplinkPhase === "drop"
                            ? "TACTICAL SATELLITE UPLINK INBOUND // DESCENDING THROUGH INTERFERENCE"
                            : null}
                        {uplinkPhase === "lock"
                            ? "UPLINK ESTABLISHED, MCO // TARGET HEX LOCKED // EXECUTE"
                            : null}
                    </div>
                </div>
            ) : null}
        </div>
    );
};

interface KeyRowProps {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
}

const KeyRow = ({ label, value, onChange, placeholder }: KeyRowProps) => {
    const [shown, setShown] = useState<boolean>(false);
    return (
        <label className="flex items-center gap-2 text-[11px] uppercase tracking-[1.5px] text-[rgba(248,250,252,0.58)]">
            <span className="w-20 flex-shrink-0">{label}</span>
            <input
                type={shown ? "text" : "password"}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="flex-1 border border-[rgba(148,163,184,0.3)] bg-[rgba(8,12,18,0.7)] px-2 py-1.5 font-mono text-xs normal-case tracking-normal text-[rgba(226,232,240,0.95)] outline-none transition focus:border-[rgba(217,186,114,0.9)] [clip-path:polygon(0_0,97%_0,100%_30%,100%_100%,3%_100%,0_70%)]"
            />
            <button
                type="button"
                onClick={() => setShown((s) => !s)}
                aria-label={shown ? "Hide key" : "Show key"}
                className="border border-[rgba(148,163,184,0.26)] bg-[rgba(14,18,24,0.85)] p-1 text-[rgba(181,193,208,0.76)] transition hover:border-[rgba(217,186,114,0.9)] hover:text-[rgba(248,250,252,0.95)]"
            >
                {shown ? "🙈" : "👁"}
            </button>
        </label>
    );
};

export default BriefingModal;
