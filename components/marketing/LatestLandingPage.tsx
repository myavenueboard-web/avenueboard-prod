"use client";

import {
  Fragment,
  type CSSProperties,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Building2,
  Check,
  CreditCard,
  Grid2X2,
  MessagesSquare,
  Play,
  Sparkles,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";

const productTabs = [
  {
    label: "Landlord Board",
    title: "Manage every rental from one clean view.",
    description:
      "Track properties, residents, rent status, lease details, notes, and documents without jumping between spreadsheets, folders, and text threads.",
    link: "Explore rental properties",
    href: "#rental-properties",
    stats: ["Rent status", "Lease details", "Resident profile", "Documents"],
  },
  {
    label: "Resident Board",
    title: "Give residents a simple place to stay connected.",
    description:
      "Residents can view rent details, payment history, lease information, shared notes, documents, and important updates from one modern workspace.",
    link: "Explore resident experience",
    href: "#rental-properties",
    stats: ["Amount due", "Payment progress", "Lease status", "Property contact"],
  },
];

const whyItems = [
  {
    icon: Wallet,
    title: "Always free for landlords",
    body: "No recurring software subscription.",
    bullets: ["Unlimited properties", "No monthly platform fee"],
    accentColor: "#0F172A",
    iconClassName: "bg-slate-50 text-slate-800 group-hover:bg-slate-100",
    heightClassName: "min-h-[286px]",
  },
  {
    icon: UsersRound,
    title: "Give residents a professional experience",
    body: "Make every rental feel organized and modern.",
    bullets: ["Receipts & statements", "Documents & updates"],
    accentColor: "#1D4ED8",
    iconClassName: "bg-[#F5F7FF] text-slate-800 group-hover:bg-[#EEF2FF]",
    heightClassName: "min-h-[298px]",
  },
  {
    icon: Building2,
    title: "Built for every portfolio",
    body: "Stay organized without enterprise complexity.",
    bullets: ["One rental or many", "Room to grow"],
    accentColor: "#4338CA",
    iconClassName: "bg-zinc-50 text-zinc-800 group-hover:bg-zinc-100",
    heightClassName: "min-h-[290px]",
  },
  {
    icon: Grid2X2,
    title: "Everything in one place",
    body: "Keep your rental records connected.",
    bullets: ["Documents & leases", "Payments & expenses"],
    accentColor: "#047857",
    iconClassName: "bg-[#F4FBF6] text-zinc-800 group-hover:bg-[#EAF7EE]",
    heightClassName: "min-h-[300px]",
  },
  {
    icon: Bell,
    title: "Automatic payment reminders",
    body: "Help everyone stay ahead of rent.",
    bullets: ["Timely reminders", "Overdue visibility"],
    accentColor: "#A16207",
    iconClassName: "bg-[#FFF9EF] text-zinc-800 group-hover:bg-[#FFF3DA]",
    heightClassName: "min-h-[288px]",
  },
  {
    icon: MessagesSquare,
    title: "Better communication",
    body: "Replace scattered messages with clarity.",
    bullets: ["Shared announcements", "Trusted updates"],
    accentColor: "#6D28D9",
    iconClassName: "bg-[#F8F5FF] text-zinc-800 group-hover:bg-[#F0EAFF]",
    heightClassName: "min-h-[296px]",
  },
  {
    icon: UsersRound,
    title: "Designed for both sides",
    body: "Make renting simpler for everyone involved.",
    bullets: ["Landlord clarity", "Resident transparency"],
    accentColor: "#0F766E",
    iconClassName: "bg-slate-50 text-slate-800 group-hover:bg-slate-100",
    heightClassName: "min-h-[292px]",
  },
  {
    icon: Sparkles,
    title: "Built for what's next",
    body: "A platform that keeps expanding.",
    bullets: ["Credit Building", "Perks, Ava & utilities"],
    accentColor: "#0891B2",
    iconClassName: "bg-stone-50 text-stone-800 group-hover:bg-stone-100",
    heightClassName: "min-h-[304px]",
  },
];

function getWhyOriginalContentInset(viewportWidth: number) {
  const contentMaxWidth = 1600;
  const pagePadding =
    viewportWidth >= 1024 ? 64 : viewportWidth >= 640 ? 40 : 24;
  const stageBreathingRoom =
    viewportWidth >= 1024 ? 72 : viewportWidth >= 640 ? 48 : 24;

  return (
    Math.max((viewportWidth - contentMaxWidth) / 2, 0) +
    pagePadding +
    stageBreathingRoom
  );
}

function IntroGuideBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[1500px] overflow-hidden"
    >
      <style jsx>{`
        @keyframes introGuideLeft {
          0%,
          100% {
            opacity: 0.88;
            transform: translate3d(0, 0, 0);
          }
          50% {
            opacity: 1;
            transform: translate3d(0, -24px, 0);
          }
        }

        @keyframes introGuideRight {
          0%,
          100% {
            opacity: 0.84;
            transform: translate3d(0, 0, 0);
          }
          45% {
            opacity: 1;
            transform: translate3d(0, 32px, 0);
          }
        }

        .intro-guide-left,
        .intro-guide-right {
          transform-box: fill-box;
          transform-origin: center;
        }

        .intro-guide-left {
          animation: introGuideLeft 6.4s ease-in-out infinite;
        }

        .intro-guide-right {
          animation: introGuideRight 7.8s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .intro-guide-left,
          .intro-guide-right {
            animation: none;
          }
        }
      `}</style>
      <svg
        className="absolute left-1/2 top-0 h-full w-[min(1500px,100vw)] -translate-x-1/2"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 1500 1500"
      >
        <defs>
          <linearGradient
            id="introGuideLine"
            x1="0"
            x2="0"
            y1="0"
            y2="1500"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#94A3B8" stopOpacity="0" />
            <stop offset="0.12" stopColor="#94A3B8" stopOpacity="0.48" />
            <stop offset="0.78" stopColor="#94A3B8" stopOpacity="0.28" />
            <stop offset="1" stopColor="#94A3B8" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="introGuideSoftLine"
            x1="0"
            x2="0"
            y1="0"
            y2="1500"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#CBD5E1" stopOpacity="0" />
            <stop offset="0.16" stopColor="#CBD5E1" stopOpacity="0.38" />
            <stop offset="0.72" stopColor="#CBD5E1" stopOpacity="0.22" />
            <stop offset="1" stopColor="#CBD5E1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g
          className="intro-guide-left"
          strokeLinecap="round"
          strokeWidth="1"
        >
          <path d="M90 0V1480" stroke="url(#introGuideLine)" />
          <path d="M178 112V1360" stroke="url(#introGuideSoftLine)" />
          <path d="M286 0V1220" stroke="url(#introGuideLine)" opacity="0.82" />
          <path d="M414 82V1080" stroke="url(#introGuideSoftLine)" />
          <path d="M0 360H430" stroke="#B6C2D0" opacity="0.24" />
          <path d="M0 920H390" stroke="#CBD5E1" opacity="0.2" />
        </g>
        <g
          className="intro-guide-right"
          strokeLinecap="round"
          strokeWidth="1"
        >
          <path d="M1086 82V1080" stroke="url(#introGuideSoftLine)" />
          <path d="M1214 0V1220" stroke="url(#introGuideLine)" opacity="0.82" />
          <path d="M1322 112V1360" stroke="url(#introGuideSoftLine)" />
          <path d="M1410 0V1480" stroke="url(#introGuideLine)" />
          <path d="M1070 460H1500" stroke="#B6C2D0" opacity="0.22" />
          <path d="M1110 980H1500" stroke="#CBD5E1" opacity="0.19" />
        </g>
      </svg>
    </div>
  );
}

type HeroSectionProps = {
  heroRef: RefObject<HTMLElement | null>;
  onOpenVideo: () => void;
};

function HeroSection({ heroRef, onOpenVideo }: HeroSectionProps) {
  return (
    <section
      ref={heroRef}
      className="mx-auto max-w-[1600px] px-6 sm:px-10 lg:px-16"
    >
      <div className="pt-32 text-center lg:pt-40">
        <div className="mx-auto max-w-[880px]">
          <p className="mb-8 text-[20px] font-medium tracking-[-0.01em] text-[#4B4E5A] sm:text-[22px]">
            Rent, simplified.
          </p>

          <h1 className="text-[54px] font-medium leading-[0.98] tracking-[-0.055em] text-black sm:text-[72px]">
            Manage rentals.
            <br />
            Without the chaos.
          </h1>

          <p className="mx-auto mt-9 max-w-[700px] text-[18px] leading-[1.65] text-[#555966] sm:text-[20px]">
            Collect rent, manage residents, track lease details, store
            documents, and stay organized from one clean Board.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
            <button
              type="button"
              onClick={onOpenVideo}
              className="inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-8 py-4 text-[16px] font-semibold text-white transition-all hover:bg-[#1D4ED8]"
            >
              <Play size={16} fill="currentColor" />
              See How It Works
            </button>

            <Link
              href="/signup"
              className="inline-flex items-center gap-2 text-[17px] font-semibold text-[#2563EB] transition-colors hover:text-[#1D4ED8]"
            >
              Get Started Free
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className="trust-gradient-text mx-auto mt-10 flex max-w-[980px] flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[16px] font-semibold sm:gap-x-7 sm:text-[18px]">
            <span className="whitespace-nowrap">No monthly subscription</span>
            <span className="hidden sm:block">•</span>
            <span className="whitespace-nowrap">
              Always free for landlords and managers
            </span>
            <span className="hidden sm:block">•</span>
            <span className="whitespace-nowrap">Designed for residents</span>
          </div>
        </div>
      </div>
    </section>
  );
}

type FloatingVideoTriggerProps = {
  visible: boolean;
  onOpenVideo: () => void;
};

function FloatingVideoTrigger({
  visible,
  onOpenVideo,
}: FloatingVideoTriggerProps) {
  return (
    <button
      type="button"
      aria-label="See how AvenueBoard works"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={onOpenVideo}
      className={`fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-4 z-[80] inline-flex h-11 items-center gap-2 rounded-full border border-[rgba(15,23,42,0.08)] bg-white/95 px-4 text-[13px] font-semibold tracking-[-0.01em] text-zinc-950 shadow-[0_8px_24px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.05)] backdrop-blur-md transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[rgba(15,23,42,0.14)] hover:text-black hover:shadow-[0_12px_30px_rgba(15,23,42,0.11),0_3px_10px_rgba(15,23,42,0.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:right-7 sm:h-12 sm:px-5 sm:text-[14px] ${
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <span
        aria-hidden="true"
        className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 shadow-[0_2px_8px_rgba(15,23,42,0.06)]"
      >
        <Play size={12} fill="currentColor" />
      </span>
      See How It Works
    </button>
  );
}

type WalkthroughVideoModalProps = {
  open: boolean;
  onClose: () => void;
};

function WalkthroughVideoModal({ open, onClose }: WalkthroughVideoModalProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/35 px-4 py-8 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="walkthrough-video-title"
        className="relative w-full max-w-[880px] overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.24)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close video"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
        >
          <X size={18} />
        </button>

        <div className="p-4 sm:p-5">
          <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-[22px] border border-zinc-200 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_36%),#0F172A] text-white">
            <div className="text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-zinc-950 shadow-[0_16px_42px_rgba(0,0,0,0.22)]">
                <Play size={24} fill="currentColor" />
              </span>
              <h2
                id="walkthrough-video-title"
                className="mt-6 text-[26px] font-semibold tracking-[-0.035em] sm:text-[34px]"
              >
                See how AvenueBoard works
              </h2>
              <p className="mx-auto mt-3 max-w-[520px] text-[15px] leading-6 text-white/72 sm:text-[16px]">
                A short walkthrough of the AvenueBoard rental workspace.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlatformSection() {
  const [activeTab, setActiveTab] = useState(0);
  const selectorRef = useRef<HTMLDivElement>(null);
  const selectorLabelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [underlineStyle, setUnderlineStyle] = useState({
    left: 0,
    width: 0,
  });

  useEffect(() => {
    const updateUnderline = () => {
      const selector = selectorRef.current;
      const label = selectorLabelRefs.current[activeTab];

      if (!selector || !label) return;

      const selectorRect = selector.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();
      const underlineWidth = labelRect.width + 20;

      setUnderlineStyle({
        left: labelRect.left - selectorRect.left - 10,
        width: underlineWidth,
      });
    };

    const frame = window.requestAnimationFrame(updateUnderline);
    window.addEventListener("resize", updateUnderline);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateUnderline);
    };
  }, [activeTab]);

  return (
    <section
      id="rental-properties"
      className="mx-auto mt-32 max-w-[1600px] px-6 sm:px-10 lg:px-16"
    >
      <div className="mx-auto max-w-[1500px] text-center">
        <p className="text-[17px] font-medium text-[#555966]">
          One connected platform
        </p>

        <h2 className="mx-auto mt-6 text-[42px] font-medium leading-[1.08] tracking-[-0.045em] text-black sm:text-[56px] lg:whitespace-nowrap">
          A rental workspace for both sides of the lease.
        </h2>
      </div>

      <div className="relative left-1/2 mt-12 ml-[-50vw] min-h-[660px] w-screen overflow-hidden bg-[#EEF1F5] lg:min-h-[740px] xl:min-h-[800px]">
        <div className="absolute inset-x-0 top-[-1px] mx-auto h-[54px] w-[min(560px,calc(100%-48px))]">
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="none"
            viewBox="0 0 560 54"
          >
            <path
              d="M0 0H560C536 0 522 8 508 25C494 43 474 54 446 54H114C86 54 66 43 52 25C38 8 24 0 0 0Z"
              fill="rgba(255,255,255,0.95)"
            />
          </svg>
          <div className="relative mx-auto flex max-w-[480px] justify-center overflow-x-auto px-4">
            <div
              ref={selectorRef}
              className="relative grid h-14 min-w-[360px] max-w-[430px] flex-1 grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] items-center"
              role="tablist"
              aria-label="Board preview selector"
            >
              <div
                aria-hidden="true"
                className="absolute bottom-1 h-0.5 rounded-full bg-zinc-950 transition-[left,width] duration-300 ease-[cubic-bezier(0.2,0.9,0.2,1)] motion-reduce:transition-none"
                style={{
                  left: underlineStyle.left,
                  width: underlineStyle.width,
                  opacity: underlineStyle.width > 0 ? 1 : 0,
                }}
              />

              {productTabs.map((tab, index) => {
                const isActive = activeTab === index;

                return (
                  <Fragment key={tab.label}>
                    <button
                      onClick={() => setActiveTab(index)}
                      role="tab"
                      aria-selected={isActive}
                      className={`relative z-10 inline-flex h-full items-center justify-center whitespace-nowrap px-9 text-[15px] tracking-[-0.01em] transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 ${
                        isActive
                          ? "font-semibold text-zinc-950"
                          : "font-medium text-[#676B76] hover:text-zinc-950"
                    }`}
                  >
                      <span
                        ref={(node) => {
                          selectorLabelRefs.current[index] = node;
                        }}
                      >
                        {tab.label}
                      </span>
                    </button>
                    {index === 0 ? (
                      <span
                        aria-hidden="true"
                        className="h-5 w-px bg-zinc-200"
                      />
                    ) : null}
                  </Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-8 max-w-[1120px] text-center text-[18px] leading-[1.65] text-[#555966] lg:whitespace-nowrap">
        AvenueBoard brings properties, residents, payments, documents, and
        support into one calm product experience.
      </p>
    </section>
  );
}

function RewardsSplitModule() {
  const benefits = [
    {
      icon: Sparkles,
      title: "Member benefits",
      description: "Access eligible offers from participating partners.",
    },
    {
      icon: Check,
      title: "Everyday value",
      description:
        "Explore benefits across shopping, dining, travel, and more.",
    },
    {
      icon: Grid2X2,
      title: "Built into AvenueBoard",
      description:
        "Keep rental tools and member benefits connected in one place.",
    },
  ];

  return (
    <section className="mx-auto mt-20 max-w-[1600px] px-6 sm:px-10 lg:px-16">
      <div className="grid min-h-[760px] overflow-hidden rounded-[26px] border border-zinc-200/50 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.035)] lg:min-h-[calc(100vh-120px)] lg:grid-cols-2">
        <div className="flex items-center bg-[#EEF1F5] px-8 py-12 sm:px-10 lg:px-16 lg:py-16">
          <div className="max-w-[500px]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-blue-700">
              Avenue Perks
            </p>
            <h2 className="mt-4 text-[34px] font-medium leading-[1.08] tracking-[-0.045em] text-black sm:text-[44px]">
              More value beyond rent.
            </h2>

            <p className="mt-5 text-[16px] leading-[1.6] text-[#555966]">
              Discover member benefits and partner offers designed to make
              everyday spending more rewarding.
            </p>

            <div className="mt-8 grid gap-5">
              {benefits.map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex gap-3.5">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-950 shadow-sm">
                    <Icon size={16} strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-semibold tracking-[-0.025em] text-zinc-950">
                      {title}
                    </h3>
                    <p className="mt-1 text-[14px] leading-6 text-[#667085]">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Link
                href="/avenue-perks"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-[14px] font-semibold text-white shadow-[0_14px_32px_rgba(15,23,42,0.14)] transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              >
                Explore Avenue Perks
                <ArrowRight size={16} />
              </Link>
              <p className="mt-4 text-[14px] font-medium leading-6 text-[#6A6E7A]">
                Available to eligible AvenueBoard members.
              </p>
            </div>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="min-h-[360px] bg-[#E7F4E8] lg:min-h-[calc(100vh-120px)]"
        />
      </div>
    </section>
  );
}

function CreditBuildingSection() {
  const benefits = [
    {
      icon: CreditCard,
      title: "Simple setup",
      description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    },
    {
      icon: Check,
      title: "Resident focused",
      description: "Sed do eiusmod tempor incididunt ut labore et dolore.",
    },
    {
      icon: Sparkles,
      title: "Clear and transparent",
      description: "Ut enim ad minim veniam, quis nostrud exercitation.",
    },
  ];

  return (
    <section
      id="credit-building"
      className="mx-auto mt-20 max-w-[1600px] px-6 sm:px-10 lg:px-16"
    >
      <div className="grid min-h-[760px] overflow-hidden rounded-[26px] border border-zinc-200/50 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.035)] lg:min-h-[calc(100vh-120px)] lg:grid-cols-2">
        <div
          aria-hidden="true"
          className="min-h-[360px] bg-[#E7F4E8] lg:min-h-[calc(100vh-120px)]"
        />

        <div className="flex items-center bg-[#EEF1F5] px-8 py-12 sm:px-10 lg:px-16 lg:py-16">
          <div className="max-w-[500px]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-blue-700">
              Coming Soon
            </p>
            <h2 className="mt-4 text-[34px] font-medium leading-[1.08] tracking-[-0.045em] text-black sm:text-[44px]">
              Build credit through rent.
            </h2>

            <p className="mt-5 text-[16px] leading-[1.6] text-[#555966]">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>

            <div className="mt-8 grid gap-5">
              {benefits.map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex gap-3.5">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-950 shadow-sm">
                    <Icon size={16} strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-semibold tracking-[-0.025em] text-zinc-950">
                      {title}
                    </h3>
                    <p className="mt-1 text-[14px] leading-6 text-[#667085]">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Link
                href="/credit-building"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-[14px] font-semibold text-white shadow-[0_14px_32px_rgba(15,23,42,0.14)] transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              >
                Learn More
                <ArrowRight size={16} />
              </Link>
              <p className="mt-4 text-[14px] font-medium leading-6 text-[#6A6E7A]">
                Coming soon.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhyAvenueBoardSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1180px)");
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    let animationFrame = 0;
    let needsMeasurement = true;
    let metrics: {
      cardCenters: number[];
      curveDepth: number;
      finalTrackX: number;
      horizontalTravel: number;
      initialTrackInset: number;
      pauseDistance: number;
      stickyTop: number;
      viewportCenter: number;
    } | null = null;

    function measureWhySection() {
      const section = sectionRef.current;
      const sticky = stickyRef.current;
      const viewport = viewportRef.current;
      const track = trackRef.current;
      if (!section || !sticky || !viewport || !track) return null;

      const headerHeight =
        document.querySelector("header")?.getBoundingClientRect().height ?? 80;
      const stickyTop = Math.round(headerHeight + 96);
      const horizontalTravel = Math.max(
        0,
        track.scrollWidth - viewport.clientWidth
      );
      const cards = Array.from(track.children) as HTMLElement[];
      const cardCenters = cards.map(
        (card) => card.offsetLeft + card.offsetWidth / 2
      );
      const viewportCenter = viewport.clientWidth / 2;
      const initialTrackInset = getWhyOriginalContentInset(
        viewport.clientWidth
      );
      const finalTrackX =
        viewport.clientWidth - initialTrackInset - track.scrollWidth;
      const curveDepth = Math.max(28, Math.min(56, viewport.clientWidth * 0.035));
      const pauseDistance = horizontalTravel * 0.15;
      const stickyViewportHeight = sticky.offsetHeight;

      section.style.setProperty("--why-sticky-top", `${stickyTop}px`);

      if (!desktopQuery.matches || reducedMotionQuery.matches) {
        section.style.height = "";
        track.style.transform = "translate3d(0, 0, 0)";
        cards.forEach((card) => {
          card.style.transform = "";
        });
        return null;
      }

      section.style.height = `${
        stickyViewportHeight + pauseDistance + horizontalTravel + 8
      }px`;

      return {
        cardCenters,
        curveDepth,
        finalTrackX,
        horizontalTravel,
        initialTrackInset,
        pauseDistance,
        stickyTop,
        viewportCenter,
      };
    }

    function updateTrackPosition() {
      animationFrame = 0;

      const section = sectionRef.current;
      const track = trackRef.current;
      if (!section || !track) return;

      if (needsMeasurement) {
        metrics = measureWhySection();
        needsMeasurement = false;
      }

      const measurement = metrics;
      if (!measurement) return;

      const sectionRect = section.getBoundingClientRect();
      const scrollWithinSection = measurement.stickyTop - sectionRect.top;
      const progress = Math.min(
        1,
        Math.max(
          0,
          (scrollWithinSection - measurement.pauseDistance) /
            Math.max(1, measurement.horizontalTravel)
        )
      );

      const trackX =
        measurement.initialTrackInset -
        (measurement.initialTrackInset - measurement.finalTrackX) * progress;

      track.style.transform = `translate3d(${trackX}px, 0, 0)`;
      Array.from(track.children).forEach((child, index) => {
        const card = child as HTMLElement;
        const cardCenter = measurement.cardCenters[index] + trackX;
        const distanceFromCenter = Math.abs(
          (cardCenter - measurement.viewportCenter) / measurement.viewportCenter
        );
        const curveOffset =
          measurement.curveDepth *
          Math.min(1, distanceFromCenter * distanceFromCenter);

        card.style.transform = `translate3d(0, ${curveOffset}px, 0)`;
      });
    }

    function requestTrackUpdate() {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateTrackPosition);
    }

    function requestMeasuredTrackUpdate() {
      needsMeasurement = true;
      requestTrackUpdate();
    }

    const resizeObserver = new ResizeObserver(requestMeasuredTrackUpdate);
    if (stickyRef.current) resizeObserver.observe(stickyRef.current);
    if (viewportRef.current) resizeObserver.observe(viewportRef.current);
    if (trackRef.current) resizeObserver.observe(trackRef.current);

    requestTrackUpdate();
    window.addEventListener("scroll", requestTrackUpdate, { passive: true });
    window.addEventListener("resize", requestMeasuredTrackUpdate);
    desktopQuery.addEventListener("change", requestMeasuredTrackUpdate);
    reducedMotionQuery.addEventListener("change", requestMeasuredTrackUpdate);

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener("scroll", requestTrackUpdate);
      window.removeEventListener("resize", requestMeasuredTrackUpdate);
      desktopQuery.removeEventListener("change", requestMeasuredTrackUpdate);
      reducedMotionQuery.removeEventListener("change", requestMeasuredTrackUpdate);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="why"
      className="mx-auto mt-32 max-w-[1600px] px-6 sm:px-10 lg:px-16"
    >
      <style jsx global>{`
        @keyframes whyCardIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div
        ref={stickyRef}
        className="lg:sticky lg:top-[var(--why-sticky-top,104px)]"
      >
        <div className="mx-auto max-w-[860px] text-center">
          <p className="text-[17px] font-medium text-[#555966]">
            Why AvenueBoard
          </p>
          <h2 className="mt-6 text-[42px] font-medium leading-[1.08] tracking-[-0.045em] text-black sm:text-[56px]">
            Built for everyone managing rentals — not just enterprise teams.
          </h2>
        </div>

        <div
          ref={viewportRef}
          role="list"
          tabIndex={0}
          aria-label="AvenueBoard value propositions"
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              viewportRef.current?.scrollBy({ left: -280, behavior: "smooth" });
            }

            if (event.key === "ArrowRight") {
              event.preventDefault();
              viewportRef.current?.scrollBy({ left: 280, behavior: "smooth" });
            }
          }}
          className="mt-16 overflow-x-auto scroll-smooth pb-3 pt-2 outline-none [-ms-overflow-style:none] [scrollbar-width:none] lg:relative lg:left-1/2 lg:ml-[-50vw] lg:w-screen lg:max-w-[100vw] lg:overflow-x-hidden lg:overflow-y-visible lg:pb-0 motion-reduce:overflow-x-auto [&::-webkit-scrollbar]:hidden"
        >
          <div
            ref={trackRef}
            className="flex w-max snap-x gap-4 transition-none will-change-transform motion-reduce:transform-none"
          >
            {whyItems.map(
              (
                {
                  icon: Icon,
                  title,
                  body,
                  bullets,
                  accentColor,
                },
                index
              ) => (
              <div
                key={title}
                role="listitem"
                className="group relative flex min-h-[320px] w-[82vw] snap-start flex-col overflow-hidden rounded-[28px] border border-zinc-200 bg-white p-8 shadow-[0_10px_30px_rgba(15,23,42,0.026)] transition-all duration-200 motion-safe:animate-[whyCardIn_420ms_ease-out_both] hover:border-zinc-300 hover:shadow-[0_16px_36px_rgba(15,23,42,0.05)] sm:w-[340px] lg:w-[calc((100vw_-_128px_-_32px)_/_3)] lg:hover:-translate-y-1 xl:w-[calc((min(100vw,1600px)_-_128px_-_48px)_/_4)]"
                style={
                  {
                    "--card-accent": accentColor,
                    animationDelay: `${index * 60}ms`,
                  } as CSSProperties
                }
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-[3px] bg-[var(--card-accent)] opacity-70"
                />
                <Icon
                  size={26}
                  strokeWidth={1.75}
                  className="text-zinc-950"
                  aria-hidden="true"
                />
                <h3
                  className="mt-9 text-[22px] font-semibold leading-tight tracking-[-0.035em] text-[var(--card-accent)]"
                >
                  {title}
                </h3>
                <p className="mt-4 text-[16px] font-medium leading-7 text-[#505764]">
                  {body}
                </p>
                <ul className="mt-6 grid gap-2.5 text-[14px] font-medium leading-5 text-[#747B88]">
                  {bullets.map((bullet) => (
                    <li key={bullet} className="flex items-center gap-2">
                      <Check
                        size={14}
                        strokeWidth={2}
                        className="shrink-0 text-zinc-500"
                        aria-hidden="true"
                      />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function NewsletterSection() {
  return (
    <section className="mx-auto mt-32 max-w-[1600px] px-6 sm:px-10 lg:px-16">
      <div className="grid w-full gap-6 py-6 lg:grid-cols-[420px_minmax(0,1fr)] lg:items-start lg:gap-20">
        <h2 className="max-w-[420px] text-[34px] font-semibold leading-[1.05] tracking-[-0.045em] text-zinc-950 sm:text-[42px]">
          Stay in the loop.
          <br />
          Get updates first.
        </h2>

        <div className="w-full lg:pr-8">
          <form className="flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              placeholder="Email address"
              className="h-[54px] flex-1 rounded-[18px] border border-zinc-300 bg-white px-5 text-[15px] font-medium text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-4 focus:ring-zinc-100"
            />
            <button
              type="submit"
              className="h-[54px] rounded-[18px] bg-[#0F172A] px-7 text-[15px] font-semibold text-white transition hover:bg-[#1E293B] sm:min-w-[146px]"
            >
              Join Updates
            </button>
          </form>

          <p className="mt-4 text-[13px] leading-6 text-[#6B6F7B]">
            By signing up, you agree to receive product updates, feature
            announcements, Avenue Perks updates, and occasional marketing
            messages from AvenueBoard. You can unsubscribe at any time.
          </p>

          <p className="mt-2 text-[13px] leading-6 text-[#6B6F7B]">
            Your subscription is subject to the{" "}
            <Link
              href="/terms"
              className="font-medium text-zinc-800 underline decoration-zinc-300 underline-offset-4 transition hover:text-black"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="font-medium text-zinc-800 underline decoration-zinc-300 underline-offset-4 transition hover:text-black"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}

export default function LatestLandingPage() {
  const heroRef = useRef<HTMLElement | null>(null);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [showFloatingVideoTrigger, setShowFloatingVideoTrigger] =
    useState(false);

  useEffect(() => {
    let animationFrame = 0;

    function updateFloatingVideoTrigger() {
      animationFrame = 0;

      const hero = heroRef.current;
      if (!hero) return;

      const heroBottom = hero.getBoundingClientRect().bottom;
      const footerTop =
        document.querySelector("footer")?.getBoundingClientRect().top ??
        Number.POSITIVE_INFINITY;
      const footerIsNear = footerTop < window.innerHeight + 96;

      setShowFloatingVideoTrigger(heroBottom < 0 && !footerIsNear);
    }

    function requestFloatingVideoTriggerUpdate() {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateFloatingVideoTrigger);
    }

    requestFloatingVideoTriggerUpdate();
    window.addEventListener("scroll", requestFloatingVideoTriggerUpdate, {
      passive: true,
    });
    window.addEventListener("resize", requestFloatingVideoTriggerUpdate);

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", requestFloatingVideoTriggerUpdate);
      window.removeEventListener("resize", requestFloatingVideoTriggerUpdate);
    };
  }, []);

  function openVideo() {
    setIsVideoOpen(true);
  }

  function closeVideo() {
    setIsVideoOpen(false);
  }

  return (
    <MarketingShell>
      <div className="relative overflow-hidden">
        <IntroGuideBackground />
        <div className="relative z-10">
          <HeroSection heroRef={heroRef} onOpenVideo={openVideo} />
          <PlatformSection />
        </div>
      </div>
      <RewardsSplitModule />
      <CreditBuildingSection />
      <WhyAvenueBoardSection />
      <NewsletterSection />
      <FloatingVideoTrigger
        visible={showFloatingVideoTrigger && !isVideoOpen}
        onOpenVideo={openVideo}
      />
      <WalkthroughVideoModal open={isVideoOpen} onClose={closeVideo} />
    </MarketingShell>
  );
}
