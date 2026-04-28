"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";

export interface ProfileSummary {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
}

export interface UseUserResult {
    user: User | null;
    profile: ProfileSummary | null;
    isAnonymous: boolean;
    isLoading: boolean;
    supabaseEnabled: boolean;
    signOut: () => Promise<void>;
}

export const useUser = (): UseUserResult => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<ProfileSummary | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const supabaseEnabled = isSupabaseConfigured();

    useEffect(() => {
        if (!supabaseEnabled) {
            setIsLoading(false);
            return;
        }
        const supabase = createClient();
        let mounted = true;

        const init = async () => {
            const { data } = await supabase.auth.getSession();
            if (!mounted) return;
            if (data.session?.user) {
                setUser(data.session.user);
            } else {
                const { data: anon, error } =
                    await supabase.auth.signInAnonymously();
                if (error) {
                    logger.warn("useUser", "anonymous sign-in failed", {
                        message: error.message,
                    });
                } else if (anon.user) {
                    setUser(anon.user);
                }
            }
            setIsLoading(false);
        };

        init();

        const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
            setUser(sess?.user ?? null);
        });

        return () => {
            mounted = false;
            sub.subscription.unsubscribe();
        };
    }, [supabaseEnabled]);

    useEffect(() => {
        if (!user || !supabaseEnabled) {
            setProfile(null);
            return;
        }
        const supabase = createClient();
        let mounted = true;
        supabase
            .from("profiles")
            .select("id, display_name, avatar_url")
            .eq("id", user.id)
            .maybeSingle()
            .then(({ data, error }) => {
                if (!mounted) return;
                if (error) {
                    logger.warn("useUser", "profile fetch failed", {
                        message: error.message,
                    });
                    return;
                }
                setProfile(data);
            });
        return () => {
            mounted = false;
        };
    }, [user, supabaseEnabled]);

    const signOut = async (): Promise<void> => {
        if (!supabaseEnabled) return;
        const supabase = createClient();
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
    };

    const isAnonymous = Boolean(user?.is_anonymous);

    return {
        user,
        profile,
        isAnonymous,
        isLoading,
        supabaseEnabled,
        signOut,
    };
};
