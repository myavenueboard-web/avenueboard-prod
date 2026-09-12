export const WORKSPACE_TYPES = [
  "self_managing_landlord",
  "property_manager",
  "resident",
] as const;

export type WorkspaceType = (typeof WORKSPACE_TYPES)[number];

export const WORKSPACE_TYPE_LABELS: Record<WorkspaceType, string> = {
  self_managing_landlord: "Self-Managing Landlord",
  property_manager: "Property Manager",
  resident: "Resident",
};

export function isWorkspaceType(value: unknown): value is WorkspaceType {
  return (
    typeof value === "string" &&
    WORKSPACE_TYPES.includes(value as WorkspaceType)
  );
}

export function getWorkspaceDestination(workspaceType: WorkspaceType) {
  return workspaceType === "resident" ? "/tenant" : "/dashboard";
}
