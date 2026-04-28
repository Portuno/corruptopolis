"use client";

import { useMemo } from "react";

import {
    getGlobalControlMetrics,
    getHexControlMetrics,
} from "@/game/control-dashboard";
import { useGameStore } from "@/game/store";
import { formatPercent } from "@/lib/utils";

const ControlDashboard = () => {
    const grid = useGameStore((state) => state.grid);
    const selectedHex = useGameStore((state) => state.selectedHex);

    const selectedNode = useMemo(() => {
        if (!selectedHex || grid.length === 0) return null;
        const column = grid[selectedHex.col];
        if (!column) return null;
        return column[selectedHex.row] ?? null;
    }, [grid, selectedHex]);

    const selectedMetrics = useMemo(() => {
        if (!selectedHex || !selectedNode) return null;
        return getHexControlMetrics(
            selectedNode,
            selectedHex.col,
            selectedHex.row,
        );
    }, [selectedHex, selectedNode]);

    const globalMetrics = useMemo(() => getGlobalControlMetrics(grid), [grid]);

    return (
        <section
            className="panel flex min-h-0 flex-col gap-3 rounded-md p-3"
            style={{ borderColor: "var(--border-mid)" }}
        >
            <h3
                className="text-[10px] uppercase tracking-[3px]"
                style={{ color: "var(--text-muted)" }}
            >
                Hex Control Dashboard
            </h3>

            <article className="flex flex-col gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-[2px] text-[color:var(--text-primary)]">
                    Selected Node
                </h4>
                {!selectedMetrics ? (
                    <p className="rounded border px-2 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--text-muted)]" style={{ borderColor: "var(--border-subtle)" }}>
                        [ WAITING FOR TELEMETRY ]
                    </p>
                ) : (
                    <>
                        <p className="text-xs text-[color:var(--text-secondary)]">
                            Coordinates: C{selectedMetrics.coordinates.col} - R
                            {selectedMetrics.coordinates.row}
                        </p>
                        <SplitBar
                            insurgent={selectedMetrics.overall.insurgent}
                            government={selectedMetrics.overall.government}
                        />
                    </>
                )}
            </article>

            <article className="flex min-h-0 flex-col gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-[2px] text-[color:var(--text-primary)]">
                    Full Map
                </h4>
                <PartySplit
                    insurgent={globalMetrics.overall.insurgent}
                    government={globalMetrics.overall.government}
                />
                <ElementRows rows={globalMetrics.elements} />
            </article>
        </section>
    );
};

const PartySplit = ({
    insurgent,
    government,
}: {
    insurgent: number;
    government: number;
}) => (
    <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded border px-2 py-1.5" style={{ borderColor: "var(--border-subtle)" }}>
            <p className="uppercase tracking-[1.5px] text-[color:var(--text-muted)]">
                Insurgent
            </p>
            <p className="font-semibold text-[color:var(--accent-player)]">
                {formatPercent(insurgent, 1)}
            </p>
        </div>
        <div className="rounded border px-2 py-1.5" style={{ borderColor: "var(--border-subtle)" }}>
            <p className="uppercase tracking-[1.5px] text-[color:var(--text-muted)]">
                Government
            </p>
            <p className="font-semibold text-[color:var(--accent-enemy)]">
                {formatPercent(government, 1)}
            </p>
        </div>
    </div>
);

const SplitBar = ({
    insurgent,
    government,
}: {
    insurgent: number;
    government: number;
}) => (
    <div className="flex flex-col gap-1">
        <div className="h-3 w-full overflow-hidden rounded border" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="flex h-full w-full">
                <div
                    className="h-full"
                    style={{
                        width: `${Math.max(0, Math.min(100, insurgent * 100))}%`,
                        background: "var(--accent-player)",
                    }}
                />
                <div
                    className="h-full"
                    style={{
                        width: `${Math.max(0, Math.min(100, government * 100))}%`,
                        background: "var(--accent-enemy)",
                    }}
                />
            </div>
        </div>
        <div className="flex items-center justify-between text-[11px]">
            <span style={{ color: "var(--accent-player)" }}>
                Insurgency {formatPercent(insurgent, 0)}
            </span>
            <span style={{ color: "var(--accent-enemy)" }}>
                Establishment {formatPercent(government, 0)}
            </span>
        </div>
    </div>
);

const ElementRows = ({
    rows,
}: {
    rows: Array<{
        key: string;
        label: string;
        weight: number;
        insurgent: number;
        government: number;
    }>;
}) => (
    <div className="max-h-52 overflow-auto rounded border" style={{ borderColor: "var(--border-subtle)" }}>
        <table className="w-full text-left text-xs">
            <thead className="bg-[color:var(--bg-surface)] text-[color:var(--text-muted)]">
                <tr>
                    <th className="px-2 py-1 font-medium">Element</th>
                    <th className="px-2 py-1 font-medium">Weight</th>
                    <th className="px-2 py-1 font-medium">Insurgent</th>
                    <th className="px-2 py-1 font-medium">Government</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((row) => (
                    <tr key={row.key} className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
                        <td className="px-2 py-1">{row.label}</td>
                        <td className="px-2 py-1">{row.weight.toFixed(2)}</td>
                        <td className="px-2 py-1">{formatPercent(row.insurgent, 1)}</td>
                        <td className="px-2 py-1">{formatPercent(row.government, 1)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export default ControlDashboard;
