export type PlatformSectionId = "platform" | "rent-tools" | "company";

export type LegalTrustGroupId = "legal" | "trust";

export type PublicPageLink = {
  id: string;
  label: string;
  href: string;
};

type PublicPageSection = {
  label: string;
  defaultCategory: string;
  links: PublicPageLink[];
};

export const platformSections: Record<PlatformSectionId, PublicPageSection> = {
  platform: {
    label: "Platform",
    defaultCategory: "rental-properties",
    links: [
      {
        id: "rental-properties",
        label: "Rental Properties",
        href: "/platform?section=platform&category=rental-properties",
      },
      {
        id: "landlord-dashboard",
        label: "Landlord Board",
        href: "/platform?section=platform&category=landlord-dashboard",
      },
      {
        id: "resident-dashboard",
        label: "Resident Board",
        href: "/platform?section=platform&category=resident-dashboard",
      },
      {
        id: "ava-support",
        label: "Ava Assistant",
        href: "/platform?section=platform&category=ava-support",
      },
      {
        id: "avenue-perks",
        label: "Avenue Perks",
        href: "/platform?section=platform&category=avenue-perks",
      },
      {
        id: "pricing",
        label: "Pricing",
        href: "/platform?section=platform&category=pricing",
      },
    ],
  },
  "rent-tools": {
    label: "Rent Tools",
    defaultCategory: "rent-collection",
    links: [
      {
        id: "rent-collection",
        label: "Rent Collection",
        href: "/platform?section=rent-tools&category=rent-collection",
      },
      {
        id: "lease-tracking",
        label: "Lease Tracking",
        href: "/platform?section=rent-tools&category=lease-tracking",
      },
      {
        id: "document-storage",
        label: "Document Storage",
        href: "/platform?section=rent-tools&category=document-storage",
      },
      {
        id: "payment-history",
        label: "Payment History",
        href: "/platform?section=rent-tools&category=payment-history",
      },
      {
        id: "rent-reminders",
        label: "Rent Reminders",
        href: "/platform?section=rent-tools&category=rent-reminders",
      },
      {
        id: "reports",
        label: "Reports",
        href: "/platform?section=rent-tools&category=reports",
      },
    ],
  },
  company: {
    label: "Company",
    defaultCategory: "about-avenueboard",
    links: [
      {
        id: "about-avenueboard",
        label: "About AvenueBoard",
        href: "/platform?section=company&category=about-avenueboard",
      },
      {
        id: "why-avenueboard",
        label: "Why AvenueBoard",
        href: "/platform?section=company&category=why-avenueboard",
      },
      {
        id: "for-landlords",
        label: "For Landlords",
        href: "/platform?section=company&category=for-landlords",
      },
      {
        id: "for-property-managers",
        label: "For Property Managers",
        href: "/platform?section=company&category=for-property-managers",
      },
      {
        id: "for-residents",
        label: "For Residents",
        href: "/platform?section=company&category=for-residents",
      },
      {
        id: "roadmap",
        label: "Roadmap",
        href: "/platform?section=company&category=roadmap",
      },
    ],
  },
};

export const footerResourcesSection: PublicPageSection = {
  label: "Resources",
  defaultCategory: "help-center",
  links: [
    {
      id: "help-center",
      label: "Help Center",
      href: "/help-center",
    },
    {
      id: "faqs",
      label: "FAQs",
      href: "/help-center?section=faq",
    },
    {
      id: "my-cases",
      label: "My Cases",
      href: "/help-center?section=cases",
    },
    {
      id: "contact-us",
      label: "Contact Us",
      href: "/help-center?section=contact",
    },
    {
      id: "login",
      label: "Login",
      href: "/login",
    },
    {
      id: "get-started",
      label: "Get Started",
      href: "/signup",
    },
  ],
};

export const legalTrustSections: Record<LegalTrustGroupId, PublicPageSection> = {
  legal: {
    label: "Legal",
    defaultCategory: "terms-of-service",
    links: [
      {
        id: "terms-of-service",
        label: "Terms of Service",
        href: "/legal?section=terms-of-service",
      },
      {
        id: "privacy-policy",
        label: "Privacy Policy",
        href: "/legal?section=privacy-policy",
      },
    ],
  },
  trust: {
    label: "Trust",
    defaultCategory: "security",
    links: [
      {
        id: "security",
        label: "Security",
        href: "/legal?section=security",
      },
      {
        id: "cookie-policy",
        label: "Cookie Policy",
        href: "/legal?section=cookie-policy",
      },
      {
        id: "accessibility",
        label: "Accessibility",
        href: "/legal?section=accessibility",
      },
    ],
  },
};

export const footerColumns = [
  platformSections.platform,
  platformSections["rent-tools"],
  legalTrustSections.trust,
  footerResourcesSection,
  platformSections.company,
  legalTrustSections.legal,
];
