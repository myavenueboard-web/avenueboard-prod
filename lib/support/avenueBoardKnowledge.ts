export const avenueBoardProductKnowledge = {
  product: "AvenueBoard",
  positioning:
    "AvenueBoard is rental management software for landlords and tenants. It helps organize leases, documents, rent activity, tenant access, property information, and support workflows in one workspace.",
  pages: {
    tenant_dashboard: {
      purpose:
        "The tenant dashboard is the renter's main workspace for rent status, lease status, property documents, notes, recent activity, property contact, support, perks, and credit-building visibility when enabled.",
      navigation:
        "Tenants can use the top Support action to open Ava, switch properties from the header when multiple leases are available, review Payment Progress, open Lease Status, use Notes, and view or upload Property Documents.",
    },
  },
  capabilities: {
    payments: {
      supported: true,
      summary:
        "Tenants can view rent due information, payment progress, payment history, payment status, and payment setup entry points. Ava must not promise refunds, reversals, chargebacks, or payment outcomes.",
    },
    leases: {
      supported: true,
      summary:
        "Tenants can view lease status, lease dates/status details when available, property/unit information, and lease-related dashboard context.",
    },
    documents: {
      supported: true,
      summary:
        "Tenants can view and download property/lease documents shared for their lease. Tenants can upload shared documents for the same lease/property when enabled. Tenant delete is limited to documents they uploaded.",
    },
    notes: {
      supported: true,
      summary:
        "Tenant Notes support private tenant notes and shared notes. Private tenant notes are visible only to the tenant who created them. Shared notes can be visible between the tenant and landlord for the same property/lease. Tenants should not see private landlord notes.",
    },
    shared_notes: {
      supported: true,
      summary:
        "Shared Notes are supported in the tenant dashboard. Tenants can create shared notes for their lease/property, and landlord-created shared notes for the same lease/property can appear to the tenant.",
    },
    credit_building: {
      supported: true,
      summary:
        "Credit Building is represented in the tenant dashboard as an AvenueBoard feature. Ava should describe it as available or eligible only when enabled and should not guarantee credit score changes.",
    },
    avenue_perks: {
      supported: true,
      summary:
        "Avenue Perks and tenant promotions are part of the tenant experience when available.",
    },
    support_workflow: {
      supported: true,
      summary:
        "Ava can answer AvenueBoard questions and create support cases when a request cannot be resolved or requires human review.",
    },
  },
  competitorPositioning:
    "If asked whether another platform is better, Ava should stay neutral and explain AvenueBoard strengths: organized rental workspace, lease and document access, tenant communication context, payment visibility, support cases, Avenue Perks, and credit-building opportunities when enabled. Ava should not recommend competitors.",
} as const;

export type AvenueBoardProductKnowledge = typeof avenueBoardProductKnowledge;
