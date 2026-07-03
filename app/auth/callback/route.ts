import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

function getSafeInternalPath(value: string | null) {
  if (!value) return "";
  if (!value.startsWith("/") || value.startsWith("//")) return "";
  if (value.includes("\\") || value.includes("://")) return "";
  return value;
}

async function resolveDefaultRedirect(
  supabase: ReturnType<typeof createServerClient>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "/login?error=oauth_failed";

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.id) return "/dashboard";

  const [{ data: roles }, { data: tenantAccess }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("profile_id", profile.id),
    supabase
      .from("tenant_access")
      .select("id")
      .eq("tenant_profile_id", profile.id)
      .eq("invite_status", "accepted")
      .limit(1),
  ]);

  const roleList = ((roles || []) as { role: string }[]).map(
    (item) => item.role
  );
  const hasLandlord = roleList.includes("landlord");
  const hasTenant =
    roleList.includes("tenant") || Boolean(tenantAccess && tenantAccess.length > 0);

  if (hasLandlord && hasTenant) return "/select-mode";
  if (hasTenant) return "/tenant";
  return "/dashboard";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = getSafeInternalPath(requestUrl.searchParams.get("next"));
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: async () => cookieStore.getAll(),
        setAll: async (supabaseCookies) => {
          supabaseCookies.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        new URL("/login?error=oauth_failed", request.url)
      );
    }
  }

  if (requestedNext && requestedNext !== "/dashboard") {
    return NextResponse.redirect(new URL(requestedNext, request.url));
  }

  const next = await resolveDefaultRedirect(supabase);
  return NextResponse.redirect(new URL(next, request.url));
}
