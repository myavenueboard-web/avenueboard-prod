import { NextResponse } from "next/server";
import {
  getPreviewCookieValue,
  isPreviewPasscodeValid,
  SITE_PREVIEW_COOKIE,
} from "@/lib/site-preview/access";

export async function POST(request: Request) {
  let passcode: unknown;

  try {
    const body = (await request.json()) as { passcode?: unknown };
    passcode = body.passcode;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!isPreviewPasscodeValid(passcode)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SITE_PREVIEW_COOKIE,
    value: getPreviewCookieValue(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
