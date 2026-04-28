import { ELEMENT_RGB } from "@/game/elements";
import { getDominant, hexCenter, hexVertices } from "@/game/grid";
import { alignmentColor } from "@/game/propagation";
import type {
    CanvasTheme,
    ElementWeights,
    Grid,
    HexNode,
    LivingHiveIntensity,
    Palette,
} from "@/game/types";
import { HEX_SIZE } from "@/game/constants";

const getLivingHiveScale = (
    intensity: LivingHiveIntensity,
): {
    pulseBoost: number;
    glowBlur: number;
    glowAlpha: number;
    dashSpeed: number;
    textAlpha: number;
} => {
    if (intensity === "low") {
        return {
            pulseBoost: 0.62,
            glowBlur: 6,
            glowAlpha: 0.22,
            dashSpeed: 0.05,
            textAlpha: 0.58,
        };
    }
    if (intensity === "high") {
        return {
            pulseBoost: 1,
            glowBlur: 14,
            glowAlpha: 0.48,
            dashSpeed: 0.12,
            textAlpha: 0.9,
        };
    }
    return {
        pulseBoost: 0.8,
        glowBlur: 10,
        glowAlpha: 0.34,
        dashSpeed: 0.08,
        textAlpha: 0.78,
    };
};

export const readCanvasTheme = (): CanvasTheme => {
    if (typeof window === "undefined") {
        return {
            bg: "#080c14",
            hexBorder: "#1a2235",
            pulseBorder: "rgba(56,189,248,0.88)",
            fortify: "rgba(56,189,248,0.82)",
        };
    }
    const cs = getComputedStyle(document.documentElement);
    const get = (v: string): string => cs.getPropertyValue(v).trim();
    return {
        bg: get("--canvas-bg") || "#080c14",
        hexBorder: get("--canvas-hex-border") || "#1a2235",
        pulseBorder:
            get("--canvas-pulse-border") || "rgba(56,189,248,0.88)",
        fortify: get("--canvas-fortify") || "rgba(56,189,248,0.82)",
    };
};

export const readPalette = (): Palette => {
    if (typeof window === "undefined") {
        return {
            enemy: [220, 32, 32],
            neutral: [96, 102, 115],
            player: [14, 116, 180],
        };
    }
    const cs = getComputedStyle(document.documentElement);
    const parse = (v: string): [number, number, number] => {
        const parts = cs
            .getPropertyValue(v)
            .split(",")
            .map((p) => parseInt(p.trim(), 10) || 0);
        return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
    };
    return {
        enemy: parse("--pal-enemy"),
        neutral: parse("--pal-neutral"),
        player: parse("--pal-player"),
    };
};

const drawElementIndicator = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    elements: ElementWeights,
): void => {
    const dom = getDominant(elements);
    const weight = elements[dom];
    const [er, eg, eb] = ELEMENT_RGB[dom];
    const alpha = 0.2 + (weight / 12) * 0.38;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgb(${er},${eg},${eb})`;
    ctx.font = `bold 8px "Courier New"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(dom[0].toUpperCase(), cx, cy);
    ctx.restore();
};

const drawHex = (
    ctx: CanvasRenderingContext2D,
    node: HexNode,
    col: number,
    row: number,
    theme: CanvasTheme,
    pal: Palette,
    isPulsing: boolean,
    isEnemyPlanned: boolean,
    isSelected: boolean,
    livingHiveEnabled: boolean,
    livingHiveIntensity: LivingHiveIntensity,
    timeMs: number,
): void => {
    const { x: cx, y: cy } = hexCenter(col, row);
    const inner = HEX_SIZE - 2;
    const verts = hexVertices(cx, cy, inner);
    const scale = getLivingHiveScale(livingHiveIntensity);

    ctx.beginPath();
    ctx.moveTo(verts[0][0], verts[0][1]);
    for (let i = 1; i < 6; i++) {
        ctx.lineTo(verts[i][0], verts[i][1]);
    }
    ctx.closePath();

    if (isPulsing || (livingHiveEnabled && node.alignment <= 0.42)) {
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, inner);
        const pulseWave =
            scale.pulseBoost +
            Math.sin(timeMs * 0.006 + col * 0.47 + row * 0.53) * 0.18;
        grad.addColorStop(
            0,
            `rgba(255, 130, 130, ${livingHiveEnabled ? pulseWave : 0.25})`,
        );
        grad.addColorStop(0.45, alignmentColor(node.alignment, pal));
        grad.addColorStop(1, alignmentColor(node.alignment, pal));
        ctx.fillStyle = grad;
    } else {
        ctx.fillStyle = alignmentColor(node.alignment, pal);
    }
    ctx.fill();
    ctx.strokeStyle = isPulsing ? theme.pulseBorder : theme.hexBorder;
    ctx.lineWidth = isPulsing ? 2 : 1;
    if (livingHiveEnabled) {
        const glowAlpha =
            (node.alignment >= 0.5 ? scale.glowAlpha : scale.glowAlpha * 0.92);
        ctx.shadowBlur = scale.glowBlur;
        ctx.shadowColor =
            node.alignment >= 0.5
                ? `rgba(56, 189, 248, ${glowAlpha})`
                : `rgba(248, 81, 73, ${glowAlpha})`;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (isSelected) {
        drawElementIndicator(ctx, cx, cy, node.elements);
    }

    if (node.fortified > 0) {
        ctx.beginPath();
        ctx.moveTo(verts[0][0], verts[0][1]);
        for (let i = 1; i < 6; i++) {
            ctx.lineTo(verts[i][0], verts[i][1]);
        }
        ctx.closePath();
        ctx.strokeStyle = theme.fortify;
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    if (node.isEnemySource) {
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,55,55,0.85)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,80,80,0.75)";
        ctx.fill();
    }

    if (isPulsing) {
        ctx.beginPath();
        ctx.arc(cx, cy, inner * 0.82, 0, Math.PI * 2);
        ctx.strokeStyle = theme.pulseBorder;
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    if (isEnemyPlanned) {
        ctx.beginPath();
        ctx.arc(cx, cy, inner * 0.68, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 90, 90, 0.92)";
        ctx.lineWidth = 2.5;
        ctx.stroke();
    }

    if (isSelected) {
        ctx.beginPath();
        const spinOffset = (timeMs * 0.005) % (Math.PI * 2);
        ctx.arc(cx, cy, inner * 0.9, spinOffset, Math.PI * 2 + spinOffset);
        ctx.strokeStyle = "rgba(111, 255, 235, 0.9)";
        ctx.lineWidth = 2;
        if (livingHiveEnabled) {
            ctx.setLineDash([5, 4]);
            ctx.lineDashOffset = -(timeMs * scale.dashSpeed);
            ctx.shadowBlur = scale.glowBlur + 2;
            ctx.shadowColor = `rgba(111, 255, 235, ${Math.min(scale.glowAlpha + 0.2, 0.72)})`;
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
    }

    if (isSelected && livingHiveEnabled) {
        const coordText = `${col.toString().padStart(2, "0")}:${row.toString().padStart(2, "0")}`;
        ctx.fillStyle = `rgba(111, 255, 235, ${scale.textAlpha})`;
        ctx.font = `bold 9px "Courier New"`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(coordText, cx, cy - inner - 3);
    }
};

export const drawGrid = (
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    grid: Grid,
    pulsingNode: { col: number; row: number } | null,
    enemyPlannedTiles: Array<{ col: number; row: number }>,
    selectedHex: { col: number; row: number } | null,
    livingHiveEnabled: boolean,
    livingHiveIntensity: LivingHiveIntensity,
    timeMs: number,
): void => {
    const theme = readCanvasTheme();
    const pal = readPalette();
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    for (let c = 0; c < grid.length; c++) {
        for (let r = 0; r < grid[c].length; r++) {
            const isPulsing =
                pulsingNode !== null &&
                pulsingNode.col === c &&
                pulsingNode.row === r;
            const isEnemyPlanned = enemyPlannedTiles.some(
                (tile) => tile.col === c && tile.row === r,
            );
            const isSelected =
                selectedHex !== null &&
                selectedHex.col === c &&
                selectedHex.row === r;
            drawHex(
                ctx,
                grid[c][r],
                c,
                r,
                theme,
                pal,
                isPulsing,
                isEnemyPlanned,
                isSelected,
                livingHiveEnabled,
                livingHiveIntensity,
                timeMs,
            );
        }
    }
};

export const resolveHexAtPoint = (
    grid: Grid,
    mouseX: number,
    mouseY: number,
): { col: number; row: number } | null => {
    let bestCol = -1;
    let bestRow = -1;
    let bestDist = Infinity;
    for (let c = 0; c < grid.length; c++) {
        for (let r = 0; r < grid[c].length; r++) {
            const { x, y } = hexCenter(c, r);
            const d = Math.hypot(mouseX - x, mouseY - y);
            if (d < bestDist) {
                bestDist = d;
                bestCol = c;
                bestRow = r;
            }
        }
    }
    if (bestCol < 0 || bestDist >= HEX_SIZE * 1.1) return null;
    return { col: bestCol, row: bestRow };
};
