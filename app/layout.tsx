import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies, headers } from "next/headers";
import { CookieConsentAuthSync } from "@/components/cookie-consent/CookieConsentAuthSync";
import { SitePreviewBlocker } from "@/components/site-preview/SitePreviewBlocker";
import {
  isPreviewCookieValid,
  isPreviewProtectionConfigured,
  SITE_PREVIEW_COOKIE,
} from "@/lib/site-preview/access";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AvenueBoard",
    template: "%s | AvenueBoard",
  },
  description: "Built for landlords. Designed for tenants.",
  icons: {
    icon: "/favicon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const INTERNAL_ROUTE_PREFIXES = [
  "/admin",
  "/api",
  "/auth",
  "/command-center",
  "/dashboard",
  "/mobile",
  "/tenant",
];

function shouldBlockRoute(pathname: string) {
  return !INTERNAL_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const pathname = headerStore.get("x-ab-pathname") ?? "/";
  const shouldShowPreviewBlocker =
    isPreviewProtectionConfigured() &&
    shouldBlockRoute(pathname) &&
    !isPreviewCookieValid(cookieStore.get(SITE_PREVIEW_COOKIE)?.value);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <CookieConsentAuthSync />
        <div
          aria-hidden={shouldShowPreviewBlocker ? true : undefined}
          inert={shouldShowPreviewBlocker ? true : undefined}
        >
          {children}
        </div>
        {shouldShowPreviewBlocker ? <SitePreviewBlocker /> : null}
      </body>
    </html>
  );
}
