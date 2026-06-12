"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOrCreateProfile } from "@/lib/getOrCreateProfile";
import ProfileSettingsPanel from "@/app/components/dashboard/ProfileSettingsPanel";
import HelpChat from "@/app/components/dashboard/HelpChat";
import {
  getLandlordNotifications,
  LandlordNotification,
} from "@/lib/getLandlordNotifications";

type UserProfile = {
  name: string;
  email: string;
};

type SidebarProperty = {
  id: string;
  property_label: string;
};

function getFirstName(name?: string) {
  return (name || "").trim().split(/\s+/)[0] || "";
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function SidebarIconShell({
  active,
  children,
}: {
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition ${
        active
          ? "border-zinc-200 bg-white text-slate-950"
          : "border-transparent bg-transparent text-slate-700"
      }`}
    >
      {children}
    </span>
  );
}

function SidebarHomeIcon({ active }: { active?: boolean }) {
  return (
    <SidebarIconShell active={active}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </SidebarIconShell>
  );
}

function SidebarBuildingIcon({ active }: { active?: boolean }) {
  return (
    <SidebarIconShell active={active}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <path
          d="M6 21V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v16"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2M4 21h16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </SidebarIconShell>
  );
}

function SidebarReportIcon({ active }: { active?: boolean }) {
  return (
    <SidebarIconShell active={active}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 19V9M12 19V5M19 19v-7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M4 19h16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </SidebarIconShell>
  );
}

function SidebarExpenseIcon({ active }: { active?: boolean }) {
  return (
    <SidebarIconShell active={active}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M12 7v10M15 9.5c-.5-1-1.4-1.5-3-1.5-1.7 0-3 .8-3 2.2 0 3 6 1.5 6 4.6 0 1.4-1.3 2.2-3 2.2-1.7 0-2.8-.6-3.4-1.7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </SidebarIconShell>
  );
}

function SidebarHelpIcon() {
  return (
    <SidebarIconShell>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 19V5M5 6h9.5l-1.2 3 1.2 3H5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19 7.5v9M16.5 14h5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M12 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </SidebarIconShell>
  );
}

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [profileId, setProfileId] = useState("");
  const [properties, setProperties] = useState<SidebarProperty[]>([]);
  const [loading, setLoading] = useState(true);

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<LandlordNotification[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const [hasLandlordRole, setHasLandlordRole] = useState(false);
  const [hasTenantPortal, setHasTenantPortal] = useState(false);
  const [taxDocumentsOpen, setTaxDocumentsOpen] = useState(false);
  const [removingLandlordPortal, setRemovingLandlordPortal] = useState(false);
  const [removeLandlordError, setRemoveLandlordError] = useState("");
  
  
  const visibleNotifications = notifications.filter(
  (notification) => !dismissedNotifications.includes(notification.id)
);
  
  const unreadNotificationCount = notifications.filter(
  (notification) => !dismissedNotifications.includes(notification.id)
).length;
  

  useEffect(() => {
    async function loadShell() {
      try {
        const { data } = await supabase.auth.getUser();

        if (!data.user) {
          router.push("/login");
          return;
        }

        const profile = await getOrCreateProfile();

        const resolvedName =
          profile.display_name || data.user.email?.split("@")[0] || "User";

        setProfileId(profile.id);

        setUser({
          name: resolvedName,
          email: profile.email || data.user.email || "",
        });

        setDisplayName(resolvedName);
        setPhone(profile.phone || "");

        const [
          { data: roleData, error: roleLoadError },
          { data: tenantAccessData, error: tenantAccessLoadError },
        ] = await Promise.all([
          supabase
            .from("user_roles")
            .select("role")
            .eq("profile_id", profile.id),
          supabase
            .from("tenant_access")
            .select("id")
            .eq("tenant_profile_id", profile.id)
            .eq("invite_status", "accepted")
            .limit(1),
        ]);

        if (roleLoadError) throw roleLoadError;
        if (tenantAccessLoadError) throw tenantAccessLoadError;

        const hasCurrentLandlordRole = (roleData || []).some(
          (item) => item.role === "landlord"
        );
        const hasCurrentTenantPortal = (tenantAccessData || []).length > 0;

        setHasLandlordRole(hasCurrentLandlordRole);
        setHasTenantPortal(hasCurrentTenantPortal);

        if (!hasCurrentLandlordRole) {
          router.replace(hasCurrentTenantPortal ? "/tenant" : "/select-mode");
          return;
        }

        const { data: propertyData } = await supabase
          .from("properties")
          .select("id, property_label")
          .eq("owner_profile_id", profile.id)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        setProperties((propertyData || []) as SidebarProperty[]);

        const dynamicNotifications = await getLandlordNotifications(profile.id);
        setNotifications(dynamicNotifications);
      } catch (error) {
        console.error("Dashboard shell load error:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    loadShell();
  }, [router, pathname]);

  useEffect(() => {
    function openAssistant() {
      setHelpOpen(true);
      setNotificationOpen(false);
      setMenuOpen(false);
    }

    function openProfile() {
      setProfileOpen(true);
      setNotificationOpen(false);
      setMenuOpen(false);
    }

    async function logoutFromMobile() {
      await supabase.auth.signOut();
      router.push("/login");
    }

    window.addEventListener("avenueboard:open-assistant", openAssistant);
    window.addEventListener("avenueboard:open-profile", openProfile);
    window.addEventListener("avenueboard:logout", logoutFromMobile);

    return () => {
      window.removeEventListener("avenueboard:open-assistant", openAssistant);
      window.removeEventListener("avenueboard:open-profile", openProfile);
      window.removeEventListener("avenueboard:logout", logoutFromMobile);
    };
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleSaveProfile() {
    if (!profileId) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        phone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId);

    if (error) {
      console.error("Profile update error:", error);
      return;
    }

    setUser((prev) =>
      prev ? { ...prev, name: displayName || prev.name } : prev
    );

    setProfileOpen(false);
  }

  async function handleRemoveLandlordPortal() {
    if (!profileId || removingLandlordPortal) return false;

    setRemoveLandlordError("");
    setRemovingLandlordPortal(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        setRemoveLandlordError("Please sign in again to remove landlord portal.");
        return false;
      }

      const response = await fetch("/api/profile/remove-landlord-portal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;

      if (!response.ok || !body?.ok) {
        setRemoveLandlordError(
          body?.message || "Unable to remove landlord portal. Please try again."
        );
        return false;
      }

      await supabase.auth.refreshSession();
      setHasLandlordRole(false);
      setMenuOpen(false);
      setProfileOpen(false);
      router.push("/tenant");
      router.refresh();
      return true;
    } catch (error) {
      console.error("Remove landlord portal error:", error);
      setRemoveLandlordError(
        "Unable to remove landlord portal right now. Please try again."
      );
      return false;
    } finally {
      setRemovingLandlordPortal(false);
    }
  }

  

  function goTo(path: string) {
    setMobileNavOpen(false);
    setNotificationOpen(false);
    setMenuOpen(false);
    router.push(path);
  }

  const isPropertyDetailPage =
    pathname.startsWith("/dashboard/properties/") && !pathname.includes("/edit");
  const isAllPropertiesPage = pathname === "/dashboard";
  const landlordFirstName = getFirstName(user?.name);
  const landlordGreeting = landlordFirstName
    ? `${getGreeting()}, ${landlordFirstName}`
    : getGreeting();

  const pageTitle =
    isPropertyDetailPage
      ? "Property Workspace"
      : isAllPropertiesPage
      ? landlordGreeting
      : pathname === "/dashboard/reports"
      ? "Reports"
      : pathname === "/dashboard/expenses"
      ? "Expenses"
      : pathname === "/dashboard/add-property"
      ? "Add Property"
      : "Property";

  const pageContext =
    isAllPropertiesPage
      ? ""
      : pathname === "/dashboard/reports"
      ? "Portfolio reporting"
      : pathname === "/dashboard/expenses"
      ? "Expense workspace"
      : pathname === "/dashboard/add-property"
      ? "Create a rental property"
      : isPropertyDetailPage
      ? ""
      : "Landlord workspace";

  const showAddPropertyButton = pathname !== "/dashboard/add-property";

  if (loading) {
    return (
      <main className="flex h-screen items-center justify-center bg-white text-sm text-zinc-500">
        Loading dashboard...
      </main>
    );
  }

  const desktopSidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex justify-center">
        <img
          src="/logo.png"
          alt="AvenueBoard"
          className="h-8 w-auto max-w-[185px] object-contain"
        />
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-hide">
        <div className="space-y-1.5">
          <button
            onClick={() => goTo("/dashboard")}
            className={`flex w-full items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-left text-[14.5px] font-bold transition-all duration-200 ${
              pathname === "/dashboard"
                ? "bg-zinc-50 text-slate-950"
                : "text-slate-700 hover:bg-zinc-100 hover:text-slate-950"
            }`}
          >
            <SidebarHomeIcon active={pathname === "/dashboard"} />
            All Properties
          </button>

          {properties.map((property) => {
            const active = pathname === `/dashboard/properties/${property.id}`;

            return (
              <button
                key={property.id}
                onClick={() => goTo(`/dashboard/properties/${property.id}`)}
                className={`flex w-full items-center gap-3 rounded-[13px] px-3 py-2.5 text-left text-[13.5px] font-bold transition-all duration-200 ${
                  active
                    ? "border border-[#E7EAF0] bg-white text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
                    : "border border-transparent text-slate-700 hover:bg-zinc-100 hover:text-slate-950"
                }`}
              >
                <SidebarBuildingIcon active={active} />
                <span className="truncate text-[13.5px] font-semibold">
  {property.property_label}
</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 shrink-0 space-y-2">
        <button
          onClick={() => goTo("/dashboard/reports")}
          className={`flex w-full items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-[14.5px] font-bold transition ${
            pathname === "/dashboard/reports"
              ? "bg-zinc-50 text-slate-950"
              : "text-slate-700 hover:bg-zinc-100 hover:text-slate-950"
          }`}
        >
          <SidebarReportIcon active={pathname === "/dashboard/reports"} />
          Reports
        </button>

        <button
          onClick={() => goTo("/dashboard/expenses")}
          className={`flex w-full items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-[14.5px] font-bold transition ${
            pathname === "/dashboard/expenses"
              ? "bg-zinc-50 text-slate-950"
              : "text-slate-700 hover:bg-zinc-100 hover:text-slate-950"
          }`}
        >
          <SidebarExpenseIcon active={pathname === "/dashboard/expenses"} />
          Expenses
        </button>

        <button
          onClick={() => {
            setMobileNavOpen(false);
            setHelpOpen(true);
          }}
          className="flex w-full items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-[14.5px] font-bold text-slate-700 transition hover:bg-zinc-100 hover:text-slate-950"
        >
          <SidebarHelpIcon />
          Roadmap
        </button>
      </div>
    </div>
  );

  return (
    <main className="h-screen overflow-hidden bg-[#F7F6F3] font-sans text-[#0F172A]">
      <div className="h-full overflow-y-auto lg:hidden">{children}</div>

      <div className="hidden h-full overflow-hidden rounded-[26px] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.05)] lg:flex">
        <aside className="relative hidden h-full w-[236px] shrink-0 overflow-hidden border-r border-[#E6E9EE] bg-[#F8FAFC] px-2.5 py-6 lg:block">
          {desktopSidebarContent}
        </aside>

        {mobileNavOpen && (
          <div className="fixed inset-0 z-[80] lg:hidden">
            <button
              aria-label="Close navigation"
              onClick={() => setMobileNavOpen(false)}
              className="absolute inset-0 bg-black/25"
            />

            <aside className="absolute left-3 top-3 flex h-[calc(100dvh-24px)] w-[82%] max-w-[320px] flex-col overflow-hidden rounded-[26px] bg-white px-6 py-6 shadow-[0_24px_90px_rgba(15,23,42,0.25)]">
              <div className="mb-8 flex shrink-0 items-start justify-between">
                <img
                  src="/logo.png"
                  alt="AvenueBoard"
                  className="h-8 w-auto max-w-[185px] object-contain"
                />

                <button
                  onClick={() => setMobileNavOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-xl text-zinc-500 shadow-sm"
                >
                  ×
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-hide">
                <button
                  onClick={() => goTo("/dashboard")}
                  className={`w-full rounded-[18px] px-3 py-3 text-left text-[15px] font-semibold transition-all duration-200 ${
                    pathname === "/dashboard"
                      ? "bg-zinc-100 text-[#0F172A]"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
                >
                  All Properties
                </button>

                {properties.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {properties.map((property) => {
                      const active =
                        pathname === `/dashboard/properties/${property.id}`;

                      return (
                        <button
                          key={property.id}
                          onClick={() =>
                            goTo(`/dashboard/properties/${property.id}`)
                          }
                          className={`w-full rounded-2xl px-4 py-3 text-left text-[14px] font-medium transition ${
                            active
                              ? "bg-zinc-100 text-zinc-950"
                              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                          }`}
                        >
                          {property.property_label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-zinc-200 pt-5">
                <div className="space-y-3">
                  <button
                    onClick={() => goTo("/dashboard/reports")}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[15px] text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-zinc-100 text-slate-800">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M5 19V5M5 6h9.5l-1.2 3 1.2 3H5M19 7.5v9M16.5 14h5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    Reports
                  </button>

                  <button
                    onClick={() => goTo("/dashboard/expenses")}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[15px] text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-zinc-100 text-[14px] font-semibold text-slate-800">
                      $
                    </span>
                    Expenses
                  </button>

                  <button
                    onClick={() => {
                      setMobileNavOpen(false);
                      setHelpOpen(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[15px] text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-zinc-100 text-slate-800">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M5 19V5M5 6h9.5l-1.2 3 1.2 3H5M19 7.5v9M16.5 14h5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    Roadmap
                  </button>
                </div>
              </div>
            </aside>
          </div>
        )}

        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white pl-3 pr-5 lg:pl-3 lg:pr-7">
          <header
            className={`flex shrink-0 items-center justify-between gap-3 bg-white ${
              isPropertyDetailPage ? "h-[58px]" : "h-[76px]"
            } ${
              isPropertyDetailPage || isAllPropertiesPage
                ? ""
                : "border-b border-zinc-200"
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setMobileNavOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F8F8F7] text-lg text-zinc-700 lg:hidden"
              >
                ☰
              </button>

              <div className="min-w-0">
                <h1
                  className={`truncate tracking-[-0.045em] ${
                    isPropertyDetailPage
                      ? "text-[18px] font-normal text-slate-600 sm:text-[19px]"
                      : isAllPropertiesPage
                      ? "text-[20px] font-medium text-slate-950 sm:text-[21px]"
                      : "text-[14px] font-semibold text-zinc-950 sm:text-[15px]"
                  }`}
                >
                  {pageTitle}
                </h1>
                {pageContext && (
                  <p className="mt-0.5 max-w-[360px] truncate text-[12px] font-medium text-zinc-400">
                    {pageContext}
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-5">
              {showAddPropertyButton && (
                <button
                  onClick={() => router.push("/dashboard/add-property")}
                  className="hidden h-[42px] items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-[13.5px] font-semibold text-slate-950 transition hover:bg-zinc-50 sm:flex"
                >
                  <span className="text-[19px] leading-none text-slate-500">+</span>
                  Add Property
                </button>
              )}

              {showAddPropertyButton && (
                <button
                  onClick={() => router.push("/dashboard/add-property")}
                  className="flex h-[42px] w-[42px] items-center justify-center rounded-2xl bg-[#0F172A] text-[25px] leading-none text-white sm:hidden"
                >
                  +
                </button>
              )}

              <div className="relative hidden sm:block">
                <button
                  onClick={() => {
                    setNotificationOpen(!notificationOpen);
                    setMenuOpen(false);
                  }}
                  className="relative flex h-[42px] w-[42px] items-center justify-center rounded-full text-slate-700 transition hover:bg-zinc-50 hover:text-slate-950"
                  aria-label="Notifications"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M15 17H9m9-6a6 6 0 0 0-12 0c0 3-.8 4.5-2 6h16c-1.2-1.5-2-3-2-6Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10 20a2.2 2.2 0 0 0 4 0"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>

                  {unreadNotificationCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#B9476D] px-1 text-[11px] font-bold text-white shadow-sm">
                      {unreadNotificationCount}
                    </span>
                  )}
                </button>

                {notificationOpen && (
                  <>
                    <button
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setNotificationOpen(false)}
                      aria-label="Close notifications"
                    />

                    <div className="absolute right-0 top-14 z-50 w-[360px] overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.16)]">
                      <div className="border-b border-zinc-200 px-5 py-4">
                        <p className="text-[15px] font-semibold text-zinc-900">
                          Notifications
                        </p>
                      </div>

                      <div className="max-h-[420px] overflow-y-auto">
                        {visibleNotifications.length === 0 ? (
                          <div className="px-5 py-10 text-center">
  <p className="text-[14px] font-semibold text-zinc-800">
    No new notifications
  </p>
  <p className="mt-2 text-[12px] leading-5 text-zinc-500">
    You’re all caught up.
  </p>
</div>
                        ) : (
                          visibleNotifications.map((notification) => (
                            <div
  key={notification.id}
  className="border-b border-zinc-200 px-5 py-4 last:border-b-0"
>
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
      <p className="text-[13px] font-semibold text-zinc-900">
        {notification.title}
      </p>

      <p className="mt-1 text-[12px] leading-5 text-zinc-500">
        {notification.message}
      </p>
    </div>

    <button
      onClick={() =>
        setDismissedNotifications((prev) => [
          ...prev,
          notification.id,
        ])
      }
      className="shrink-0 text-[16px] text-zinc-400 hover:text-zinc-700"
    >
      ×
    </button>
  </div>
</div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="hidden h-8 w-px bg-zinc-200 sm:block" />

              <button
                onClick={() => {
                  setHelpOpen(true);
                  setNotificationOpen(false);
                  setMenuOpen(false);
                }}
                className="hidden h-[42px] items-center gap-2 rounded-2xl px-3 text-[13.5px] font-semibold text-zinc-950 transition hover:bg-zinc-50 sm:flex"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3l1.35 4.15L17.5 8.5l-4.15 1.35L12 14l-1.35-4.15L6.5 8.5l4.15-1.35L12 3Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M18.5 14l.75 2.25L21.5 17l-2.25.75L18.5 20l-.75-2.25L15.5 17l2.25-.75L18.5 14Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M5.5 14l.6 1.9L8 16.5l-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6.6-1.9Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Assistant
              </button>

              <div className="hidden h-8 w-px bg-zinc-200 sm:block" />

              <div className="relative">
                <button
                  onClick={() => {
                    setMenuOpen(!menuOpen);
                    setNotificationOpen(false);
                  }}
                  className="flex items-center gap-3 rounded-2xl px-2 py-1.5 transition hover:bg-zinc-50"
                >
                  <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#0F172A] text-[14px] font-semibold text-white">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>

                  <div className="hidden text-left sm:block">
                    <p className="max-w-[190px] truncate text-[14.5px] font-semibold text-zinc-950">
                      {user?.name}
                    </p>
                    <p className="text-[12.5px] text-zinc-500">Landlord</p>
                  </div>

                  <span className="text-zinc-400">⌄</span>
                </button>

                {menuOpen && (
                  <>
                    <button
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setMenuOpen(false)}
                      aria-label="Close menu"
                    />

                    <div className="absolute right-0 top-14 z-50 w-[230px] rounded-2xl border border-zinc-200 bg-white p-2 shadow-[0_18px_60px_rgba(15,23,42,0.12)]">
  {hasTenantPortal && (
  <button
    onClick={() => {
      setMenuOpen(false);
      router.push(hasTenantPortal ? "/tenant" : "/select-mode");
    }}
    className="w-full rounded-xl px-3 py-3 text-left text-[13px] font-medium text-[#B9476D] hover:bg-[#FCEEF3]"
  >
    Switch to tenant dashboard
  </button>
)}

<button

  onClick={() => {
    setMenuOpen(false);
    setTaxDocumentsOpen(true);
  }}
  className="w-full rounded-xl px-3 py-3 text-left text-[13px] font-medium text-zinc-700 hover:bg-zinc-50"
>
  Tax Documents
</button>

                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          setProfileOpen(true);
                        }}
                        className="w-full rounded-xl px-3 py-3 text-left text-[13px] font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        Profile Settings
                      </button>

                      <button
                        onClick={handleLogout}
                        className="w-full rounded-xl px-3 py-3 text-left text-[13px] font-medium text-red-600 hover:bg-red-50"
                      >
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto pt-2 scrollbar-hide lg:overflow-hidden lg:pt-0">
            {children}
          </div>
        </section>
      </div>

      <ProfileSettingsPanel
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={user}
        displayName={displayName}
        phone={phone}
        setDisplayName={setDisplayName}
        setPhone={setPhone}
        onSave={handleSaveProfile}
        onLogout={handleLogout}
        hasTenantPortal={hasTenantPortal}
        hasLandlordRole={hasLandlordRole}
        removingLandlordPortal={removingLandlordPortal}
        removeLandlordError={removeLandlordError}
        onClearRemoveLandlordError={() => setRemoveLandlordError("")}
        onRemoveLandlordPortal={handleRemoveLandlordPortal}
        />

{taxDocumentsOpen && (
  <TaxDocumentsPanel onClose={() => setTaxDocumentsOpen(false)} />
)}

      <HelpChat open={helpOpen} onClose={() => setHelpOpen(false)} />
    </main>
  );
}

function TaxDocumentsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[120] bg-black/25 backdrop-blur-sm">
      <button
        aria-label="Close tax documents"
        onClick={onClose}
        className="absolute inset-0"
      />

      <aside className="absolute right-3 top-3 flex h-[calc(100dvh-24px)] w-[92%] max-w-[520px] flex-col overflow-hidden rounded-[32px] bg-white shadow-[0_30px_100px_rgba(15,23,42,0.24)]">
        <div className="border-b border-zinc-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[24px] font-[850] tracking-[-0.05em] text-zinc-950">
                Tax Documents
              </h2>
            </div>

            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">

          <div className="mt-5 rounded-[30px] border border-dashed border-zinc-200 bg-white px-6 py-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-[28px]">
              📄
            </div>

            <h3 className="mt-5 text-[18px] font-[850] tracking-[-0.035em] text-zinc-950">
              No tax documents yet
            </h3>

            <p className="mx-auto mt-3 max-w-[360px] text-[13px] leading-6 text-zinc-500">
              Documents will show here only when real tax forms are available.
              No sample or mock documents are displayed.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
