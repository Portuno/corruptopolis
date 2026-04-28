"use client";

const ELEVEN_STORAGE = "corrupto-el-key";
const GEMINI_STORAGE = "corrupto-gem-key";

const safeRead = (k: string): string => {
    if (typeof window === "undefined") return "";
    try {
        return window.localStorage.getItem(k) ?? "";
    } catch {
        return "";
    }
};

const safeWrite = (k: string, v: string): void => {
    if (typeof window === "undefined") return;
    try {
        if (v) window.localStorage.setItem(k, v);
        else window.localStorage.removeItem(k);
    } catch {
        /* ignore quota errors */
    }
};

export const readLocalElevenKey = (): string => safeRead(ELEVEN_STORAGE);
export const readLocalGeminiKey = (): string => safeRead(GEMINI_STORAGE);

export const writeLocalElevenKey = (v: string): void =>
    safeWrite(ELEVEN_STORAGE, v);
export const writeLocalGeminiKey = (v: string): void =>
    safeWrite(GEMINI_STORAGE, v);

export const hasAnyLocalKey = (): boolean =>
    Boolean(readLocalElevenKey() || readLocalGeminiKey());
