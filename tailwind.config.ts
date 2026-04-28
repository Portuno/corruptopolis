import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class", '[data-theme="dark"]'],
    content: ["./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                border: "rgb(var(--tw-border) / <alpha-value>)",
                background: "rgb(var(--tw-bg) / <alpha-value>)",
                foreground: "rgb(var(--tw-fg) / <alpha-value>)",
                muted: "rgb(var(--tw-muted) / <alpha-value>)",
                player: "rgb(var(--tw-player) / <alpha-value>)",
                enemy: "rgb(var(--tw-enemy) / <alpha-value>)",
                confirm: "rgb(var(--tw-confirm) / <alpha-value>)",
                warn: "rgb(var(--tw-warn) / <alpha-value>)",
            },
            fontFamily: {
                mono: [
                    '"JetBrains Mono"',
                    '"Courier New"',
                    "ui-monospace",
                    "monospace",
                ],
            },
            keyframes: {
                pulseRed: {
                    "0%,100%": { color: "rgb(var(--tw-fg))" },
                    "50%": { color: "rgb(var(--tw-enemy))" },
                },
            },
            animation: {
                pulseRed: "pulseRed 0.42s ease-in-out 1",
            },
        },
    },
    plugins: [],
};

export default config;
