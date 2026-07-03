import type {
  ActivityLog,
  LeaseDocument,
  PropertyNote,
  RentPayment,
  TenantActivity,
  TenantActivityIcon,
} from "@/lib/tenant/tenantTypes";
import {
  formatActivityStatus,
  formatCurrency,
  formatDate,
  truncateActivityText,
} from "@/lib/tenant/tenantFormatters";

export function mapActivityLogToTenantActivity(activity: ActivityLog): TenantActivity {
  const type = activity.activity_type;
  const description = activity.description || activity.title;
  const loweredTitle = activity.title.toLowerCase();
  const isUpcomingAutopay =
    type.includes("autopay") ||
    loweredTitle.includes("autopay") ||
    loweredTitle.includes("auto pay");
  const isFailedPayment =
    type.includes("failed") ||
    type.includes("declined") ||
    loweredTitle.includes("failed") ||
    loweredTitle.includes("declined");
  const isPendingPayment =
    type.includes("pending") ||
    type.includes("processing") ||
    loweredTitle.includes("pending") ||
    loweredTitle.includes("processing");
  const isSuccessfulPayment =
    loweredTitle === "rent payment received" ||
    loweredTitle.includes("payment received") ||
    loweredTitle.includes("payment completed") ||
    loweredTitle.includes("payment succeeded") ||
    loweredTitle.includes("payment paid");
  const title = isUpcomingAutopay
    ? "Upcoming AutoPay"
    : isFailedPayment
    ? "Payment failed"
    : isPendingPayment
    ? "Payment processing"
    : isSuccessfulPayment
    ? "Rent payment made"
    : activity.title;
  const isDelete = type.includes("deleted") || type.includes("delete");
  const isDocument = type.includes("document");
  const isNote = type.includes("note");
  const isPayment = type.includes("payment") || type.includes("bank");
  const isAlert =
    type.includes("pending") ||
    type.includes("request") ||
    type.includes("failed") ||
    type.includes("late");

  const icon: TenantActivityIcon = isDelete
    ? "delete"
    : isDocument
    ? "document"
    : isNote
    ? "note"
    : isPayment && !isAlert
    ? "payment-success"
    : isPayment
    ? "payment-pending"
    : "note";

  const iconClass = isDelete
    ? "bg-[#FFF1F2] text-[#B9476D] ring-1 ring-[#F8D7DF]"
    : isDocument
    ? "bg-[#DCEEFF] text-[#1D5F9F] ring-1 ring-[#BFE0FF]"
    : isNote
    ? "bg-[#DCEEFF] text-[#1D5F9F] ring-1 ring-[#BFE0FF]"
    : isSuccessfulPayment
    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    : isFailedPayment
    ? "bg-[#FFF1F2] text-[#B9476D] ring-1 ring-[#F8D7DF]"
    : isPendingPayment
    ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    : isUpcomingAutopay
    ? "bg-[#DCEEFF] text-[#1D5F9F] ring-1 ring-[#BFE0FF]"
    : isAlert
    ? "bg-white text-slate-950 ring-1 ring-slate-950/15"
    : "bg-slate-950 text-white ring-1 ring-slate-950/10";

  return {
    id: `activity-log-${activity.id}`,
    timestamp: activity.created_at,
    icon,
    title,
    subtitle: truncateActivityText(description),
    badge: isDelete ? "Tenant" : undefined,
    badgeClass: isDelete ? "bg-[#FFF1F2] text-[#B9476D]" : undefined,
    iconClass,
    amountClass: isSuccessfulPayment
      ? "text-emerald-600"
      : isFailedPayment
      ? "text-[#B9476D]"
      : isPendingPayment
      ? "text-amber-700"
      : isUpcomingAutopay
      ? "text-[#1D5F9F]"
      : "text-zinc-500",
    propertyId: activity.property_id || undefined,
    leaseId: activity.lease_id || undefined,
  };
}

export function getActivityDedupeKey(activity: TenantActivity) {
  return `${activity.title.toLowerCase()}::${activity.subtitle.toLowerCase()}`;
}

export function buildTenantActivities(
  activityLogs: ActivityLog[],
  payments: RentPayment[],
  documents: LeaseDocument[],
  notes: PropertyNote[],
  localActivities: TenantActivity[],
  profileId: string
) {
  const logActivities = activityLogs.map(mapActivityLogToTenantActivity);
  const logKeys = new Set(
    logActivities.map((activity) => getActivityDedupeKey(activity))
  );

  const paymentActivities: TenantActivity[] = payments
    .map((payment): TenantActivity | null => {
      const timestamp = payment.paid_at || payment.created_at;
      if (!timestamp) return null;

      const status = String(payment.status || "").toLowerCase();
      const isPaid = ["paid", "succeeded", "complete", "completed"].includes(status);
      const isFailed = ["failed", "declined", "canceled", "cancelled"].includes(status);
      const isProcessing = ["processing", "pending"].includes(status);

      return {
        id: `payment-${payment.id}`,
        timestamp,
        icon: isPaid
          ? "payment-success"
          : isFailed
          ? "payment-alert"
          : "payment-pending",
        title: isPaid
          ? "Rent payment made"
          : isFailed
          ? "Payment failed"
          : isProcessing
          ? "Payment processing"
          : "Payment processing",
        subtitle: payment.period_label || "Rent activity",
        amount: formatCurrency(payment.amount),
        badge: !isPaid && !isFailed && status ? formatActivityStatus(status) : undefined,
        badgeClass: "bg-zinc-100 text-zinc-600",
        iconClass: isPaid
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : isFailed
          ? "bg-[#FFF1F2] text-[#B9476D] ring-1 ring-[#F8D7DF]"
          : "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
        amountClass: isPaid
          ? "text-emerald-600"
          : isFailed
          ? "text-[#B9476D]"
          : "text-amber-700",
      };
    })
    .filter((activity): activity is TenantActivity => Boolean(activity));

  const documentActivities: TenantActivity[] = documents
    .map((doc): TenantActivity | null => {
      if (!doc.created_at) return null;

      const tenantOwned = doc.uploaded_by_profile_id === profileId;

      return {
        id: `document-${doc.id}`,
        timestamp: doc.created_at,
        icon: "document",
        title: tenantOwned ? "Document uploaded" : "Document shared",
        subtitle: doc.file_name,
        amount: formatDate(doc.created_at),
        iconClass: "bg-[#DCEEFF] text-[#1D5F9F] ring-1 ring-[#BFE0FF]",
        amountClass: "text-zinc-500",
      };
    })
    .filter((activity): activity is TenantActivity => {
      if (!activity) return false;
      return !logKeys.has(getActivityDedupeKey(activity));
    });

  const noteActivities: TenantActivity[] = notes
    .map((note): TenantActivity | null => {
      if (!note.created_at) return null;

      return {
        id: `note-${note.id}`,
        timestamp: note.created_at,
        icon: "note",
        title:
          note.note_type === "private" ? "Private note added" : "Shared note added",
        subtitle: truncateActivityText(note.text),
        badge: note.created_by_role === "landlord" ? "Landlord" : "Tenant",
        badgeClass: "bg-zinc-100 text-zinc-600",
        iconClass:
          note.note_type === "private"
            ? "bg-[#FFF3D5] text-[#8A5A00] ring-1 ring-[#F3D184]"
            : "bg-[#DCEEFF] text-[#1D5F9F] ring-1 ring-[#BFE0FF]",
        amountClass: "text-zinc-500",
      };
    })
    .filter((activity): activity is TenantActivity => {
      if (!activity) return false;
      return !logKeys.has(getActivityDedupeKey(activity));
    });

  const combinedActivities = [
    ...logActivities,
    ...localActivities,
    ...paymentActivities,
    ...documentActivities,
    ...noteActivities,
  ].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const seen = new Set<string>();

  return combinedActivities
    .filter((activity) => {
      const key = getActivityDedupeKey(activity);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}
