"use client";

import {
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  CircleDot,
  DollarSign,
  FileText,
  Home,
  LifeBuoy,
  StickyNote,
  Trash2,
  User,
  UserCheck,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOrCreateProfile } from "@/lib/getOrCreateProfile";
import { triggerEmailEvent } from "@/lib/email/triggerEmailEvent";

type TenantRecord = {
  invite_token: string | null;
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  tenant_role: string;
  invite_status: string | null;
};

type ActivityLog = {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  created_at: string;
};

type LeaseDocumentRecord = {
  id: string;
  created_at?: string | null;
  file_name: string;
  file_url: string | null;
  file_type: string | null;
  storage_path?: string | null;
  file_size?: number | null;
};

type RentPaymentRecord = {
  id: string;
  period_label?: string | null;
  status?: string | null;
  amount?: number | null;
  paid_at?: string | null;
  created_at?: string | null;
};

type PropertyRecord = {
  id: string;
  created_at?: string | null;
  property_label: string;
  street_address: string;
  city: string;
  state_name: string;
  zip: string;
  property_type: string;
  units: string;
  unit_name: string | null;
  bank_status: string | null;
  status: string | null;
  leases?: {
    id: string;
    start_date: string;
    end_date: string;
    monthly_rent: number;
    security_deposit: number | null;
    rent_due_day: string;
    lease_status: string | null;
    payment_status: string | null;
    lease_tenants?: TenantRecord[];
    lease_documents?: LeaseDocumentRecord[];
}[];
};

type PropertyNote = {
  id: string;
  text: string;
  type: "private" | "shared";
  created_at: string;
  created_by_role: "landlord" | "tenant";
};

type MonthStatus = "paid" | "upcoming" | "late" | "future" | "inactive";

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<PropertyRecord | null>(null);
  const [profileId, setProfileId] = useState("");
  const [loading, setLoading] = useState(true);

  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [editForm, setEditForm] = useState({
    propertyLabel: "",
    streetAddress: "",
    city: "",
    stateName: "",
    zip: "",
  });

  const [selectedTenant, setSelectedTenant] = useState<TenantRecord | null>(
    null
  );
  const [savingTenant, setSavingTenant] = useState(false);
  const [tenantForm, setTenantForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const [noteOpen, setNoteOpen] = useState(false);
  const [notes, setNotes] = useState<PropertyNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState<"private" | "shared">("private");
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [paymentRequestOpen, setPaymentRequestOpen] = useState(false);
  const [selectedPaymentTenant, setSelectedPaymentTenant] =
  useState<TenantRecord | null>(null);
  const [additionalAmount, setAdditionalAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [sendingPaymentRequest, setSendingPaymentRequest] = useState(false);
  const [tenantManageOpen, setTenantManageOpen] = useState(false);
  const [tenantMode, setTenantMode] = useState<"add" | "edit">("add");
  const [inviteConfirmOpen, setInviteConfirmOpen] = useState(false);
  const [inviteTenant, setInviteTenant] = useState<TenantRecord | null>(null);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteSentSuccess, setInviteSentSuccess] = useState(false);
  const [leaseEditOpen, setLeaseEditOpen] = useState(false);
  const [noteDeleteOpen, setNoteDeleteOpen] = useState(false);
  const [selectedNoteDelete, setSelectedNoteDelete] = useState<PropertyNote | null>(null);
  const [deletingNote, setDeletingNote] = useState(false);
  const [savingLease, setSavingLease] = useState(false);
  const [documentDeleteOpen, setDocumentDeleteOpen] = useState(false);
  const [selectedDocumentDelete, setSelectedDocumentDelete] =
    useState<LeaseDocumentRecord | null>(null);
  const [deletingDocument, setDeletingDocument] = useState(false);
  const [notesViewOpen, setNotesViewOpen] = useState(false);
  const [documentsViewOpen, setDocumentsViewOpen] = useState(false);
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);
  const [activityHistoryOpen, setActivityHistoryOpen] = useState(false);
  const [tenantsExpanded, setTenantsExpanded] = useState(false);
  const [tenantDeleteTarget, setTenantDeleteTarget] =
    useState<TenantRecord | null>(null);
  const [deletingTenant, setDeletingTenant] = useState(false);
  const tenantPopoverRef = useRef<HTMLDivElement | null>(null);
  const [payments, setPayments] = useState<RentPaymentRecord[]>([]);
  const [leaseForm, setLeaseForm] = useState({
   startDate: "",
   endDate: "",
   monthlyRent: "",
   rentDueDay: "",
   });

  useEffect(() => {
    async function loadPropertyDashboard() {
      try {
        const { data } = await supabase.auth.getUser();

        if (!data.user) {
          router.push("/login");
          return;
        }

        const profile = await getOrCreateProfile();
        setProfileId(profile.id);

        const { data: propertyData, error: propertyError } = await supabase
          .from("properties")
          .select(
            `
            *,
            leases (
              id,
              start_date,
              end_date,
              monthly_rent,
              security_deposit,
              rent_due_day,
              lease_status,
              payment_status,
              lease_tenants (
                id,
                first_name,
                last_name,
                email,
                phone,
                tenant_role,
                invite_status,
                invite_token
              ),
              lease_documents (
  id,
  created_at,
  file_name,
  file_url,
  file_type,
  storage_path,
  file_size
)
            )
          `
          )
          .eq("id", propertyId)
          .eq("owner_profile_id", profile.id)
          .single();

        if (propertyError) {
          console.error("Property detail load error:", propertyError);
          router.push("/dashboard");
          return;
        }

        const loadedProperty = propertyData as PropertyRecord;
        const lease = loadedProperty.leases?.[0];

        setProperty(loadedProperty);

if (lease?.id) {
  const { data: paymentData, error: paymentError } = await supabase
    .from("rent_payments")
    .select("*")
    .eq("lease_id", lease.id)
    .order("created_at", { ascending: true });

  if (!paymentError) {
    setPayments(paymentData || []);
  }
}

        const { data: activityData, error: activityError } = await supabase
  .from("activity_logs")
  .select("*")
  .eq("property_id", propertyId)
  .order("created_at", { ascending: false })
  .limit(50);

if (!activityError) {
  setActivities(activityData || []);
}

        setEditForm({
          propertyLabel: loadedProperty.property_label || "",
          streetAddress: loadedProperty.street_address || "",
          city: loadedProperty.city || "",
          stateName: loadedProperty.state_name || "",
          zip: loadedProperty.zip || "",
        });

        const { data: noteData, error: noteError } = await supabase
  .from("property_notes")
  .select("*")
  .eq("property_id", propertyId)
  .order("created_at", { ascending: false });

if (!noteError) {
  setNotes(
    (noteData || []).map((note) => ({
      id: note.id,
      text: note.text,
      type: note.note_type,
      created_at: note.created_at,
      created_by_role: note.created_by_role || "landlord",
    }))
  );
}


        if (searchParams.get("edit") === "true") {
          setEditOpen(true);
        }
      } catch (error) {
        console.error("Property dashboard load error:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    if (propertyId) loadPropertyDashboard();
  }, [propertyId, router, searchParams]);

  useEffect(() => {
    if (!tenantsExpanded) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        tenantPopoverRef.current &&
        !tenantPopoverRef.current.contains(event.target as Node)
      ) {
        setTenantsExpanded(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setTenantsExpanded(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [tenantsExpanded]);

  async function handleSavePropertyEdit() {
    if (!property) return;

    setSavingEdit(true);

    const { error } = await supabase
      .from("properties")
      .update({
        property_label: editForm.propertyLabel.trim(),
        street_address: editForm.streetAddress.trim(),
        city: editForm.city.trim(),
        state_name: editForm.stateName.trim(),
        zip: editForm.zip.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", property.id)
      .eq("owner_profile_id", profileId);

    if (error) {
      console.error("Property update error:", error);
      setSavingEdit(false);
      return;
    }

    setProperty({
      ...property,
      property_label: editForm.propertyLabel.trim(),
      street_address: editForm.streetAddress.trim(),
      city: editForm.city.trim(),
      state_name: editForm.stateName.trim(),
      zip: editForm.zip.trim(),
    });

    setEditOpen(false);
    setSavingEdit(false);
  }

  function openTenantAdd() {
  setSelectedTenant(null);
  setTenantMode("add");
  setTenantForm({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  setTenantManageOpen(true);
}

function openTenantManageEdit(tenant: TenantRecord) {
  setSelectedTenant(tenant);
  setTenantMode("edit");
  setTenantForm({
    firstName: tenant.first_name || "",
    lastName: tenant.last_name || "",
    email: tenant.email || "",
    phone: tenant.phone || "",
  });
  setTenantManageOpen(true);
}

  async function handleRequestTenantPayment(tenant: TenantRecord) {
  if (!property || sendingPaymentRequest) return;

  setSendingPaymentRequest(true);

  const { error } = await supabase.functions.invoke("send-payment-request", {
    body: {
      tenant_id: tenant.id,
      tenant_email: tenant.email,
      tenant_name: `${tenant.first_name} ${tenant.last_name}`,
      property_id: property.id,
      property_label: property.property_label,
      lease_id: property.leases?.[0]?.id || null,
      monthly_rent: property.leases?.[0]?.monthly_rent || 0,
      rent_due_day: property.leases?.[0]?.rent_due_day || null,
      additional_amount: additionalAmount ? Number(additionalAmount) : 0,
      note: paymentNote.trim() || null,
    },
  });

  setSendingPaymentRequest(false);

  if (error) {
    console.error("Payment request error:", error);
    alert("Unable to send payment request.");
    return;
  }

  await supabase.from("activity_logs").insert({
    property_id: property.id,
    profile_id: profileId,
    lease_id: property.leases?.[0]?.id || null,
    activity_type: "payment_request_sent",
    title: "Payment request sent",
    description: `Payment request sent to ${tenant.email}`,
  });
  alert("Payment request sent successfully.");
  setAdditionalAmount("");
  setPaymentNote("");
  setSelectedPaymentTenant(null);
  setPaymentRequestOpen(false);
}

async function handleDeleteTenant(tenant: TenantRecord) {
  if (!property || deletingTenant) return;

  setDeletingTenant(true);

  const { error } = await supabase
    .from("lease_tenants")
    .delete()
    .eq("id", tenant.id);

  if (error) {
    console.error("Delete tenant error:", error);
    setDeletingTenant(false);
    alert("Unable to delete tenant.");
    return;
  }

  setProperty({
    ...property,
    leases: property.leases?.map((lease) => ({
      ...lease,
      lease_tenants: lease.lease_tenants?.filter((t) => t.id !== tenant.id),
    })),
  });
  setTenantDeleteTarget(null);
  setDeletingTenant(false);
}

async function sendTenantInvite(tenant: TenantRecord, showSuccess = true) {
  if (!property) return false;

if (!tenant.invite_token) {
  alert("Invite token is missing for this tenant. Please recreate the invite.");
  return false;
}

  const { error } = await supabase.functions.invoke("resend-email", {
    body: {
      tenantEmail: tenant.email,
      tenantName: `${tenant.first_name} ${tenant.last_name}`,
      propertyName: property.property_label,
      inviteLink: `${window.location.origin}/tenant/accept-invite?token=${tenant.invite_token}`,
    },
  });

  if (error) {
    console.error("Tenant invite error:", error);
    alert("Unable to send invite. Please try again.");
    return false;
  }

  await supabase.from("activity_logs").insert({
    property_id: property.id,
    profile_id: profileId,
    lease_id: property.leases?.[0]?.id || null,
    activity_type: "tenant_invite_resent",
    title: "Tenant invite sent",
    description: `Invite sent to ${tenant.email}`,
  });

  await triggerEmailEvent({
    trigger: "tenant_invite_created",
    propertyId: property.id,
    leaseId: property.leases?.[0]?.id || null,
    tenantId: tenant.id,
  });

  return true;
}

  function handleResendTenantInvite(tenant: TenantRecord) {
  if (!tenant.email) {
    alert("This tenant does not have an email address.");
    return;
  }

  setInviteTenant(tenant);
  setInviteConfirmOpen(true);
}

async function confirmResendTenantInvite() {
  if (!inviteTenant || !property) return;

  setSendingInvite(true);

  const sent = await sendTenantInvite(inviteTenant, false);

  setSendingInvite(false);

  if (!sent) return;

  setInviteSentSuccess(true);

  setTimeout(() => {
    setInviteConfirmOpen(false);
    setInviteTenant(null);
    setInviteSentSuccess(false);
  }, 1400);
}

async function handleAddTenant() {
  if (!property || !lease?.id) return;

  setSavingTenant(true);

  const { data, error } = await supabase
    .from("lease_tenants")
    .insert({
      lease_id: lease.id,
      first_name: tenantForm.firstName.trim(),
      last_name: tenantForm.lastName.trim(),
      email: tenantForm.email.trim() || null,
      phone: tenantForm.phone.trim() || null,
      tenant_role: "secondary",
invite_status: "not_sent",
    })
    .select()
    .single();

  if (error) {
    console.error("Add tenant error:", error);
    alert("Unable to add tenant.");
    setSavingTenant(false);
    return;
  }

  const newTenant = data as TenantRecord;

  setProperty({
    ...property,
    leases: property.leases?.map((leaseItem) =>
      leaseItem.id === lease.id
        ? {
            ...leaseItem,
            lease_tenants: [...(leaseItem.lease_tenants || []), newTenant],
          }
        : leaseItem
    ),
  });


  setTenantForm({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  setTenantManageOpen(false);
  setSavingTenant(false);
}

  async function handleSaveTenantEdit() {
    if (!selectedTenant || !property) return;

    setSavingTenant(true);

    const { error } = await supabase
      .from("lease_tenants")
      .update({
        first_name: tenantForm.firstName.trim(),
        last_name: tenantForm.lastName.trim(),
        email: tenantForm.email.trim() || null,
        phone: tenantForm.phone.trim() || null,
      })
      .eq("id", selectedTenant.id);

    if (error) {
      console.error("Tenant update error:", error);
      setSavingTenant(false);
      return;
    }

    setProperty({
      ...property,
      leases: property.leases?.map((lease) => ({
        ...lease,
        lease_tenants: lease.lease_tenants?.map((tenant) =>
          tenant.id === selectedTenant.id
            ? {
                ...tenant,
                first_name: tenantForm.firstName.trim(),
                last_name: tenantForm.lastName.trim(),
                email: tenantForm.email.trim() || null,
                phone: tenantForm.phone.trim() || null,
              }
            : tenant
        ),
      })),
    });

    setTenantManageOpen(false);
    setSelectedTenant(null);
    setSavingTenant(false);
  }

  async function handleDeleteProperty() {
    if (!property || deleting) return;

    setDeleting(true);

    try {
      const leaseIds = (property.leases || []).map((lease) => lease.id);

      await supabase
        .from("activity_logs")
        .delete()
        .eq("property_id", property.id);

      await supabase.from("expenses").delete().eq("property_id", property.id);

      if (leaseIds.length > 0) {
        await supabase.from("lease_tenants").delete().in("lease_id", leaseIds);
        await supabase.from("lease_amounts").delete().in("lease_id", leaseIds);
        await supabase
          .from("lease_preferences")
          .delete()
          .in("lease_id", leaseIds);
        await supabase.from("lease_documents").delete().in("lease_id", leaseIds);
        await supabase.from("leases").delete().in("id", leaseIds);
      }

      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", property.id)
        .eq("owner_profile_id", profileId);

      if (error) throw error;

      router.push("/dashboard");
    } catch (error) {
      console.error("Property delete error:", error);
      alert("Unable to delete this property. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveLeaseEdit() {
  if (!property || !lease?.id) return;

  setSavingLease(true);

  const { error } = await supabase
    .from("leases")
    .update({
      start_date: leaseForm.startDate,
      end_date: leaseForm.endDate,
      monthly_rent: Number(leaseForm.monthlyRent),
      rent_due_day: leaseForm.rentDueDay,
      updated_at: new Date().toISOString(),
    })
    .eq("id", lease.id);

  if (error) {
    console.error("Lease update error:", error);
    alert("Unable to update lease.");
    setSavingLease(false);
    return;
  }

  setProperty({
    ...property,
    leases: property.leases?.map((leaseItem) =>
      leaseItem.id === lease.id
        ? {
            ...leaseItem,
            start_date: leaseForm.startDate,
            end_date: leaseForm.endDate,
            monthly_rent: Number(leaseForm.monthlyRent),
            rent_due_day: leaseForm.rentDueDay,
          }
        : leaseItem
    ),
  });

  await supabase.from("activity_logs").insert({
    property_id: property.id,
    profile_id: profileId,
    lease_id: lease.id,
    activity_type: leaseEndingSoon ? "lease_extended" : "lease_updated",
    title: leaseEndingSoon ? "Lease extended" : "Lease updated",
    description: `${property.property_label} lease details were updated.`,
  });

  setLeaseEditOpen(false);
  setSavingLease(false);
}

  async function handleSaveNote() {
  if (!newNote.trim() || !property) return;

  const noteText = newNote.trim();

  const { data, error } = await supabase
  .from("property_notes")
  .insert({
  property_id: property.id,
  lease_id: property.leases?.[0]?.id || null,
  profile_id: profileId,
  note_type: noteType,
  text: noteText,
  created_by_role: "landlord",
})
  .select()
  .single();

  if (error) {
    console.error("Note save error:", error);
    alert("Unable to save note.");
    return;
  }

  setNotes((prev) => [
  {
    id: data.id,
    text: data.text,
    type: data.note_type,
    created_at: data.created_at,
    created_by_role: data.created_by_role || "landlord",
  },
  ...prev,
]);

  await supabase.from("activity_logs").insert({
    property_id: property.id,
    profile_id: profileId,
    lease_id: property.leases?.[0]?.id || null,
    activity_type: noteType === "shared" ? "shared_note_added" : "private_note_added",
    title: noteType === "shared" ? "Shared note added" : "Private note added",
    description:
      noteType === "shared"
        ? "A shared note was added for this property."
        : "A private note was added to this property.",
  });

  setNewNote("");
  setNoteType("private");
  setNoteOpen(false);
}
  
async function handleDeleteNote() {
  if (!selectedNoteDelete) return;

  setDeletingNote(true);
  const noteToDelete = selectedNoteDelete;

  const { error } = await supabase
    .from("property_notes")
    .delete()
    .eq("id", noteToDelete.id)
    .eq("property_id", propertyId);

  if (error) {
    console.error("Delete note error:", error);
    alert("Unable to delete note.");
    setDeletingNote(false);
    return;
  }

  if (property) {
    await supabase.from("activity_logs").insert({
      property_id: property.id,
      profile_id: profileId,
      lease_id: property.leases?.[0]?.id || null,
      activity_type:
        noteToDelete.type === "shared"
          ? "shared_note_deleted"
          : "private_note_deleted",
      title:
        noteToDelete.type === "shared"
          ? "Shared note deleted"
          : "Private note deleted",
      description:
        noteToDelete.type === "shared"
          ? "A shared note was removed from this property."
          : "A private note was removed from this property.",
    });
  }

  setNotes((prev) => prev.filter((note) => note.id !== noteToDelete.id));
  setSelectedNoteDelete(null);
  setNoteDeleteOpen(false);
  setDeletingNote(false);
}

async function handleDocumentUpload(
  event: React.ChangeEvent<HTMLInputElement>
) {
  const file = event.target.files?.[0];

  if (!file || !property || !lease) return;

  setUploadingDocument(true);

  try {
    const filePath = `${property.id}/${crypto.randomUUID()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("lease-documents")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: documentRecord, error: insertError } =
      await supabase
        .from("lease_documents")
        .insert({
          property_id: property.id,
          lease_id: lease.id,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: filePath,
          uploaded_by_profile_id: profileId,
        })
        .select()
        .single();

    if (insertError) throw insertError;

    setProperty({
      ...property,
      leases: property.leases?.map((leaseItem) =>
        leaseItem.id === lease.id
          ? {
              ...leaseItem,
              lease_documents: [
                ...(leaseItem.lease_documents || []),
                documentRecord,
              ],
            }
          : leaseItem
      ),
    });

    await supabase.from("activity_logs").insert({
      property_id: property.id,
      profile_id: profileId,
      lease_id: lease.id,
      activity_type: "document_uploaded",
      title: "Document uploaded",
      description: file.name,
    });
  } catch (error) {
    console.error("Document upload error:", error);
    alert("Unable to upload document.");
  } finally {
    setUploadingDocument(false);
  }
}

async function downloadDocument(doc: LeaseDocumentRecord) {
  if (!doc.storage_path) return;

  const { data, error } = await supabase.storage
    .from("lease-documents")
    .download(doc.storage_path);

  if (error || !data) {
    console.error("Download document error:", error);
    alert("Unable to download document.");
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
}

async function openDocument(doc: LeaseDocumentRecord) {
  if (!doc.storage_path) return;

  const { data, error } = await supabase.storage
    .from("lease-documents")
    .createSignedUrl(doc.storage_path, 60);

  if (error || !data?.signedUrl) {
    console.error("Open document error:", error);
    alert("Unable to open document.");
    return;
  }

  window.open(data.signedUrl, "_blank");
}

async function handleDeleteDocument() {
  if (!selectedDocumentDelete || !property || !lease) return;

  setDeletingDocument(true);

  try {
    if (selectedDocumentDelete.storage_path) {
      const { error: storageError } = await supabase.storage
        .from("lease-documents")
        .remove([selectedDocumentDelete.storage_path]);

      if (storageError) throw storageError;
    }

    const { error: dbError } = await supabase
      .from("lease_documents")
      .delete()
      .eq("id", selectedDocumentDelete.id)
      .eq("property_id", property.id);

    if (dbError) throw dbError;

    setProperty({
      ...property,
      leases: property.leases?.map((leaseItem) =>
        leaseItem.id === lease.id
          ? {
              ...leaseItem,
              lease_documents: leaseItem.lease_documents?.filter(
                (doc) => doc.id !== selectedDocumentDelete.id
              ),
            }
          : leaseItem
      ),
    });

    await supabase.from("activity_logs").insert({
      property_id: property.id,
      profile_id: profileId,
      lease_id: lease.id,
      activity_type: "document_deleted",
      title: "Document deleted",
      description: `${selectedDocumentDelete.file_name} was removed.`,
    });

    setSelectedDocumentDelete(null);
    setDocumentDeleteOpen(false);
  } catch (error) {
    console.error("Document delete error:", error);
    alert("Unable to delete document.");
  } finally {
    setDeletingDocument(false);
  }
}

    async function handleConnectStripe() {
  try {
    const response = await fetch("/api/stripe/connect-account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        propertyId,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.url) {
      alert("Unable to start Stripe setup.");
      return;
    }

    window.location.href = data.url;
  } catch (error) {
    console.error("Stripe connect error:", error);
    alert("Unable to start Stripe setup.");
  }
}

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Loading property...
      </div>
    );
  }

  if (!property) return null;

  const lease = property.leases?.[0];
  const leaseEndingSoon = lease?.end_date
  ? (() => {
      const diffDays = Math.ceil(
        (new Date(lease.end_date).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      );

      return diffDays >= 0 && diffDays <= 60;
    })()
  : false;
  const leaseStatus = getLeaseStatus(lease?.end_date);
  const bankConnected = property.bank_status === "connected";
  const tenants = [...(lease?.lease_tenants || [])].sort((a, b) => {
  const aPrimary = a.tenant_role?.toLowerCase() === "primary";
  const bPrimary = b.tenant_role?.toLowerCase() === "primary";

  if (aPrimary && !bPrimary) return -1;
  if (!aPrimary && bPrimary) return 1;

  return 0;
});
  const primaryTenant = tenants.find(
    (tenant) => tenant.tenant_role?.toLowerCase() === "primary"
  ) || tenants[0];
  const secondaryTenants = tenants.slice(1);
  const documents = lease?.lease_documents || [];
  const visibleNotes = notes.slice(0, 2);
  const visibleDocuments = documents.slice(0, 2);
  const visibleActivities = activities.slice(0, 4);
  const emptyActivitySlots = Math.max(0, 4 - visibleActivities.length);

  return (
    <>
      <div className="mt-1 grid h-full min-h-0 grid-cols-1 gap-2.5 overflow-y-auto pb-3 lg:mt-1.5 lg:grid-cols-[minmax(0,1fr)_312px] lg:gap-2.5 lg:overflow-hidden">
        <div className="min-h-0 space-y-2.5 lg:overflow-y-auto lg:pr-0">
          <section className="overflow-visible rounded-[26px] border border-zinc-200 bg-white p-4 shadow-none">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-[28px] font-semibold tracking-[-0.055em] text-slate-950 sm:text-[31px]">
  {property.property_label}
</h1>

                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-[11.5px] font-semibold ${leaseStatus.badgeClass}`}
                  >
                    {leaseStatus.label}
                  </span>
                </div>
                <p className="mt-1.5 flex items-center gap-2 text-[13.5px] font-medium leading-5 text-zinc-500">
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    className="shrink-0 text-zinc-400"
  >
    <path
      d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>

  <span>
    {property.street_address}, {property.city}, {property.state_name} {property.zip}
  </span>
</p>
              </div>

            <div className="flex shrink-0 items-center gap-2">
  <button
  onClick={() =>
    router.push(
      leaseEndingSoon
        ? `/dashboard/properties/${propertyId}/edit?step=3`
        : `/dashboard/properties/${propertyId}/edit?step=1`
    )
  }
  className={`rounded-2xl px-4 py-2.5 text-[13.5px] font-semibold transition ${
    leaseEndingSoon
      ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
      : "border border-zinc-200 bg-white text-slate-950 hover:bg-zinc-50"
  }`}
>
  {leaseEndingSoon ? "Extend Lease" : "Edit Lease"}
</button>

  <div className="relative">
    <button
      onClick={() => setActionMenuOpen(!actionMenuOpen)}
      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
    >
      ⋯
    </button>

    {actionMenuOpen && (
      <div className="absolute right-0 top-12 z-50 w-[180px] rounded-2xl border border-zinc-200 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
        <button
          onClick={() => {
            setActionMenuOpen(false);
            setDeleteOpen(true);
          }}
          className="w-full rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-red-600 hover:bg-red-50"
        >
          Delete Property
        </button>
      </div>
    )}
  </div>
</div>
</div>

            <div className="mt-3.5 grid overflow-hidden rounded-[22px] border border-zinc-200 bg-white md:grid-cols-3">
              <PropertyTopMetric
                icon="dollar"
                label="Due This Month"
                value={`$${Number(lease?.monthly_rent || 0).toLocaleString()}`}
                subtext={`Due on ${lease?.rent_due_day || "—"}`}
                tone="emerald"
              />

              <PropertyTopMetric
                icon="shield"
                label="Bank Status"
                value={bankConnected ? "Verified" : "Pending"}
                subtext={bankConnected ? "Ready" : "Action needed"}
                tone={bankConnected ? "emerald" : "amber"}
              />

              <PropertyTopMetric
                icon="calendar"
                label="Lease Details"
                value={formatDate(lease?.end_date)}
                subtext={`Lease ends · ${leaseStatus.label}`}
                tone="blue"
              />
            </div>

            <div
              className={`mt-3.5 rounded-[20px] border p-3.5 lg:flex lg:items-center lg:justify-between lg:gap-4 ${
                bankConnected
                  ? "border-emerald-100 bg-emerald-50/70"
                  : "border-amber-200 bg-amber-50/80"
              }`}
            >
              {bankConnected ? (
                <>
                  <div>
                    <p className="text-[14px] font-semibold text-emerald-900">
                      Workspace Ready
                    </p>
                    <p className="mt-1 text-[12px] leading-5 text-emerald-800">
                      Your property workspace is fully configured and ready for
                      rent collection.
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 lg:mt-0 lg:justify-end">
                    {[
                      "Bank account connected",
                      "Tenant setup complete",
                      "Lease active",
                    ].map((label) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-white/70 px-2.5 py-1 text-[11.5px] font-semibold text-emerald-700"
                      >
                        <span className="text-[12px]">✓</span>
                        {label}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-[14px] font-semibold text-amber-950">
                      Connect Bank Account
                    </p>
                    <p className="mt-1 text-[12px] leading-5 text-amber-800">
                      Activate rent collection and allow tenants to complete
                      payment setup.
                    </p>
                  </div>

                  <button
                    onClick={() => handleConnectStripe()}
                    className="mt-4 h-10 w-full rounded-2xl bg-[#33435F] px-5 text-[13px] font-semibold text-white transition hover:bg-[#2A3850] lg:mt-0 lg:w-auto lg:shrink-0"
                  >
                    Connect Bank
                  </button>
                </>
              )}
            </div>

            <div ref={tenantPopoverRef} className="relative mt-3 pt-2">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-[19px] font-medium tracking-[-0.04em] text-slate-950">
                    Tenant
                  </h2>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[12.5px] font-semibold text-zinc-500">
                    {tenants.length}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {tenants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setTenantsExpanded((current) => !current)}
                      className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-[13.5px] font-semibold text-slate-950 transition hover:bg-zinc-50"
                    >
                      {tenantsExpanded ? "Hide" : "View all"}
                    </button>
                  )}

                  <button
                    onClick={() => router.push(`/dashboard/properties/${propertyId}/edit?step=2`)}
                    className="inline-flex h-8 items-center text-[13px] font-semibold leading-none text-slate-700 transition hover:text-slate-950"
                  >
                    Manage Tenant →
                  </button>
                </div>
              </div>

              {primaryTenant ? (
                <div className="overflow-visible">
                  <TenantCard
                    tenant={primaryTenant}
                    onEdit={() =>
                      router.push(`/dashboard/properties/${propertyId}/edit?step=2`)
                    }
                    onResendInvite={() => handleResendTenantInvite(primaryTenant)}
                    onRequestPayment={() => {
                      setSelectedPaymentTenant(primaryTenant);
                      setPaymentRequestOpen(true);
                    }}
                    onDelete={() => setTenantDeleteTarget(primaryTenant)}
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 px-4 py-5 text-[13px] text-zinc-500">
                  No tenant added.
                </div>
              )}

              {tenantsExpanded && secondaryTenants.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-[70] mt-2 rounded-[22px] border border-zinc-200 bg-white p-2.5 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
                  <div
                    className={`space-y-2.5 ${
                      secondaryTenants.length > 3
                        ? "max-h-[252px] overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:#D4D4D8_transparent]"
                        : "overflow-visible"
                    }`}
                  >
                    {secondaryTenants.map((tenant) => (
                      <TenantCard
                        key={tenant.id}
                        tenant={tenant}
                        onEdit={() =>
                          router.push(`/dashboard/properties/${propertyId}/edit?step=2`)
                        }
                        onResendInvite={() => handleResendTenantInvite(tenant)}
                        onRequestPayment={() => {
                          setSelectedPaymentTenant(tenant);
                          setPaymentRequestOpen(true);
                        }}
                        onDelete={() => setTenantDeleteTarget(tenant)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="relative grid h-[236px] overflow-hidden rounded-[26px] border border-zinc-200 bg-white shadow-none lg:grid-cols-[minmax(0,1.45fr)_minmax(310px,1fr)]">
            <div className="flex min-h-0 min-w-0 flex-col p-3.5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-[20px] font-medium tracking-[-0.045em] text-slate-950">
                    Notes
                  </h2>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[12.5px] font-semibold text-zinc-500">
                    {notes.length}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setNoteOpen(true)}
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-[13.5px] font-semibold text-slate-950 transition hover:bg-zinc-50"
                  >
                    + Add
                  </button>

                  <button
                    type="button"
                    onClick={() => setNotesViewOpen(true)}
                    className="text-[12.5px] font-semibold text-slate-700 transition hover:text-slate-950"
                  >
                    All notes →
                  </button>
                </div>
              </div>

              <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 [scrollbar-color:#d4d4d8_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300 [&::-webkit-scrollbar-track]:bg-transparent">
                {notes.length === 0 ? (
                  <div className="rounded-[18px] border border-amber-200 bg-[#FFF8EA] px-3.5 py-2.5">
                    <span className="rounded-full bg-[#FFE8B8] px-2.5 py-1 text-[10.5px] font-semibold text-[#8A5A00]">
                      Private Note
                    </span>

                    <p className="mt-2.5 text-[14px] font-medium leading-5 text-zinc-900">
                      Save reminders, updates, and important property notes.
                    </p>

                    <p className="mt-2.5 text-[12.5px] text-zinc-500">
                      Getting Started • AvenueBoard
                    </p>
                  </div>
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className={`group relative rounded-[18px] border px-3.5 py-2 pr-11 ${
                        note.type === "private"
                          ? "border-amber-200 bg-[#FFF8EA]"
                          : "border-blue-200 bg-[#EFF7FF]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedNoteDelete(note);
                          setNoteDeleteOpen(true);
                        }}
                        className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-zinc-400 opacity-0 transition-all duration-200 hover:bg-white hover:text-red-500 group-hover:opacity-100"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M9 3h6M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>

                      <p className="text-[14px] font-semibold leading-5 text-slate-950">
                        {note.text}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                        <p className="min-w-0 text-[12.5px] text-zinc-500">
                          {formatDate(note.created_at)} •{" "}
                          {note.created_by_role === "tenant"
                            ? "Created by tenant"
                            : "Created by landlord"}
                          {note.type === "shared" && (
                            <>
                              {" "}•{" "}
                              {note.created_by_role === "tenant"
                                ? "Shared with landlord"
                                : "Shared with tenant"}
                            </>
                          )}
                        </p>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${
                            note.type === "private"
                              ? "bg-[#FFE8B8] text-[#8A5A00]"
                              : "bg-[#DCEEFF] text-[#1D5F9F]"
                          }`}
                        >
                          {note.type === "private" ? "Private Note" : "Shared Note"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>

            <div className="pointer-events-none absolute bottom-4 top-4 hidden w-px bg-zinc-200 lg:block" style={{ left: "59.2%" }} />

            <div className="flex min-h-0 min-w-0 flex-col border-t border-zinc-200 p-3.5 lg:border-t-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-[20px] font-medium tracking-[-0.045em] text-slate-950">
                    Property Documents
                  </h2>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[12.5px] font-semibold text-zinc-500">
                    {documents.length}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <label className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-4 py-2 text-[13.5px] font-semibold text-slate-950 transition hover:bg-zinc-50">
                    {uploadingDocument ? "Uploading" : "Upload"}
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={handleDocumentUpload}
                      disabled={uploadingDocument}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setDocumentsViewOpen(true)}
                    className="text-[12.5px] font-semibold text-slate-700 transition hover:text-slate-950"
                  >
                    View all →
                  </button>
                </div>
              </div>

              <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 [scrollbar-color:#d4d4d8_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300 [&::-webkit-scrollbar-track]:bg-transparent">
                {documents.length > 0 ? (
                  visibleDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-3.5 py-2.5 text-left transition hover:border-zinc-300 hover:bg-zinc-50/80"
                    >
                      <button
                        type="button"
                        onClick={() => openDocument(doc)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-[11px] font-semibold uppercase tracking-[0.02em] text-zinc-600">
                          {getDocumentFileLabel(doc.file_name, doc.file_type)}
                        </span>

                        <span className="min-w-0">
                          <span className="block truncate text-[13.5px] font-semibold text-slate-950">
                            {doc.file_name}
                          </span>
                          <span className="mt-0.5 block truncate text-[12.5px] text-zinc-500">
                            Uploaded document
                            {doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ""}
                          </span>
                        </span>
                      </button>

                      <div className="ml-3 flex shrink-0 items-center gap-2 text-[12.5px] font-semibold text-slate-600">
                        <button
                          type="button"
                          onClick={() => openDocument(doc)}
                          className="transition hover:text-slate-950"
                        >
                          View
                        </button>
                        <span className="text-zinc-300">/</span>
                        <button
                          type="button"
                          onClick={() => downloadDocument(doc)}
                          className="transition hover:text-slate-950"
                        >
                          Download
                        </button>
                        <span className="text-zinc-300">/</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDocumentDelete(doc);
                            setDocumentDeleteOpen(true);
                          }}
                          className="transition hover:text-red-500"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 px-4 py-8 text-center">
                    <p className="text-[14px] font-semibold text-zinc-800">
                      Store leases, renewals, notices, inspections, and important property documents.
                    </p>
                  </div>
                )}
              </div>

            </div>
          </section>

          <section className="min-h-0 overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-none">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <div>
                <h2 className="text-[20px] font-medium tracking-[-0.045em] text-slate-950">
                  Recent Activity
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setActivityHistoryOpen(true)}
                className="text-[12.5px] font-semibold leading-5 text-slate-950 transition hover:text-slate-700 active:scale-[0.96]"
              >
                View more activity →
              </button>
            </div>

            {visibleActivities.length > 0 ? (
              <div className="grid grid-cols-4 divide-x divide-zinc-200 px-3 py-1">
                {visibleActivities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
                {Array.from({ length: emptyActivitySlots }).map((_, index) => (
                  <div key={`empty-landlord-activity-${index}`} className="min-h-[78px]" />
                ))}
              </div>
            ) : (
              <div className="px-4 py-4">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/60 px-4 py-5">
                  <p className="text-[13.5px] font-semibold text-slate-950">
                    No recent activity
                  </p>
                  <p className="mt-1 text-[12.5px] leading-5 text-zinc-500">
                    Property, tenant, document, payment, and note updates will appear here.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>


        <aside className="hidden min-h-0 flex-col gap-2.5 lg:flex lg:overflow-hidden">
          <PaymentPerformanceCard
            payments={payments}
            leaseStartDate={lease?.start_date}
            leaseEndDate={lease?.end_date}
            monthlyRent={lease?.monthly_rent || 0}
            rentDueDay={lease?.rent_due_day || "1st of the Month"}
            propertyCreatedAt={property.created_at}
            onViewHistory={() => setPaymentHistoryOpen(true)}
          />

          <section className="rounded-[24px] border border-zinc-200 bg-white p-[18px] shadow-none">
  <div className="flex items-start justify-between gap-3">
    <div>
      <h2 className="text-[20px] font-medium tracking-[-0.045em] text-slate-950">
        Payment Setup
      </h2>

      <p className="mt-1 text-[13px] leading-5 text-zinc-500">
        Powered by <span className="font-semibold text-[#635BFF]">stripe</span>
      </p>
    </div>

    <span
      className={`rounded-full border px-3 py-1 text-[11.5px] font-semibold ${
        bankConnected
          ? "border-emerald-100 bg-emerald-50/80 text-emerald-700"
          : "border-amber-100 bg-amber-50/80 text-amber-700"
      }`}
    >
      {bankConnected ? "Active" : "Needs Action"}
    </span>
  </div>

  <div className="mt-4 space-y-2">
    <div className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-zinc-50/70 px-3.5 py-2.5">
      <p className="text-[12.5px] font-medium leading-5 text-zinc-500">Payout Method</p>
      <p className="text-[13.5px] font-semibold leading-5 text-slate-950">
        {bankConnected ? "Direct Deposit" : "Not connected"}
      </p>
    </div>

    <div className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-zinc-50/70 px-3.5 py-2.5">
      <p className="text-[12.5px] font-medium leading-5 text-zinc-500">Next Payout</p>
      <p className="text-[13.5px] font-semibold leading-5 text-slate-950">
        {bankConnected ? "Available after setup" : "Pending setup"}
      </p>
    </div>

    <div className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-zinc-50/70 px-3.5 py-2.5">
      <p className="text-[12.5px] font-medium leading-5 text-zinc-500">Tenant Payments</p>
      <p className="text-[13.5px] font-semibold leading-5 text-slate-950">
        {bankConnected ? "Enabled" : "Paused"}
      </p>
    </div>
  </div>

  <button
    onClick={() => handleConnectStripe()}
    className="mt-4 h-9 w-full rounded-2xl bg-[#33435F] text-[13px] font-semibold text-white transition hover:bg-[#2A3850]"
  >
    Manage Payout Settings
  </button>
</section>

        </aside>
      </div>

      {editOpen && (
        <ModalShell
          title="Edit Property"
          subtitle="Update property name and address details."
          onClose={() => setEditOpen(false)}
        >
          <div className="space-y-4">
            <InputField
              label="Property Name"
              value={editForm.propertyLabel}
              onChange={(value) =>
                setEditForm({ ...editForm, propertyLabel: value })
              }
            />

            <InputField
              label="Street Address"
              value={editForm.streetAddress}
              onChange={(value) =>
                setEditForm({ ...editForm, streetAddress: value })
              }
            />

            <div className="grid gap-3 sm:grid-cols-3">
              <InputField
                label="City"
                value={editForm.city}
                onChange={(value) => setEditForm({ ...editForm, city: value })}
              />

              <InputField
                label="State"
                value={editForm.stateName}
                onChange={(value) =>
                  setEditForm({ ...editForm, stateName: value })
                }
              />

              <InputField
                label="ZIP"
                value={editForm.zip}
                onChange={(value) => setEditForm({ ...editForm, zip: value })}
              />
            </div>
          </div>

          <ModalActions
            onCancel={() => setEditOpen(false)}
            onSave={handleSavePropertyEdit}
            saving={savingEdit}
          />
        </ModalShell>
      )}

      {tenantManageOpen && (
  <ModalShell
    title={tenantMode === "add" ? "Add Tenant" : "Edit Tenant"}
    subtitle={
      tenantMode === "add"
        ? "Add an additional tenant to this lease."
        : "Update or remove this tenant."
    }
    onClose={() => setTenantManageOpen(false)}
  >
    <div className="grid gap-3 sm:grid-cols-2">
      <InputField
        label="First Name"
        value={tenantForm.firstName}
        onChange={(value) =>
          setTenantForm({ ...tenantForm, firstName: value })
        }
      />

      <InputField
        label="Last Name"
        value={tenantForm.lastName}
        onChange={(value) =>
          setTenantForm({ ...tenantForm, lastName: value })
        }
      />
    </div>

    <div className="mt-4 space-y-4">
      <InputField
        label="Email"
        value={tenantForm.email}
        onChange={(value) => setTenantForm({ ...tenantForm, email: value })}
      />

      <InputField
        label="Phone"
        value={tenantForm.phone}
        onChange={(value) => setTenantForm({ ...tenantForm, phone: value })}
      />
    </div>

    <ModalActions
      onCancel={() => setTenantManageOpen(false)}
      onSave={tenantMode === "add" ? handleAddTenant : handleSaveTenantEdit}
      saving={savingTenant}
      saveLabel={tenantMode === "add" ? "Add Tenant" : "Save Changes"}
    />
  </ModalShell>
)}


      {noteOpen && (
  <ModalShell
    title="Add Note"
    subtitle="Add an internal note for this property."
    onClose={() => setNoteOpen(false)}
  >
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setNoteType("private")}
          className={`h-[64px] rounded-2xl border text-[14px] font-semibold transition-all duration-200 ${
            noteType === "private"
              ? "border-[#B9476D] bg-[#FFF1F5] text-[#B9476D] shadow-[0_4px_18px_rgba(185,71,109,0.12)]"
              : "border-black/5 bg-[#FAFAFA] text-zinc-700 hover:bg-white"
          }`}
        >
          Private Note
        </button>

        <button
          type="button"
          onClick={() => setNoteType("shared")}
          className={`h-[64px] rounded-2xl border text-[14px] font-semibold transition-all duration-200 ${
            noteType === "shared"
              ? "border-[#7DA8FF] bg-[#EEF4FF] text-[#2D5BBA] shadow-[0_4px_18px_rgba(125,168,255,0.14)]"
              : "border-black/5 bg-[#FAFAFA] text-zinc-700 hover:bg-white"
          }`}
        >
          Shared Note
        </button>
      </div>

      {noteType === "shared" && (
        <div className="rounded-2xl border border-[#D8E6FF] bg-[#F3F7FF] px-4 py-3">
          <p className="text-[13px] font-medium text-[#2D5BBA]">
            Tenants will be able to view this note.
          </p>
        </div>
      )}

      <textarea
        value={newNote}
        onChange={(e) => setNewNote(e.target.value)}
        placeholder="Add property notes..."
        className="min-h-[180px] w-full rounded-[24px] border border-black/5 bg-[#FAFAFA] p-5 text-[15px] leading-6 outline-none transition-all duration-200 focus:border-[#B9476D] focus:bg-white focus:ring-4 focus:ring-[#B9476D]/10"
      />

      <div className="rounded-2xl border border-[#EEE7FF] bg-[#F8F5FF] px-4 py-3">
        <p className="text-[13px] font-semibold text-[#6D4FD8]">
          Note Tip
        </p>

        <p className="mt-1 text-[12px] leading-5 text-zinc-600">
          Use notes to track reminders, tenant conversations, property issues,
          or lease-related updates.
        </p>
      </div>

      

      <ModalActions
        onCancel={() => setNoteOpen(false)}
        onSave={handleSaveNote}
        saving={false}
        saveLabel="Add Note"
      />
    </div>
  </ModalShell>
)}

        {paymentRequestOpen && selectedPaymentTenant && (
  <ModalShell
    title="Request Payment"
    subtitle="Send an additional payment due notification."
    onClose={() => {
      setPaymentRequestOpen(false);
      setSelectedPaymentTenant(null);
      setAdditionalAmount("");
      setPaymentNote("");
    }}
  >

    <div className="space-y-5">
      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
  <p className="text-[13px] font-semibold text-amber-900">
    Automatic reminders are already enabled.
  </p>

  <p className="mt-1 text-[12px] leading-5 text-amber-800">
    Tenants will receive rent due reminders 5 days and 1 day before the due date.
    Sending this will send an additional payment due notification.
  </p>
</div>

      <InputField
        label="Additional Amount Optional"
        value={additionalAmount}
        onChange={setAdditionalAmount}
      />

      <textarea
        value={paymentNote}
        onChange={(e) => setPaymentNote(e.target.value)}
        placeholder="Optional note to tenant..."
        className="min-h-[130px] w-full rounded-[22px] border border-black/5 bg-[#FAFAFA] p-4 text-[14px] leading-6 outline-none transition focus:border-[#B9476D] focus:bg-white focus:ring-4 focus:ring-[#B9476D]/10"
      />

      <ModalActions
  onCancel={() => {
    setPaymentRequestOpen(false);
    setSelectedPaymentTenant(null);
    setAdditionalAmount("");
    setPaymentNote("");
  }}
  onSave={() => handleRequestTenantPayment(selectedPaymentTenant)}
  saving={sendingPaymentRequest}
  saveLabel={
    additionalAmount
      ? "Add Amount & Send Request"
      : "Send Payment Request"
  }
/>
    </div>
  </ModalShell>
)}

{inviteConfirmOpen && inviteTenant && (
  <ModalShell
    title="Resend tenant invite?"
    subtitle={`This will send a new portal invitation to ${inviteTenant.email}.`}
    onClose={() => {
      if (!sendingInvite) {
        setInviteConfirmOpen(false);
        setInviteTenant(null);
        setInviteSentSuccess(false);
      }
    }}
  >
    {inviteSentSuccess ? (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-5 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-[20px] font-bold text-emerald-700">
          ✓
        </div>

        <p className="mt-3 text-[15px] font-semibold text-emerald-900">
          Invite email sent
        </p>
      </div>
    ) : (
      <>
        <div className="rounded-2xl border border-black/5 bg-[#FAFAFA] px-4 py-4">
          <p className="text-[14px] font-semibold text-zinc-900">
            {inviteTenant.first_name} {inviteTenant.last_name}
          </p>

          <p className="mt-1 text-[13px] text-zinc-500">
            {inviteTenant.email}
          </p>
        </div>

        <ModalActions
          onCancel={() => {
            setInviteConfirmOpen(false);
            setInviteTenant(null);
            setInviteSentSuccess(false);
          }}
          onSave={confirmResendTenantInvite}
          saving={sendingInvite}
          saveLabel="Send Invite"
        />
      </>
    )}
  </ModalShell>
)}

      {leaseEditOpen && (
  <ModalShell
    title={leaseEndingSoon ? "Extend Lease" : "Edit Lease"}
    subtitle="Update lease dates, rent amount, and rent due day."
    onClose={() => setLeaseEditOpen(false)}
  >
    <div className="grid gap-3 sm:grid-cols-2">
      <InputField
        label="Lease Start Date"
        value={leaseForm.startDate}
        onChange={(value) => setLeaseForm({ ...leaseForm, startDate: value })}
      />

      <InputField
        label="Lease End Date"
        value={leaseForm.endDate}
        onChange={(value) => setLeaseForm({ ...leaseForm, endDate: value })}
      />
    </div>

    <div className="mt-4 space-y-4">
      <InputField
        label="Monthly Rent"
        value={leaseForm.monthlyRent}
        onChange={(value) => setLeaseForm({ ...leaseForm, monthlyRent: value })}
      />

      <InputField
        label="Rent Due Day"
        value={leaseForm.rentDueDay}
        onChange={(value) => setLeaseForm({ ...leaseForm, rentDueDay: value })}
      />
    </div>

    <ModalActions
      onCancel={() => setLeaseEditOpen(false)}
      onSave={handleSaveLeaseEdit}
      saving={savingLease}
      saveLabel={leaseEndingSoon ? "Extend Lease" : "Save Lease"}
    />
  </ModalShell>
)}

      {notesViewOpen && (
        <PropertyNotesFullView
          notes={notes}
          onClose={() => setNotesViewOpen(false)}
          onAddNote={() => {
            setNotesViewOpen(false);
            setNoteOpen(true);
          }}
          onDeleteNote={(note) => {
            setSelectedNoteDelete(note);
            setNoteDeleteOpen(true);
          }}
        />
      )}

      {documentsViewOpen && (
        <PropertyDocumentsFullView
          documents={documents}
          uploadingDocument={uploadingDocument}
          onClose={() => setDocumentsViewOpen(false)}
          onUpload={handleDocumentUpload}
          onOpenDocument={openDocument}
          onDownloadDocument={downloadDocument}
          onDeleteDocument={(doc) => {
            setSelectedDocumentDelete(doc);
            setDocumentDeleteOpen(true);
          }}
        />
      )}

      {paymentHistoryOpen && (
        <PaymentHistoryFullView
          payments={payments}
          leaseStartDate={lease?.start_date}
          leaseEndDate={lease?.end_date}
          monthlyRent={lease?.monthly_rent || 0}
          rentDueDay={lease?.rent_due_day || "1st of the Month"}
          propertyCreatedAt={property.created_at}
          propertyName={property.property_label}
          onClose={() => setPaymentHistoryOpen(false)}
        />
      )}

      {activityHistoryOpen && (
        <ActivityHistoryFullView
          activities={activities}
          propertyName={property.property_label}
          onClose={() => setActivityHistoryOpen(false)}
        />
      )}

      {deleteOpen && (
        <DeletePropertyModal
          propertyName={property.property_label}
          deleting={deleting}
          onClose={() => {
            if (!deleting) setDeleteOpen(false);
          }}
          onConfirm={handleDeleteProperty}
        />
      )}

      {noteDeleteOpen && selectedNoteDelete && (
  <DeleteNoteModal
    deleting={deletingNote}
    onClose={() => {
      if (!deletingNote) {
        setNoteDeleteOpen(false);
        setSelectedNoteDelete(null);
      }
    }}
    onConfirm={handleDeleteNote}
  />
)}
    {documentDeleteOpen && selectedDocumentDelete && (
  <DeleteDocumentModal
    fileName={selectedDocumentDelete.file_name}
    deleting={deletingDocument}
    onClose={() => {
      if (!deletingDocument) {
        setDocumentDeleteOpen(false);
        setSelectedDocumentDelete(null);
      }
    }}
    onConfirm={handleDeleteDocument}
  />
)}

      {tenantDeleteTarget && (
        <DeleteTenantModal
          tenant={tenantDeleteTarget}
          deleting={deletingTenant}
          onClose={() => {
            if (!deletingTenant) setTenantDeleteTarget(null);
          }}
          onConfirm={() => handleDeleteTenant(tenantDeleteTarget)}
        />
      )}

    </>
  );
}

function PaymentPerformanceCard({
  payments,
  leaseStartDate,
  leaseEndDate,
  monthlyRent,
  rentDueDay,
  propertyCreatedAt,
  onViewHistory,
}: {
  payments: RentPaymentRecord[];
  leaseStartDate?: string | null;
  leaseEndDate?: string | null;
  monthlyRent: number;
  rentDueDay: string;
  propertyCreatedAt?: string | null;
  onViewHistory: () => void;
}) {
  const upcomingRef = useRef<HTMLDivElement | null>(null);

  const paymentMap = new Map(
    payments.map((payment) => [
      String(payment.period_label || "").toLowerCase(),
      payment,
    ])
  );

  const timeline = buildPaymentTimeline(
  leaseStartDate,
  leaseEndDate,
  rentDueDay,
  propertyCreatedAt
).map((item) => {
  const savedPayment = paymentMap.get(item.monthFull.toLowerCase());

  return {
    ...item,
    id: savedPayment?.id || item.key,
    status: normalizePaymentStatus(savedPayment?.status || item.status),
    amount: savedPayment?.amount || monthlyRent,
  };
});

  const upcomingKey =
    timeline.find((item) => item.status === "upcoming")?.id || "";

  useEffect(() => {
    const timer = setTimeout(() => {
      upcomingRef.current?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [upcomingKey]);

  const paidCount = timeline.filter((p) => p.status === "paid").length;
  const lateCount = timeline.filter((p) => p.status === "late").length;
  const upcomingCount = timeline.filter((p) => p.status === "upcoming").length;
  const futureCount = timeline.filter((p) => p.status === "future").length;

  return (
    <section className="rounded-[24px] border border-zinc-200 bg-white p-[18px] shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[20px] font-medium leading-6 tracking-[-0.045em] text-slate-950">
            Payout Performance
          </h2>
          <div className="mt-1 text-[12.5px] leading-5">
            <p className="whitespace-nowrap text-zinc-500">
              <span>
                Rent payments for {formatMonthYear(leaseStartDate)} –{" "}
                {formatMonthYear(leaseEndDate)}
              </span>
            </p>
            <button
              type="button"
              onClick={onViewHistory}
              className="mt-0.5 block w-full text-right text-[12.5px] font-semibold text-slate-950 transition hover:text-slate-700"
            >
              All history →
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 max-h-[286px] space-y-1.5 overflow-y-auto scroll-smooth pr-1 [scrollbar-color:#d4d4d8_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300 [&::-webkit-scrollbar-track]:bg-transparent">
        {timeline.map((item) => (
          <PaymentMonthRow
            key={item.id}
            item={{
              key: item.id,
              month: item.month,
              dueText: item.dueText,
              status: item.status,
            }}
            monthlyRent={item.amount}
            rowRef={item.status === "upcoming" ? upcomingRef : undefined}
          />
        ))}
      </div>

      <div className="mt-3.5 grid grid-cols-4 overflow-hidden rounded-[18px] border border-zinc-200 bg-white">
        <PaymentStat label="Paid" value={paidCount} color="text-emerald-600" dot="bg-emerald-500" />
        <PaymentStat label="Upcoming" value={upcomingCount} color="text-blue-600" dot="bg-blue-500" />
        <PaymentStat label="Late" value={lateCount} color="text-amber-600" dot="bg-amber-400" />
        <PaymentStat label="Future" value={futureCount} color="text-zinc-500" dot="bg-zinc-300" />
      </div>
    </section>
  );
}

function PaymentMonthRow({
  item,
  monthlyRent,
  rowRef,
}: {
  item: {
    key: string;
    month: string;
    dueText: string;
    status: MonthStatus;
  };
  monthlyRent: number;
  rowRef?: RefObject<HTMLDivElement | null>;
}) {
  const styles = getPaymentRowStyles(item.status);

  return (
    <div
      ref={rowRef}
      className="grid grid-cols-[minmax(72px,1fr)_auto_minmax(64px,auto)] items-center gap-2 rounded-2xl border border-zinc-100 bg-zinc-50/70 px-3 py-2"
    >
      <p className="truncate text-[12.5px] font-semibold tracking-[-0.01em] text-slate-800">
        {item.month}
      </p>

      <span
        className={`inline-flex items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles.pill}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
        {styles.label}
      </span>

      <p className="shrink-0 text-right text-[12.5px] font-semibold tabular-nums text-slate-950">
        ${Number(monthlyRent || 0).toLocaleString()}
      </p>
    </div>
  );
}

function PaymentStat({
  label,
  value,
  color,
  dot,
}: {
  label: string;
  value: number;
  color: string;
  dot: string;
}) {
  return (
    <div className="border-r border-zinc-200 px-2 py-2.5 text-center last:border-r-0">
      <div className="flex items-center justify-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <p className="text-[11px] font-semibold text-zinc-500">{label}</p>
      </div>

      <p className={`mt-1 text-[19px] font-semibold tracking-[-0.04em] ${color}`}>
        {value}
      </p>
    </div>
  );
}

function PropertyNotesFullView({
  notes,
  onClose,
  onAddNote,
  onDeleteNote,
}: {
  notes: PropertyNote[];
  onClose: () => void;
  onAddNote: () => void;
  onDeleteNote: (note: PropertyNote) => void;
}) {
  return (
    <LargePropertyModal
      title="All Notes"
      subtitle="Review private and shared notes for this property."
      count={notes.length}
      onClose={onClose}
      action={
        <button
          type="button"
          onClick={onAddNote}
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-[13.5px] font-semibold text-slate-950 transition hover:bg-zinc-50"
        >
          + Add
        </button>
      }
    >
      {notes.length === 0 ? (
        <EmptyFullView
          title="No notes yet"
          subtitle="Add private reminders or shared tenant updates for this property."
        />
      ) : (
        <div className="grid gap-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`group relative rounded-[20px] border px-4 py-3.5 pr-12 ${
                note.type === "private"
                  ? "border-amber-200 bg-[#FFF8EA]"
                  : "border-blue-200 bg-[#EFF7FF]"
              }`}
            >
              <button
                type="button"
                onClick={() => onDeleteNote(note)}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-zinc-400 opacity-0 transition-all duration-200 hover:bg-white hover:text-red-500 group-hover:opacity-100"
                aria-label="Delete note"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 3h6M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="min-w-0 flex-1 text-[14px] font-semibold leading-6 text-slate-950">
                  {note.text}
                </p>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${
                    note.type === "private"
                      ? "bg-[#FFE8B8] text-[#8A5A00]"
                      : "bg-[#DCEEFF] text-[#1D5F9F]"
                  }`}
                >
                  {note.type === "private" ? "Private Note" : "Shared Note"}
                </span>
              </div>

              <p className="mt-2 text-[12.5px] leading-5 text-zinc-500">
                {formatDate(note.created_at)} •{" "}
                {note.created_by_role === "tenant"
                  ? "Created by tenant"
                  : "Created by landlord"}
              </p>
            </div>
          ))}
        </div>
      )}
    </LargePropertyModal>
  );
}

function PropertyDocumentsFullView({
  documents,
  uploadingDocument,
  onClose,
  onUpload,
  onOpenDocument,
  onDownloadDocument,
  onDeleteDocument,
}: {
  documents: LeaseDocumentRecord[];
  uploadingDocument: boolean;
  onClose: () => void;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenDocument: (doc: LeaseDocumentRecord) => void;
  onDownloadDocument: (doc: LeaseDocumentRecord) => void;
  onDeleteDocument: (doc: LeaseDocumentRecord) => void;
}) {
  return (
    <LargePropertyModal
      title="Property Documents"
      subtitle="View, download, upload, or remove documents for this property."
      count={documents.length}
      onClose={onClose}
      action={
        <label className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-4 py-2 text-[13.5px] font-semibold text-slate-950 transition hover:bg-zinc-50">
          {uploadingDocument ? "Uploading" : "Upload"}
          <input
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            onChange={onUpload}
            disabled={uploadingDocument}
          />
        </label>
      }
    >
      {documents.length === 0 ? (
        <EmptyFullView
          title="No documents yet"
          subtitle="Upload lease documents, renewals, notices, inspections, and records."
        />
      ) : (
        <div className="overflow-hidden rounded-[24px] border border-zinc-200 bg-white">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-4 last:border-b-0"
            >
              <button
                type="button"
                onClick={() => onOpenDocument(doc)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-[11px] font-semibold uppercase tracking-[0.02em] text-zinc-600">
                  {getDocumentFileLabel(doc.file_name, doc.file_type)}
                </span>

                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold text-slate-950">
                    {doc.file_name}
                  </span>
                  <span className="mt-0.5 block truncate text-[12.5px] text-zinc-500">
                    {formatDate(doc.created_at)} ·{" "}
                    {doc.file_type || "Document"}
                    {doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ""}
                  </span>
                </span>
              </button>

              <div className="flex shrink-0 items-center gap-2 text-[12.5px] font-semibold text-slate-600">
                <button
                  type="button"
                  onClick={() => onOpenDocument(doc)}
                  className="transition hover:text-slate-950"
                >
                  View
                </button>
                <span className="text-zinc-300">/</span>
                <button
                  type="button"
                  onClick={() => onDownloadDocument(doc)}
                  className="transition hover:text-slate-950"
                >
                  Download
                </button>
                <span className="text-zinc-300">/</span>
                <button
                  type="button"
                  onClick={() => onDeleteDocument(doc)}
                  className="transition hover:text-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </LargePropertyModal>
  );
}

function PaymentHistoryFullView({
  payments,
  leaseStartDate,
  leaseEndDate,
  monthlyRent,
  rentDueDay,
  propertyCreatedAt,
  propertyName,
  onClose,
}: {
  payments: RentPaymentRecord[];
  leaseStartDate?: string | null;
  leaseEndDate?: string | null;
  monthlyRent: number;
  rentDueDay: string;
  propertyCreatedAt?: string | null;
  propertyName: string;
  onClose: () => void;
}) {
  const paymentMap = new Map(
    payments.map((payment) => [
      String(payment.period_label || "").toLowerCase(),
      payment,
    ])
  );
  const timeline = buildPaymentTimeline(
    leaseStartDate,
    leaseEndDate,
    rentDueDay,
    propertyCreatedAt
  ).map((item) => {
    const savedPayment = paymentMap.get(item.monthFull.toLowerCase());
    const status = normalizePaymentStatus(savedPayment?.status || item.status);

    return {
      ...item,
      id: savedPayment?.id || item.key,
      amount: savedPayment?.amount || monthlyRent,
      status,
      paidAt: savedPayment?.paid_at || null,
      createdAt: savedPayment?.created_at || null,
    };
  });

  const paidCount = timeline.filter((item) => item.status === "paid").length;
  const lateCount = timeline.filter((item) => item.status === "late").length;
  const upcomingCount = timeline.filter(
    (item) => item.status === "upcoming"
  ).length;
  const futureCount = timeline.filter((item) => item.status === "future").length;

  return (
    <LargePropertyModal
      title="Payment History"
      subtitle={`${propertyName} rent payment timeline`}
      count={timeline.length}
      onClose={onClose}
    >
      <div className="grid grid-cols-4 overflow-hidden rounded-[22px] border border-zinc-200 bg-white">
        <PaymentStat label="Paid" value={paidCount} color="text-emerald-600" dot="bg-emerald-500" />
        <PaymentStat label="Upcoming" value={upcomingCount} color="text-blue-600" dot="bg-blue-500" />
        <PaymentStat label="Late" value={lateCount} color="text-amber-600" dot="bg-amber-400" />
        <PaymentStat label="Future" value={futureCount} color="text-zinc-500" dot="bg-zinc-300" />
      </div>

      <div className="mt-5 overflow-hidden rounded-[24px] border border-zinc-200 bg-white">
        {timeline.map((item) => {
          const styles = getPaymentRowStyles(item.status);
          const dateText =
            item.status === "paid" && item.paidAt
              ? `Paid on ${formatDate(item.paidAt)}`
              : item.status === "paid" && item.createdAt
              ? `Recorded on ${formatDate(item.createdAt)}`
              : item.dueText;

          return (
            <div
              key={item.id}
              className="grid grid-cols-[minmax(160px,1fr)_auto_auto] items-center gap-4 border-b border-zinc-200 px-4 py-4 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-slate-950">
                  {item.monthFull}
                </p>
                <p className="mt-0.5 truncate text-[12.5px] text-zinc-500">
                  {dateText}
                </p>
              </div>

              <span
                className={`inline-flex items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles.pill}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                {styles.label}
              </span>

              <p className="text-right text-[14px] font-semibold tabular-nums text-slate-950">
                ${Number(item.amount || 0).toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>
    </LargePropertyModal>
  );
}

function ActivityHistoryFullView({
  activities,
  propertyName,
  onClose,
}: {
  activities: ActivityLog[];
  propertyName: string;
  onClose: () => void;
}) {
  return (
    <LargePropertyModal
      title="Activity History"
      subtitle={`${propertyName} activity log`}
      count={activities.length}
      onClose={onClose}
    >
      {activities.length === 0 ? (
        <EmptyFullView
          title="No activity yet"
          subtitle="Property, tenant, document, payment, and note updates will appear here."
        />
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <ActivityHistoryRow key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </LargePropertyModal>
  );
}

function EmptyFullView({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50/70 px-5 py-10 text-center">
      <p className="text-[14px] font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-[12.5px] leading-5 text-zinc-500">{subtitle}</p>
    </div>
  );
}

function LargePropertyModal({
  title,
  subtitle,
  count,
  action,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  count: number;
  action?: ReactNode;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/30 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div className="flex h-[76vh] min-h-[520px] w-full max-w-[1120px] flex-col overflow-hidden rounded-[32px] bg-white shadow-[0_40px_120px_rgba(15,23,42,0.22)]">
          <div className="flex shrink-0 items-start justify-between gap-5 border-b border-zinc-200 px-6 py-5">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h2 className="text-[24px] font-medium tracking-[-0.045em] text-slate-950">
                  {title}
                </h2>
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[12px] font-semibold text-zinc-500">
                  {count}
                </span>
              </div>
              <p className="mt-1 text-[13px] leading-5 text-zinc-500">
                {subtitle}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {action}
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-[20px] text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-900"
                aria-label={`Close ${title}`}
              >
                ×
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 [scrollbar-color:#d4d4d8_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300 [&::-webkit-scrollbar-track]:bg-transparent">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function getPaymentRowStyles(status: MonthStatus) {
  if (status === "paid") {
    return {
      label: "Paid",
      symbol: "✓",
      card: "bg-gradient-to-r from-emerald-50 to-emerald-50/35",
      pill: "bg-emerald-50 text-emerald-700",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
      bar: "bg-emerald-500",
      icon: "bg-emerald-600 text-white",
    };
  }

  if (status === "late") {
    return {
      label: "Late",
      symbol: "!",
      card: "bg-gradient-to-r from-amber-50 to-amber-50/35",
      pill: "bg-amber-50 text-amber-700",
      text: "text-amber-700",
      dot: "bg-amber-400",
      bar: "bg-amber-400",
      icon: "bg-amber-100 text-amber-700",
    };
  }

  if (status === "upcoming") {
    return {
      label: "Upcoming",
      symbol: "□",
      card: "bg-gradient-to-r from-blue-50 to-blue-50/35",
      pill: "bg-blue-50 text-blue-700",
      text: "text-blue-700",
      dot: "bg-blue-500",
      bar: "bg-blue-500",
      icon: "bg-blue-100 text-blue-700",
    };
  }

  if (status === "inactive") {
  return {
    label: "Inactive",
    symbol: "□",
    card: "bg-gradient-to-r from-zinc-50 to-zinc-50/35",
    pill: "bg-zinc-100 text-zinc-400",
    text: "text-zinc-400",
    dot: "bg-zinc-200",
    bar: "bg-zinc-200",
    icon: "bg-zinc-100 text-zinc-400",
  };
}

  return {
    label: "Future",
    symbol: "□",
    card: "bg-gradient-to-r from-zinc-50 to-zinc-50/35",
    pill: "bg-zinc-100 text-zinc-500",
    text: "text-zinc-500",
    dot: "bg-zinc-300",
    bar: "bg-zinc-300",
    icon: "bg-zinc-100 text-zinc-500",
  };
}


function formatMonthYear(date?: string | null) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function extractDueDay(rentDueDay: string) {
  return rentDueDay?.replace(" of the Month", "") || "—";
}

function PropertyTopMetric({
  icon,
  label,
  value,
  subtext,
  tone,
}: {
  icon: "dollar" | "shield" | "calendar";
  label: string;
  value: string;
  subtext: string;
  tone: "emerald" | "amber" | "blue";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-100 bg-emerald-50/80 text-emerald-700"
      : tone === "amber"
      ? "border-amber-100 bg-amber-50/80 text-amber-700"
      : "border-blue-100 bg-blue-50/80 text-blue-700";

  return (
    <div className="flex items-center gap-4 border-b border-zinc-200 px-[18px] py-3.5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] ${toneClass}`}
      >
        {icon === "dollar" && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3v18M16.5 7.5c-.8-.9-2-1.4-3.6-1.4-2.2 0-3.6 1-3.6 2.6 0 1.7 1.4 2.3 3.7 2.9 2.4.6 3.8 1.3 3.8 3.1 0 1.8-1.5 3-4.1 3-1.9 0-3.4-.6-4.4-1.8"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        )}

        {icon === "shield" && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3.8 18.5 6v5.1c0 4-2.5 7.3-6.5 8.8-4-1.5-6.5-4.8-6.5-8.8V6L12 3.8Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="m8.7 12.1 2.1 2.1 4.6-4.8"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {icon === "calendar" && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M7 3.5v3M17 3.5v3M4.5 9h15M6 5.5h12a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>

      <div className="min-w-0">
        <p className="text-[12.5px] font-semibold leading-4 text-slate-500">{label}</p>
        <p className="mt-1 truncate text-[22px] font-semibold tracking-[-0.055em] text-slate-950">
          {value}
        </p>
        <p className="mt-0.5 truncate text-[13px] font-medium leading-5 text-slate-500">
          {subtext}
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  warning = false,
  success = false,
}: {
  label: string;
  value: string;
  subtext: string;
  warning?: boolean;
  success?: boolean;
}) {
  return (
    <div className="rounded-[18px] border border-[#E4E1DA] bg-white px-4 py-4 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
      <p className="text-[12.5px] font-semibold text-slate-500">{label}</p>

      <p
        className={`mt-2 truncate text-[22px] font-semibold tracking-[-0.035em] ${
          warning
            ? "text-amber-600"
            : success
            ? "text-emerald-600"
            : "text-slate-950"
        }`}
      >
        {value}
      </p>

      <p className="mt-1 truncate text-[12.5px] font-medium text-slate-500">
        {subtext}
      </p>
    </div>
  );
}

function TenantCard({
  tenant,
  onEdit,
  onResendInvite,
  onRequestPayment,
  onDelete,
}: {
  tenant: TenantRecord;
  onEdit: () => void;
  onResendInvite: () => void;
  onRequestPayment: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (
      menuRef.current &&
      !menuRef.current.contains(event.target as Node)
    ) {
      setMenuOpen(false);
    }
  }

  document.addEventListener("mousedown", handleClickOutside);

  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, []);

  const inviteAccepted = tenant.invite_status === "accepted";
  const isPrimaryTenant = tenant.tenant_role?.toLowerCase() === "primary";
  const roleLabel = getTenantRoleLabel(tenant.tenant_role);

  return (
    <div
  ref={menuRef}
  className="group relative flex items-center gap-3.5 overflow-visible rounded-[18px] border border-zinc-200 bg-white px-4 py-3.5 transition hover:bg-zinc-50"
>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-[14px] font-semibold text-white">
        {getTenantInitials(tenant)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[14.5px] font-semibold text-slate-950">
            {tenant.first_name} {tenant.last_name}
          </p>

          {tenant.tenant_role && (
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold ${
                isPrimaryTenant
                  ? "border-blue-100 bg-blue-50/80 text-blue-700"
                  : "border-zinc-200 bg-zinc-100 text-zinc-600"
              }`}
            >
              {roleLabel}
            </span>
          )}

          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold ${
              inviteAccepted
                ? "border-emerald-100 bg-emerald-50/80 text-emerald-700"
                : "border-amber-100 bg-amber-50/80 text-amber-700"
            }`}
          >
            {inviteAccepted ? "Invite accepted" : "Invite sent"}
          </span>

          {inviteAccepted && (
            <span className="rounded-full border border-emerald-100 bg-emerald-50/80 px-2.5 py-0.5 text-[10.5px] font-semibold text-emerald-700">
              Dashboard enabled
            </span>
          )}
        </div>

        <p className="mt-1 truncate text-[12.5px] text-zinc-500">
          {tenant.email || "No email"}
        </p>
      </div>

    <div className="relative z-20 flex items-center gap-3">
  {isPrimaryTenant && (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      if (inviteAccepted) {
        onRequestPayment();
        return;
      }

      onResendInvite();
    }}
    className="relative z-30 rounded-xl bg-[#33435F] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#2A3850]"
  >
    {inviteAccepted ? "Request Payment" : "Resend Invite"}
  </button>
)}

<button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  }}
  data-open={menuOpen}
  className="relative z-30 flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-[18px] font-semibold text-zinc-700 transition hover:bg-zinc-50 hover:text-black"
>
  ⋮
</button>
</div>

      {menuOpen && (
        <div className="absolute right-0 top-14 z-[80] w-[190px] rounded-2xl border border-zinc-200 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
          <button
            onClick={() => {
              setMenuOpen(false);
              onEdit();
            }}
            className="w-full rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-slate-700 hover:bg-zinc-50"
          >
            Edit tenant
          </button>


          <button
            onClick={() => {
              setMenuOpen(false);
              onDelete();
            }}
            className="w-full rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-red-600 hover:bg-red-50"
          >
            Delete tenant
          </button>
        </div>
      )}
    </div>
  );
}
function RightInfo({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  if (label === "Status") {
    return (
      <div className="flex items-center justify-between rounded-2xl bg-[#FAFAFA] px-4 py-3">
        <p className="text-[13px] font-semibold text-slate-500">{label}</p>

        <span
          className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
            warning
              ? "bg-amber-50 text-amber-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {value}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-2xl bg-[#FAFAFA] px-4 py-3">
      <p className="text-[13px] font-semibold text-slate-500">{label}</p>

      <p className="text-right text-[14px] font-semibold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function ActivityItem({ activity }: { activity: ActivityLog }) {
  const tone = getActivityTone(activity);
  const display = getActivityDisplay(activity);

  return (
    <div className="group min-h-[78px] px-3 py-3.5 transition hover:bg-zinc-50/60">
      <div className="flex items-start gap-3">
        <ActivityIcon type={tone.type} iconClass={tone.iconClass} size="sm" />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <p className="truncate text-[13.5px] font-semibold leading-5 text-slate-950">
              {display.title}
            </p>
            {tone.badge && (
              <span className={tone.badgeClass}>{tone.badge}</span>
            )}
          </div>

          <p className="mt-0.5 line-clamp-1 text-[12.5px] leading-5 text-zinc-500">
            {display.description}
          </p>

          {activity.created_at && (
            <p className="mt-1 truncate text-[11.5px] font-medium leading-4 text-zinc-400">
              {formatDate(activity.created_at)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityHistoryRow({ activity }: { activity: ActivityLog }) {
  const tone = getActivityTone(activity);
  const display = getActivityDisplay(activity);

  return (
    <div className="flex items-center justify-between gap-5 rounded-2xl border border-zinc-200 bg-white px-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <ActivityIcon type={tone.type} iconClass={tone.iconClass} size="md" />

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-[13px] font-semibold leading-5 text-zinc-950">
              {display.title}
            </p>
            {tone.badge && (
              <span className={tone.badgeClass}>{tone.badge}</span>
            )}
          </div>
          <p className="mt-1 truncate text-[12px] font-medium leading-5 text-zinc-500">
            {display.description}
          </p>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[11px] font-medium leading-4 text-zinc-500">
          {formatDateTime(activity.created_at)}
        </p>
      </div>
    </div>
  );
}

function getActivityDisplay(activity: ActivityLog) {
  const type = String(activity.activity_type || "").toLowerCase();
  const title = activity.title || "Property updated";
  const description = activity.description || "Property workspace updated";
  const genericPropertyTitle = title.toLowerCase() === "property updated";

  if (type.includes("private_note_added") || title.toLowerCase() === "private note added") {
    return {
      title: "Private note added",
      description: "A private note was added to this property.",
    };
  }

  if (type.includes("shared_note_added") || title.toLowerCase() === "shared note added") {
    return {
      title: "Shared note added",
      description: "A shared note was added for this property.",
    };
  }

  if (
    type.includes("private_note_deleted") ||
    type.includes("private_note_removed") ||
    title.toLowerCase() === "private note deleted"
  ) {
    return {
      title: "Private note deleted",
      description: "A private note was removed from this property.",
    };
  }

  if (
    type.includes("shared_note_deleted") ||
    type.includes("shared_note_removed") ||
    title.toLowerCase() === "shared note deleted"
  ) {
    return {
      title: "Shared note deleted",
      description: "A shared note was removed from this property.",
    };
  }

  if (type.includes("note_added") && genericPropertyTitle) {
    return {
      title: "Note added",
      description: "A note was added to this property.",
    };
  }

  if ((type.includes("note_deleted") || type.includes("note_removed")) && genericPropertyTitle) {
    return {
      title: "Note deleted",
      description: "A note was removed from this property.",
    };
  }

  return { title, description };
}

function getActivityTone(activity: ActivityLog) {
  const display = getActivityDisplay(activity);
  const activityType = String(activity.activity_type || "").toLowerCase();
  const activityTitle = display.title.toLowerCase();
  const text = `${activityType} ${activityTitle} ${
    display.description
  }`.toLowerCase();
  const isDelete = text.includes("delete") || text.includes("removed");
  const isNote = activityType.includes("note") || activityTitle.includes("note");
  const isDocument =
    activityType.includes("document") || activityTitle.includes("document");
  const isTenant =
    activityType.includes("tenant") ||
    activityTitle.includes("tenant") ||
    activityTitle.includes("dashboard enabled");
  const isTenantSuccess =
    isTenant &&
    (text.includes("accepted") ||
      text.includes("enabled") ||
      text.includes("complete"));
  const isPayment =
    activityType.includes("payment") ||
    activityTitle.includes("payment") ||
    text.includes("rent");
  const isPaymentSuccess =
    isPayment &&
    (text.includes("paid") ||
      text.includes("received") ||
      text.includes("success") ||
      text.includes("confirmed"));
  const isPaymentAlert =
    isPayment &&
    (text.includes("late") ||
      text.includes("failed") ||
      text.includes("declined") ||
      text.includes("past due"));
  const isSupport =
    activityType.includes("support") ||
    activityTitle.includes("support case") ||
    activityTitle.includes("case created");
  const isProperty =
    activityType.includes("property") ||
    activityTitle.includes("property updated") ||
    activityTitle.includes("details updated");

  if (isNote && isDelete) {
    return {
      type: "delete" as const,
      iconClass: "bg-[#FFF1F2] text-[#B9476D] ring-1 ring-[#F8D7DF]",
      badge: text.includes("tenant") ? "Tenant" : "",
      badgeClass:
        "shrink-0 rounded-full bg-[#FFF1F2] px-2 py-0.5 text-[10px] font-semibold leading-4 text-[#B9476D]",
    };
  }

  if (isNote) {
    return {
      type: "note" as const,
      iconClass: "bg-[#DCEEFF] text-[#1D5F9F] ring-1 ring-[#BFE0FF]",
      badge: text.includes("landlord") ? "Landlord" : "",
      badgeClass:
        "shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold leading-4 text-zinc-600",
    };
  }

  if (isDocument && isDelete) {
    return {
      type: "delete" as const,
      iconClass: "bg-[#FFF1F2] text-[#B9476D] ring-1 ring-[#F8D7DF]",
      badge: "",
      badgeClass: "",
    };
  }

  if (isDocument) {
    return {
      type: "document" as const,
      iconClass: "bg-[#F4F4F5] text-zinc-700 ring-1 ring-zinc-200",
      badge: "",
      badgeClass: "",
    };
  }

  if (isTenant) {
    return {
      type: isTenantSuccess ? ("user-check" as const) : ("user" as const),
      iconClass: isTenantSuccess
        ? "bg-slate-950 text-white ring-1 ring-slate-950/10"
        : "bg-white text-slate-950 ring-1 ring-slate-950/15",
      badge: "Tenant",
      badgeClass: "",
    };
  }

  if (isPaymentSuccess) {
    return {
      type: "payment-success" as const,
      iconClass: "bg-slate-950 text-white ring-1 ring-slate-950/10",
      badge: "",
      badgeClass: "",
    };
  }

  if (isPaymentAlert) {
    return {
      type: "payment-alert" as const,
      iconClass: "bg-[#FFF1F2] text-[#B9476D] ring-1 ring-[#F8D7DF]",
      badge: "",
      badgeClass: "",
    };
  }

  if (isPayment) {
    return {
      type: "payment" as const,
      iconClass: "bg-white text-slate-950 ring-1 ring-slate-950/15",
      badge: "",
      badgeClass: "",
    };
  }

  if (isSupport) {
    return {
      type: "support" as const,
      iconClass: "bg-white text-slate-950 ring-1 ring-slate-950/15",
      badge: "",
      badgeClass: "",
    };
  }

  if (isProperty) {
    return {
      type: "property" as const,
      iconClass: "bg-[#F4F4F5] text-zinc-700 ring-1 ring-zinc-200",
      badge: "",
      badgeClass: "",
    };
  }

  return {
    type: "note" as const,
    iconClass: "bg-[#DCEEFF] text-[#1D5F9F] ring-1 ring-[#BFE0FF]",
    badge: "",
    badgeClass: "",
  };
}

function ActivityIcon({
  type,
  iconClass,
  size,
}: {
  type:
    | "delete"
    | "document"
    | "note"
    | "payment"
    | "payment-alert"
    | "payment-pending"
    | "payment-success"
    | "property"
    | "support"
    | "user"
    | "user-check";
  iconClass: string;
  size: "sm" | "md";
}) {
  const Icon =
    type === "payment-success"
      ? CheckCircle2
      : type === "payment-alert"
      ? AlertCircle
      : type === "payment-pending"
      ? CircleDot
      : type === "payment"
      ? DollarSign
      : type === "document"
      ? FileText
      : type === "delete"
      ? Trash2
      : type === "property"
      ? Home
      : type === "support"
      ? LifeBuoy
      : type === "user"
      ? User
      : type === "user-check"
      ? UserCheck
      : StickyNote;

  return (
    <span
      className={`flex shrink-0 items-center justify-center border transition ${
        size === "sm" ? "h-9 w-9 rounded-2xl" : "h-10 w-10 rounded-full"
      } ${iconClass}`}
    >
      <Icon
        size={17}
        strokeWidth={size === "sm" ? 1.8 : 2.15}
        aria-hidden="true"
      />
    </span>
  );
}

function ModalShell({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/30 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-[720px] overflow-hidden rounded-[32px] bg-white shadow-[0_40px_120px_rgba(15,23,42,0.22)]">
          <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 pb-4 pt-5 sm:px-6">
            <div className="min-w-0">
              <h2 className="text-[21px] font-semibold tracking-[-0.04em] text-zinc-900 sm:text-[22px]">
                {title}
              </h2>

              <p className="mt-1 text-[13px] leading-5 text-zinc-500">
                {subtitle}
              </p>
            </div>

            <button
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
            >
              ×
            </button>
          </div>

          <div className="max-h-[72dvh] overflow-y-auto px-5 py-5 sm:px-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalActions({
  onCancel,
  onSave,
  saving,
  saveLabel = "Save Changes",
}: {
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  saveLabel?: string;
}) {
  return (
    <div className="mt-7 grid gap-3 border-t border-zinc-100 pt-5 sm:flex sm:justify-end">
      <button
        onClick={onCancel}
        className="h-11 w-full rounded-2xl border border-black/5 bg-white px-6 text-[14px] font-semibold text-zinc-700 transition-all duration-200 hover:bg-zinc-50 sm:w-auto"
      >
        Cancel
      </button>

      <button
        onClick={onSave}
        disabled={saving}
        className="h-11 w-full rounded-2xl bg-[#B9476D] px-6 text-[14px] font-semibold text-white hover:bg-[#A93F64] disabled:opacity-50 sm:w-auto"
      >
        {saving ? "Saving..." : saveLabel}
      </button>
    </div>
  );
}

function DeleteDocumentModal({
  fileName,
  deleting,
  onClose,
  onConfirm,
}: {
  fileName: string;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[430px] rounded-[28px] bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.25)]">
        <h2 className="text-[21px] font-semibold tracking-[-0.04em] text-zinc-900">
          Delete document?
        </h2>

        <p className="mt-3 text-[14px] leading-6 text-zinc-500">
          This document will be permanently deleted from AvenueBoard and cannot be recovered.
        </p>

        <div className="mt-7 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="h-11 rounded-2xl border border-black/5 bg-white px-6 text-[14px] font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={deleting}
            className="h-11 rounded-2xl bg-[#B9476D] px-6 text-[14px] font-semibold text-white hover:bg-[#A93F64] disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteNoteModal({
  deleting,
  onClose,
  onConfirm,
}: {
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[430px] rounded-[28px] bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.25)]">
        <h2 className="text-[21px] font-semibold tracking-[-0.04em] text-zinc-900">
          Delete note?
        </h2>

        <p className="mt-3 text-[14px] leading-6 text-zinc-500">
          This note will be permanently deleted.
        </p>

        <div className="mt-7 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="h-11 rounded-2xl border border-black/5 bg-white px-6 text-[14px] font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={deleting}
            className="h-11 rounded-2xl bg-[#B9476D] px-6 text-[14px] font-semibold text-white hover:bg-[#A93F64] disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteTenantModal({
  tenant,
  deleting,
  onClose,
  onConfirm,
}: {
  tenant: TenantRecord;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const tenantName = getTenantFullName(tenant);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[460px] rounded-[28px] bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.25)] sm:p-6">
        <h2 className="text-[21px] font-semibold tracking-[-0.04em] text-zinc-900">
          Remove tenant?
        </h2>

        <p className="mt-3 text-[14px] leading-6 text-zinc-500">
          <span className="font-semibold text-zinc-900">{tenantName}</span>
          {tenant.email ? ` (${tenant.email})` : ""} will be removed from this
          property and lease access. They will no longer be connected to this
          property workspace.
        </p>

        <div className="mt-7 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="h-11 rounded-2xl border border-black/5 bg-white px-6 text-[14px] font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={deleting}
            className="h-11 rounded-2xl bg-red-600 px-6 text-[14px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Removing..." : "Remove Tenant"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeletePropertyModal({
  propertyName,
  deleting,
  onClose,
  onConfirm,
}: {
  propertyName: string;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[460px] rounded-[28px] bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.25)] sm:p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-[22px] font-semibold text-red-600">
          !
        </div>

        <h2 className="mt-5 text-[22px] font-semibold tracking-[-0.04em] text-zinc-900">
          Delete property?
        </h2>

        <p className="mt-3 text-[14px] leading-6 text-zinc-500">
          This will permanently delete{" "}
          <span className="font-semibold text-zinc-900">{propertyName}</span>{" "}
          and its related history. This action cannot be undone.
        </p>

        <div className="mt-7 grid gap-3 sm:flex sm:justify-end">
          <button
            onClick={onClose}
            disabled={deleting}
            className="h-11 rounded-2xl border border-black/5 bg-white px-6 text-[14px] font-semibold text-zinc-700 transition-all duration-200 hover:bg-zinc-50 disabled:opacity-50"
          >
            Go Back
          </button>

          <button
            onClick={onConfirm}
            disabled={deleting}
            className="h-11 rounded-2xl bg-[#B9476D] px-6 text-[14px] font-semibold text-white hover:bg-[#A93F64] disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Confirm Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-[13px] font-medium text-zinc-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-black/5 bg-[#FAFAFA] px-4 text-[16px] outline-none focus:border-[#B9476D] focus:bg-white focus:ring-4 focus:ring-[#B9476D]/10 sm:text-[14px]"
      />
    </div>
  );
}

function getDocumentFileLabel(fileName?: string | null, fileType?: string | null) {
  const extension = fileName?.split(".").pop()?.trim();

  if (extension) {
    return extension.slice(0, 4).toUpperCase();
  }

  if (fileType?.includes("pdf")) return "PDF";
  if (fileType?.includes("png")) return "PNG";
  if (fileType?.includes("jpeg") || fileType?.includes("jpg")) return "JPG";
  if (fileType?.includes("word")) return "DOC";

  return "DOC";
}

function formatFileSize(size?: number | null) {
  if (!size) return "";

  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date?: string | null) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(date?: string | null) {
  if (!date) return "—";

  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getTenantFullName(tenant: TenantRecord) {
  return `${tenant.first_name || ""} ${tenant.last_name || ""}`.trim() || "Tenant";
}

function getTenantInitials(tenant: TenantRecord) {
  const initials = `${tenant.first_name?.charAt(0) || ""}${
    tenant.last_name?.charAt(0) || ""
  }`;

  return initials || "T";
}

function getTenantRoleLabel(role?: string | null) {
  const normalized = String(role || "").toLowerCase();

  if (normalized === "primary") return "Primary";
  if (normalized === "secondary") return "Secondary";
  if (normalized === "co-tenant" || normalized === "cotenant") return "Co-tenant";

  return role
    ? role
        .split(/[_\s-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "Tenant";
}

function formatDateShort(date?: string | null) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function normalizePaymentStatus(status?: string | null): MonthStatus {
  const normalized = String(status || "").toLowerCase();

  if (["paid", "succeeded", "complete", "completed"].includes(normalized)) {
    return "paid";
  }

  if (["late", "failed", "declined", "past_due"].includes(normalized)) {
    return "late";
  }

  if (["upcoming", "pending"].includes(normalized)) {
    return "upcoming";
  }

  if (normalized === "inactive") return "inactive";
  if (normalized === "future") return "future";

  return "future";
}

function buildPaymentTimeline(
  leaseStartDate?: string | null,
  leaseEndDate?: string | null,
  rentDueDay?: string,
  propertyCreatedAt?: string | null
): {
  key: string;
  month: string;
  monthFull: string;
  dueText: string;
  status: MonthStatus;
}[] {
  if (!leaseStartDate || !leaseEndDate) return [];

  const leaseStart = new Date(leaseStartDate);
  const leaseEnd = new Date(leaseEndDate);
  const today = new Date();

  const createdDate = propertyCreatedAt ? new Date(propertyCreatedAt) : today;

  const startMonth = new Date(
    Math.max(
      new Date(leaseStart.getFullYear(), leaseStart.getMonth(), 1).getTime(),
      new Date(createdDate.getFullYear(), createdDate.getMonth() + 1, 1).getTime()
    )
  );

  const dueDay = Number(String(rentDueDay || "1").match(/\d+/)?.[0] || 1);

  const rows: {
    key: string;
    month: string;
    monthFull: string;
    dueText: string;
    status: MonthStatus;
  }[] = [];

  const cursor = new Date(startMonth);

  while (cursor <= leaseEnd) {
    const monthDate = new Date(cursor);

    const dueDate = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      dueDay
    );

    const lateDate = addBusinessDays(dueDate, 10);

    let status: MonthStatus = "future";

const firstTrackedMonth =
  monthDate.getFullYear() === startMonth.getFullYear() &&
  monthDate.getMonth() === startMonth.getMonth();

if (firstTrackedMonth) {
  status = "upcoming";

    } else if (monthDate < new Date(today.getFullYear(), today.getMonth(), 1)) {
      status = today > lateDate ? "late" : "upcoming";
    }

    rows.push({
      key: `${monthDate.getFullYear()}-${monthDate.getMonth()}`,
      month: monthDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
      monthFull: monthDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
      dueText: dueDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      status,
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return rows;
}

function addBusinessDays(date: Date, businessDays: number) {
  const result = new Date(date);
  let added = 0;

  while (added < businessDays) {
    result.setDate(result.getDate() + 1);

    const day = result.getDay();
    if (day !== 0 && day !== 6) {
      added++;
    }
  }

  return result;
}

function getMonthStatusClass(status: MonthStatus) {
  if (status === "paid") return "bg-emerald-50 text-emerald-700";
  if (status === "upcoming") return "bg-blue-50 text-blue-700";
  if (status === "late") return "bg-amber-50 text-amber-700";
  if (status === "inactive") return "bg-zinc-50 text-zinc-300";
  return "bg-zinc-50 text-zinc-400";
}

function SmallPaymentInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-[13px] font-semibold text-zinc-950">
        {value}
      </p>
    </div>
  );
}

function LegendDot({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-100 bg-white px-2.5 py-1 text-zinc-500">
      <span className={`h-1.5 w-1.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function getLeaseStatus(endDate?: string | null) {
  if (!endDate) {
    return {
      label: "Active",
      badgeClass:
        "bg-emerald-50 text-emerald-700 border border-emerald-100",
    };
  }

  const today = new Date();
  const leaseEnd = new Date(endDate);

  today.setHours(0, 0, 0, 0);
  leaseEnd.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil(
    (leaseEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) {
    return {
      label: "Expired",
      badgeClass: "bg-red-50 text-red-700 border border-red-100",
    };
  }

  if (diffDays <= 60) {
    return {
      label: "Ending Soon",
      badgeClass: "bg-amber-50 text-amber-700 border border-amber-100",
    };
  }

  return {
    label: "Active",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border border-emerald-100",
  };
}
