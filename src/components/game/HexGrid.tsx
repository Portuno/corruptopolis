"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";

import { CANVAS_H, CANVAS_W } from "@/game/constants";
import { useGameStore } from "@/game/store";

import { drawGrid, resolveHexAtPoint } from "./canvas-helpers";

const HexGrid = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const grid = useGameStore((s) => s.grid);
    const pulsingNode = useGameStore((s) => s.pulsingNode);
    const phase = useGameStore((s) => s.phase);
    const enemyPlannedTiles = useGameStore((s) => s.enemyIntent.plannedTiles);
    const selectedHex = useGameStore((s) => s.selectedHex);
    const deployMeme = useGameStore((s) => s.deployMeme);
    const selectHex = useGameStore((s) => s.selectHex);
    const clearPulse = useGameStore((s) => s.clearPulse);
    const livingHiveEnabled = useGameStore((s) => s.livingHiveEnabled);
    const livingHiveIntensity = useGameStore((s) => s.livingHiveIntensity);
    const [timeMs, setTimeMs] = useState<number>(0);

    useEffect(() => {
        if (!livingHiveEnabled) return;
        let frameId = 0;
        const animate = () => {
            setTimeMs(performance.now());
            frameId = window.requestAnimationFrame(animate);
        };
        frameId = window.requestAnimationFrame(animate);
        return () => window.cancelAnimationFrame(frameId);
    }, [livingHiveEnabled]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || grid.length === 0) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        drawGrid(
            ctx,
            CANVAS_W,
            CANVAS_H,
            grid,
            pulsingNode,
            enemyPlannedTiles,
            selectedHex,
            livingHiveEnabled,
            livingHiveIntensity,
            timeMs,
        );
    }, [
        grid,
        pulsingNode,
        enemyPlannedTiles,
        selectedHex,
        livingHiveEnabled,
        livingHiveIntensity,
        timeMs,
    ]);

    useEffect(() => {
        if (!pulsingNode) return;
        const id = window.setTimeout(() => clearPulse(), 200);
        return () => window.clearTimeout(id);
    }, [pulsingNode, clearPulse]);

    const handleClick = (e: MouseEvent<HTMLCanvasElement>) => {
        if (phase !== "PLAYER_ACTION") return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;
        const hit = resolveHexAtPoint(grid, mx, my);
        if (!hit) return;
        selectHex(hit.col, hit.row);
        deployMeme(hit.col, hit.row);
    };

    return (
        <div className="hex-grid-shell flex h-full min-h-0 w-full items-center justify-center">
            {livingHiveEnabled ? (
                <div
                    aria-hidden="true"
                    className={`hex-grid-rain hex-grid-rain-${livingHiveIntensity} pointer-events-none absolute inset-0 rounded-md`}
                />
            ) : null}
            <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                onClick={handleClick}
                role="img"
                aria-label="Hexagonal influence map of 225 districts"
                className={`h-full max-h-full w-full max-w-full cursor-crosshair rounded-md border ${
                    livingHiveEnabled
                        ? `hex-grid-active-fx hex-grid-active-fx-${livingHiveIntensity}`
                        : ""
                }`}
                style={{
                    aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
                    borderColor: "var(--border-subtle)",
                    background: "var(--canvas-bg)",
                }}
            />
        </div>
    );
};

export default HexGrid;
