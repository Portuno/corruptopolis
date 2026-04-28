"use client";

import { ELEMENTS } from "@/game/elements";

const Legend = () => {
    return (
        <section className="flex flex-col gap-2">
            <h3
                className="text-[10px] uppercase tracking-[3px]"
                style={{ color: "var(--text-muted)" }}
            >
                Legend
            </h3>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
                <Swatch color="rgb(220, 30, 30)" label="Establishment" />
                <Swatch color="rgb(100, 100, 110)" label="Contested" />
                <Swatch color="rgb(30, 80, 220)" label="Coalition" />
                <Swatch
                    color="rgba(80, 220, 255, 0.55)"
                    label="Fortified"
                    border="rgba(80, 220, 255, 0.4)"
                />
            </div>
            <div className="grid grid-cols-3 gap-1 text-[10px]">
                {ELEMENTS.map((e) => (
                    <span
                        key={e.key}
                        className="flex items-center gap-1"
                        style={{ color: "var(--text-secondary)" }}
                    >
                        <span
                            className="font-bold"
                            style={{ color: e.color }}
                        >
                            {e.letter}
                        </span>
                        {e.label}
                    </span>
                ))}
            </div>
        </section>
    );
};

interface SwatchProps {
    color: string;
    label: string;
    border?: string;
}

const Swatch = ({ color, label, border }: SwatchProps) => (
    <span
        className="flex items-center gap-2"
        style={{ color: "var(--text-secondary)" }}
    >
        <span
            className="inline-block h-3 w-3 rounded-sm border"
            style={{
                background: color,
                borderColor: border ?? "transparent",
            }}
        />
        {label}
    </span>
);

export default Legend;
