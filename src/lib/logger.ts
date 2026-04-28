import { serverEnv } from "./env";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};

const SECRET_PATTERNS: Array<[RegExp, string]> = [
    [/(authorization\s*[:=]\s*)(bearer\s+)?[A-Za-z0-9._\-]+/gi, "$1[redacted]"],
    [/(xi-api-key\s*[:=]\s*)[A-Za-z0-9._\-]+/gi, "$1[redacted]"],
    [/(api[_-]?key\s*[:=]\s*)[A-Za-z0-9._\-]+/gi, "$1[redacted]"],
    [/(\?key=)[A-Za-z0-9._\-]+/g, "$1[redacted]"],
    [/(sk-[A-Za-z0-9]{8,})/g, "[redacted]"],
    [/(AIza[0-9A-Za-z_\-]{20,})/g, "[redacted]"],
];

const redact = (raw: unknown): unknown => {
    if (raw == null) return raw;
    if (typeof raw === "string") {
        return SECRET_PATTERNS.reduce(
            (acc, [pat, rep]) => acc.replace(pat, rep),
            raw,
        );
    }
    if (Array.isArray(raw)) return raw.map(redact);
    if (typeof raw === "object") {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
            if (
                /key|token|secret|authorization|password/i.test(k) &&
                typeof v === "string"
            ) {
                out[k] = v.length === 0 ? "" : "[redacted]";
                continue;
            }
            out[k] = redact(v);
        }
        return out;
    }
    return raw;
};

const isClient = (): boolean => typeof window !== "undefined";

const minLevel = (): LogLevel => {
    if (isClient()) {
        try {
            const debugFlag = window.localStorage?.getItem("debug");
            if (debugFlag === "1" || debugFlag === "true") return "debug";
        } catch {
            /* ignore */
        }
        return "info";
    }
    return serverEnv.LOG_LEVEL;
};

const emit = (
    level: LogLevel,
    tag: string,
    message: string,
    meta?: Record<string, unknown>,
): void => {
    if (LEVEL_RANK[level] < LEVEL_RANK[minLevel()]) return;
    const safeMeta = meta ? (redact(meta) as Record<string, unknown>) : undefined;
    const payload = {
        ts: new Date().toISOString(),
        level,
        tag,
        msg: message,
        ...(safeMeta ? { meta: safeMeta } : {}),
    };

    if (isClient()) {
        const fn =
            level === "error"
                ? console.error
                : level === "warn"
                  ? console.warn
                  : level === "debug"
                    ? console.debug
                    : console.info;
        fn(`[${tag}]`, message, safeMeta ?? "");
        return;
    }
    process.stdout.write(JSON.stringify(payload) + "\n");
};

export const logger = {
    debug: (tag: string, message: string, meta?: Record<string, unknown>) =>
        emit("debug", tag, message, meta),
    info: (tag: string, message: string, meta?: Record<string, unknown>) =>
        emit("info", tag, message, meta),
    warn: (tag: string, message: string, meta?: Record<string, unknown>) =>
        emit("warn", tag, message, meta),
    error: (tag: string, message: string, meta?: Record<string, unknown>) =>
        emit("error", tag, message, meta),
};
