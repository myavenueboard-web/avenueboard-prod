export type PlatformSectionId = "platform";

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
    defaultCategory: "platform-overview",
    links: [
      {
        id: "landlord-dashboard",
        label: "Landlord Board",
        href: "/#rental-properties",
      },
      {
        id: "resident-dashboard",
        label: "Resident Board",
        href: "/#rental-properties",
      },
      {
        id: "ava-support",
        label: "Ava Assistant",
        href: "/#rental-properties",
      },
      {
        id: "avenue-perks",
        label: "Avenue Perks",
        href: "/avenue-perks",
      },
      {
        id: "credit-building",
        label: "Credit Building",
        href: "/credit-building",
      },
      {
        id: "pricing",
        label: "Pricing",
        href: "/pricing",
      },
    ],
  },
};

export const footerPlatformSection: PublicPageSection = {
  label: "Platform",
  defaultCategory: "landlord-dashboard",
  links: [
    {
      id: "landlord-dashboard",
      label: "Landlord Board",
      href: "/#rental-properties",
    },
    {
      id: "resident-dashboard",
      label: "Resident Board",
      href: "/#rental-properties",
    },
    {
      id: "ava-support",
      label: "Ava Assistant",
      href: "/#rental-properties",
    },
    {
      id: "avenue-perks",
      label: "Avenue Perks",
      href: "/member-benefits?section=avenue-perks",
    },
    {
      id: "credit-building",
      label: "Credit Building",
      href: "/member-benefits?section=credit-building",
    },
    {
      id: "pricing",
      label: "Pricing",
      href: "/pricing",
    },
  ],
};

export const footerResourcesSection: PublicPageSection = {
  label: "Resources",
  defaultCategory: "help-center",
  links: [
    {
      id: "get-started",
      label: "Get Started",
      href: "/signup",
    },
    {
      id: "login",
      label: "Login",
      href: "/login",
    },
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
      label: "Support Cases",
      href: "/help-center?section=cases",
    },
    {
      id: "contact-us",
      label: "Contact Us",
      href: "/help-center?section=contact",
    },
  ],
};

export const legalTrustSections: Record<LegalTrustGroupId, PublicPageSection> = {
  legal: {
    label: "Legal",
    defaultCategory: "privacy-policy",
    links: [
      {
        id: "privacy-policy",
        label: "Privacy Policy",
        href: "/legal?section=privacy-policy",
      },
      {
        id: "terms-of-service",
        label: "Terms of Service",
        href: "/legal?section=terms-of-service",
      },
    ],
  },
  trust: {
    label: "Trust",
    defaultCategory: "privacy-preferences",
    links: [
      {
        id: "privacy-preferences",
        label: "Privacy Preferences",
        href: "/legal?section=privacy-preferences",
      },
      {
        id: "cookie-policy",
        label: "Cookie Policy",
        href: "/legal?section=cookie-policy",
      },
    ],
  },
};

export const footerColumns = [
  footerPlatformSection,
  footerResourcesSection,
  legalTrustSections.trust,
  legalTrustSections.legal,
];
