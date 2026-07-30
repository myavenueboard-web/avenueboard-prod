import type { StaffRole, StaffUser } from "@/lib/command-center/server";

export type CommandCenterCapability =
  | "command_center.view"
  | "people.view"
  | "people.notes.create"
  | "people.notes.edit"
  | "properties.view"
  | "properties.notes.create"
  | "properties.notes.edit"
  | "portfolio.view"
  | "payments.view"
  | "payments.notes.create"
  | "payments.notes.edit"
  | "cases.view"
  | "cases.assign"
  | "cases.status.update"
  | "cases.priority.update"
  | "cases.notes.create"
  | "cases.notes.edit"
  | "cases.resolve"
  | "cases.reopen"
  | "analytics.view"
  | "analytics.export"
  | "audit_log.view"
  | "audit_log.export"
  | "settings.view"
  | "staff.view"
  | "staff.role.update"
  | "staff.status.update"
  | "staff.mfa.update";

const VIEW_CAPABILITIES: CommandCenterCapability[] = [
  "command_center.view",
  "people.view",
  "properties.view",
  "portfolio.view",
  "payments.view",
  "cases.view",
  "analytics.view",
  "audit_log.view",
  "settings.view",
  "staff.view",
];

const STAFF_MANAGEMENT_CAPABILITIES: CommandCenterCapability[] = [
  "staff.role.update",
  "staff.status.update",
  "staff.mfa.update",
];

const PEOPLE_NOTE_CAPABILITIES: CommandCenterCapability[] = [
  "people.notes.create",
  "people.notes.edit",
];

const PROPERTY_NOTE_CAPABILITIES: CommandCenterCapability[] = [
  "properties.notes.create",
  "properties.notes.edit",
];

const PAYMENT_NOTE_CAPABILITIES: CommandCenterCapability[] = [
  "payments.notes.create",
  "payments.notes.edit",
];

const CASE_CAPABILITIES: CommandCenterCapability[] = [
  "cases.assign",
  "cases.status.update",
  "cases.priority.update",
  "cases.notes.create",
  "cases.notes.edit",
  "cases.resolve",
  "cases.reopen",
];

const PAYMENT_CASE_CAPABILITIES: CommandCenterCapability[] = [
  "cases.status.update",
  "cases.notes.create",
  "cases.notes.edit",
  "cases.resolve",
];

export const COMMAND_CENTER_ROLE_CAPABILITIES: Record<
  StaffRole,
  CommandCenterCapability[]
> = {
  super_admin: [
    ...VIEW_CAPABILITIES,
    ...PEOPLE_NOTE_CAPABILITIES,
    ...PROPERTY_NOTE_CAPABILITIES,
    ...PAYMENT_NOTE_CAPABILITIES,
    ...CASE_CAPABILITIES,
    ...STAFF_MANAGEMENT_CAPABILITIES,
  ],
  operations: [
    ...VIEW_CAPABILITIES,
    ...PEOPLE_NOTE_CAPABILITIES,
    ...PROPERTY_NOTE_CAPABILITIES,
    ...PAYMENT_NOTE_CAPABILITIES,
    ...CASE_CAPABILITIES,
    "staff.status.update",
  ],
  support: [
    ...VIEW_CAPABILITIES,
    ...PEOPLE_NOTE_CAPABILITIES,
    ...PROPERTY_NOTE_CAPABILITIES,
    ...PAYMENT_NOTE_CAPABILITIES,
    ...CASE_CAPABILITIES,
  ],
  payments: [
    ...VIEW_CAPABILITIES,
    ...PAYMENT_NOTE_CAPABILITIES,
    ...PAYMENT_CASE_CAPABILITIES,
  ],
  read_only: VIEW_CAPABILITIES,
};

export function getStaffCapabilities(role: StaffRole) {
  return [...(COMMAND_CENTER_ROLE_CAPABILITIES[role] || [])];
}

export function staffHasCapability(
  staff: StaffUser | null | undefined,
  capability: CommandCenterCapability
) {
  if (!staff || staff.status !== "active") return false;
  return COMMAND_CENTER_ROLE_CAPABILITIES[staff.role]?.includes(capability) || false;
}
