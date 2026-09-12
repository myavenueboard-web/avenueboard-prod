import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 8;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getRequestKey(request: Request, email: string) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  return `${ipAddress}:${email}`;
}

function isRateLimited(request: Request, email: string) {
  const key = getRequestKey(request, email);
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX_REQUESTS;
}

async function emailExists(email: string) {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const users = data.users || [];

    if (
      users.some((user) => normalizeEmail(user.email) === email)
    ) {
      return true;
    }

    if (users.length < perPage) {
      return false;
    }

    page += 1;
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);

  if (!email) {
    return NextResponse.json({ exists: false });
  }

  if (isRateLimited(request, email)) {
    return NextResponse.json({ exists: false }, { status: 429 });
  }

  try {
    return NextResponse.json({ exists: await emailExists(email) });
  } catch (error) {
    console.error("Signup email existence check failed:", error);
    return NextResponse.json({ exists: false }, { status: 500 });
  }
}
