"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOrCreateProfile } from "@/lib/getOrCreateProfile";
import ProfileSettingsPanel from "@/app/components/dashboard/ProfileSettingsPanel";
import HelpChat from "@/app/components/dashboard/HelpChat";

type UserProfile = {
  name: string;
  email: string;
};

type SidebarProperty = {
  id: string;
  property_label: string;
};

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
      <img
        src="/logo.png"
        alt="AvenueBoard"
        className="h-8 w-fit max-w-[195px] object-contain"
      />

      <div className="mt-12 min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-hide">
        <div className="space-y-3">
          <button
            onClick={() => goTo("/dashboard")}
            className={`w-full rounded-2xl px-4 py-3 text-left text-[15px] font-semibold transition ${
              pathname === "/dashboard"
                ? "bg-white text-[#0F172A] shadow-sm"
                : "text-zinc-500 hover:bg-white hover:text-zinc-900"
            }`}
          >
            All Properties
          </button>

          {properties.length > 0 && (
            <div className="space-y-2 pt-2">
              {properties.map((property) => {
                const active =
                  pathname === `/dashboard/properties/${property.id}`;

                return (
                  <button
                    key={property.id}
                    onClick={() => goTo(`/dashboard/properties/${property.id}`)}
                    className={`w-full rounded-2xl px-4 py-3 text-left text-[14px] font-medium transition ${
                      active
                        ? "bg-white text-[#B9476D] shadow-sm"
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
      </div>

      <div className="mt-8 shrink-0 space-y-3">
        <button
          onClick={() => goTo("/dashboard/reports")}
          className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[15px] transition ${
            pathname === "/dashboard/reports"
              ? "bg-white font-semibold text-[#B9476D] shadow-sm"
              : "text-zinc-500 hover:bg-white hover:text-zinc-900"
          }`}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white text-[14px] font-semibold text-[#B9476D] shadow-sm">
            ↗
          </span>
          Reports
        </button>

        <button
          onClick={() => goTo("/dashboard/expenses")}
          className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[15px] transition ${
            pathname === "/dashboard/expenses"
              ? "bg-white font-semibold text-[#B9476D] shadow-sm"
              : "text-zinc-500 hover:bg-white hover:text-zinc-900"
          }`}
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
  );

  return (
    <main className="min-h-screen bg-[#F7F6F3] p-3 font-sans text-[#0F172A] sm:p-4">
      <div className="flex min-h-[calc(100vh-24px)] overflow-hidden rounded-[24px] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.05)] sm:min-h-[calc(100vh-32px)] sm:rounded-[28px] lg:p-5">
        <aside className="relative hidden h-[calc(100vh-72px)] w-[285px] shrink-0 overflow-hidden rounded-[24px] bg-[#F8F8F7] px-6 py-8 lg:block">
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
                  className={`w-full rounded-2xl px-4 py-3 text-left text-[15px] font-semibold transition ${
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
                              ? "bg-white text-[#B9476D] shadow-sm"
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

        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
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

              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
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