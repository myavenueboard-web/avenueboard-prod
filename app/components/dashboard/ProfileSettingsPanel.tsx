"use client";

import { useState } from "react";

type ProfileSettingsPanelProps = {
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
};

export default function ProfileSettingsPanel({
  open,
  onClose,
  user,
  displayName,
  phone,
  setDisplayName,
  setPhone,
  onSave,
  onLogout,
}: ProfileSettingsPanelProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
      />

      <aside className="fixed bottom-0 right-0 top-0 z-50 h-[100dvh] w-[88vw] max-w-[420px] overflow-hidden bg-white shadow-[0_24px_90px_rgba(15,23,42,0.22)] sm:w-[420px]">
        <div className="flex h-full flex-col">
          <div className="shrink-0 px-5 py-5 sm:px-7 sm:py-7">
            <div className="flex items-start justify-between gap-5">
              <div>
                <h2 className="text-[22px] font-semibold tracking-[-0.04em] text-[#0F172A] sm:text-[24px]">
                  Profile Settings
                </h2>
                <p className="mt-1 text-[13px] text-zinc-500">
                  Manage your AvenueBoard account details.
                </p>
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
            <div className="flex items-center gap-4 rounded-[22px] border border-zinc-200 bg-[#FAFAFA] p-4 text-left">
              <div className="relative shrink-0">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[#0F172A] text-[22px] font-semibold text-white sm:h-24 sm:w-24 sm:text-[26px]">
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

              <div>
                <h3 className="text-[15px] font-semibold text-zinc-900">
                  Profile Photo
                </h3>
                <p className="mt-1 text-[13px] leading-5 text-zinc-500">
                  Upload a profile image for your landlord account.
                </p>
                <p className="mt-2 text-[12px] text-zinc-400">
                  JPG or PNG. Recommended 400×400.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-5">
              <div>
                <label className="text-[13px] font-medium text-zinc-800 sm:text-[14px]">
                  Display Name
                </label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="mt-2 h-[48px] w-full rounded-2xl border border-zinc-200 bg-[#F8F9FA] px-4 text-[16px] text-zinc-900 outline-none focus:border-[#CA6180] focus:bg-white focus:ring-4 focus:ring-[#CA6180]/10 sm:h-[52px] sm:px-5 sm:text-[14px]"
                />
              </div>

              <div>
                <label className="text-[13px] font-medium text-zinc-800 sm:text-[14px]">
                  Email
                </label>
                <input
                  value={user?.email || ""}
                  disabled
                  className="mt-2 h-[48px] w-full cursor-not-allowed rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-[16px] text-zinc-500 outline-none sm:h-[52px] sm:px-5 sm:text-[14px]"
                />
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
                  className="mt-2 h-[48px] w-full rounded-2xl border border-zinc-200 bg-[#F8F9FA] px-4 text-[16px] text-zinc-900 outline-none focus:border-[#CA6180] focus:bg-white focus:ring-4 focus:ring-[#CA6180]/10 sm:h-[52px] sm:px-5 sm:text-[14px]"
                />
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-zinc-200 bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 sm:px-7 sm:pb-7 sm:pt-7">
            <div className="grid grid-cols-1 gap-3 sm:space-y-3">
              <button
                onClick={onSave}
                className="h-[50px] w-full rounded-2xl bg-[#B9476D] text-[15px] font-semibold text-white hover:bg-[#A93F64] sm:h-[52px]"
              >
                Save Changes
              </button>

              <button
                onClick={onLogout}
                className="h-[50px] w-full rounded-2xl border border-red-100 bg-red-50 text-[14px] font-semibold text-red-600 hover:bg-red-100 sm:h-[52px]"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}