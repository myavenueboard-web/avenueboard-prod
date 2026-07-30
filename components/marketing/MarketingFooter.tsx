"use client";

import Link from "next/link";
import { CookieConsentManager } from "@/components/cookie-consent/CookieConsent";
import { footerColumns } from "@/components/public-pages/publicPageNavigation";

const socialLinks = [
  {
    label: "Facebook",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
        <path
          fill="currentColor"
          d="M14.2 8.6V6.9c0-.8.2-1.3 1.4-1.3h1.7V2.7c-.8-.1-1.6-.2-2.4-.2-2.4 0-4.1 1.5-4.1 4.2v1.9H8.1v3.2h2.7v8.1h3.4v-8.1H17l.4-3.2h-3.2Z"
        />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
        <path
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.9"
          d="M7.8 3.5h8.4a4.3 4.3 0 0 1 4.3 4.3v8.4a4.3 4.3 0 0 1-4.3 4.3H7.8a4.3 4.3 0 0 1-4.3-4.3V7.8a4.3 4.3 0 0 1 4.3-4.3Z"
        />
        <path
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.9"
          d="M15.6 11.5a3.6 3.6 0 1 1-7.2 1 3.6 3.6 0 0 1 7.2-1ZM17.5 6.9h.01"
        />
      </svg>
    ),
  },
  {
    label: "X",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
        <path
          fill="currentColor"
          d="M13.9 10.5 21.1 2h-1.7l-6.2 7.3L8.2 2H2.5l7.6 11.1L2.5 22h1.7l6.7-7.8 5.3 7.8H22l-8.1-11.5Zm-2.4 2.8-.8-1.1L4.6 3.3h2.8l4.9 7.1.8 1.1 6.4 9.3h-2.8l-5.2-7.5Z"
        />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
        <path
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.9"
          d="M21 8.4a3 3 0 0 0-2.1-2.1C17 5.8 12 5.8 12 5.8s-5 0-6.9.5A3 3 0 0 0 3 8.4 31 31 0 0 0 2.5 12a31 31 0 0 0 .5 3.6 3 3 0 0 0 2.1 2.1c1.9.5 6.9.5 6.9.5s5 0 6.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-3.6 31 31 0 0 0-.5-3.6Z"
        />
        <path fill="currentColor" d="m10.4 9.2 4.4 2.8-4.4 2.8V9.2Z" />
      </svg>
    ),
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto max-w-[1600px] px-6 py-28 sm:px-10 lg:px-16 xl:py-32">
        <div className="grid gap-20 lg:translate-x-4 lg:grid-cols-[320px_minmax(48px,1fr)_minmax(520px,760px)] lg:gap-0 xl:translate-x-6">
          <div className="flex min-h-[520px] flex-col items-start">
            <img
              src="/logo.png"
              alt="AvenueBoard"
              className="-ml-2 h-14 w-auto object-contain"
            />

            <p className="mt-5 max-w-[260px] text-[14.5px] font-normal leading-6 text-[#7A7E89]">
              Modern rental platform for landlords, managers and residents.
            </p>

            <div className="-ml-1.5 mt-8 flex items-center gap-6 text-zinc-900">
              {socialLinks.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="inline-flex h-7 w-7 items-center justify-center transition-opacity hover:opacity-60"
                >
                  {social.icon}
                </Link>
              ))}
            </div>

            <div className="mt-12">
              <p className="text-[15px] font-semibold tracking-[-0.01em] text-zinc-950">
                Download our app
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="#"
                  className="inline-flex h-[58px] w-[192px] items-center gap-3 rounded-lg bg-black px-4 text-white transition hover:bg-[#111] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-label="Download on the App Store"
                >
                  <svg
                    viewBox="0 0 22.773 22.773"
                    aria-hidden="true"
                    className="h-8 w-8 shrink-0 fill-current"
                  >
                    <path d="M15.769 0h.162c.13 1.606-.483 2.806-1.228 3.675-.731.863-1.732 1.7-3.351 1.573-.108-1.583.506-2.694 1.25-3.561C13.292.879 14.557.16 15.769 0zm4.901 16.716v.045c-.455 1.378-1.104 2.559-1.896 3.655-.723.995-1.609 2.334-3.191 2.334-1.367 0-2.275-.879-3.676-.903-1.482-.024-2.297.735-3.652.926h-.462c-.995-.144-1.798-.932-2.383-1.642-1.725-2.098-3.058-4.808-3.306-8.276v-1.019c.105-2.482 1.311-4.5 2.914-5.478.846-.52 2.009-.963 3.304-.765.555.086 1.122.276 1.619.464.471.181 1.06.502 1.618.485.378-.011.754-.208 1.135-.347 1.116-.403 2.21-.865 3.652-.648 1.733.262 2.963 1.032 3.723 2.22-1.466.933-2.625 2.339-2.427 4.74.176 2.181 1.444 3.457 3.028 4.209z" />
                  </svg>
                  <span className="text-left">
                    <span className="block text-[11px] font-medium leading-none text-white">
                      Download on the
                    </span>
                    <span className="mt-0.5 block text-[18px] font-semibold leading-none tracking-[-0.02em]">
                      App Store
                    </span>
                  </span>
                </Link>

                <Link
                  href="#"
                  className="inline-flex h-[58px] w-[192px] items-center gap-3 rounded-lg bg-black px-4 text-white transition hover:bg-[#111] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-label="Get it on Google Play"
                >
                  <svg
                    viewBox="0 0 64 64"
                    aria-hidden="true"
                    className="h-8 w-8 shrink-0"
                  >
                    <path fill="#57cef3" d="M7 3v58l33-29z" />
                    <path fill="#fff200" d="m36 32 8-10 15 10-15 10z" />
                    <path fill="#48ff48" d="M36 32 7 3h4l34 20z" />
                    <path fill="#ff6c58" d="M36 32 7 61h4l34-20z" />
                    <path
                      fill="#f33"
                      d="M9.1 64c-1.9 0-3.6-1-4.5-2.6L8 58.2v.7c0 .3.1.6.3.8L24 44c7.4 0 14.1-1.2 18.3-3.1l5.8-3.4v4.6L11.7 63.3c-.7.5-1.6.7-2.6.7z"
                    />
                    <path
                      fill="#0779e4"
                      d="M9.1 4C8.5 4 8 4.5 8 5.1V36c0 4.4 7.2 8 16 8L5.5 62.5c-.9-.9-1.5-2.2-1.5-3.6V5.1C4 2.3 6.3 0 9.1 0z"
                    />
                    <path
                      fill="#314a52"
                      d="M8.3 4.3c.2-.2.5-.3.8-.3.2 0 .4.1.6.2l45.5 26.6c.5.2.8.7.8 1.2s-.3 1-.7 1.3l-11.4 6.6 2.9 2.9 10.4-6.1c1.7-1 2.7-2.8 2.7-4.7s-1-3.8-2.7-4.7L11.7.7C11 .2 10.1 0 9.1 0 7.7 0 6.4.6 5.5 1.5z"
                    />
                  </svg>
                  <span className="text-left">
                    <span className="block text-[11px] font-medium leading-none text-white">
                      Get it on
                    </span>
                    <span className="mt-0.5 block text-[18px] font-semibold leading-none tracking-[-0.02em]">
                      Google Play
                    </span>
                  </span>
                </Link>
              </div>
            </div>

            <p className="mt-auto pt-16 text-[14px] leading-6 text-[#7A7E89]">
              © 2026 AvenueBoard. All rights reserved.
            </p>
          </div>

          <div className="grid w-full max-w-[760px] gap-x-16 gap-y-12 sm:grid-cols-2 lg:col-start-3 lg:grid-rows-[auto_auto] lg:gap-y-16 lg:justify-self-end xl:gap-x-20">
            {footerColumns.map((column) => (
              <div key={column.label}>
                <h3 className="text-[14px] font-semibold tracking-[-0.015em] text-zinc-800">
                  {column.label}
                </h3>

                <div className="mt-5 grid gap-3.5 text-[16px] leading-5 text-[#4B5563]">
                  {column.links.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="transition-colors hover:text-zinc-800 hover:underline hover:decoration-zinc-400 hover:underline-offset-4"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <CookieConsentManager />
    </footer>
  );
}
