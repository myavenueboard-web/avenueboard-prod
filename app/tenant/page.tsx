"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOrCreateProfile } from "@/lib/getOrCreateProfile";
import type {
  ActivityLog,
  DeleteTarget,
  LeaseDocument,
  PaymentMethod,
  PropertyContact,
  PropertyNote,
  RentPayment,
  TenantAccessRow,
  TenantActivity,
  TenantLease,
  TenantLeaseRow,
  TenantPropertyRow,
  UserInfo,
} from "@/lib/tenant/tenantTypes";
import { buildTenantActivities } from "@/lib/tenant/tenantActivity";
import {
  getFirstName,
  getInitials,
  getTenantActivityStorageKey,
  truncateActivityText,
} from "@/lib/tenant/tenantFormatters";
import {
  AddNoteModal,
  ConfirmDeleteModal,
  NotesDocumentsCard,
  PaymentHero,
  PaymentProgressCard,
  QuickAccessCard,
  RecentActivityCard,
  ViewAllDocumentsModal,
  ViewAllNotesModal,
  ViewMoreActivitiesModal,
} from "@/components/tenant/TenantDashboardComponents";

type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  statusCode?: string | number;
  status?: string | number;
  name?: string;
};

type TenantNotification = {
  id: string;
  title: string;
  message: string;
  type: "warning" | "success" | "info";
  created_at: string;
};

function getTenantNotificationStorageKey(profileId: string) {
  return `avenueboard_tenant_dismissed_notifications_${profileId}`;
}

function getTenantSelectedLeaseStorageKey(profileId: string) {
  return `avenueboard_tenant_selected_lease_${profileId}`;
}

function getLeaseAddressLabel(lease?: TenantLease) {
  if (!lease) return "Property";

  const unit = lease.unit_name ? `, Unit ${lease.unit_name}` : "";
  const location = [lease.city, lease.state_name].filter(Boolean).join(", ");

  return `${lease.street_address}${unit}${
    location ? `, ${location}` : ""
  }${lease.zip ? ` ${lease.zip}` : ""}`;
}

function resolveTenantSelectedLeaseId({
  leases,
  profileId,
  queryLeaseId,
}: {
  leases: TenantLease[];
  profileId: string;
  queryLeaseId?: string | null;
}) {
  if (leases.length === 0) return "";

  const isValidLeaseId = (leaseId?: string | null) =>
    Boolean(leaseId && leases.some((lease) => lease.lease_id === leaseId));

  if (isValidLeaseId(queryLeaseId)) return queryLeaseId as string;

  if (typeof window !== "undefined" && profileId) {
    const savedLeaseId = window.localStorage.getItem(
      getTenantSelectedLeaseStorageKey(profileId)
    );

    if (isValidLeaseId(savedLeaseId)) return savedLeaseId as string;
  }

  return leases[0].lease_id;
}

function buildTenantNotifications({
  selectedLease,
  selectedPaymentMethods,
  selectedRentPayments,
  selectedDocuments,
  selectedNotes,
  selectedActivities,
  profileId,
}: {
  selectedLease?: TenantLease;
  selectedPaymentMethods: PaymentMethod[];
  selectedRentPayments: RentPayment[];
  selectedDocuments: LeaseDocument[];
  selectedNotes: PropertyNote[];
  selectedActivities: TenantActivity[];
  profileId: string;
}): TenantNotification[] {
  const notifications: TenantNotification[] = [];

  if (selectedLease && selectedPaymentMethods.length === 0) {
    notifications.push({
      id: `setup-payment-${selectedLease.lease_id}`,
      title: "Set up payment",
      message:
        "Your invite is accepted. Add a payment method to view and pay upcoming rent dues.",
      type: "warning",
      created_at: new Date().toISOString(),
    });
  }

  selectedNotes
    .filter(
      (note) => note.note_type === "shared" && note.created_by_role === "landlord"
    )
    .forEach((note) => {
      notifications.push({
        id: `landlord-note-${note.id}`,
        title: "Landlord shared a note with you",
        message: truncateActivityText(note.text),
        type: "info",
        created_at: note.created_at,
      });
    });

  selectedDocuments
    .filter((doc) => doc.uploaded_by_profile_id !== profileId)
    .forEach((doc) => {
      notifications.push({
        id: `landlord-document-${doc.id}`,
        title: "Landlord shared a document with you",
        message: doc.file_name,
        type: "info",
        created_at: doc.created_at || new Date().toISOString(),
      });
    });

  selectedRentPayments.forEach((payment) => {
    const status = String(payment.status || "").toLowerCase();
    const timestamp = payment.paid_at || payment.created_at;

    if (!timestamp) return;

    if (["failed", "declined", "canceled", "cancelled"].includes(status)) {
      notifications.push({
        id: `payment-issue-${payment.id}`,
        title: "Payment needs attention",
        message: payment.period_label || "A rent payment could not be completed.",
        type: "warning",
        created_at: timestamp,
      });
    }

    if (["paid", "succeeded", "complete", "completed"].includes(status)) {
      notifications.push({
        id: `payment-success-${payment.id}`,
        title: "Payment confirmed",
        message: payment.period_label || "Your rent payment was recorded.",
        type: "success",
        created_at: timestamp,
      });
    }
  });

  selectedActivities
    .filter((activity) =>
      ["Payment request sent", "Lease updated", "Lease extended"].includes(
        activity.title
      )
    )
    .forEach((activity) => {
      notifications.push({
        id: `activity-${activity.id}`,
        title: activity.title,
        message: activity.subtitle,
        type: "info",
        created_at: activity.timestamp,
      });
    });

  const seen = new Set<string>();

  return notifications
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .filter((notification) => {
      if (seen.has(notification.id)) return false;
      seen.add(notification.id);
      return true;
    })
    .slice(0, 10);
}

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

function logTenantSupabaseError(
  label: string,
  error: unknown,
  context?: Record<string, unknown>
) {
  console.error(label, {
    error: describeSupabaseError(error),
    context,
  });
}

export default function TenantDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState("");
  const [leases, setLeases] = useState<TenantLease[]>([]);
  const [notes, setNotes] = useState<PropertyNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [documents, setDocuments] = useState<LeaseDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentError, setDocumentError] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [rentPayments, setRentPayments] = useState<RentPayment[]>([]);
  const [propertyContacts, setPropertyContacts] = useState<PropertyContact[]>(
    []
  );
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [localActivities, setLocalActivities] = useState<TenantActivity[]>([]);
  const [hasLandlordRole, setHasLandlordRole] = useState(false);
  const [selectedLeaseId, setSelectedLeaseId] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>(
    []
  );
  const [noteOpen, setNoteOpen] = useState(false);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false);
  const [activitiesModalOpen, setActivitiesModalOpen] = useState(false);
  const [noteType, setNoteType] = useState<"private" | "shared">("private");
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState("");
  const [deletingDocumentId, setDeletingDocumentId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: "Tenant",
    email: "",
  });

  useEffect(() => {
    async function loadTenantDashboard() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        const profile = await getOrCreateProfile();
        setProfileId(profile.id);

        setUserInfo({
          name:
            profile?.display_name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "Tenant",
          email: user.email || profile?.email || "",
        });

        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("profile_id", profile.id);

        setHasLandlordRole(
          (roleData || []).some((item) => item.role === "landlord")
        );

        const { data: accessData, error: accessError } = await supabase
          .from("tenant_access")
          .select("id, property_id, lease_id, invite_status, created_at")
          .eq("tenant_profile_id", profile.id)
          .eq("invite_status", "accepted")
          .order("created_at", { ascending: false });

        if (accessError) {
          console.error("Tenant access load error:", accessError);
          return;
        }

        const accessRows = (accessData || []) as TenantAccessRow[];

        if (accessRows.length === 0) {
          setLeases([]);
          return;
        }

        const propertyIds = accessRows.map((item) => item.property_id);
        const leaseIds = accessRows.map((item) => item.lease_id);

        const [
          { data: propertyData },
          { data: leaseData },
          { data: docData },
          { data: paymentMethodData },
          { data: rentPaymentData },
        ] = await Promise.all([
          supabase
            .from("properties")
            .select(
              "id, owner_profile_id, property_label, street_address, city, state_name, zip, unit_name"
            )
            .in("id", propertyIds),

          supabase
            .from("leases")
            .select("id, start_date, end_date, monthly_rent, rent_due_day")
            .in("id", leaseIds),

          supabase
            .from("lease_documents")
            .select(
              "id, property_id, lease_id, file_name, file_url, file_type, storage_path, file_size, uploaded_by_profile_id, created_at"
            )
            .in("lease_id", leaseIds)
            .in("property_id", propertyIds)
            .order("created_at", { ascending: false }),

          supabase
            .from("payment_methods")
            .select("id, lease_id, brand, last4, exp_month, exp_year, is_default")
            .in("lease_id", leaseIds),

          supabase
            .from("rent_payments")
            .select(
              "id, lease_id, payment_method_id, amount, period_label, status, receipt_url, paid_at, created_at"
            )
            .in("lease_id", leaseIds)
            .order("created_at", { ascending: false }),
        ]);

        const ownerProfileIds = Array.from(
          new Set(
            ((propertyData || []) as TenantPropertyRow[])
              .map((property) => property.owner_profile_id)
              .filter(Boolean) as string[]
          )
        );

        const { data: contactData } = ownerProfileIds.length
          ? await supabase
              .from("profiles")
              .select("id, display_name, email, phone")
              .in("id", ownerProfileIds)
          : { data: [] };

        const propertyMap = new Map(
          ((propertyData || []) as TenantPropertyRow[]).map((property) => [
            property.id,
            property,
          ])
        );

        const leaseMap = new Map(
          ((leaseData || []) as TenantLeaseRow[]).map((lease) => [
            lease.id,
            lease,
          ])
        );

        const normalizedLeases: TenantLease[] = accessRows.map((access) => {
          const property = propertyMap.get(access.property_id);
          const lease = leaseMap.get(access.lease_id);

          return {
            id: access.id,
            tenant_access_id: access.id,
            property_id: access.property_id,
            lease_id: access.lease_id,
            owner_profile_id: property?.owner_profile_id || null,
            property_label: property?.property_label || "Property",
            street_address: property?.street_address || "",
            city: property?.city || "",
            state_name: property?.state_name || "",
            zip: property?.zip || "",
            unit_name: property?.unit_name || null,
            start_date: lease?.start_date || null,
            end_date: lease?.end_date || null,
            monthly_rent: Number(lease?.monthly_rent || 0),
            rent_due_day: lease?.rent_due_day || null,
          };
        });

        setLeases(normalizedLeases);
        setDocuments((docData || []) as LeaseDocument[]);
        setPaymentMethods((paymentMethodData || []) as PaymentMethod[]);
        setRentPayments((rentPaymentData || []) as RentPayment[]);
        setPropertyContacts((contactData || []) as PropertyContact[]);
        setSelectedLeaseId(
          resolveTenantSelectedLeaseId({
            leases: normalizedLeases,
            profileId: profile.id,
            queryLeaseId:
              typeof window !== "undefined"
                ? new URLSearchParams(window.location.search).get("leaseId")
                : null,
          })
        );
      } catch (error) {
        console.error("Tenant dashboard error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadTenantDashboard();
  }, [router]);

  const selectedLease =
    leases.find((lease) => lease.lease_id === selectedLeaseId) || leases[0];

  useEffect(() => {
    if (!profileId || !selectedLease?.lease_id) return;

    try {
      window.localStorage.setItem(
        getTenantSelectedLeaseStorageKey(profileId),
        selectedLease.lease_id
      );
    } catch (error) {
      console.error("Tenant selected lease persist error:", error);
    }
  }, [profileId, selectedLease?.lease_id]);

  function handleLeaseSelection(leaseId: string) {
    if (!leases.some((lease) => lease.lease_id === leaseId)) return;

    setSelectedLeaseId(leaseId);
    setNotificationOpen(false);
    setProfileOpen(false);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("leaseId", leaseId);
      window.history.replaceState({}, "", `/tenant?${params.toString()}`);
    }
  }

  const selectedPropertyContact =
    propertyContacts.find(
      (contact) => contact.id === selectedLease?.owner_profile_id
    ) || null;

  const selectedDocuments = useMemo(() => {
    if (!selectedLease) return [];
    return documents.filter(
      (doc) =>
        doc.lease_id === selectedLease.lease_id &&
        doc.property_id === selectedLease.property_id
    );
  }, [documents, selectedLease]);

  const selectedNotes = useMemo(() => {
    if (!selectedLease || !profileId) return [];

    return notes.filter((note) => {
      const sameLease =
        note.lease_id === selectedLease.lease_id &&
        note.property_id === selectedLease.property_id;

      if (!sameLease) return false;
      if (note.note_type === "shared") return true;

      return note.profile_id === profileId && note.created_by_role === "tenant";
    });
  }, [notes, profileId, selectedLease]);

  const selectedPaymentMethods = useMemo(() => {
    if (!selectedLease) return [];
    return paymentMethods.filter(
      (method) => method.lease_id === selectedLease.lease_id
    );
  }, [paymentMethods, selectedLease]);

  const selectedRentPayments = useMemo(() => {
    if (!selectedLease) return [];
    return rentPayments.filter(
      (payment) => payment.lease_id === selectedLease.lease_id
    );
  }, [rentPayments, selectedLease]);

  const selectedLocalActivities = useMemo(() => {
    if (!selectedLease) return [];

    return localActivities.filter(
      (activity) =>
        activity.leaseId === selectedLease.lease_id &&
        activity.propertyId === selectedLease.property_id
    );
  }, [localActivities, selectedLease]);

  const selectedActivityLogs = useMemo(() => {
    if (!selectedLease) return [];

    return activityLogs.filter(
      (activity) =>
        activity.lease_id === selectedLease.lease_id &&
        activity.property_id === selectedLease.property_id
    );
  }, [activityLogs, selectedLease]);

  const selectedActivities = useMemo(
    () =>
      buildTenantActivities(
        selectedActivityLogs,
        selectedRentPayments,
        selectedDocuments,
        selectedNotes,
        selectedLocalActivities,
        profileId
      ),
    [
      profileId,
      selectedActivityLogs,
      selectedDocuments,
      selectedLocalActivities,
      selectedNotes,
      selectedRentPayments,
    ]
  );

  const tenantNotifications = useMemo(
    () =>
      buildTenantNotifications({
        selectedLease,
        selectedPaymentMethods,
        selectedRentPayments,
        selectedDocuments,
        selectedNotes,
        selectedActivities,
        profileId,
      }),
    [
      profileId,
      selectedActivities,
      selectedDocuments,
      selectedLease,
      selectedNotes,
      selectedPaymentMethods,
      selectedRentPayments,
    ]
  );

  const visibleNotifications = tenantNotifications.filter(
    (notification) => !dismissedNotifications.includes(notification.id)
  );
  const unreadNotificationCount = visibleNotifications.length;

  useEffect(() => {
    if (!profileId) return;

    try {
      const stored = window.localStorage.getItem(getTenantActivityStorageKey(profileId));
      if (!stored) return;

      const parsed = JSON.parse(stored) as TenantActivity[];
      window.setTimeout(() => {
        setLocalActivities(parsed.slice(0, 10));
      }, 0);
    } catch (error) {
      console.error("Tenant activity restore error:", error);
    }
  }, [profileId]);

  useEffect(() => {
    if (!profileId) return;

    try {
      window.localStorage.setItem(
        getTenantActivityStorageKey(profileId),
        JSON.stringify(localActivities.slice(0, 10))
      );
    } catch (error) {
      console.error("Tenant activity persist error:", error);
    }
  }, [localActivities, profileId]);

  useEffect(() => {
    if (!profileId) return;

    try {
      const stored = window.localStorage.getItem(
        getTenantNotificationStorageKey(profileId)
      );
      window.setTimeout(() => {
        setDismissedNotifications(stored ? JSON.parse(stored) : []);
      }, 0);
    } catch (error) {
      console.error("Tenant notification load error:", error);
      window.setTimeout(() => {
        setDismissedNotifications([]);
      }, 0);
    }
  }, [profileId]);

  useEffect(() => {
    if (!profileId) return;

    try {
      window.localStorage.setItem(
        getTenantNotificationStorageKey(profileId),
        JSON.stringify(dismissedNotifications.slice(0, 50))
      );
    } catch (error) {
      console.error("Tenant notification persist error:", error);
    }
  }, [dismissedNotifications, profileId]);

  async function loadActivitiesForLease(lease: TenantLease) {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("id, property_id, lease_id, activity_type, title, description, created_at")
      .eq("property_id", lease.property_id)
      .eq("lease_id", lease.lease_id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      logTenantSupabaseError("Tenant activity load error", error, {
        stage: "activity_logs select",
        propertyId: lease.property_id,
        leaseId: lease.lease_id,
        possibleCauses: ["activity_logs tenant SELECT RLS policy"],
      });
      return;
    }

    setActivityLogs((prev) => [
      ...prev.filter(
        (activity) =>
          activity.lease_id !== lease.lease_id ||
          activity.property_id !== lease.property_id
      ),
      ...((data || []) as ActivityLog[]),
    ]);
  }

  async function createTenantActivityLog({
    lease,
    activityType,
    title,
    description,
  }: {
    lease: TenantLease;
    activityType: string;
    title: string;
    description?: string;
  }) {
    if (!profileId) return null;

    const { data, error } = await supabase
      .from("activity_logs")
      .insert({
        profile_id: profileId,
        property_id: lease.property_id,
        lease_id: lease.lease_id,
        activity_type: activityType,
        title,
        description: description || null,
      })
      .select("id, property_id, lease_id, activity_type, title, description, created_at")
      .single();

    if (error) {
      logTenantSupabaseError("Tenant activity insert error", error, {
        stage: "activity_logs insert",
        propertyId: lease.property_id,
        leaseId: lease.lease_id,
        profileId,
        activityType,
        possibleCauses: ["activity_logs tenant INSERT RLS policy"],
      });
      return null;
    }

    const insertedActivity = data as ActivityLog;
    setActivityLogs((prev) => [insertedActivity, ...prev].slice(0, 20));
    return insertedActivity;
  }

  function addLocalTenantActivity(activity: TenantActivity) {
    setLocalActivities((prev) => [activity, ...prev].slice(0, 10));
  }

  async function loadNotesForLease(lease: TenantLease, tenantProfileId: string) {
    await Promise.resolve();
    setNotesLoading(true);
    setNoteError("");

    const [privateResult, sharedResult] = await Promise.all([
      supabase
        .from("property_notes")
        .select(
          "id, property_id, lease_id, profile_id, note_type, text, created_by_role, created_at"
        )
        .eq("property_id", lease.property_id)
        .eq("lease_id", lease.lease_id)
        .eq("profile_id", tenantProfileId)
        .eq("created_by_role", "tenant")
        .eq("note_type", "private")
        .order("created_at", { ascending: false }),

      supabase
        .from("property_notes")
        .select(
          "id, property_id, lease_id, profile_id, note_type, text, created_by_role, created_at"
        )
        .eq("property_id", lease.property_id)
        .eq("lease_id", lease.lease_id)
        .eq("note_type", "shared")
        .order("created_at", { ascending: false }),
    ]);

    if (privateResult.error || sharedResult.error) {
      console.error(
        "Tenant notes load error:",
        privateResult.error || sharedResult.error
      );
      setNoteError("Unable to load notes.");
      setNotesLoading(false);
      return;
    }

    const scopedNotes = [
      ...((privateResult.data || []) as PropertyNote[]),
      ...((sharedResult.data || []) as PropertyNote[]),
    ].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setNotes((prev) => [
      ...prev.filter(
        (note) =>
          note.lease_id !== lease.lease_id ||
          note.property_id !== lease.property_id
      ),
      ...scopedNotes,
    ]);
    setNotesLoading(false);
  }

  useEffect(() => {
    if (!selectedLease || !profileId) return;

    async function loadSelectedLeaseData() {
      if (!selectedLease || !profileId) return;
      await Promise.all([
        loadNotesForLease(selectedLease, profileId),
        loadActivitiesForLease(selectedLease),
      ]);
    }

    loadSelectedLeaseData();
  }, [profileId, selectedLease]);

  async function loadDocumentsForLease(lease: TenantLease) {
    setDocumentsLoading(true);
    setDocumentError("");

    const { data, error } = await supabase
      .from("lease_documents")
      .select(
        "id, property_id, lease_id, file_name, file_url, file_type, storage_path, file_size, uploaded_by_profile_id, created_at"
      )
      .eq("property_id", lease.property_id)
      .eq("lease_id", lease.lease_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Tenant documents load error:", error);
      setDocumentError("Unable to load documents.");
      setDocumentsLoading(false);
      return;
    }

    setDocuments((prev) => [
      ...prev.filter(
        (doc) =>
          doc.lease_id !== lease.lease_id || doc.property_id !== lease.property_id
      ),
      ...((data || []) as LeaseDocument[]),
    ]);
    setDocumentsLoading(false);
  }

  async function handleSaveNote() {
    if (!selectedLease || !profileId || savingNote || !newNote.trim()) return;

    setSavingNote(true);
    setNoteError("");

    const { data, error } = await supabase
      .from("property_notes")
      .insert({
        property_id: selectedLease.property_id,
        lease_id: selectedLease.lease_id,
        profile_id: profileId,
        note_type: noteType,
        text: newNote.trim(),
        created_by_role: "tenant",
      })
      .select(
        "id, property_id, lease_id, profile_id, note_type, text, created_by_role, created_at"
      )
      .single();

    if (error) {
      logTenantSupabaseError("Tenant note save error", error, {
        stage: "property_notes insert",
        propertyId: selectedLease.property_id,
        leaseId: selectedLease.lease_id,
        profileId,
        noteType,
        possibleCauses: [
          "missing property_notes column",
          "property_notes RLS insert policy",
          "invalid note_type or created_by_role value",
        ],
      });
      setNoteError("Unable to save note.");
      setSavingNote(false);
      return;
    }

    setNotes((prev) => [data as PropertyNote, ...prev]);
    await createTenantActivityLog({
      lease: selectedLease,
      activityType: "note_added",
      title: noteType === "shared" ? "Shared note added" : "Private note added",
      description: newNote.trim(),
    });
    setNewNote("");
    setNoteType("private");
    setNoteOpen(false);
    setSavingNote(false);
  }

  async function handleDeleteNote(note: PropertyNote) {
    if (
      !selectedLease ||
      !profileId ||
      deletingNoteId ||
      note.profile_id !== profileId ||
      note.created_by_role !== "tenant"
    ) {
      return;
    }

    setDeletingNoteId(note.id);
    setNoteError("");

    const { error } = await supabase
      .from("property_notes")
      .delete()
      .eq("id", note.id)
      .select("id")
      .maybeSingle();

    if (error) {
      logTenantSupabaseError("Tenant note delete error", error, {
        stage: "property_notes delete",
        noteId: note.id,
        propertyId: selectedLease.property_id,
        leaseId: selectedLease.lease_id,
        profileId,
        possibleCauses: [
          "property_notes RLS delete policy",
          "note does not belong to tenant profile",
          "note is not scoped to selected lease/property",
        ],
      });
      setNoteError("Unable to delete note.");
      setDeletingNoteId("");
      return;
    }

    if (!error) {
      const { data: stillExists, error: verifyError } = await supabase
        .from("property_notes")
        .select("id")
        .eq("id", note.id)
        .maybeSingle();

      if (verifyError) {
        logTenantSupabaseError("Tenant note delete verification error", verifyError, {
          stage: "property_notes delete verification",
          noteId: note.id,
          propertyId: selectedLease.property_id,
          leaseId: selectedLease.lease_id,
          profileId,
        });
      }

      if (stillExists) {
        logTenantSupabaseError("Tenant note delete did not persist", null, {
          stage: "property_notes delete verification",
          noteId: note.id,
          propertyId: selectedLease.property_id,
          leaseId: selectedLease.lease_id,
          profileId,
          possibleCauses: [
            "property_notes RLS delete policy did not match",
            "delete filters did not match the row",
          ],
        });
        setNoteError("Unable to delete note.");
        setDeletingNoteId("");
        return;
      }
    }

    const deleteTitle =
      note.note_type === "private" ? "Private note deleted" : "Shared note deleted";
    const insertedActivity = await createTenantActivityLog({
      lease: selectedLease,
      activityType: "note_deleted",
      title: deleteTitle,
      description: truncateActivityText(note.text),
    });

    if (!insertedActivity) {
      addLocalTenantActivity({
        id: `note-delete-${note.id}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        icon: "delete",
        title: deleteTitle,
        subtitle: truncateActivityText(note.text),
        badge: "Tenant",
        badgeClass: "bg-[#FFF1F2] text-[#B9476D]",
        iconClass: "bg-[#FFF1F2] text-[#B9476D] ring-1 ring-[#F8D7DF]",
        amountClass: "text-zinc-500",
        propertyId: selectedLease.property_id,
        leaseId: selectedLease.lease_id,
      });
    }
    setNotes((prev) => prev.filter((item) => item.id !== note.id));
    setDeleteTarget(null);
    setDeletingNoteId("");
  }

  async function handleDocumentUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (uploadingDocument) return;

    if (!file) {
      setDocumentError("Choose a document to upload.");
      return;
    }

    if (!selectedLease?.property_id || !selectedLease?.lease_id) {
      logTenantSupabaseError("Tenant document upload blocked", null, {
        stage: "defensive lease check",
        selectedLease,
        possibleCauses: ["missing selected lease", "missing property_id", "missing lease_id"],
      });
      setDocumentError("Lease access is not ready yet.");
      return;
    }

    if (!profileId) {
      logTenantSupabaseError("Tenant document upload blocked", null, {
        stage: "defensive profile check",
        possibleCauses: ["missing tenant profile", "profile load failed"],
      });
      setDocumentError("Your profile is not ready yet.");
      return;
    }

    const allowedTypes = new Set([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]);
    const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"];
    const lowerName = file.name.toLowerCase();
    const validExtension = allowedExtensions.some((extension) =>
      lowerName.endsWith(extension)
    );
    const maxFileSize = 10 * 1024 * 1024;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${selectedLease.property_id}/${selectedLease.lease_id}/tenant-${profileId}-${Date.now()}-${safeName}`;

    setDocumentError("");

    if (!file.name.trim() || !safeName.trim()) {
      setDocumentError("This file name cannot be uploaded.");
      return;
    }

    if (!allowedTypes.has(file.type) && !validExtension) {
      setDocumentError("Upload PDF, JPG, PNG, DOC, or DOCX files only.");
      return;
    }

    if (file.size > maxFileSize) {
      setDocumentError("Files must be 10 MB or smaller.");
      return;
    }

    if (
      !filePath ||
      filePath.includes("//") ||
      !filePath.startsWith(`${selectedLease.property_id}/${selectedLease.lease_id}/`)
    ) {
      logTenantSupabaseError("Tenant document upload blocked", null, {
        stage: "defensive storage path check",
        filePath,
        propertyId: selectedLease.property_id,
        leaseId: selectedLease.lease_id,
        profileId,
      });
      setDocumentError("Unable to prepare this upload.");
      return;
    }

    setUploadingDocument(true);
    let uploadedPath: string | null = null;

    try {
      const { error: uploadError } = await supabase.storage
        .from("lease-documents")
        .upload(filePath, file);

      if (uploadError) {
        logTenantSupabaseError("Tenant document upload error", uploadError, {
          stage: "storage upload",
          bucket: "lease-documents",
          filePath,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          propertyId: selectedLease.property_id,
          leaseId: selectedLease.lease_id,
          profileId,
          possibleCauses: [
            "missing lease-documents bucket",
            "storage RLS/policy rejected insert",
            "bucket file size or MIME restriction",
            "invalid storage path",
          ],
        });
        setDocumentError("Unable to upload document.");
        return;
      }

      uploadedPath = filePath;

      const { error: insertError } = await supabase
        .from("lease_documents")
        .insert({
          property_id: selectedLease.property_id,
          lease_id: selectedLease.lease_id,
          file_name: file.name,
          file_type: file.type || null,
          file_size: file.size,
          storage_path: filePath,
          uploaded_by_profile_id: profileId,
        });

      if (insertError) {
        logTenantSupabaseError("Tenant document upload error", insertError, {
          stage: "lease_documents insert",
          table: "lease_documents",
          bucket: "lease-documents",
          filePath,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          propertyId: selectedLease.property_id,
          leaseId: selectedLease.lease_id,
          profileId,
          insertedColumns: [
            "property_id",
            "lease_id",
            "file_name",
            "file_type",
            "file_size",
            "storage_path",
            "uploaded_by_profile_id",
          ],
          possibleCauses: [
            "missing lease_documents column",
            "lease_documents RLS insert policy",
            "foreign key rejected property_id or lease_id",
            "tenant profile lacks permission for this lease/property",
          ],
        });

        const { error: cleanupError } = await supabase.storage
          .from("lease-documents")
          .remove([filePath]);

        if (cleanupError) {
          logTenantSupabaseError("Tenant document cleanup error", cleanupError, {
            stage: "storage cleanup after DB insert failure",
            bucket: "lease-documents",
            filePath,
            possibleCauses: [
              "storage RLS/policy rejected delete",
              "uploaded object path not found",
            ],
          });
        } else {
          uploadedPath = null;
        }

        setDocumentError("Unable to save document details.");
        return;
      }

      await createTenantActivityLog({
        lease: selectedLease,
        activityType: "document_uploaded",
        title: "Document uploaded",
        description: file.name,
      });
      await loadDocumentsForLease(selectedLease);
    } catch (error) {
      logTenantSupabaseError("Tenant document upload error", error, {
        stage: "unexpected upload exception",
        bucket: "lease-documents",
        uploadedPath,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        propertyId: selectedLease.property_id,
        leaseId: selectedLease.lease_id,
        profileId,
      });
      setDocumentError("Unable to upload document.");
    } finally {
      setUploadingDocument(false);
    }
  }

  async function handleDeleteDocument(doc: LeaseDocument) {
    if (
      !selectedLease ||
      !profileId ||
      deletingDocumentId ||
      doc.uploaded_by_profile_id !== profileId
    ) {
      return;
    }

    if (
      doc.property_id !== selectedLease.property_id ||
      doc.lease_id !== selectedLease.lease_id
    ) {
      setDocumentError("Document is not linked to this lease.");
      return;
    }

    if (!doc.storage_path) {
      setDocumentError("Document file path is missing.");
      return;
    }

    setDeletingDocumentId(doc.id);
    setDocumentError("");

    const { error: dbError } = await supabase
      .from("lease_documents")
      .delete()
      .eq("id", doc.id)
      .select("id")
      .maybeSingle();

    if (dbError) {
      logTenantSupabaseError("Tenant document metadata delete error", dbError, {
        stage: "lease_documents delete",
        table: "lease_documents",
        bucket: "lease-documents",
        storagePath: doc.storage_path,
        documentId: doc.id,
        propertyId: doc.property_id,
        leaseId: doc.lease_id,
        profileId,
        possibleCauses: [
          "lease_documents RLS delete policy",
          "metadata row does not belong to tenant profile",
          "metadata row is not scoped to selected lease/property",
        ],
      });
      setDocumentError("Unable to delete document.");
      setDeletingDocumentId("");
      return;
    }

    const { data: stillExists, error: verifyError } = await supabase
      .from("lease_documents")
      .select("id")
      .eq("id", doc.id)
      .maybeSingle();

    if (verifyError) {
      logTenantSupabaseError("Tenant document delete verification error", verifyError, {
        stage: "lease_documents delete verification",
        documentId: doc.id,
        propertyId: doc.property_id,
        leaseId: doc.lease_id,
        profileId,
      });
    }

    if (stillExists) {
      logTenantSupabaseError("Tenant document delete did not persist", null, {
        stage: "lease_documents delete verification",
        documentId: doc.id,
        propertyId: doc.property_id,
        leaseId: doc.lease_id,
        profileId,
        possibleCauses: [
          "lease_documents RLS delete policy did not match",
          "delete filters did not match the row",
        ],
      });
      setDocumentError("Unable to delete document.");
      setDeletingDocumentId("");
      return;
    }

    const insertedActivity = await createTenantActivityLog({
      lease: selectedLease,
      activityType: "document_deleted",
      title: "Document deleted",
      description: `${doc.file_name} was removed.`,
    });

    if (!insertedActivity) {
      addLocalTenantActivity({
        id: `document-delete-${doc.id}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        icon: "delete",
        title: "Document deleted",
        subtitle: doc.file_name,
        badge: "Tenant",
        badgeClass: "bg-[#FFF1F2] text-[#B9476D]",
        iconClass: "bg-[#FFF1F2] text-[#B9476D] ring-1 ring-[#F8D7DF]",
        amountClass: "text-zinc-500",
        propertyId: selectedLease.property_id,
        leaseId: selectedLease.lease_id,
      });
    }
    setDocuments((prev) => prev.filter((item) => item.id !== doc.id));
    setDeleteTarget(null);

    const { error: storageError } = await supabase.storage
      .from("lease-documents")
      .remove([doc.storage_path]);

    if (storageError) {
      logTenantSupabaseError("Tenant document storage cleanup error", storageError, {
        stage: "storage delete after lease_documents delete",
        bucket: "lease-documents",
        storagePath: doc.storage_path,
        documentId: doc.id,
        propertyId: doc.property_id,
        leaseId: doc.lease_id,
        profileId,
        possibleCauses: [
          "storage RLS/policy rejected delete",
          "stored object path does not exist",
        ],
      });
    }

    setDeletingDocumentId("");
  }

  async function viewDocument(doc: LeaseDocument) {
    if (doc.storage_path) {
      const { data, error } = await supabase.storage
        .from("lease-documents")
        .createSignedUrl(doc.storage_path, 60);

      if (error || !data?.signedUrl) {
        logTenantSupabaseError("Tenant document view error", error, {
          stage: "storage signed URL",
          bucket: "lease-documents",
          storagePath: doc.storage_path,
          documentId: doc.id,
          propertyId: doc.property_id,
          leaseId: doc.lease_id,
          possibleCauses: [
            "missing lease-documents bucket",
            "storage RLS/policy rejected signed URL",
            "stored object path does not exist",
          ],
        });
        setDocumentError("Unable to open document.");
        return;
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (doc.file_url) {
      window.open(doc.file_url, "_blank", "noopener,noreferrer");
    }
  }

  async function downloadDocument(doc: LeaseDocument) {
    if (doc.storage_path) {
      const { data, error } = await supabase.storage
        .from("lease-documents")
        .download(doc.storage_path);

      if (error || !data) {
        logTenantSupabaseError("Tenant document download error", error, {
          stage: "storage download",
          bucket: "lease-documents",
          storagePath: doc.storage_path,
          documentId: doc.id,
          propertyId: doc.property_id,
          leaseId: doc.lease_id,
          possibleCauses: [
            "missing lease-documents bucket",
            "storage RLS/policy rejected download",
            "stored object path does not exist",
          ],
        });
        setDocumentError("Unable to download document.");
        return;
      }

      const url = URL.createObjectURL(data);
      const link = document.createElement("a");

      link.href = url;
      link.download = doc.file_name || "document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    if (doc.file_url) {
      window.open(doc.file_url, "_blank", "noopener,noreferrer");
    }
  }

  if (loading) {
    return (
      <main className="flex h-screen items-center justify-center bg-white text-sm text-zinc-500">
        Loading tenant portal...
      </main>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-white font-sans text-[#0F172A]">
      <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-zinc-100 bg-white px-7">
        <div className="flex items-center gap-5">
  <img src="/logo.png" alt="AvenueBoard" className="h-8 w-auto" />

  <div className="h-9 w-px bg-zinc-200" />

  <div>
    <p className="text-[14px] font-semibold tracking-[-0.03em] text-zinc-950">
      Tenant Portal
    </p>
    <p className="mt-0.5 max-w-[360px] truncate text-[12px] font-medium text-zinc-400">

      {getLeaseAddressLabel(selectedLease)}

    </p>

  </div>
</div>

        <div className="flex items-center gap-5">
          {leases.length > 1 && (
            <div className="hidden min-w-[220px] sm:block">
              <label className="sr-only" htmlFor="tenant-lease-switcher">
                Select rental property
              </label>
              <select
                id="tenant-lease-switcher"
                value={selectedLease?.lease_id || ""}
                onChange={(event) => handleLeaseSelection(event.target.value)}
                className="h-10 max-w-[280px] rounded-2xl border border-zinc-200 bg-white px-3 text-[13px] font-semibold text-zinc-950 outline-none transition hover:bg-zinc-50 focus:border-[#B9476D] focus:ring-4 focus:ring-[#B9476D]/10"
              >
                {leases.map((lease) => (
                  <option key={lease.tenant_access_id} value={lease.lease_id}>
                    {lease.property_label}
                    {lease.unit_name ? ` · Unit ${lease.unit_name}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="relative">
            <button
              onClick={() => {
                setNotificationOpen((value) => !value);
                setProfileOpen(false);
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-700 hover:bg-zinc-50"
              aria-label="Notifications"
            >
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 17H9m9-6a6 6 0 0 0-12 0c0 3-.8 4.5-2 6h16c-1.2-1.5-2-3-2-6Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 20a2.2 2.2 0 0 0 4 0"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>

              {unreadNotificationCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#B9476D] px-1 text-[11px] font-bold text-white shadow-sm">
                  {unreadNotificationCount}
                </span>
              )}
            </button>

            {notificationOpen && (
              <>
                <button
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setNotificationOpen(false)}
                  aria-label="Close notifications"
                />

                <div className="absolute right-0 top-14 z-50 w-[360px] overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.16)]">
                  <div className="border-b border-zinc-100 px-5 py-4">
                    <p className="text-[15px] font-semibold text-zinc-900">
                      Notifications
                    </p>
                  </div>

                  <div className="max-h-[420px] overflow-y-auto">
                    {visibleNotifications.length === 0 ? (
                      <div className="px-5 py-10 text-center">
                        <p className="text-[14px] font-semibold text-zinc-800">
                          No new notifications
                        </p>
                        <p className="mt-2 text-[12px] leading-5 text-zinc-500">
                          You’re all caught up.
                        </p>
                      </div>
                    ) : (
                      visibleNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="border-b border-zinc-100 px-5 py-4 last:border-b-0"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-zinc-900">
                                {notification.title}
                              </p>
                              <p className="mt-1 text-[12px] leading-5 text-zinc-500">
                                {notification.message}
                              </p>
                            </div>

                            <button
                              onClick={() =>
                                setDismissedNotifications((prev) => [
                                  ...prev,
                                  notification.id,
                                ])
                              }
                              className="shrink-0 text-[16px] text-zinc-400 hover:text-zinc-700"
                              aria-label="Dismiss notification"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="h-8 w-px bg-zinc-200" />

          <button className="hidden h-10 items-center gap-2 rounded-2xl px-3 text-[13px] font-semibold text-zinc-950 transition hover:bg-zinc-50 sm:flex">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 13v-1a8 8 0 0 1 16 0v1"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4 13v3a2 2 0 0 0 2 2h1v-7H6a2 2 0 0 0-2 2ZM20 13v3a2 2 0 0 1-2 2h-1v-7h1a2 2 0 0 1 2 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 18c0 1.1-.9 2-2 2h-2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Support
          </button>

          <div className="hidden h-8 w-px bg-zinc-200 sm:block" />

          <div className="relative">
            <button
              onClick={() => setProfileOpen((value) => !value)}
              className="flex items-center gap-3 rounded-2xl px-2 py-1.5 hover:bg-zinc-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0F172A] text-[13px] font-semibold text-white">
                {getInitials(userInfo.name)}
              </div>

              <div className="hidden text-left sm:block">
                <p className="max-w-[190px] truncate text-[14px] font-semibold text-zinc-950">
                  {userInfo.name}
                </p>
                <p className="text-[12px] text-zinc-500">Tenant</p>
              </div>

              <span className="text-zinc-400">⌄</span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-[56px] z-20 w-[260px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.14)]">
                <div className="border-b border-zinc-100 px-4 py-4">
                  <p className="truncate text-[14px] font-semibold text-zinc-900">
                    {userInfo.name}
                  </p>
                  <p className="mt-1 truncate text-[12px] text-zinc-500">
                    {userInfo.email}
                  </p>
                </div>

                {hasLandlordRole && (
                  <button
                    onClick={() => router.push("/select-mode")}
                    className="flex h-11 w-full items-center px-4 text-[13px] font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Switch mode
                  </button>
                )}

                <button className="flex h-11 w-full items-center px-4 text-[13px] font-medium text-zinc-700 hover:bg-zinc-50">
                  Profile settings
                </button>

                <button className="flex h-11 w-full items-center px-4 text-[13px] font-medium text-zinc-700 hover:bg-zinc-50">
                  Support
                </button>

                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.push("/login");
                  }}
                  className="flex h-11 w-full items-center border-t border-zinc-100 px-4 text-[13px] font-semibold text-[#B9476D] hover:bg-zinc-50"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {leases.length === 0 ? (
        <div className="flex h-[calc(100vh-76px)] items-center justify-center px-6 text-center">
          <div>
            <h1 className="text-[30px] font-semibold tracking-[-0.05em]">
              No active lease access
            </h1>
            <p className="mt-3 max-w-[460px] text-[15px] leading-7 text-zinc-500">
              Your landlord invitation has not been connected yet. Open your
              invite email and accept the invitation to access your tenant
              portal.
            </p>
          </div>
        </div>
      ) : (
        
        <div className="grid h-[calc(100vh-76px)] grid-cols-[minmax(0,1fr)_405px] gap-4 overflow-hidden bg-white px-4 py-4">
        <div className="grid min-h-0 grid-rows-[390px_285px_minmax(0,1fr)] gap-4 overflow-hidden">
            <PaymentHero
            lease={selectedLease}
            paymentMethods={selectedPaymentMethods}
            firstName={getFirstName(userInfo.name)}
            />

            <NotesDocumentsCard
                notes={selectedNotes}
                notesLoading={notesLoading}
                noteError={noteError}
                documents={selectedDocuments}
                documentsLoading={documentsLoading}
                documentError={documentError}
                uploadingDocument={uploadingDocument}
                fileInputRef={fileInputRef}
                profileId={profileId}
                deletingNoteId={deletingNoteId}
                deletingDocumentId={deletingDocumentId}
                onAddNote={() => setNoteOpen(true)}
                onViewAllNotes={() => setNotesModalOpen(true)}
                onViewAllDocuments={() => setDocumentsModalOpen(true)}
                onDocumentUpload={handleDocumentUpload}
                onViewDocument={viewDocument}
                onDownloadDocument={downloadDocument}
                onDeleteNote={(note) => setDeleteTarget({ type: "note", item: note })}
                onDeleteDocument={(doc) =>
                  setDeleteTarget({ type: "document", item: doc })
                }
            />

            <RecentActivityCard
              activities={selectedActivities}
              onViewMore={() => setActivitiesModalOpen(true)}
            />
          </div>

          <aside className="grid min-h-0 grid-rows-[490px_minmax(0,1fr)] gap-4 overflow-hidden">
            <PaymentProgressCard
              lease={selectedLease}
              payments={selectedRentPayments}
            />
            <QuickAccessCard
              propertyContact={selectedPropertyContact}
            />
          </aside>
        </div>
      )}

      {noteOpen && (
  <AddNoteModal
    noteType={noteType}
    setNoteType={setNoteType}
    newNote={newNote}
    setNewNote={setNewNote}
    onClose={() => setNoteOpen(false)}
    onSave={handleSaveNote}
    saving={savingNote}
    error={noteError}
  />
)}

      {deleteTarget && (
        <ConfirmDeleteModal
          title={deleteTarget.type === "note" ? "Delete note?" : "Delete document?"}
          body={
            deleteTarget.type === "note"
              ? "This note will be permanently removed."
              : "This document will be permanently removed."
          }
          deleting={
            deleteTarget.type === "note"
              ? deletingNoteId === deleteTarget.item.id
              : deletingDocumentId === deleteTarget.item.id
          }
          onCancel={() => {
            if (!deletingNoteId && !deletingDocumentId) setDeleteTarget(null);
          }}
          onConfirm={() => {
            if (deleteTarget.type === "note") {
              handleDeleteNote(deleteTarget.item);
              return;
            }

            handleDeleteDocument(deleteTarget.item);
          }}
        />
      )}

      {notesModalOpen && (
        <ViewAllNotesModal
          notes={selectedNotes}
          loading={notesLoading}
          error={noteError}
          profileId={profileId}
          deletingNoteId={deletingNoteId}
          onClose={() => setNotesModalOpen(false)}
          onDeleteNote={(note) => setDeleteTarget({ type: "note", item: note })}
        />
      )}

      {documentsModalOpen && (
        <ViewAllDocumentsModal
          documents={selectedDocuments}
          loading={documentsLoading}
          error={documentError}
          profileId={profileId}
          deletingDocumentId={deletingDocumentId}
          onClose={() => setDocumentsModalOpen(false)}
          onViewDocument={viewDocument}
          onDownloadDocument={downloadDocument}
          onDeleteDocument={(doc) =>
            setDeleteTarget({ type: "document", item: doc })
          }
        />
      )}

      {activitiesModalOpen && (
        <ViewMoreActivitiesModal
          activities={selectedActivities.slice(0, 10)}
          onClose={() => setActivitiesModalOpen(false)}
        />
      )}

    </main>
  );
}
