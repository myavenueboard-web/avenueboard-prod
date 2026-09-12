import { supabase } from "@/lib/supabase";
import type { WorkspaceType } from "@/lib/workspaceTypes";

export type WorkspaceOnboardingStatus = {
  completed: boolean;
  requiresOnboarding: boolean;
  primaryWorkspaceType: WorkspaceType | null;
  destination: string;
};

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

export async function getWorkspaceOnboardingStatus() {
  const token = await getAccessToken();

  if (!token) {
    return null;
  }

  const response = await fetch("/api/onboarding/workspace", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as WorkspaceOnboardingStatus;
}

export async function submitWorkspaceType(workspaceType: WorkspaceType) {
  const token = await getAccessToken();

  if (!token) {
    throw new Error("Please sign in again to continue.");
  }

  const response = await fetch("/api/onboarding/workspace", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ workspaceType }),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.message || "Unable to save your workspace type.");
  }

  return body as WorkspaceOnboardingStatus;
}
