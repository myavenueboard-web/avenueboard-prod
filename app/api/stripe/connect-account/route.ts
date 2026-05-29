import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { propertyId } = await request.json();

    if (!propertyId) {
      return NextResponse.json({ error: "Missing propertyId" }, { status: 400 });
    }

    const { data: property, error: propertyError } = await supabaseAdmin
      .from("properties")
      .select("stripe_account_id")
      .eq("id", propertyId)
      .single();

    if (propertyError) {
      console.error("Supabase property lookup error:", propertyError);
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
      }
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/properties/${propertyId}`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect-return?propertyId=${propertyId}`,
      type: "account_onboarding",
    });

    return NextResponse.json({
      url: accountLink.url,
      accountId,
    });
  } catch (error) {
    console.error("Stripe connect account error:", error);

    return NextResponse.json(
      { error: "Unable to create Stripe onboarding link" },
      { status: 500 }
    );
  }
}