"use client";

import {
  createContext,
  type KeyboardEvent as ReactKeyboardEvent,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import {
  restoreAuthenticatedConsentFromSupabase,
  syncAuthenticatedConsentToSupabase,
} from "./consentSync";
import {
  buildCookieConsentRecord,
  clearOptionalAvenueBoardCookies,
  getGlobalPrivacyControl,
  readCookieConsent,
  writeCookieConsent,
  type CookieConsentSource,
  type CookieConsentRecord,
} from "./consentStorage";

type DraftPreferences = {
  analytics: boolean;
  marketing: boolean;
};

type CookiePreferenceControlsProps = {
  draft: DraftPreferences;
  gpcActive: boolean;
  savingAction?: CookiePreferenceAction | null;
  onDraftChange: (preferences: DraftPreferences) => void;
  onEssentialOnly: () => void | Promise<void>;
  onSave: () => void | Promise<void>;
  onAcceptAll: () => void | Promise<void>;
  controlsClassName?: string;
  actionsClassName?: string;
  actionHelperText?: string;
  bottomHelperText?: string;
};

type CookiePreferenceAction = "essential" | "save" | "acceptAll";

declare global {
  interface Window {
    __avenueBoardClearCookieConsentForTesting?: () => void;
  }
}

type CookieConsentContextValue = {
  consent: CookieConsentRecord | null;
  hasValidConsent: boolean;
  isBannerOpen: boolean;
  isPreferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
  acceptAll: () => void;
  acceptEssentialOnly: () => void;
  savePreferences: (preferences: DraftPreferences) => void;
  hasAnalyticsConsent: boolean;
  hasMarketingConsent: boolean;
};

const CookieConsentContext =
  createContext<CookieConsentContextValue | null>(null);

const focusableSelector =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
const consentUpdatedEventName = "avenueboard:cookie-consent-updated";
const COOKIE_CONSENT_BASE_BOTTOM_OFFSET = 24;

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);

  if (!context) {
    throw new Error(
      "useCookieConsent must be used within CookieConsentManager."
    );
  }

  return context;
}

function notifyCookieConsentUpdated(record: CookieConsentRecord) {
  window.dispatchEvent(
    new CustomEvent<CookieConsentRecord>(consentUpdatedEventName, {
      detail: record,
    })
  );
}

function persistCookieConsentRecord(record: CookieConsentRecord) {
  writeCookieConsent(record);
  clearOptionalAvenueBoardCookies(record);
  void syncAuthenticatedConsentToSupabase(record);
  notifyCookieConsentUpdated(record);
}

function createConsentRecord(
  nextDraft: DraftPreferences,
  source: CookieConsentSource,
  gpcActive: boolean
) {
  return buildCookieConsentRecord({
    analytics: nextDraft.analytics,
    marketing: nextDraft.marketing,
    source,
    gpc: gpcActive,
  });
}

function getLowerLeftFloatingControlOffset() {
  if (typeof window === "undefined") return 0;

  const viewportHeight = window.innerHeight;
  const candidates = Array.from(document.body.querySelectorAll<HTMLElement>("*"));

  for (const element of candidates) {
    if (element.closest("[data-cookie-consent-banner]")) continue;

    const styles = window.getComputedStyle(element);
    if (styles.position !== "fixed") continue;

    const rect = element.getBoundingClientRect();
    const bottomGap = viewportHeight - rect.bottom;
    const isLowerLeft =
      rect.left >= 0 &&
      rect.left <= 96 &&
      bottomGap >= 0 &&
      bottomGap <= 96 &&
      rect.width >= 24 &&
      rect.width <= 160 &&
      rect.height >= 24 &&
      rect.height <= 160;

    if (isLowerLeft) {
      return Math.ceil(rect.height + bottomGap + 16);
    }
  }

  return 0;
}

export function CookieConsentManager() {
  const [initialized, setInitialized] = useState(false);
  const [consent, setConsent] = useState<CookieConsentRecord | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [draft, setDraft] = useState<DraftPreferences>({
    analytics: false,
    marketing: false,
  });
  const [gpcActive, setGpcActive] = useState(false);
  const [floatingControlOffset, setFloatingControlOffset] = useState(0);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      window.__avenueBoardClearCookieConsentForTesting = () => {
        document.cookie =
          "ab_cookie_consent=; Max-Age=0; Path=/; SameSite=Lax";
        window.location.reload();
      };
    }

    function openPreferences() {
      const latestConsent = readCookieConsent();
      const latestGpc = getGlobalPrivacyControl();

      previousFocusRef.current = document.activeElement as HTMLElement | null;
      setDraft({
        analytics: latestConsent?.analytics ?? false,
        marketing: latestGpc ? false : latestConsent?.marketing ?? false,
      });
      setConsent(latestConsent);
      setGpcActive(latestGpc);
      setPreferencesOpen(true);
    }

    function handleConsentUpdated(event: Event) {
      const record = (event as CustomEvent<CookieConsentRecord>).detail;
      if (!record) return;

      setConsent(record);
      setDraft({
        analytics: record.analytics,
        marketing: getGlobalPrivacyControl() ? false : record.marketing,
      });
      setBannerVisible(false);
    }

    async function initializeConsent() {
      const nextGpc = getGlobalPrivacyControl();
      const storedConsent = readCookieConsent();
      const restoredConsent = storedConsent
        ? null
        : await restoreAuthenticatedConsentFromSupabase(nextGpc);

      if (restoredConsent) {
        writeCookieConsent(restoredConsent);
      }

      setGpcActive(nextGpc);
      setConsent(storedConsent ?? restoredConsent);
      setBannerVisible(!storedConsent && !restoredConsent);
      setFloatingControlOffset(getLowerLeftFloatingControlOffset());
      setInitialized(true);
    }

    const initializationTimer = window.setTimeout(() => {
      void initializeConsent();
    }, 0);

    window.addEventListener(
      "avenueboard:open-cookie-preferences",
      openPreferences
    );
    window.addEventListener(consentUpdatedEventName, handleConsentUpdated);

    return () => {
      if (process.env.NODE_ENV !== "production") {
        delete window.__avenueBoardClearCookieConsentForTesting;
      }

      window.clearTimeout(initializationTimer);
      window.removeEventListener(
        "avenueboard:open-cookie-preferences",
        openPreferences
      );
      window.removeEventListener(consentUpdatedEventName, handleConsentUpdated);
    };
  }, []);

  useEffect(() => {
    if (!preferencesOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.setTimeout(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        focusableSelector
      );
      firstFocusable?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [preferencesOpen]);

  function persistConsentRecord(record: CookieConsentRecord) {
    persistCookieConsentRecord(record);
    setConsent(record);
    setDraft({
      analytics: record.analytics,
      marketing: record.marketing,
    });
    setBannerVisible(false);
    closePreferences();
  }

  function saveConsent(
    nextDraft: DraftPreferences,
    source: CookieConsentSource
  ) {
    const record = createConsentRecord(nextDraft, source, gpcActive);

    persistConsentRecord(record);
  }

  function acceptEssentialOnly(
    source: CookieConsentSource = "banner_essential_only"
  ) {
    saveConsent({ analytics: false, marketing: false }, source);
  }

  function acceptAll(source: CookieConsentSource = "banner_accept_all") {
    saveConsent({ analytics: true, marketing: !gpcActive }, source);
  }

  function openPreferencesFromBanner() {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setDraft({
      analytics: consent?.analytics ?? false,
      marketing: gpcActive ? false : consent?.marketing ?? false,
    });
    setPreferencesOpen(true);
  }

  function closePreferences() {
    setPreferencesOpen(false);
    window.setTimeout(() => previousFocusRef.current?.focus(), 0);
  }

  function handleDialogKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closePreferences();
      return;
    }

    if (event.key !== "Tab" || !dialogRef.current) return;

    const focusableItems = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)
    ).filter((item) => !item.hasAttribute("disabled"));

    if (focusableItems.length === 0) return;

    const first = focusableItems[0];
    const last = focusableItems[focusableItems.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!initialized) return null;

  const cookieConsentFloatingBottom = `calc(${
    COOKIE_CONSENT_BASE_BOTTOM_OFFSET + floatingControlOffset
  }px + env(safe-area-inset-bottom))`;

  const contextValue: CookieConsentContextValue = {
    consent,
    hasValidConsent: Boolean(consent),
    isBannerOpen: bannerVisible && !preferencesOpen,
    isPreferencesOpen: preferencesOpen,
    openPreferences: openPreferencesFromBanner,
    closePreferences,
    acceptAll: () => acceptAll("privacy_settings"),
    acceptEssentialOnly: () => acceptEssentialOnly("privacy_settings"),
    savePreferences: (preferences) =>
      saveConsent(preferences, "privacy_settings"),
    hasAnalyticsConsent: consent?.analytics === true,
    hasMarketingConsent: consent?.marketing === true,
  };

  return (
    <CookieConsentContext.Provider value={contextValue}>
      {bannerVisible && !preferencesOpen && (
        <section
          data-cookie-consent-banner
          aria-label="Cookie consent"
          aria-live="polite"
          className="fixed inset-x-4 z-[80] sm:left-6 sm:right-auto lg:left-8"
          style={{ bottom: cookieConsentFloatingBottom }}
        >
          <div className="relative max-h-[calc(100dvh-128px)] w-full overflow-y-auto rounded-[18px] border border-zinc-200/80 bg-white/95 shadow-[0_20px_58px_rgba(15,23,42,0.14)] backdrop-blur-xl motion-safe:animate-[cookieConsentIn_210ms_ease-out] sm:w-[592px] sm:max-w-[calc(100vw-48px)] sm:overflow-visible">
            <button
              type="button"
              onClick={() => acceptEssentialOnly("banner_close")}
              aria-label="Close and use essential cookies only"
              title="Use essential cookies only"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-700 transition hover:bg-zinc-100 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              <X size={17} strokeWidth={2} aria-hidden="true" />
            </button>

            <div className="px-5 py-4 pr-14 sm:px-5 sm:py-4 sm:pr-14">
              <div>
                <p className="text-[14px] font-semibold leading-[1.45] tracking-[-0.01em] text-[#3F4350]">
                  We use essential technologies to keep our website secure.
                  Review our{" "}
                  <Link
                    href="/legal?section=cookie-policy"
                    className="text-slate-950 transition hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                  >
                    Cookie Policy
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/legal?section=privacy-policy"
                    className="text-slate-950 transition hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                  >
                    Privacy Policy
                  </Link>
                  , or choose how optional analytics and marketing technologies
                  are used below.
                </p>
              </div>

              <div className="mt-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                  <button
                    type="button"
                    onClick={openPreferencesFromBanner}
                    className="flex h-[38px] items-center justify-center rounded-lg px-0 text-[13px] font-medium text-slate-800 underline decoration-slate-500/30 underline-offset-4 transition hover:text-slate-950 hover:decoration-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                  >
                    Manage Preferences
                  </button>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={() =>
                        acceptEssentialOnly("banner_essential_only")
                      }
                      className="h-[38px] whitespace-nowrap rounded-xl border border-slate-950/15 bg-white px-3.5 text-[13px] font-semibold text-slate-900 transition hover:border-slate-950/25 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 sm:min-w-[118px]"
                    >
                      Essential Only
                    </button>
                    <button
                      type="button"
                      onClick={() => acceptAll("banner_accept_all")}
                      className="h-[38px] whitespace-nowrap rounded-xl bg-slate-950 px-3.5 text-[13px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 sm:min-w-[106px]"
                    >
                      Accept All
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {preferencesOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/20 px-4 py-4 backdrop-blur-[2px] sm:items-center sm:px-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePreferences();
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            onKeyDown={handleDialogKeyDown}
            className="max-h-[calc(100dvh-32px)] w-full max-w-[680px] overflow-y-auto rounded-[22px] border border-zinc-200/80 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.18)] motion-safe:animate-[cookieConsentIn_200ms_ease-out]"
          >
            <div className="flex items-start justify-between gap-5 px-6 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-8">
              <div>
                <h2
                  id={titleId}
                  className="text-[28px] font-medium leading-tight tracking-[-0.055em] text-black sm:text-[32px]"
                >
                  Cookie preferences
                </h2>
                <p
                  id={descriptionId}
                  className="mt-3 max-w-[560px] text-[15px] font-medium leading-7 tracking-[-0.01em] text-[#4B4E5A] sm:text-[16px]"
                >
                  Choose which optional technologies AvenueBoard may use.
                  Essential technologies are always active because they are
                  required for security and core platform functionality.
                </p>
              </div>
              <button
                type="button"
                onClick={closePreferences}
                aria-label="Close cookie preferences"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <CookiePreferenceControls
              draft={draft}
              gpcActive={gpcActive}
              onDraftChange={setDraft}
              onEssentialOnly={() => acceptEssentialOnly("preferences_modal")}
              onSave={() => saveConsent(draft, "preferences_modal")}
              onAcceptAll={() => acceptAll("preferences_modal")}
              controlsClassName="px-6 pb-2 sm:px-8"
              actionsClassName="flex flex-col-reverse gap-3 px-6 pb-6 pt-5 sm:flex-row sm:justify-end sm:px-8 sm:pb-8"
            />
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes cookieConsentIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </CookieConsentContext.Provider>
  );
}

function CookiePreferenceControls({
  draft,
  gpcActive,
  savingAction = null,
  onDraftChange,
  onEssentialOnly,
  onSave,
  onAcceptAll,
  controlsClassName = "",
  actionsClassName = "",
  actionHelperText,
  bottomHelperText,
}: CookiePreferenceControlsProps) {
  return (
    <>
      <div className={controlsClassName}>
        {gpcActive && (
          <p className="mb-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] font-medium leading-5 text-slate-700">
            A browser privacy signal is active. Marketing technologies will
            remain disabled.
          </p>
        )}

        <div className="divide-y divide-zinc-200 border-y border-zinc-200">
          <PreferenceRow
            title="Essential Technologies"
            description="Required for authentication, security, session management, invitations, payment onboarding, and saving your privacy choices."
            stateLabel="Always active"
            locked
            enabled
          />
          <PreferenceRow
            title="Analytics Technologies"
            description="Helps us understand how AvenueBoard is used so we can improve performance, usability, and reliability. AvenueBoard does not currently use analytics technologies that require your consent."
            enabled={draft.analytics}
            onChange={(value) =>
              onDraftChange({ ...draft, analytics: value })
            }
          />
          <PreferenceRow
            title="Marketing Technologies"
            description="May support campaign measurement, attribution, or relevant promotions in the future. AvenueBoard does not currently use advertising or marketing technologies that require your consent."
            enabled={draft.marketing && !gpcActive}
            disabled={gpcActive}
            onChange={(value) =>
              onDraftChange({
                ...draft,
                marketing: gpcActive ? false : value,
              })
            }
          />
        </div>
      </div>

      {actionHelperText && (
        <p className="mt-8 text-[13px] font-medium leading-5 text-zinc-500">
          {actionHelperText}
        </p>
      )}

      <div className={actionsClassName}>
        <button
          type="button"
          disabled={savingAction === "essential"}
          onClick={onEssentialOnly}
          className="h-12 rounded-xl border border-zinc-200 bg-white px-6 text-[14px] font-semibold text-slate-800 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-wait disabled:opacity-70"
        >
          Essential Only
        </button>
        <button
          type="button"
          disabled={savingAction === "save"}
          onClick={onSave}
          className="h-12 rounded-xl border border-zinc-200 bg-white px-6 text-[14px] font-semibold text-slate-800 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-wait disabled:opacity-70"
        >
          Save Preferences
        </button>
        <button
          type="button"
          disabled={savingAction === "acceptAll"}
          onClick={onAcceptAll}
          className="h-12 rounded-xl bg-slate-950 px-6 text-[14px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-wait disabled:opacity-70"
        >
          Accept All
        </button>
      </div>

      {bottomHelperText && (
        <p className="mt-4 text-center text-[13px] font-medium leading-5 text-zinc-500 sm:text-right">
          {bottomHelperText}
        </p>
      )}
    </>
  );
}

export function PrivacyPreferencesPageControls() {
  const [draft, setDraft] = useState<DraftPreferences>({
    analytics: false,
    marketing: false,
  });
  const [gpcActive, setGpcActive] = useState(false);
  const [savingAction, setSavingAction] =
    useState<CookiePreferenceAction | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const savingActionRef = useRef<CookiePreferenceAction | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    function refreshFromStoredConsent() {
      const latestConsent = readCookieConsent();
      const latestGpc = getGlobalPrivacyControl();

      setGpcActive(latestGpc);
      setDraft({
        analytics: latestConsent?.analytics ?? false,
        marketing: latestGpc ? false : latestConsent?.marketing ?? false,
      });
    }

    refreshFromStoredConsent();

    window.addEventListener(consentUpdatedEventName, refreshFromStoredConsent);

    return () => {
      window.removeEventListener(
        consentUpdatedEventName,
        refreshFromStoredConsent
      );
    };
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  function showToast(message: string) {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    setToastMessage(message);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 3000);
  }

  function runPageConsentAction(
    action: CookiePreferenceAction,
    message: string,
    save: () => void
  ) {
    if (savingActionRef.current) return;

    savingActionRef.current = action;
    setSavingAction(action);

    try {
      save();
      showToast(message);
    } finally {
      window.setTimeout(() => {
        savingActionRef.current = null;
        setSavingAction(null);
      }, 250);
    }
  }

  function savePageConsent(
    nextDraft: DraftPreferences,
    source: CookieConsentSource
  ) {
    const record = createConsentRecord(nextDraft, source, gpcActive);

    persistCookieConsentRecord(record);
    setDraft({
      analytics: record.analytics,
      marketing: record.marketing,
    });
  }

  return (
    <>
      <CookiePreferenceControls
        draft={draft}
        gpcActive={gpcActive}
        savingAction={savingAction}
        onDraftChange={setDraft}
        onEssentialOnly={() =>
          runPageConsentAction(
            "essential",
            "Preferences updated. Optional technologies are disabled.",
            () =>
              savePageConsent(
                { analytics: false, marketing: false },
                "privacy_settings"
              )
          )
        }
        onSave={() =>
          runPageConsentAction("save", "Privacy preferences saved.", () =>
            savePageConsent(draft, "privacy_settings")
          )
        }
        onAcceptAll={() =>
          runPageConsentAction(
            "acceptAll",
            "Preferences updated. All optional technologies are enabled.",
            () =>
              savePageConsent(
                { analytics: true, marketing: !gpcActive },
                "privacy_settings"
              )
          )
      }
      controlsClassName="mt-6"
      actionHelperText="Your changes take effect immediately after you save your preferences."
      actionsClassName="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
      bottomHelperText="You can return to this page at any time to review or update your privacy preferences."
    />

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-6 z-[95] flex justify-center px-4"
        >
          <div className="flex max-w-[calc(100vw-32px)] items-center gap-3 rounded-xl border border-zinc-200/90 bg-white/95 px-4 py-3 text-[14px] font-medium text-slate-900 shadow-[0_18px_45px_rgba(15,23,42,0.14)] backdrop-blur">
            <Check
              size={16}
              strokeWidth={2.2}
              className="shrink-0 text-slate-700"
              aria-hidden="true"
            />
            <span>{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              aria-label="Dismiss notification"
              className="-mr-1 ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <X size={15} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
type PreferenceRowProps = {
  title: string;
  description: string;
  enabled: boolean;
  locked?: boolean;
  disabled?: boolean;
  stateLabel?: string;
  onChange?: (enabled: boolean) => void;
};

function PreferenceRow({
  title,
  description,
  enabled,
  locked = false,
  disabled = false,
  stateLabel,
  onChange,
}: PreferenceRowProps) {
  const descriptionId = useId();

  return (
    <div className="grid gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div>
        <h3 className="text-[18px] font-medium tracking-[-0.035em] text-black">
          {title}
        </h3>
        <p
          id={descriptionId}
          className="mt-2 max-w-[500px] text-[14px] font-medium leading-6 tracking-[-0.01em] text-[#4B4E5A]"
        >
          {description}
        </p>
      </div>

      {locked ? (
        <span className="inline-flex h-8 items-center justify-center rounded-full bg-zinc-50 px-4 text-[12px] font-medium text-slate-500">
          {stateLabel || "Always active"}
        </span>
      ) : (
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-describedby={descriptionId}
          disabled={disabled}
          onClick={() => onChange?.(!enabled)}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-60 ${
            enabled ? "bg-slate-950" : "bg-zinc-200"
          }`}
        >
          <span className="sr-only">{title}</span>
          <span
            className={`absolute h-6 w-6 rounded-full bg-white shadow-sm transition ${
              enabled ? "translate-x-7" : "translate-x-1"
            }`}
          />
        </button>
      )}
    </div>
  );
}

export function CookiePreferencesButton({
  className,
  label = "Cookie Preferences",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent("avenueboard:open-cookie-preferences")
        )
      }
      className={className}
    >
      {label}
    </button>
  );
}
