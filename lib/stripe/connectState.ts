import crypto from "crypto";

export const STRIPE_CONNECT_STATE_COOKIE = "ab_stripe_connect_state";

export type StripeConnectStatePayload = {
  nonce: string;
  propertyId: string;
  ownerProfileId: string;
  userId: string;
  stripeAccountId: string;
  createdAt: number;
  expiresAt: number;
};

const STATE_TTL_MS = 30 * 60 * 1000;

function getStateSecret() {
  const secret = process.env.STRIPE_CONNECT_STATE_SECRET;

  if (!secret) {
    throw new Error("Missing STRIPE_CONNECT_STATE_SECRET");
  }

  return secret;
}

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );

  return Buffer.from(padded, "base64").toString("utf8");
}

function signPayload(encodedPayload: string) {
  return base64UrlEncode(
    crypto
      .createHmac("sha256", getStateSecret())
      .update(encodedPayload)
      .digest()
  );
}

export function createStripeConnectState({
  propertyId,
  ownerProfileId,
  userId,
  stripeAccountId,
}: {
  propertyId: string;
  ownerProfileId: string;
  userId: string;
  stripeAccountId: string;
}) {
  const now = Date.now();
  const payload: StripeConnectStatePayload = {
    nonce: crypto.randomBytes(24).toString("hex"),
    propertyId,
    ownerProfileId,
    userId,
    stripeAccountId,
    createdAt: now,
    expiresAt: now + STATE_TTL_MS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyStripeConnectState(state: string) {
  const [encodedPayload, signature] = state.split(".");

  if (!encodedPayload || !signature) {
    throw new Error("Invalid Stripe onboarding state.");
  }

  const expectedSignature = signPayload(encodedPayload);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (
    provided.length !== expected.length ||
    !crypto.timingSafeEqual(provided, expected)
  ) {
    throw new Error("Invalid Stripe onboarding state signature.");
  }

  const payload = JSON.parse(
    base64UrlDecode(encodedPayload)
  ) as StripeConnectStatePayload;

  if (!payload.expiresAt || payload.expiresAt < Date.now()) {
    throw new Error("Stripe onboarding state expired.");
  }

  if (
    !payload.propertyId ||
    !payload.ownerProfileId ||
    !payload.userId ||
    !payload.stripeAccountId ||
    !payload.nonce
  ) {
    throw new Error("Stripe onboarding state is incomplete.");
  }

  return payload;
}

