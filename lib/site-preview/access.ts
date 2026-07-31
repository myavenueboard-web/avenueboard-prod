import { createHmac, timingSafeEqual } from "crypto";

export const SITE_PREVIEW_COOKIE = "ab_site_preview";

const COOKIE_PURPOSE = "avenueboard-site-preview";

function getPasscode() {
  return process.env.SITE_PREVIEW_PASSCODE?.trim() ?? "";
}

export function isPreviewProtectionConfigured() {
  return getPasscode().length > 0;
}

export function getPreviewCookieValue() {
  const passcode = getPasscode();
  if (!passcode) return "";

  return createHmac("sha256", passcode).update(COOKIE_PURPOSE).digest("hex");
}

export function isPreviewCookieValid(value?: string) {
  const expected = getPreviewCookieValue();
  if (!value || !expected || value.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

export function isPreviewPasscodeValid(value: unknown) {
  const passcode = getPasscode();
  if (!passcode || typeof value !== "string") return false;

  const submitted = value.trim();
  if (submitted.length !== passcode.length) return false;

  return timingSafeEqual(Buffer.from(submitted), Buffer.from(passcode));
}
