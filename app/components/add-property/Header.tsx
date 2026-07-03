import { useEffect, useRef } from "react";

type UserProfile = {
  name: string;
  email: string;
};

type HeaderProps = {
  user: UserProfile | null;
  menuOpen: boolean;
  setMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleBack: () => void;
  handleLogout: () => void;
  openProfileSettings: () => void;
};

export default function Header({
  user,
  menuOpen,
  setMenuOpen,
  handleBack,
  handleLogout,
  openProfileSettings,
}: HeaderProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [setMenuOpen]);

  return (
    <header className="flex items-center justify-between">
      <button
        onClick={handleBack}
        className="text-[15px] text-zinc-500 hover:text-zinc-900"
      >
        ‹ Back
      </button>

      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-3 rounded-2xl px-2 py-1 transition hover:bg-zinc-50"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0F172A] text-[15px] font-semibold text-white">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div className="hidden text-left lg:block">
            <p className="text-[15px] font-semibold">{user?.name}</p>
            <p className="max-w-[170px] truncate text-[13.5px] text-zinc-400">
              {user?.email}
            </p>
          </div>

          <span className="text-zinc-400">⌄</span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-14 z-50 w-[230px] rounded-2xl border border-zinc-200 bg-white p-2 shadow-[0_18px_60px_rgba(15,23,42,0.12)]">
            <div className="px-3 py-3">
              <p className="text-[14.5px] font-semibold text-zinc-900">
                {user?.name}
              </p>
              <p className="mt-1 truncate text-[13.5px] text-zinc-400">
                {user?.email}
              </p>
            </div>

            <div className="h-px bg-zinc-100" />

            <button
              onClick={() => {
                setMenuOpen(false);
                openProfileSettings();
              }}
              className="mt-2 w-full rounded-xl px-3 py-3 text-left text-[14.5px] font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Profile Settings
            </button>

            <button
              onClick={handleLogout}
              className="w-full rounded-xl px-3 py-3 text-left text-[14.5px] font-medium text-red-600 hover:bg-red-50"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
