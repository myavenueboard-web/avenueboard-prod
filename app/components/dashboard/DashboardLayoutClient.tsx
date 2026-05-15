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

  return (
    <main className="h-screen overflow-hidden bg-[#F7F6F3] p-4 font-sans text-[#0F172A]">
      <div className="flex h-[calc(100vh-32px)] overflow-hidden rounded-[28px] bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.05)]">
        <aside className="relative h-full w-[285px] shrink-0 rounded-[24px] bg-[#F8F8F7] px-6 py-8">
          <img src="/logo.png" alt="AvenueBoard" className="h-10 w-auto" />

          <div className="mt-12 space-y-3">
            <button
              onClick={() => router.push("/dashboard")}
              className={`w-full rounded-2xl px-4 py-3 text-left text-[15px] font-semibold transition ${
                pathname === "/dashboard"
                  ? "bg-white text-[#0F172A] shadow-sm"
                  : "text-zinc-500 hover:bg-white hover:text-zinc-900"
              }`}
            >
              All Properties
            </button>

            {properties.length > 0 && (
              <div className="max-h-[calc(100vh-430px)] space-y-2 overflow-y-auto pr-1 pt-2">
                {properties.map((property) => {
                  const active =
                    pathname === `/dashboard/properties/${property.id}`;

                  return (
                    <button
                      key={property.id}
                      onClick={() =>
                        router.push(`/dashboard/properties/${property.id}`)
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

          <div className="absolute bottom-8 left-6 right-6 space-y-3">
            <button
              onClick={() => router.push("/dashboard/reports")}
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
              onClick={() => router.push("/dashboard/expenses")}
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
              onClick={() => setHelpOpen(true)}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[15px] text-zinc-500 transition hover:bg-white hover:text-zinc-900"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white text-[14px] font-semibold text-[#B9476D] shadow-sm">
                ?
              </span>
              Help
            </button>
          </div>
        </aside>

        <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden px-8 py-5">
          <header className="flex h-[64px] shrink-0 items-center justify-between">
            <h1 className="text-[28px] font-semibold tracking-[-0.05em]">
              {pageTitle}
            </h1>

            <div className="flex items-center gap-4">
              {showAddPropertyButton && (
                <button
                  onClick={() => router.push("/dashboard/add-property")}
                  className="flex h-11 items-center gap-2 rounded-2xl bg-[#B9476D] px-6 text-[15px] font-semibold text-white transition hover:bg-[#A93F64]"
                >
                  <span className="text-[22px] leading-none">+</span>
                  Add Property
                </button>
              )}

              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-3 rounded-2xl px-2 py-1 transition hover:bg-zinc-50"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0F172A] text-sm font-semibold text-white">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>

                  <div className="hidden text-left lg:block">
                    <p className="text-[14px] font-semibold">{user?.name}</p>
                    <p className="max-w-[160px] truncate text-[12px] text-zinc-400">
                      {user?.email}
                    </p>
                  </div>

                  <span className="text-zinc-400">⌄</span>
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

          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
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