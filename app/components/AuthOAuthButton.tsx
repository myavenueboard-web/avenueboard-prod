"use client";

type AuthOAuthButtonProps = {
  provider: "google" | "apple";
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export default function AuthOAuthButton({
  provider,
  label,
  loading = false,
  disabled = false,
  onClick,
}: AuthOAuthButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="flex h-[50px] w-full items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 text-[14px] font-semibold text-zinc-700 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {provider === "google" ? <GoogleIcon /> : <AppleIcon />}
      {loading ? "Redirecting..." : label}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
    >
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.4a4.6 4.6 0 0 1-2 3v2.4h3.2c1.9-1.7 3-4.2 3-7.1Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-0.9 6.6-2.6l-3.2-2.4c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.5A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 13.9a6 6 0 0 1 0-3.8V7.6H3.1a10 10 0 0 0 0 8.8l3.3-2.5Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.5 9.5 0 0 0 12 2a10 10 0 0 0-8.9 5.6l3.3 2.5c.8-2.4 3-4.2 5.6-4.2Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 fill-zinc-950"
    >
      <path d="M16.8 12.7c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8-.7 0-1.8-.8-2.9-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.8-.4 7 1.2 9.2.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.7 0 0-2.9-1.1-3-3.6ZM14.6 6.1c.6-.8 1.1-1.8.9-2.9-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.8-.9 2.8 1 .1 2-.5 2.6-1.3Z" />
    </svg>
  );
}
