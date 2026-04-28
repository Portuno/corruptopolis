import type { Metadata } from "next";

import FeedbackButton from "@/components/feedback/FeedbackButton";

import "./globals.css";

export const metadata: Metadata = {
    title: "Corruptópolis — Hyperpolis Simulation",
    description:
        "Twelve epochs to flip the narrative against the Collaborative Corruption Matrix. A meme-driven hex-grid simulation built with Next.js, Supabase, Gemini, and ElevenLabs.",
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" data-theme="dark" suppressHydrationWarning>
            <body className="min-h-screen antialiased">
                {children}
                <FeedbackButton />
            </body>
        </html>
    );
}
