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

      <aside className="fixed right-0 top-0 z-50 h-screen w-[420px] max-w-[92vw] bg-white px-7 py-7 shadow-[0_24px_90px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[24px] font-semibold tracking-[-0.04em] text-[#0F172A]">
              Profile Settings
            </h2>
            <p className="mt-1 text-[13px] text-zinc-500">
              Manage your AvenueBoard account details.
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
          >
            ×
          </button>
        </div>

        <div className="mt-8 flex items-center gap-5">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#0F172A] text-[26px] font-semibold text-white">
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

        <div className="mt-8 space-y-5">
          <div>
            <label className="text-[14px] font-medium text-zinc-800">
              Display Name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="mt-2 h-[52px] w-full rounded-2xl border border-zinc-200 bg-[#F8F9FA] px-5 text-[14px] text-zinc-900 outline-none focus:border-[#CA6180] focus:bg-white focus:ring-4 focus:ring-[#CA6180]/10"
            />
          </div>

          <div>
            <label className="text-[14px] font-medium text-zinc-800">
              Email
            </label>
            <input
              value={user?.email || ""}
              disabled
              className="mt-2 h-[52px] w-full cursor-not-allowed rounded-2xl border border-zinc-200 bg-zinc-50 px-5 text-[14px] text-zinc-500 outline-none"
            />
          </div>

          <div>
            <label className="text-[14px] font-medium text-zinc-800">
              Phone Number{" "}
              <span className="text-[12px] text-zinc-400">(Optional)</span>
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(415) 555-0000"
              className="mt-2 h-[52px] w-full rounded-2xl border border-zinc-200 bg-[#F8F9FA] px-5 text-[14px] text-zinc-900 outline-none focus:border-[#CA6180] focus:bg-white focus:ring-4 focus:ring-[#CA6180]/10"
            />
          </div>
        </div>

        <div className="absolute bottom-7 left-7 right-7 space-y-3">
          <button
            onClick={onSave}
            className="h-[52px] w-full rounded-2xl bg-[#B9476D] text-[15px] font-semibold text-white hover:bg-[#A93F64]"
          >
            Save Changes
          </button>

          <button
            onClick={onLogout}
            className="h-[52px] w-full rounded-2xl border border-red-100 bg-red-50 text-[14px] font-semibold text-red-600 hover:bg-red-100"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}