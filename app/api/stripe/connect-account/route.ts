import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
  createStripeConnectState,
  STRIPE_CONNECT_STATE_COOKIE,
} from "@/lib/stripe/connectState";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function getAppUrl(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
}

export async function POST(request: Request) {
  try {
    const { propertyId } = await request.json();

    if (!propertyId) {
      return NextResponse.json({ error: "Missing propertyId" }, { status: 400 });
    }

    const token = getBearerToken(request);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Landlord profile not found" },
        { status: 404 }
      );
    }

    const { data: property, error: propertyError } = await supabaseAdmin
      .from("properties")
      .select("id, owner_profile_id, stripe_account_id")
      .eq("id", propertyId)
      .single();

    if (propertyError) {
      console.error("Supabase property lookup error:", propertyError);
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    if (!property || property.owner_profile_id !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let accountId = property?.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        capabilities: {
          transfers: { requested: true },
        },
        metadata: {
          propertyId,
          ownerProfileId: profile.id,
          userId: user.id,
        },
      });

      accountId = account.id;

      const { error: updateError } = await supabaseAdmin
        .from("properties")
        .update({
          stripe_account_id: accountId,
          bank_status: "pending",
        })
        .eq("id", propertyId);

      if (updateError) {
        console.error("Supabase property update error:", updateError);
        return NextResponse.json(
          { error: "Unable to prepare bank setup" },
          { status: 500 }
        );
      }
    }

    const appUrl = getAppUrl(request);
    const state = createStripeConnectState({
      propertyId,
      ownerProfileId: profile.id,
      userId: user.id,
      stripeAccountId: accountId,
    });
    const returnUrl = new URL("/api/stripe/connect-return", appUrl);
    returnUrl.searchParams.set("state", state);

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/dashboard/properties/${propertyId}`,
      return_url: returnUrl.toString(),
      type: "account_onboarding",
    });

    const response = NextResponse.json({
      url: accountLink.url,
      accountId,
    });

    response.cookies.set(STRIPE_CONNECT_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/stripe/connect-return",
      maxAge: 30 * 60,
    });

    return response;
  } catch (error) {
    console.error("Stripe connect account error:", error);

    return NextResponse.json(
      { error: "Unable to create Stripe onboarding link" },
      { status: 500 }
    );
  }
}
