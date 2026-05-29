import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const propertyId = searchParams.get("propertyId");

    if (!propertyId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
      );
    }

    const { data: property } = await supabaseAdmin
      .from("properties")
      .select("stripe_account_id")
      .eq("id", propertyId)
      .single();

    if (property?.stripe_account_id) {
      const account = await stripe.accounts.retrieve(
        property.stripe_account_id
      );

      const onboardingComplete =
        account.details_submitted &&
        account.charges_enabled;

      await supabaseAdmin
        .from("properties")
        .update({
          stripe_onboarding_complete: onboardingComplete,
          bank_status: onboardingComplete ? "connected" : "pending",
        })
        .eq("id", propertyId);
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/properties/${propertyId}`
    );
  } catch (error) {
    console.error("Stripe return error:", error);

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    );
  }
}