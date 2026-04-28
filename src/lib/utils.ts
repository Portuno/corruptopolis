import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));

export const formatPercent = (n: number, digits = 1): string =>
    `${(n * 100).toFixed(digits)}%`;

export const sleep = (ms: number): Promise<void> =>
    new Promise((r) => setTimeout(r, ms));

export const newRequestId = (): string =>
    `req_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
