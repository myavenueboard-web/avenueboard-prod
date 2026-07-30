import type { Metadata } from "next";
import LatestLandingPage from "@/components/marketing/LatestLandingPage";

export const metadata: Metadata = {
  title: "AvenueBoard | Rent, simplified.",
  description:
    "Collect rent, manage residents, track lease details, store documents, and stay organized from one clean Board.",
  alternates: {
    canonical: "https://www.avenueboard.com",
  },
  openGraph: {
    title: "AvenueBoard | Rent, simplified.",
    description:
      "Collect rent, manage residents, track lease details, store documents, and stay organized from one clean Board.",
    url: "https://www.avenueboard.com",
    siteName: "AvenueBoard",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AvenueBoard | Rent, simplified.",
    description:
      "Collect rent, manage residents, track lease details, store documents, and stay organized from one clean Board.",
  },
};

export default LatestLandingPage;
