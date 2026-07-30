export const CURRENT_CONSENT_VERSION = 1;
export const COOKIE_CONSENT_VERSION = CURRENT_CONSENT_VERSION;
export const COOKIE_CONSENT_KEY = "ab_cookie_consent";

const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export type CookieConsentCategory = "essential" | "analytics" | "marketing";

export type CookieConsentSource =
  | "banner_accept_all"
  | "banner_essential_only"
  | "banner_close"
  | "preferences_modal"
  | "privacy_settings"
  | "gpc";

export type CookieConsentRecord = {
  version: number;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
  source: CookieConsentSource;
  gpc: boolean;
};

export type CookieConsentInput = {
  analytics: boolean;
  marketing: boolean;
  source: CookieConsentSource;
  gpc: boolean;
};

export function getGlobalPrivacyControl() {
  if (typeof navigator === "undefined") return false;

  return Boolean(
    (navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl
  );
}

export function buildCookieConsentRecord({
  analytics,
  marketing,
  source,
  gpc,
}: CookieConsentInput): CookieConsentRecord {
  return {
    version: CURRENT_CONSENT_VERSION,
    essential: true,
    analytics,
    marketing: gpc ? false : marketing,
    updatedAt: new Date().toISOString(),
    source: gpc && marketing ? "gpc" : source,
    gpc,
  };
}

export function buildCookieConsentRecordFromStoredPreference({
  analytics,
  marketing,
  source,
  updatedAt,
  gpc,
}: CookieConsentInput & { updatedAt: string }): CookieConsentRecord {
  return {
    version: CURRENT_CONSENT_VERSION,
    essential: true,
    analytics,
    marketing: gpc ? false : marketing,
    updatedAt,
    source: gpc && marketing ? "gpc" : source,
    gpc,
  };
}

export function isValidCookieConsentRecord(
  value: unknown
): value is CookieConsentRecord {
  if (!value || typeof value !== "object") return false;

  const record = value as Partial<CookieConsentRecord>;

  return (
    record.version === CURRENT_CONSENT_VERSION &&
    record.essential === true &&
    typeof record.analytics === "boolean" &&
    typeof record.marketing === "boolean" &&
    typeof record.updatedAt === "string" &&
    typeof record.source === "string" &&
    isCookieConsentSource(record.source) &&
    typeof record.gpc === "boolean"
  );
}

export function isCookieConsentSource(
  source: unknown
): source is CookieConsentSource {
  return (
    source === "banner_accept_all" ||
    source === "banner_essential_only" ||
    source === "banner_close" ||
    source === "preferences_modal" ||
    source === "privacy_settings" ||
    source === "gpc"
  );
}

export function readCookieConsent(): CookieConsentRecord | null {
  if (typeof document === "undefined") return null;

  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${COOKIE_CONSENT_KEY}=`));

  if (!cookie) return null;

  try {
    const rawValue = cookie.slice(COOKIE_CONSENT_KEY.length + 1);
    const parsed = JSON.parse(decodeURIComponent(rawValue));
    return isValidCookieConsentRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCookieConsent(record: CookieConsentRecord) {
  if (typeof document === "undefined") return;

  const encoded = encodeURIComponent(JSON.stringify(record));
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";

  document.cookie = `${COOKIE_CONSENT_KEY}=${encoded}; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;

  window.dispatchEvent(
    new CustomEvent("avenueboard:cookie-consent-updated", {
      detail: record,
    })
  );
}

export function hasCookieConsent(category: CookieConsentCategory) {
  if (category === "essential") return true;

  const consent = readCookieConsent();
  if (!consent) return false;

  return consent[category] === true;
}

// Future optional integrations should call hasCookieConsent("analytics") or
// hasCookieConsent("marketing") before loading third-party scripts.
const OPTIONAL_FIRST_PARTY_COOKIE_NAMES: string[] = [];

export function clearOptionalAvenueBoardCookies(consent: CookieConsentRecord) {
  if (typeof document === "undefined") return;

  if (consent.analytics && consent.marketing) return;

  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";

  OPTIONAL_FIRST_PARTY_COOKIE_NAMES.forEach((name) => {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
  });
}
