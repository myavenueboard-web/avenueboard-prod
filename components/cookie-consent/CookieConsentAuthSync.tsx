"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { readCookieConsent } from "./consentStorage";
import { syncAuthenticatedConsentToSupabase } from "./consentSync";

export function CookieConsentAuthSync() {
  const syncedKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    async function syncExistingLocalConsentOnce(userId: string) {
      const consent = readCookieConsent();
      if (!consent) return;

      const syncKey = `${userId}:${consent.updatedAt}:${consent.source}`;
      if (syncedKeysRef.current.has(syncKey)) return;

      syncedKeysRef.current.add(syncKey);

      const result = await syncAuthenticatedConsentToSupabase(consent);
      if (!result.synced && result.reason === "error") {
        syncedKeysRef.current.delete(syncKey);
      }
    }

    const initialTimer = window.setTimeout(() => {
      void supabase.auth.getUser().then(({ data }) => {
        if (data.user) void syncExistingLocalConsentOnce(data.user.id);
      });
    }, 0);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id;
      if (userId) void syncExistingLocalConsentOnce(userId);
    });

    return () => {
      window.clearTimeout(initialTimer);
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
