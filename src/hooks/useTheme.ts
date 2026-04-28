"use client";

import { useCallback, useEffect, useState } from "react";

export type ThemeKey = "dark" | "dim" | "light";

const STORAGE_KEY = "corrupto-theme";

const isThemeKey = (v: unknown): v is ThemeKey =>
    v === "dark" || v === "dim" || v === "light";

const readInitial = (): ThemeKey => {
    if (typeof window === "undefined") return "dark";
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return isThemeKey(raw) ? raw : "dark";
    } catch {
        return "dark";
    }
};

export const useTheme = () => {
    const [theme, setThemeState] = useState<ThemeKey>("dark");

    useEffect(() => {
        const initial = readInitial();
        setThemeState(initial);
        document.documentElement.setAttribute("data-theme", initial);
    }, []);

    const setTheme = useCallback((next: ThemeKey) => {
        setThemeState(next);
        document.documentElement.setAttribute("data-theme", next);
        try {
            window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
            /* ignore quota errors */
        }
    }, []);

    return { theme, setTheme };
};
