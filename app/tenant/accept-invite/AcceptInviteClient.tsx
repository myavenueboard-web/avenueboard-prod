"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { triggerEmailEvent } from "@/lib/email/triggerEmailEvent";

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
  const [verifiedInvite, setVerifiedInvite] = useState<VerifiedInvite | null>(
    null
  );
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
            body: { token: inviteToken },
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
        setVerifiedInvite(invite);

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
          body: { token },
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
        localStorage.removeItem("avenueboard_tenant_invite_token");
      }

      await triggerEmailEvent({
        trigger: "tenant_invite_accepted",
        propertyId: verifiedInvite?.property_id || null,
        leaseId: verifiedInvite?.lease_id || null,
        tenantId: verifiedInvite?.id || null,
      });

      const acceptedLeaseId =
        data?.lease_id ||
        data?.leaseId ||
        data?.tenant_access?.lease_id ||
        verifiedInvite?.lease_id ||
        "";

      setStatus("accepted");
      setMessage("Invitation accepted. Redirecting...");

      setTimeout(() => {
        router.push(
          acceptedLeaseId
            ? `/tenant?leaseId=${encodeURIComponent(acceptedLeaseId)}`
            : "/tenant"
        );
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
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#F7F6F3] px-4 py-5 font-sans text-[#0F172A] sm:flex sm:items-center sm:justify-center sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100dvh-40px)] w-full max-w-[500px] flex-col rounded-[28px] border border-zinc-200 bg-white px-5 py-6 text-center shadow-[0_20px_80px_rgba(15,23,42,0.08)] sm:min-h-0 sm:rounded-[32px] sm:p-8">
        <div className="shrink-0">
          <img
            src="/logo.png"
            alt="AvenueBoard"
            className="mx-auto h-7 w-auto object-contain sm:h-9"
          />

          <h1 className="mt-7 text-[28px] font-semibold tracking-[-0.05em] text-zinc-900 sm:mt-8 sm:text-[30px]">
            Tenant Invitation
          </h1>

          <p className="mt-4 break-words text-[14px] leading-7 text-zinc-500 sm:text-[15px]">
            {message}
          </p>
        </div>

        <div className="flex flex-1 flex-col justify-center py-7">
          {status === "loading" && (
            <div className="flex justify-center">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#B9476D] border-t-transparent sm:h-10 sm:w-10" />
            </div>
          )}

          {status === "logged_out" && (
            <div className="flex flex-col gap-3">
              <button
                onClick={goToSignup}
                className="h-12 rounded-2xl bg-[#B9476D] text-[14px] font-semibold text-white transition hover:bg-[#A93F64]"
              >
                Create Account
              </button>

              <button
                onClick={goToLogin}
                className="h-12 rounded-2xl border border-zinc-200 bg-white text-[14px] font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                Log In
              </button>
            </div>
          )}

          {status === "wrong_user" && (
            <div className="rounded-2xl bg-amber-50 p-4 text-left">
              <p className="text-[13px] font-semibold text-amber-900">
                Account mismatch
              </p>

              <p className="mt-2 break-words text-[13px] leading-6 text-amber-800">
                This invite was sent to{" "}
                <span className="font-semibold">{inviteEmail}</span>. You are
                logged in as{" "}
                <span className="font-semibold">{currentEmail}</span>.
              </p>

              <button
                onClick={logoutAndContinue}
                className="mt-5 h-11 w-full rounded-2xl bg-[#B9476D] text-[14px] font-semibold text-white transition hover:bg-[#A93F64]"
              >
                Log Out & Continue
              </button>
            </div>
          )}

          {status === "ready" && (
            <button
              onClick={acceptInvite}
              disabled={accepting}
              className="h-12 w-full rounded-2xl bg-[#B9476D] text-[14px] font-semibold text-white transition hover:bg-[#A93F64] disabled:opacity-50"
            >
              {accepting ? "Accepting..." : "Accept Invitation"}
            </button>
          )}

          {status === "accepted" && (
            <div className="flex justify-center">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#B9476D] border-t-transparent sm:h-10 sm:w-10" />
            </div>
          )}

          {status === "error" && (
            <button
              onClick={() => router.push("/login")}
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white text-[14px] font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Go to Login
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
