"use client";

import { useState } from "react";

type ProfileSettingsPanelProps = {
  variant?: "landlord" | "tenant";
  open: boolean;
  onClose: () => void;
  user: {
    name: string;
    email: string;
  } | null;
  displayName: string;
  phone: string;
  setDisplayName: (value: string) => void;
  setPhone: (value: string) => void;
  onSave: () => void;
  onLogout: () => void;
  hasTenantPortal: boolean;
  hasLandlordRole: boolean;
  canRemoveLandlordPortal?: boolean;
  removingLandlordPortal: boolean;
  removeLandlordError: string;
  onClearRemoveLandlordError: () => void;
  onRemoveLandlordPortal: () => Promise<boolean>;
};

export default function ProfileSettingsPanel({
  variant = "landlord",
  open,
  onClose,
  user,
  displayName,
  phone,
  setDisplayName,
  setPhone,
  onSave,
  onLogout,
  hasTenantPortal,
  hasLandlordRole,
  canRemoveLandlordPortal = false,
  removingLandlordPortal,
  removeLandlordError,
  onClearRemoveLandlordError,
  onRemoveLandlordPortal,
}: ProfileSettingsPanelProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [removeLandlordConfirmOpen, setRemoveLandlordConfirmOpen] =
    useState(false);
  const isTenantVariant = variant === "tenant";

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[240] bg-black/20 backdrop-blur-[2px]"
      />

      <aside
        className="fixed bottom-0 right-0 top-0 z-[250] h-[100dvh] w-[92vw] max-w-[560px] overflow-hidden bg-white shadow-[0_24px_90px_rgba(15,23,42,0.22)] sm:w-[560px]"
      >
        <div className="flex h-full flex-col">
          <div className="shrink-0 px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex items-start justify-between gap-5">
              <div>
                <h2 className="text-[22px] font-semibold tracking-[-0.04em] text-[#0F172A] sm:text-[24px]">
                  Profile Settings
                </h2>
              </div>

              <button
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
              >
                ×
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-7">
            <div
              className={`flex items-center gap-5 text-left ${
                isTenantVariant
                  ? "border-b border-zinc-200 pb-5"
                  : "border-b border-zinc-200 pb-5"
              }`}
            >
              <div className="relative shrink-0">
                <div
                  className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#0F172A] text-[24px] font-semibold text-white"
                >
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    displayName?.charAt(0)?.toUpperCase() ||
                    user?.email?.charAt(0)?.toUpperCase() ||
                    "U"
                  )}
                </div>

                <label className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white bg-white text-[13px] shadow-md hover:bg-zinc-50">
                  ✎
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      const imageUrl = URL.createObjectURL(file);
                      setPreviewImage(imageUrl);
                    }}
                  />
                </label>
              </div>

              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-zinc-900">
                  Profile Photo
                </h3>
                <p className="mt-1 text-[12px] text-zinc-400">
                  JPG or PNG. Recommended 400×400.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4 sm:mt-6 sm:space-y-4">
              <div>
                <label className="text-[13px] font-medium text-zinc-800 sm:text-[14px]">
                  Display Name
                </label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="mt-2 h-[48px] w-full rounded-xl border border-zinc-200 bg-[#F8F9FA] px-4 text-[16px] text-zinc-900 outline-none focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10 sm:h-[52px] sm:px-5 sm:text-[14px]"
                />
              </div>

              <div>
                <label className="text-[13px] font-medium text-zinc-800 sm:text-[14px]">
                  Email
                </label>
                <input
                  value={user?.email || ""}
                  disabled
                  className="mt-2 h-[48px] w-full cursor-not-allowed rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-[16px] text-zinc-500 outline-none sm:h-[52px] sm:px-5 sm:text-[14px]"
                />
                {isTenantVariant && (
                  <p className="mt-2 text-[12px] font-medium text-zinc-400">
                    Email is linked to your AvenueBoard account and cannot be
                    changed here.
                  </p>
                )}
              </div>

              <div>
                <label className="text-[13px] font-medium text-zinc-800 sm:text-[14px]">
                  Phone Number{" "}
                  <span className="text-[12px] text-zinc-400">(Optional)</span>
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(415) 555-0000"
                  className="mt-2 h-[48px] w-full rounded-xl border border-zinc-200 bg-[#F8F9FA] px-4 text-[16px] text-zinc-900 outline-none focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10 sm:h-[52px] sm:px-5 sm:text-[14px]"
                />
              </div>
            </div>

            <div className="mt-6 bg-white sm:mt-6">
              <div>
                <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-zinc-950">
                  Boards
                </h3>
                <p className="mt-1 text-[12.5px] leading-5 text-zinc-500">
                  AvenueBoard workspaces connected to this account.
                </p>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50/70 px-4 py-3">
                  <span className="text-[13.5px] font-semibold text-slate-800">
                    Resident Board
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                      hasTenantPortal
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {hasTenantPortal ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50/70 px-4 py-3">
                  <span className="text-[13.5px] font-semibold text-slate-800">
                    Landlord Board
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                      hasLandlordRole
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {hasLandlordRole ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {removeLandlordError && !isTenantVariant && (
                <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-medium leading-5 text-red-600">
                  {removeLandlordError}
                </p>
              )}

              {!isTenantVariant && canRemoveLandlordPortal ? (
                <button
                  type="button"
                  onClick={() => {
                    onClearRemoveLandlordError();
                    setRemoveLandlordConfirmOpen(true);
                  }}
                  className="mt-4 h-11 w-full rounded-2xl border border-red-100 bg-red-50 text-[13px] font-semibold text-red-600 transition hover:bg-red-100"
                >
                  Remove Landlord Board
                </button>
              ) : null}
            </div>
          </div>

          <div className="shrink-0 border-t border-zinc-200 bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 sm:px-7 sm:pb-7 sm:pt-7">
            <div className="grid grid-cols-1 gap-3 sm:space-y-3">
              <button
                onClick={onSave}
                className="h-[50px] w-full rounded-xl bg-[#2563EB] text-[15px] font-semibold text-white hover:bg-[#1D4ED8] sm:h-[52px]"
              >
                {isTenantVariant ? "Save Changes" : "Save Settings"}
              </button>

              <button
                onClick={onLogout}
                className="h-[50px] w-full rounded-xl border border-red-100 bg-white text-[14px] font-semibold text-red-600 hover:bg-red-50 sm:h-[52px]"
              >
                {isTenantVariant ? "Logout" : "Sign Out"}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {removeLandlordConfirmOpen && (
        <div className="fixed inset-0 z-[270] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[460px] rounded-[28px] border border-zinc-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.20)]">
            <h2 className="text-[24px] font-medium tracking-[-0.05em] text-slate-950">
              Remove Landlord Board?
            </h2>
            <p className="mt-3 text-[14px] font-medium leading-6 text-zinc-600">
              You’ll no longer have access to the Landlord Board. Your
              Resident Board will remain active, and you can create a Landlord
              Board again later if you need to manage or rent out a property.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!removingLandlordPortal) {
                    setRemoveLandlordConfirmOpen(false);
                  }
                }}
                disabled={removingLandlordPortal}
                className="h-11 rounded-2xl border border-zinc-200 bg-white px-5 text-[13px] font-semibold text-slate-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const removed = await onRemoveLandlordPortal();
                  if (removed) {
                    setRemoveLandlordConfirmOpen(false);
                  }
                }}
                disabled={removingLandlordPortal}
                className="h-11 rounded-2xl bg-red-600/90 px-5 text-[13px] font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {removingLandlordPortal
                  ? "Removing..."
                  : "Remove Landlord Board"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
