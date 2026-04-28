"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useUser } from "@/hooks/useUser";

const UserMenu = () => {
    const router = useRouter();
    const { user, profile, isAnonymous, isLoading, supabaseEnabled, signOut } =
        useUser();

    if (!supabaseEnabled) {
        return (
            <span
                className="text-[10px] uppercase tracking-[2px]"
                style={{ color: "var(--text-muted)" }}
                title="Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
            >
                Local mode
            </span>
        );
    }

    if (isLoading) {
        return (
            <span
                className="text-[10px] uppercase tracking-[2px]"
                style={{ color: "var(--text-muted)" }}
            >
                …
            </span>
        );
    }

    const handleSignOut = async () => {
        await signOut();
        router.refresh();
    };

    const displayLabel =
        profile?.display_name ?? (isAnonymous ? "Anonymous" : user?.email ?? "Operator");

    return (
        <div className="flex items-center gap-2">
            {isAnonymous ? (
                <Link
                    href="/signup"
                    className="rounded border px-2 py-1 text-[10px] uppercase tracking-[2px] hover:opacity-80"
                    style={{
                        borderColor: "var(--border-mid)",
                        color: "var(--accent-player)",
                    }}
                >
                    Enlist
                </Link>
            ) : (
                <Link
                    href="/profile"
                    className="rounded border px-2 py-1 text-[10px] uppercase tracking-[2px] hover:opacity-80"
                    style={{
                        borderColor: "var(--border-mid)",
                        color: "var(--accent-player)",
                    }}
                >
                    Profile
                </Link>
            )}
            <span
                className="hidden text-[11px] sm:inline"
                style={{ color: "var(--text-secondary)" }}
            >
                {displayLabel}
            </span>
            {!isAnonymous ? (
                <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-[10px] uppercase tracking-[2px] hover:opacity-80"
                    style={{ color: "var(--text-muted)" }}
                >
                    Sign out
                </button>
            ) : (
                <Link
                    href="/login"
                    className="text-[10px] uppercase tracking-[2px] hover:opacity-80"
                    style={{ color: "var(--text-muted)" }}
                >
                    Sign in
                </Link>
            )}
        </div>
    );
};

export default UserMenu;
