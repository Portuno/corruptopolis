"use client";

import { useTheme, type ThemeKey } from "@/hooks/useTheme";

const OPTIONS: Array<{ value: ThemeKey; label: string }> = [
    { value: "dark", label: "◼ Dark" },
    { value: "dim", label: "◗ Dim" },
    { value: "light", label: "◻ Light" },
];

const ThemeToggle = () => {
    const { theme, setTheme } = useTheme();

    return (
        <div className="flex gap-1" role="group" aria-label="Theme switcher">
            {OPTIONS.map((opt) => {
                const isActive = theme === opt.value;
                return (
                    <button
                        type="button"
                        key={opt.value}
                        aria-pressed={isActive}
                        onClick={() => setTheme(opt.value)}
                        className="flex-1 rounded border px-2 py-1 text-[10px] uppercase tracking-[2px] transition"
                        style={{
                            borderColor: isActive
                                ? "var(--accent-player)"
                                : "var(--border-subtle)",
                            color: isActive
                                ? "var(--accent-player)"
                                : "var(--text-muted)",
                            background: isActive
                                ? "var(--accent-player-bg)"
                                : "transparent",
                        }}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
};

export default ThemeToggle;
