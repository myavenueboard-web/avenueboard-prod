"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type InviteStatus =
  | "loading"
  | "logged_out"
  | "wrong_user"
  | "ready"
  | "accepted"
  | "error";

type VerifiedInvite = {
  id: string;
  lease_id: string;
  email: string | null;
  invite_status: string | null;
  property_id: string | null;
  property_label: string | null;
};

type TenantInvite = {
  id: string;
  lease_id: string;
  email: string | null;
  invite_status: string | null;
  leases:
    | {
        id: string;
        property_id: string;
      }
    | {
        id: string;
        property_id: string;
      }[]
    | null;
};

function buildAuthUrl(path: "/login" | "/signup", email: string) {
  const params = new URLSearchParams();

  params.set("redirect", "/tenant/accept-invite");

  if (email) {
    params.set("email", email);
  }

  return `${path}?${params.toString()}`;
}

export default function AcceptInviteClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<InviteStatus>("loading");
  const [message, setMessage] = useState("Preparing your invitation...");
  const [token, setToken] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    async function checkInvite() {
      try {
        const urlToken = searchParams.get("token");

        if (urlToken && typeof window !== "undefined") {
          localStorage.setItem("avenueboard_tenant_invite_token", urlToken);
          window.history.replaceState({}, "", "/tenant/accept-invite");
        }

        const inviteToken =
          urlToken ||
          (typeof window !== "undefined"
            ? localStorage.getItem("avenueboard_tenant_invite_token")
            : "");

        if (!inviteToken) {
          setStatus("error");
          setMessage("Invalid or expired invite link.");
          return;
        }

        setToken(inviteToken);

        const { data: verifyData, error: verifyError } =
          await supabase.functions.invoke("verify-tenant-invite", {
            body: {
              token: inviteToken,
            },
          });

        if (verifyError || !verifyData?.valid || !verifyData?.invite) {
          console.warn("Invite verification warning:", verifyError || verifyData);
          setStatus("error");
          setMessage("This invite link is invalid or expired.");
          return;
        }

        const invite = verifyData.invite as VerifiedInvite;
        const tenantEmail = invite.email || "";
        const accountExists = !!verifyData.account_exists;

        setInviteEmail(tenantEmail);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setStatus("logged_out");

          if (accountExists) {
            setMessage(
              tenantEmail
                ? `This invite was sent to ${tenantEmail}. Please log in to accept your invitation.`
                : "Please log in to accept this invitation."
            );

            setTimeout(() => {
              router.replace(buildAuthUrl("/login", tenantEmail));
            }, 900);
          } else {
            setMessage(
              tenantEmail
                ? `This invite was sent to ${tenantEmail}. Create your account to accept your invitation.`
                : "Please create an account to accept this invitation."
            );

            setTimeout(() => {
              router.replace(buildAuthUrl("/signup", tenantEmail));
            }, 900);
          }

          return;
        }

        const loggedInEmail = user.email || "";
        setCurrentEmail(loggedInEmail);

        if (
          tenantEmail &&
          loggedInEmail.toLowerCase() !== tenantEmail.toLowerCase()
        ) {
          setStatus("wrong_user");
          setMessage(
            `You are currently logged in as ${loggedInEmail}. This invitation was sent to ${tenantEmail}.`
          );
          return;
        }

        setStatus("ready");
        setMessage(
          invite.property_label
            ? `Your invitation for ${invite.property_label} is ready to accept.`
            : "Your invitation is ready to accept."
        );
      } catch (error) {
        console.warn("Invite check warning:", error);
        setStatus("error");
        setMessage("Something went wrong while preparing this invitation.");
      }
    }

    checkInvite();
  }, [router, searchParams]);

  async function acceptInvite() {
    if (!token || accepting) return;

    setAccepting(true);
    setStatus("loading");
    setMessage("Accepting your invitation...");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStatus("logged_out");
        setMessage("Please log in or create an account first.");
        setAccepting(false);
        return;
      }

  const { data, error } = await supabase.functions.invoke(
  "accept-tenant-invite",
  {
    body: {
      token,
    },
  }
);

if (error || !data?.success) {
  console.warn("Accept invite warning:", error || data);

  setStatus("error");

  setMessage(
    data?.error ||
      "Something went wrong while accepting this invitation."
  );

  setAccepting(false);

  return;
}

if (typeof window !== "undefined") {
  localStorage.removeItem(
    "avenueboard_tenant_invite_token"
  );
}

      if (typeof window !== "undefined") {
        localStorage.removeItem("avenueboard_tenant_invite_token");
      }

      setStatus("accepted");
      setMessage("Invitation accepted. Redirecting...");

      setTimeout(() => {
        router.push("/tenant");
      }, 900);
    } catch (error) {
      console.warn("Invite accept warning:", error);
      setStatus("error");
      setMessage("Something went wrong while accepting this invitation.");
      setAccepting(false);
    }
  }

  async function logoutAndContinue() {
    await supabase.auth.signOut();
    router.push(buildAuthUrl("/login", inviteEmail));
  }

  function goToLogin() {
    router.push(buildAuthUrl("/login", inviteEmail));
  }

  function goToSignup() {
    router.push(buildAuthUrl("/signup", inviteEmail));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F6F3] px-6 font-sans text-[#0F172A]">
      <div className="w-full max-w-[500px] rounded-[32px] border border-zinc-200 bg-white p-8 text-center shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
        <img
          src="/logo.png"
          alt="AvenueBoard"
          className="mx-auto h-10 w-auto"
        />

        <h1 className="mt-8 text-[28px] font-semibold tracking-[-0.05em] text-zinc-900">
          Tenant Invitation
        </h1>

        <p className="mt-4 text-[15px] leading-7 text-zinc-500">{message}</p>

        {status === "loading" && (
          <div className="mt-8 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#B9476D] border-t-transparent" />
          </div>
        )}

        {status === "logged_out" && (
          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={goToSignup}
              className="h-12 rounded-2xl bg-[#B9476D] text-[14px] font-semibold text-white hover:bg-[#A93F64]"
            >
              Create Account
            </button>

            <button
              onClick={goToLogin}
              className="h-12 rounded-2xl border border-zinc-200 bg-white text-[14px] font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Log In
            </button>
          </div>
        )}

        {status === "wrong_user" && (
          <div className="mt-8 rounded-2xl bg-amber-50 p-4 text-left">
            <p className="text-[13px] font-semibold text-amber-900">
              Account mismatch
            </p>

            <p className="mt-2 text-[13px] leading-6 text-amber-800">
              This invite was sent to{" "}
              <span className="font-semibold">{inviteEmail}</span>. You are
              logged in as <span className="font-semibold">{currentEmail}</span>.
            </p>

            <button
              onClick={logoutAndContinue}
              className="mt-5 h-11 w-full rounded-2xl bg-[#B9476D] text-[14px] font-semibold text-white hover:bg-[#A93F64]"
            >
              Log Out & Continue
            </button>
          </div>
        )}

        {status === "ready" && (
          <div className="mt-8">
            <button
              onClick={acceptInvite}
              disabled={accepting}
              className="h-12 w-full rounded-2xl bg-[#B9476D] text-[14px] font-semibold text-white hover:bg-[#A93F64] disabled:opacity-50"
            >
              {accepting ? "Accepting..." : "Accept Invitation"}
            </button>
          </div>
        )}

        {status === "accepted" && (
          <div className="mt-8 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#B9476D] border-t-transparent" />
          </div>
        )}

        {status === "error" && (
          <button
            onClick={() => router.push("/login")}
            className="mt-8 h-12 w-full rounded-2xl border border-zinc-200 bg-white text-[14px] font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Go to Login
          </button>
        )}
      </div>
    </main>
  );
}