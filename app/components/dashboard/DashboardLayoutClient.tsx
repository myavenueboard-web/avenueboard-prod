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
          ? "border-[#F4C9D7] bg-white text-[#B9476D]"
          : "border-zinc-200 bg-white text-slate-700"
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
          d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M9.8 9a2.3 2.3 0 0 1 4.4 1c0 1.8-2.2 2-2.2 4"
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

  

  function goTo(path: string) {
    setMobileNavOpen(false);
    setNotificationOpen(false);
    setMenuOpen(false);
    router.push(path);
  }

  const pageTitle =
    pathname === "/dashboard"
      ? "Properties"
      : pathname === "/dashboard/reports"
      ? "Reports"
      : pathname === "/dashboard/expenses"
      ? "Expenses"
      : pathname === "/dashboard/add-property"
      ? "Add Property"
      : "Property";

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
          className="h-10 w-auto max-w-[220px] object-contain"
        />
      </div>

      <div className="mt-8 min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-hide">
        <div className="space-y-2">
          <button
            onClick={() => goTo("/dashboard")}
            className={`flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[15px] font-bold transition-all duration-200 ${
              pathname === "/dashboard"
                ? "bg-[#FCEEF3] text-[#B9476D]"
                : "text-slate-700 hover:bg-white hover:text-slate-950"
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
                className={`flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] font-bold transition-all duration-200 ${
                  active
                    ? "bg-[#FCEEF3] text-[#B9476D]"
                    : "text-slate-700 hover:bg-white hover:text-slate-950"
                }`}
              >
                <SidebarBuildingIcon active={active} />
                <span className="truncate">{property.property_label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 shrink-0 space-y-3">
        <button
          onClick={() => goTo("/dashboard/reports")}
          className={`flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-[15px] font-bold transition ${
            pathname === "/dashboard/reports"
              ? "bg-[#FCEEF3] text-[#B9476D]"
              : "text-slate-700 hover:bg-white hover:text-slate-950"
          }`}
        >
          <SidebarReportIcon active={pathname === "/dashboard/reports"} />
          Reports
        </button>

        <button
          onClick={() => goTo("/dashboard/expenses")}
          className={`flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-[15px] font-bold transition ${
            pathname === "/dashboard/expenses"
              ? "bg-[#FCEEF3] text-[#B9476D]"
              : "text-slate-700 hover:bg-white hover:text-slate-950"
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
          className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-[15px] font-bold text-slate-700 transition hover:bg-white hover:text-slate-950"
        >
          <SidebarHelpIcon />
          Help
        </button>
      </div>
    </div>
  );

  return (
    <main className="h-screen overflow-hidden bg-[#F7F6F3] font-sans text-[#0F172A]">
      <div className="flex h-full overflow-hidden rounded-[28px] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.05)]">
        <aside className="relative hidden h-full w-[285px] shrink-0 overflow-hidden border-r border-zinc-100 bg-[#FBFBFA] px-7 py-8 lg:block">
          {desktopSidebarContent}
        </aside>

        {mobileNavOpen && (
          <div className="fixed inset-0 z-[80] lg:hidden">
            <button
              aria-label="Close navigation"
              onClick={() => setMobileNavOpen(false)}
              className="absolute inset-0 bg-black/25"
            />

            <aside className="absolute left-3 top-3 flex h-[calc(100dvh-24px)] w-[82%] max-w-[320px] flex-col overflow-hidden rounded-[26px] bg-[#F8F8F7] px-6 py-6 shadow-[0_24px_90px_rgba(15,23,42,0.25)]">
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
                  className={`w-full rounded-[18px] px-4 py-3 text-left text-[15px] font-semibold transition-all duration-200 ${
                    pathname === "/dashboard"
                      ? "bg-white text-[#0F172A] shadow-sm"
                      : "text-zinc-500 hover:bg-white hover:text-zinc-900"
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
                              ? "bg-[#FCEEF3] text-[#B9476D]"
                              : "text-zinc-500 hover:bg-white hover:text-zinc-900"
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
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[15px] text-zinc-500 transition hover:bg-white hover:text-zinc-900"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white text-[14px] font-semibold text-[#B9476D] shadow-sm">
                      ↗
                    </span>
                    Reports
                  </button>

                  <button
                    onClick={() => goTo("/dashboard/expenses")}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[15px] text-zinc-500 transition hover:bg-white hover:text-zinc-900"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white text-[14px] font-semibold text-[#B9476D] shadow-sm">
                      $
                    </span>
                    Expenses
                  </button>

                  <button
                    onClick={() => {
                      setMobileNavOpen(false);
                      setHelpOpen(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[15px] text-zinc-500 transition hover:bg-white hover:text-zinc-900"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white text-[14px] font-semibold text-[#B9476D] shadow-sm">
                      ?
                    </span>
                    Help
                  </button>
                </div>
              </div>
            </aside>
          </div>
        )}

        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white px-6 py-5 lg:px-8">
          <header className="flex min-h-[58px] shrink-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setMobileNavOpen(true)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F8F8F7] text-xl text-zinc-700 lg:hidden"
              >
                ☰
              </button>

              <h1 className="truncate text-[22px] font-semibold tracking-[-0.05em] sm:text-[28px]">
                {pageTitle}
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
              {showAddPropertyButton && (
                <button
                  onClick={() => router.push("/dashboard/add-property")}
                  className="hidden h-11 items-center gap-2 rounded-2xl bg-[#B9476D] px-5 text-[14px] font-semibold text-white transition hover:bg-[#A93F64] sm:flex lg:px-6 lg:text-[15px]"
                >
                  <span className="text-[22px] leading-none">+</span>
                  Add Property
                </button>
              )}

              {showAddPropertyButton && (
                <button
                  onClick={() => router.push("/dashboard/add-property")}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#B9476D] text-[26px] leading-none text-white sm:hidden"
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
                  className="relative flex h-11 w-11 items-center justify-center rounded-full text-slate-700 transition hover:bg-zinc-100 hover:text-slate-950"
                  aria-label="Notifications"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
                      <div className="border-b border-zinc-100 px-5 py-4">
                        <p className="text-[15px] font-semibold text-zinc-900">
                          Notifications
                        </p>
                      </div>

                      <div className="max-h-[420px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-5 py-10 text-center">
                            <p className="text-[14px] font-medium text-zinc-700">
                              No notifications right now
                            </p>
                          </div>
                        ) : (
                          notifications
  .filter(
    (notification) =>
      !dismissedNotifications.includes(notification.id)
  )
  .map((notification) => (
                            <div
  key={notification.id}
  className="border-b border-zinc-100 px-5 py-4"
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

              <div className="relative">
                <button
                  onClick={() => {
                    setMenuOpen(!menuOpen);
                    setNotificationOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-2xl px-1.5 py-1 transition hover:bg-zinc-50 sm:gap-3 sm:px-2"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0F172A] text-sm font-semibold text-white sm:h-11 sm:w-11">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>

                  <div className="hidden text-left lg:block">
                    <p className="text-[14px] font-semibold">{user?.name}</p>
                    <p className="max-w-[160px] truncate text-[12px] text-zinc-400">
                      {user?.email}
                    </p>
                  </div>

                  <span className="hidden text-zinc-400 sm:inline">⌄</span>
                </button>

                {menuOpen && (
                  <>
                    <button
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setMenuOpen(false)}
                      aria-label="Close menu"
                    />

                    <div className="absolute right-0 top-14 z-50 w-[230px] rounded-2xl border border-zinc-200 bg-white p-2 shadow-[0_18px_60px_rgba(15,23,42,0.12)]">
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

          <div className="min-h-0 flex-1 overflow-y-auto pt-3 scrollbar-hide lg:overflow-hidden lg:pt-0">
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
      />

      <HelpChat open={helpOpen} onClose={() => setHelpOpen(false)} />
    </main>
  );
}