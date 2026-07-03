import { supabase } from "@/lib/supabase";

type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
  statusCode?: number;
};

type LeaseIdRecord = {
  id: string;
};

type LeaseDocumentPathRecord = {
  storage_path: string | null;
};

type TenantAccessIdRecord = {
  id: string;
};

type DeletePropertyOptions = {
  propertyId: string;
  ownerProfileId?: string;
  knownLeaseIds?: string[];
};

function describeSupabaseError(error: unknown) {
  if (!error) return null;

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === "object") {
    const typedError = error as SupabaseLikeError;

    return {
      message: typedError.message || null,
      code: typedError.code || null,
      details: typedError.details || null,
      hint: typedError.hint || null,
      statusCode: typedError.statusCode || typedError.status || null,
      raw: JSON.stringify(error),
    };
  }

  return {
    message: String(error),
  };
}

function getSupabaseErrorMessage(error: unknown) {
  if (!error) return "Unknown Supabase error";
  if (error instanceof Error) return error.message || "Unknown Supabase error";

  if (typeof error === "object") {
    const typedError = error as SupabaseLikeError;
    return (
      typedError.message ||
      typedError.details ||
      typedError.hint ||
      JSON.stringify(error)
    );
  }

  return String(error);
}

function logDeleteDebug(
  label: string,
  error: unknown,
  context?: Record<string, unknown>
) {
  if (process.env.NODE_ENV !== "development") return;

  const payload = {
    error: describeSupabaseError(error),
    context,
  };

  if (error) {
    console.warn(label, payload);
  } else {
    console.info(label, payload);
  }
}

async function cleanupEmailEventsServerSide({
  propertyId,
  leaseIds,
  tenantAccessIds,
}: {
  propertyId: string;
  leaseIds: string[];
  tenantAccessIds: string[];
}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error("Delete failed at email event cleanup: missing session.");
  }

  const response = await fetch("/api/dashboard/delete-property-email-events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      propertyId,
      leaseIds,
      tenantAccessIds,
    }),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok || !body?.ok) {
    throw new Error(
      `Delete failed at email event cleanup (email_events): ${
        body?.message || response.statusText
      }`
    );
  }

  logDeleteDebug("Delete property email event cleanup completed", null, {
    propertyId,
    leaseIds,
    tenantAccessIds,
    deleted: body.deleted,
  });
}

async function runDeleteStep(
  table: string,
  stage: string,
  run: () => Promise<{ error: unknown }>
) {
  logDeleteDebug("Delete property step started", null, { table, stage });

  const { error } = await run();

  if (error) {
    logDeleteDebug("Delete property step failed", error, { table, stage });
    throw new Error(
      `Delete failed at ${stage} (${table}): ${getSupabaseErrorMessage(error)}`
    );
  }

  logDeleteDebug("Delete property step completed", null, { table, stage });
}

export async function deleteLandlordPropertyCascade({
  propertyId,
  ownerProfileId,
  knownLeaseIds = [],
}: DeletePropertyOptions) {
  logDeleteDebug("Delete property flow started", null, {
    propertyId,
    ownerProfileId,
    knownLeaseIds,
  });

  const { data: leaseRows, error: leaseLookupError } = await supabase
    .from("leases")
    .select("id")
    .eq("property_id", propertyId);

  if (leaseLookupError) {
    logDeleteDebug("Delete property lease lookup failed", leaseLookupError, {
      table: "leases",
      propertyId,
    });
    throw new Error(
      `Delete failed at lease lookup (leases): ${getSupabaseErrorMessage(
        leaseLookupError
      )}`
    );
  }

  const leaseIds = Array.from(
    new Set([
      ...knownLeaseIds,
      ...((leaseRows || []) as LeaseIdRecord[]).map((lease) => lease.id),
    ])
  );

  const tenantAccessIds = new Set<string>();
  const { data: propertyTenantAccess, error: propertyTenantAccessError } =
    await supabase
      .from("tenant_access")
      .select("id")
      .eq("property_id", propertyId);

  if (propertyTenantAccessError) {
    logDeleteDebug(
      "Delete property tenant access lookup failed",
      propertyTenantAccessError,
      {
        table: "tenant_access",
        propertyId,
        stage: "tenant access lookup by property",
      }
    );
    throw new Error(
      `Delete failed at tenant access lookup (tenant_access): ${getSupabaseErrorMessage(
        propertyTenantAccessError
      )}`
    );
  }

  ((propertyTenantAccess || []) as TenantAccessIdRecord[]).forEach((access) => {
    tenantAccessIds.add(access.id);
  });

  if (leaseIds.length > 0) {
    const { data: leaseTenantAccess, error: leaseTenantAccessError } =
      await supabase
        .from("tenant_access")
        .select("id")
        .in("lease_id", leaseIds);

    if (leaseTenantAccessError) {
      logDeleteDebug(
        "Delete property tenant access lookup failed",
        leaseTenantAccessError,
        {
          table: "tenant_access",
          leaseIds,
          stage: "tenant access lookup by lease",
        }
      );
      throw new Error(
        `Delete failed at tenant access lookup (tenant_access): ${getSupabaseErrorMessage(
          leaseTenantAccessError
        )}`
      );
    }

    ((leaseTenantAccess || []) as TenantAccessIdRecord[]).forEach((access) => {
      tenantAccessIds.add(access.id);
    });
  }

  const documentPaths = new Set<string>();

  const { data: propertyDocuments, error: propertyDocumentsError } =
    await supabase
      .from("lease_documents")
      .select("storage_path")
      .eq("property_id", propertyId);

  if (propertyDocumentsError) {
    logDeleteDebug(
      "Delete property document path lookup failed",
      propertyDocumentsError,
      {
        table: "lease_documents",
        propertyId,
        stage: "document path lookup by property",
      }
    );
    throw new Error(
      `Delete failed at document path lookup (lease_documents): ${getSupabaseErrorMessage(
        propertyDocumentsError
      )}`
    );
  }

  ((propertyDocuments || []) as LeaseDocumentPathRecord[]).forEach((document) => {
    if (document.storage_path) documentPaths.add(document.storage_path);
  });

  if (leaseIds.length > 0) {
    const { data: leaseDocuments, error: leaseDocumentsError } = await supabase
      .from("lease_documents")
      .select("storage_path")
      .in("lease_id", leaseIds);

    if (leaseDocumentsError) {
      logDeleteDebug(
        "Delete property document path lookup failed",
        leaseDocumentsError,
        {
          table: "lease_documents",
          leaseIds,
          stage: "document path lookup by lease",
        }
      );
      throw new Error(
        `Delete failed at document path lookup (lease_documents): ${getSupabaseErrorMessage(
          leaseDocumentsError
        )}`
      );
    }

    ((leaseDocuments || []) as LeaseDocumentPathRecord[]).forEach((document) => {
      if (document.storage_path) documentPaths.add(document.storage_path);
    });
  }

  await cleanupEmailEventsServerSide({
    propertyId,
    leaseIds,
    tenantAccessIds: Array.from(tenantAccessIds),
  });

  if (documentPaths.size > 0) {
    const storagePaths = Array.from(documentPaths);
    const { error: storageError } = await supabase.storage
      .from("lease-documents")
      .remove(storagePaths);

    if (storageError) {
      logDeleteDebug("Delete property storage cleanup failed", storageError, {
        bucket: "lease-documents",
        propertyId,
        leaseIds,
        storagePaths,
      });
      throw new Error(
        `Delete failed at storage cleanup (lease-documents): ${getSupabaseErrorMessage(
          storageError
        )}`
      );
    }

    logDeleteDebug("Delete property storage cleanup completed", null, {
      bucket: "lease-documents",
      propertyId,
      leaseIds,
      storageFileCount: storagePaths.length,
    });
  }

  await runDeleteStep("activity_logs", "activity log cleanup", () =>
    Promise.resolve(
      supabase.from("activity_logs").delete().eq("property_id", propertyId)
    )
  );

  await runDeleteStep("expenses", "expense cleanup", () =>
    Promise.resolve(
      supabase.from("expenses").delete().eq("property_id", propertyId)
    )
  );

  await runDeleteStep("property_notes", "property notes cleanup", () =>
    Promise.resolve(
      supabase.from("property_notes").delete().eq("property_id", propertyId)
    )
  );

  await runDeleteStep("rent_payments", "rent payment cleanup", () =>
    Promise.resolve(
      supabase.from("rent_payments").delete().eq("property_id", propertyId)
    )
  );

  await runDeleteStep("payment_methods", "payment method cleanup", () =>
    Promise.resolve(
      supabase.from("payment_methods").delete().eq("property_id", propertyId)
    )
  );

  await runDeleteStep("tenant_access", "tenant access cleanup", () =>
    Promise.resolve(
      supabase.from("tenant_access").delete().eq("property_id", propertyId)
    )
  );

  if (leaseIds.length > 0) {
    await runDeleteStep("rent_payments", "rent payment lease cleanup", () =>
      Promise.resolve(
        supabase.from("rent_payments").delete().in("lease_id", leaseIds)
      )
    );

    await runDeleteStep("payment_methods", "payment method lease cleanup", () =>
      Promise.resolve(
        supabase.from("payment_methods").delete().in("lease_id", leaseIds)
      )
    );

    await runDeleteStep("tenant_access", "tenant access lease cleanup", () =>
      Promise.resolve(
        supabase.from("tenant_access").delete().in("lease_id", leaseIds)
      )
    );

    await runDeleteStep("lease_tenants", "lease tenant cleanup", () =>
      Promise.resolve(
        supabase.from("lease_tenants").delete().in("lease_id", leaseIds)
      )
    );

    await runDeleteStep("lease_amounts", "lease amount cleanup", () =>
      Promise.resolve(
        supabase.from("lease_amounts").delete().in("lease_id", leaseIds)
      )
    );

    await runDeleteStep("lease_preferences", "lease preference cleanup", () =>
      Promise.resolve(
        supabase.from("lease_preferences").delete().in("lease_id", leaseIds)
      )
    );

    await runDeleteStep("lease_documents", "lease document cleanup", () =>
      Promise.resolve(
        supabase.from("lease_documents").delete().in("lease_id", leaseIds)
      )
    );

    await runDeleteStep("leases", "lease cleanup", () =>
      Promise.resolve(supabase.from("leases").delete().in("id", leaseIds))
    );
  }

  let propertyDelete = supabase.from("properties").delete().eq("id", propertyId);

  if (ownerProfileId) {
    propertyDelete = propertyDelete.eq("owner_profile_id", ownerProfileId);
  }

  await runDeleteStep("properties", "property delete", () =>
    Promise.resolve(propertyDelete)
  );

  logDeleteDebug("Delete property flow completed", null, {
    propertyId,
    ownerProfileId,
    leaseIds,
    tenantAccessIds: Array.from(tenantAccessIds),
    storageFileCount: documentPaths.size,
  });
}

export function getDeletePropertyErrorMessage(error: unknown) {
  if (process.env.NODE_ENV === "development" && error instanceof Error) {
    return error.message;
  }

  return "Unable to delete this property. Please try again.";
}
