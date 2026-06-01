"use client";

import {
  Eye,
  Download,
  Trash2,
} from "lucide-react";

import {
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOrCreateProfile } from "@/lib/getOrCreateProfile";

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
    lease_documents?: {
  id: string;
  file_name: string;
  file_url: string | null;
  file_type: string | null;
  storage_path?: string | null;
  file_size?: number | null;
  
}[];
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
  const [activities, setActivities] = useState<any[]>([]);

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
  const [selectedDocumentDelete, setSelectedDocumentDelete] = useState<any | null>(null);
  const [deletingDocument, setDeletingDocument] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
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
  .limit(5);

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
    (noteData || []).map((note: any) => ({
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
  const confirmDelete = confirm(
    `Delete ${tenant.first_name} ${tenant.last_name}?`
  );

  if (!confirmDelete || !property) return;

  const { error } = await supabase
    .from("lease_tenants")
    .delete()
    .eq("id", tenant.id);

  if (error) {
    console.error("Delete tenant error:", error);
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
    activity_type: "note_added",
    title: noteType === "shared" ? "Shared note added" : "Private note added",
    description: noteText,
  });

  setNewNote("");
  setNoteType("private");
  setNoteOpen(false);
}
  
async function handleDeleteNote() {
  if (!selectedNoteDelete) return;

  setDeletingNote(true);

  const { error } = await supabase
    .from("property_notes")
    .delete()
    .eq("id", selectedNoteDelete.id)
    .eq("property_id", propertyId);

  if (error) {
    console.error("Delete note error:", error);
    alert("Unable to delete note.");
    setDeletingNote(false);
    return;
  }

  setNotes((prev) => prev.filter((note) => note.id !== selectedNoteDelete.id));
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
    const filePath = `${property.id}/${Date.now()}-${file.name}`;

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

async function downloadDocument(doc: any) {
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

async function openDocument(doc: any) {
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
  const tenants = (lease?.lease_tenants || []).sort((a, b) => {
  const aPrimary = a.tenant_role?.toLowerCase() === "primary";
  const bPrimary = b.tenant_role?.toLowerCase() === "primary";

  if (aPrimary && !bPrimary) return -1;
  if (!aPrimary && bPrimary) return 1;

  return 0;
});
  const documents = lease?.lease_documents || [];

  return (
    <>
      <div className="mt-2 grid h-full min-h-0 grid-cols-1 gap-3 overflow-y-auto pb-4 lg:mt-3 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-3 lg:overflow-hidden">
        <div className="min-h-0 space-y-3 lg:overflow-y-auto lg:pr-0">
          <section className="rounded-[22px] border border-[#E8E5DE] bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.03)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-[30px] font-semibold tracking-[-0.04em] text-zinc-900 sm:text-[34px]">
  {property.property_label}
</h1>

                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${leaseStatus.badgeClass}`}
                  >
                    {leaseStatus.label}
                  </span>
                </div>
                <p className="mt-3 flex items-center gap-2 text-[14px] font-medium leading-6 text-zinc-500 sm:text-[15px]">
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
  className={`rounded-2xl px-4 py-2.5 text-[13px] font-semibold transition ${
    leaseEndingSoon
      ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
      : "border border-black/5 bg-white text-[#B9476D] hover:bg-zinc-50"
  }`}
>
  {leaseEndingSoon ? "Extend Lease" : "Edit Lease"}
</button>

  <div className="relative">
    <button
      onClick={() => setActionMenuOpen(!actionMenuOpen)}
      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-black/5 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
    >
      ⋯
    </button>

    {actionMenuOpen && (
      <div className="absolute right-0 top-12 z-50 w-[180px] rounded-2xl border border-black/5 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
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

            <div className="mt-5 rounded-[22px] border border-black/5 bg-[#FAFAFA] p-4 lg:hidden">
              <p className="text-[13px] text-zinc-500">Upcoming Due</p>

              <div className="mt-2 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[32px] font-semibold tracking-[-0.06em] text-zinc-900">
                    ${Number(lease?.monthly_rent || 0).toLocaleString()}
                  </p>

                  <p className="mt-1 text-[13px] text-zinc-500">
                    Due {lease?.rent_due_day || "—"}
                  </p>
                </div>

                <div className="text-right">
                  <p
                    className={`text-[13px] font-semibold ${
                      bankConnected ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {bankConnected ? "Bank verified" : "Bank pending"}
                  </p>

                  <p className="mt-1 text-[12px] text-zinc-400">
                    Lease ends {formatDateShort(lease?.end_date)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 hidden gap-3 lg:grid xl:grid-cols-4">
              <MetricCard
                label="Monthly Rent"
                value={`$${Number(lease?.monthly_rent || 0).toLocaleString()}`}
                subtext="Per month"
                success
              />

              <MetricCard
                label="Due This Month"
                value={`$${Number(lease?.monthly_rent || 0).toLocaleString()}`}
                subtext={lease?.rent_due_day || "—"}
              />

              <MetricCard
                label="Bank Status"
                value={bankConnected ? "Verified" : "Pending"}
                subtext={bankConnected ? "Ready" : "Action needed"}
                warning={!bankConnected}
                success={bankConnected}
              />

              <MetricCard
                label="Lease Ends"
                value={formatDate(lease?.end_date)}
                subtext={leaseStatus.label}
                warning={leaseStatus.label !== "Active"}
              />
            </div>

            {!bankConnected && (
              <div className="mt-4 rounded-[22px] border border-amber-100 bg-amber-50 p-4 lg:mt-5 lg:flex lg:items-center lg:justify-between lg:gap-5">
                <div>
                  <p className="text-[14px] font-semibold text-amber-900">
                    Connect bank account
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-amber-800">
                    Activate rent collection and allow tenants to complete
                    payment setup.
                  </p>
                </div>

                <button
                  onClick={() => handleConnectStripe()}
                  className="mt-4 h-11 w-full rounded-2xl bg-[#B9476D] px-5 text-[13px] font-semibold text-white hover:bg-[#A93F64] lg:mt-0 lg:w-auto lg:shrink-0"
                >
                  Connect Bank
                </button>
              </div>
            )}
          </section>

          <section className="relative z-20 overflow-visible rounded-[24px] border border-[#E8E5DE] bg-white shadow-[0_4px_18px_rgba(15,23,42,0.025)]">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-[17px] font-semibold tracking-[-0.035em] text-slate-950">
                  Tenants
                </h2>
                <p className="mt-1 text-[12px] text-zinc-500">
                  {tenants.length} tenant record
                  {tenants.length === 1 ? "" : "s"}
                </p>
              </div>

              {tenants.length > 0 && (
                <button
                  onClick={() => router.push(`/dashboard/properties/${propertyId}/edit?step=2`)}
                  className="rounded-xl border border-black/5 px-4 py-2 text-[13px] font-semibold text-[#B9476D] hover:bg-zinc-50"
                >
                  Add / Modify
                </button>
              )}
            </div>

            <div className="space-y-3 overflow-visible p-4">
              {tenants.length > 0 ? (
                tenants.map((tenant) => (
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
onDelete={() => handleDeleteTenant(tenant)}
                />
                ))
              ) : (
                <div className="rounded-2xl bg-[#FAFAFA] px-4 py-5 text-[13px] text-zinc-500 sm:col-span-2">
                  No tenant added.
                </div>
              )}
            </div>
          </section>


          <section className="overflow-hidden rounded-[24px] border border-[#E8E5DE] bg-white shadow-[0_4px_18px_rgba(15,23,42,0.025)]">
  <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-4 sm:px-5">
    <div>
      <h2 className="text-[17px] font-semibold tracking-[-0.035em] text-slate-950">
        Notes
      </h2>
    </div>

    <button
      onClick={() => setNoteOpen(true)}
      className="rounded-xl border border-black/5 px-4 py-2 text-[13px] font-semibold text-[#B9476D] transition-all duration-200 hover:bg-zinc-50"
    >
      Add Note
    </button>
  </div>

  <div className="grid gap-3 p-4 sm:grid-cols-2">
    
    {notes.length === 0 ? (
  <div className="rounded-[18px] bg-[#FFF8EA] px-4 py-3">
    <span className="rounded-full bg-[#FFE8B8] px-2 py-1 text-[10px] font-semibold text-[#8A5A00]">
      Private Note
    </span>

    <p className="mt-3 text-[13px] font-medium leading-5 text-zinc-900">
      Save reminders, updates, and important property notes.
    </p>

    <p className="mt-3 text-[12px] text-zinc-500">
      Getting Started • AvenueBoard
    </p>
  </div>
) : (
      notes.map((note) => (
  <div
  key={note.id}
  className={`group relative rounded-[18px] px-4 py-3 pr-12 ${
    note.type === "private"
      ? "bg-[#FFF8EA]"
      : "bg-[#EFF7FF]"
  }`}
>
    <button
  type="button"
  onClick={() => {
    setSelectedNoteDelete(note);
    setNoteDeleteOpen(true);
  }}
  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-zinc-400 opacity-0 transition-all duration-200 hover:bg-white hover:text-red-500 group-hover:opacity-100"
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

    <span
      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
        note.type === "private"
          ? "bg-[#FFE8B8] text-[#8A5A00]"
          : "bg-[#DCEEFF] text-[#1D5F9F]"
      }`}
    >
      {note.type === "private" ? "Private Note" : "Shared Note"}
    </span>

    <p className="mt-3 text-[13px] font-medium leading-5 text-zinc-900">
      {note.text}
    </p>

    <p className="mt-3 text-[12px] text-zinc-500">
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
  </div>
))
    )}
  </div>
</section>
                    <section className="overflow-hidden rounded-[24px] border border-[#E8E5DE] bg-white shadow-[0_4px_18px_rgba(15,23,42,0.025)]">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-[17px] font-semibold tracking-[-0.035em] text-slate-950">
                  Property Documents
                </h2>
                <p className="mt-1 text-[12px] text-zinc-500">
                  Lease agreements and uploads
                </p>
              </div>

              <label className="cursor-pointer rounded-xl border border-dashed border-zinc-300 px-4 py-2 text-[13px] font-semibold text-[#B9476D] transition-all duration-200 hover:bg-zinc-50">
  {uploadingDocument ? "Uploading..." : "Upload"}
  <input
    type="file"
    className="hidden"
    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
    onChange={handleDocumentUpload}
    disabled={uploadingDocument}
  />
</label>
            </div>

            <div className="space-y-2 p-4">
              {documents.length > 0 ? (
                
            documents.map((doc) => (
  <div
    key={doc.id}
    className="flex w-full items-center justify-between rounded-2xl border border-black/5 bg-[#FAFAFA] px-4 py-3 text-left transition-all duration-200 hover:bg-zinc-50"
  >
    <button
      type="button"
      onClick={() => openDocument(doc)}
      className="min-w-0 flex-1 text-left"
    >
      <p className="truncate text-[13px] font-semibold text-zinc-900">
        {doc.file_name}
      </p>

      <p className="mt-1 text-[12px] text-zinc-500">
        Uploaded document
      </p>
    </button>

    <div className="ml-3 flex items-center gap-1">
      <button
        type="button"
        onClick={() => openDocument(doc)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-400 transition hover:text-zinc-900"
        title="View"
      >
        <Eye size={15} strokeWidth={1.6} />
      </button>

      <button
        type="button"
        onClick={() => downloadDocument(doc)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-400 transition hover:text-zinc-900"
        title="Download"
      >
        <Download size={15} strokeWidth={1.6} />
      </button>

      <button
        type="button"
        onClick={() => {
          setSelectedDocumentDelete(doc);
          setDocumentDeleteOpen(true);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-400 transition hover:text-red-500"
        title="Delete"
      >
        <Trash2 size={15} strokeWidth={1.6} />
      </button>
    </div>
  </div>
))

              ) : (
                <div className="rounded-2xl bg-[#FAFAFA] px-4 py-8 text-center">
                  <p className="text-[14px] font-semibold text-zinc-800">
                    Store leases, renewals, notices, inspections, and important property documents.
                  </p>

                </div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-[24px] border border-[#E8E5DE] bg-white shadow-[0_4px_18px_rgba(15,23,42,0.025)]">
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-[17px] font-semibold tracking-[-0.035em] text-slate-950">
                Recent Activity
              </h2>

              <p className="mt-1 text-[12px] text-zinc-500">
                Latest property updates
              </p>
            </div>

            <div className="space-y-3 p-4">
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))
              ) : (
                <div className="rounded-2xl bg-[#FAFAFA] px-4 py-5 text-[13px] text-zinc-500">
                  No activity yet.
                </div>
              )}
            </div>
          </section>
        </div>


        <aside className="hidden min-h-0 flex-col gap-3 lg:flex lg:overflow-hidden">
          
          <PaymentPerformanceCard
  payments={payments}
  leaseStartDate={lease?.start_date}
  leaseEndDate={lease?.end_date}
  monthlyRent={lease?.monthly_rent || 0}
  rentDueDay={lease?.rent_due_day || "1st of the Month"}
  propertyCreatedAt={property.created_at}
/>

          <section className="rounded-[24px] border border-[#E8E5DE] bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.035)]">
  <div className="flex items-start justify-between gap-3">
    <div>
      <h2 className="text-[18px] font-semibold tracking-[-0.045em] text-slate-950">
        Payment Setup
      </h2>

      <p className="mt-1 text-[12px] text-zinc-500">
        Powered by <span className="font-semibold text-[#635BFF]">stripe</span>
      </p>
    </div>

    <span
      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
        bankConnected
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {bankConnected ? "Active" : "Needs Action"}
    </span>
  </div>

  <div className="mt-5 space-y-4">
    <div className="flex items-center justify-between">
      <p className="text-[13px] text-zinc-500">Payout Method</p>
      <p className="text-[13px] font-semibold text-zinc-900">
        {bankConnected ? "Direct Deposit" : "Not connected"}
      </p>
    </div>

    <div className="flex items-center justify-between">
      <p className="text-[13px] text-zinc-500">Next Payout</p>
      <p className="text-[13px] font-semibold text-zinc-900">
        {bankConnected ? "Available after setup" : "Pending setup"}
      </p>
    </div>

    <div className="flex items-center justify-between">
      <p className="text-[13px] text-zinc-500">Tenant Payments</p>
      <p className="text-[13px] font-semibold text-zinc-900">
        {bankConnected ? "Enabled" : "Paused"}
      </p>
    </div>
  </div>

  <button
    onClick={() => handleConnectStripe()}
    className="mt-5 h-11 w-full rounded-2xl bg-[#B9476D] text-[14px] font-semibold text-white transition hover:bg-[#A93F64]"
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
}: {
  payments: any[];
  leaseStartDate?: string | null;
  leaseEndDate?: string | null;
  monthlyRent: number;
  rentDueDay: string;
  propertyCreatedAt?: string | null;
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
    status: savedPayment?.status || item.status,
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

  const completedCount = paidCount + lateCount;
  const onTimeRate =
    completedCount > 0 ? Math.round((paidCount / completedCount) * 100) : 100;

  return (
    <section className="rounded-[24px] border border-[#E8E5DE] bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.035)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-semibold leading-6 tracking-[-0.045em] text-slate-950">
            Payout Performance
          </h2>
          <p className="mt-2 text-[12px] leading-5 text-zinc-500">
            Rent payments for
            <br />
            {formatMonthYear(leaseStartDate)} – {formatMonthYear(leaseEndDate)}
          </p>
        </div>

        <div className="rounded-[18px] bg-emerald-50 px-4 py-3 text-right">
          <p className="text-[23px] font-semibold tracking-[-0.06em] text-emerald-700">
            {onTimeRate}%
          </p>
          <p className="text-[11px] font-medium text-zinc-500">On-time rate</p>
        </div>
      </div>

      <div className="mt-4 max-h-[300px] space-y-2 overflow-y-auto pr-1">
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

      <div className="mt-5 grid grid-cols-4 overflow-hidden rounded-[18px] border border-zinc-100 bg-white">
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
      className="grid grid-cols-[54px_26px_1fr] items-center gap-3"
    >
      <p className="text-[12px] font-medium text-slate-800">{item.month}</p>

      <div className="flex flex-col items-center">
        <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
        <span className={`mt-1 h-8 w-[10px] rounded-full ${styles.bar}`} />
      </div>

      <div className={`rounded-[15px] px-3 py-2 ${styles.card}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold ${styles.icon}`}
              >
                {styles.symbol}
              </span>

              <p className={`text-[12px] font-semibold ${styles.text}`}>
                {styles.label}
              </p>
            </div>
          </div>

          <p className="shrink-0 text-[12px] font-semibold text-slate-950">
            ${Number(monthlyRent || 0).toLocaleString()}
          </p>
        </div>
      </div>
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
    <div className="border-r border-zinc-100 px-2 py-3 text-center last:border-r-0">
      <div className="flex items-center justify-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <p className="text-[10px] font-semibold text-zinc-500">{label}</p>
      </div>

      <p className={`mt-1 text-[18px] font-semibold tracking-[-0.04em] ${color}`}>
        {value}
      </p>
    </div>
  );
}

function getPaymentRowStyles(status: MonthStatus) {
  if (status === "paid") {
    return {
      label: "Paid",
      symbol: "✓",
      card: "bg-gradient-to-r from-emerald-50 to-emerald-50/35",
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
      <p className="text-[12px] font-semibold text-slate-500">{label}</p>

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

      <p className="mt-1 truncate text-[12px] font-medium text-slate-500">
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

  const initials = `${tenant.first_name?.charAt(0) || ""}${
    tenant.last_name?.charAt(0) || ""
  }`;

  const inviteAccepted = tenant.invite_status === "accepted";
  const isPrimaryTenant = tenant.tenant_role === "primary";

  return (
    <div
  ref={menuRef}
  className="relative overflow-visible flex items-center gap-4 rounded-[18px] border border-black/5 bg-[#FAFAFA] px-4 py-3 transition-all duration-200 hover:bg-white hover:shadow-sm"
>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#B9476D] text-[13px] font-semibold text-white">
        {initials || "T"}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[14px] font-semibold text-slate-950">
            {tenant.first_name} {tenant.last_name}
          </p>

          {tenant.tenant_role === "primary" && (
            <span className="rounded-full bg-[#FFF1F5] px-2 py-[3px] text-[9px] font-semibold text-[#B9476D]">
              Primary
            </span>
          )}

          {tenant.tenant_role === "primary" && (
  <span
    className={`rounded-full px-2 py-[3px] text-[9px] font-semibold ${
      inviteAccepted
        ? "bg-emerald-50 text-emerald-700"
        : "bg-amber-50 text-amber-700"
    }`}
  >
    {inviteAccepted ? "Invite accepted · Dashboard enabled" : "Invite sent"}
  </span>
)}
        </div>

        <p className="mt-1 truncate text-[12px] text-zinc-500">
          {tenant.email || "No email"}
        </p>
      </div>

    <div className="relative z-20 flex items-center gap-3">
  {isPrimaryTenant && (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      inviteAccepted ? onRequestPayment() : onResendInvite();
    }}
    className="relative z-30 rounded-xl border border-black/5 bg-white px-3 py-2 text-[12px] font-semibold text-[#B9476D] transition hover:bg-zinc-50"
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
  className="relative z-30 flex h-8 w-8 items-center justify-center text-[18px] font-semibold text-zinc-700 transition hover:text-black"
>
  ⋮
</button>
</div>

      {menuOpen && (
        <div className="absolute right-0 top-12 z-[80] w-[190px] rounded-2xl border border-black/5 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
          <button
            onClick={onEdit}
            className="w-full rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-slate-700 hover:bg-zinc-50"
          >
            Edit tenant
          </button>


          <button
            onClick={onDelete}
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

function ActivityItem({ activity }: { activity: any }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white px-4 py-4">
      <p className="text-[13px] font-semibold text-zinc-900">
        {activity.title}
      </p>

      <p className="mt-1 text-[12px] text-zinc-500">
        {activity.description}
      </p>

      <p className="mt-2 text-[11px] text-zinc-400">
        {formatDate(activity.created_at)}
      </p>
    </div>
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

function formatDate(date?: string | null) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateShort(date?: string | null) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
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