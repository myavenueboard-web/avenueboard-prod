"use client";

import { supabase } from "@/lib/supabase";
import {
  buildCookieConsentRecordFromStoredPreference,
  CURRENT_CONSENT_VERSION,
  isCookieConsentSource,
  type CookieConsentRecord,
} from "./consentStorage";

type StoredCookieConsentRow = {
  consent_version: number;
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  source: string;
  updated_at: string;
};

type CookieConsentUpsertPayload = {
  user_id: string;
  consent_version: number;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  source: CookieConsentRecord["source"];
  updated_at: string;
};

type CookieConsentSyncResult =
  | { synced: true; userId: string }
  | { synced: false; userId: string | null; reason: "no_user" | "error" };

type AuthenticatedConsentUserResult =
  | { userId: string; reason: "authenticated" }
  | { userId: null; reason: "no_user" }
  | { userId: null; reason: "error"; error: unknown };

type SafeCookieConsentError = {
  name?: string;
  message?: string;
  status?: string | number;
  code?: string;
};

function serializeCookieConsentError(error: unknown): SafeCookieConsentError {
  if (!error || typeof error !== "object") {
    return { message: typeof error === "string" ? error : "Unknown error" };
  }

  const source = error as {
    name?: unknown;
    message?: unknown;
    status?: unknown;
    code?: unknown;
  };

  return {
    name: typeof source.name === "string" ? source.name : undefined,
    message: typeof source.message === "string" ? source.message : undefined,
    status:
      typeof source.status === "string" || typeof source.status === "number"
        ? source.status
        : undefined,
    code: typeof source.code === "string" ? source.code : undefined,
  };
}

function isMissingAuthSessionError(error: unknown) {
  const safeError = serializeCookieConsentError(error);
  const message = safeError.message?.toLowerCase() ?? "";

  return (
    safeError.name === "AuthSessionMissingError" ||
    safeError.code === "session_not_found" ||
    message.includes("auth session missing") ||
    message.includes("session missing") ||
    message.includes("no session")
  );
}

async function getAuthenticatedConsentUser(): Promise<AuthenticatedConsentUserResult> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      if (isMissingAuthSessionError(error)) {
        return { userId: null, reason: "no_user" };
      }

      return { userId: null, reason: "error", error };
    }

    if (!user) {
      return { userId: null, reason: "no_user" };
    }

    return { userId: user.id, reason: "authenticated" };
  } catch (error) {
    if (isMissingAuthSessionError(error)) {
      return { userId: null, reason: "no_user" };
    }

    return { userId: null, reason: "error", error };
  }
}

function logCookieConsentSyncError(
  message: string,
  details: {
    error?: unknown;
    payload?: Omit<CookieConsentUpsertPayload, "user_id">;
    userId?: string | null;
  } = {}
) {
  if (process.env.NODE_ENV === "production") return;

  console.error("[cookie-consent]", message, {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    userId: details.userId,
    payload: details.payload,
    error: details.error
      ? serializeCookieConsentError(details.error)
      : undefined,
  });
}

export async function restoreAuthenticatedConsentFromSupabase(
  gpc: boolean
): Promise<CookieConsentRecord | null> {
  const userResult = await getAuthenticatedConsentUser();

  if (userResult.reason === "no_user") {
    return null;
  }

  if (userResult.reason === "error") {
    logCookieConsentSyncError("Unable to read authenticated user.", {
      error: userResult.error,
    });
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("cookie_consents")
      .select(
        "consent_version, essential, analytics, marketing, source, updated_at"
      )
      .eq("user_id", userResult.userId)
      .maybeSingle<StoredCookieConsentRow>();

    if (error) {
      logCookieConsentSyncError("Unable to restore cookie consent.", {
        error,
        userId: userResult.userId,
      });
      return null;
    }

    if (!data) return null;
    if (data.consent_version !== CURRENT_CONSENT_VERSION) return null;
    if (data.essential !== true) return null;
    if (!isCookieConsentSource(data.source)) return null;

    return buildCookieConsentRecordFromStoredPreference({
      analytics: data.analytics,
      marketing: data.marketing,
      source: data.source,
      updatedAt: data.updated_at,
      gpc,
    });
  } catch (error) {
    logCookieConsentSyncError("Unexpected cookie consent restore failure.", {
      error,
    });
    return null;
  }
}

export async function syncAuthenticatedConsentToSupabase(
  consent: CookieConsentRecord
): Promise<CookieConsentSyncResult> {
  const userResult = await getAuthenticatedConsentUser();

  if (userResult.reason === "no_user") {
    return { synced: false, userId: null, reason: "no_user" };
  }

  if (userResult.reason === "error") {
    logCookieConsentSyncError("Unable to read authenticated user.", {
      error: userResult.error,
    });
    return { synced: false, userId: null, reason: "error" };
  }

  try {
    const payload: CookieConsentUpsertPayload = {
      user_id: userResult.userId,
      consent_version: consent.version,
      essential: true,
      analytics: consent.analytics,
      marketing: consent.marketing,
      source: consent.source,
      updated_at: consent.updatedAt,
    };

    const { error } = await supabase
      .from("cookie_consents")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      logCookieConsentSyncError("Unable to upsert cookie consent.", {
        error,
        payload: {
          consent_version: payload.consent_version,
          essential: payload.essential,
          analytics: payload.analytics,
          marketing: payload.marketing,
          source: payload.source,
          updated_at: payload.updated_at,
        },
        userId: userResult.userId,
      });
      return { synced: false, userId: userResult.userId, reason: "error" };
    }

    return { synced: true, userId: userResult.userId };
  } catch (error) {
    logCookieConsentSyncError("Unexpected cookie consent upsert failure.", {
      error,
    });
    return { synced: false, userId: null, reason: "error" };
  }
}
