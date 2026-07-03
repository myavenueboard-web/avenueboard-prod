export const avenueBoardProductKnowledge = {
  product: "AvenueBoard",
  positioning:
    "AvenueBoard is rental management software for landlords and residents. It helps organize leases, documents, rent activity, resident access, property information, and support workflows in one workspace.",
  pages: {
    tenant_dashboard: {
      purpose:
        "The Resident Board is the renter's main workspace for rent status, lease status, property documents, notes, recent activity, property contact, support, perks, and credit-building visibility when enabled.",
      navigation:
        "Residents can use the top Support action to open Ava, switch properties from the header when multiple leases are available, review Payment Progress, open Lease Status, use Notes, and view or upload Property Documents.",
    },
  },
  capabilities: {
    payments: {
      supported: true,
      summary:
        "Residents can view rent due information, payment progress, payment history, payment status, and payment setup entry points. Current online checkout is card-only; ACH should be described as coming soon until it is live. Ava must not promise refunds, reversals, chargebacks, or payment outcomes.",
    },
    leases: {
      supported: true,
      summary:
        "Residents can view lease status, lease dates/status details when available, property/unit information, and lease-related board context.",
    },
    documents: {
      supported: true,
      summary:
        "Residents can view and download property/lease documents shared for their lease. Residents can upload shared documents for the same lease/property when enabled. Resident delete is limited to documents they uploaded.",
    },
    notes: {
      supported: true,
      summary:
        "Resident Notes support private resident notes and shared notes. Private resident notes are visible only to the resident who created them. Shared notes can be visible between the resident and landlord for the same property/lease. Residents should not see private landlord notes.",
    },
    shared_notes: {
      supported: true,
      summary:
        "Shared Notes are supported in the Resident Board. Residents can create shared notes for their lease/property, and landlord-created shared notes for the same lease/property can appear to the resident.",
    },
    credit_building: {
      supported: true,
      summary:
        "Credit Building is represented in the Resident Board as an AvenueBoard feature. Ava should describe it as available or eligible only when enabled and should not guarantee credit score changes.",
    },
    avenue_perks: {
      supported: true,
      summary:
        "Avenue Perks and resident promotions are part of the resident experience when available.",
    },
    support_workflow: {
      supported: true,
      summary:
        "Ava can answer AvenueBoard questions and create support cases when a request cannot be resolved or requires human review.",
    },
  },
  competitorPositioning:
    "If asked whether another platform is better, Ava should stay neutral and explain AvenueBoard strengths: organized rental workspace, lease and document access, resident communication context, payment visibility, support cases, Avenue Perks, and credit-building opportunities when enabled. Ava should not recommend competitors.",
} as const;

export type AvenueBoardProductKnowledge = typeof avenueBoardProductKnowledge;
