export type TenantLease = {
  id: string;
  tenant_access_id: string;
  property_id: string;
  lease_id: string;
  owner_profile_id: string | null;
  property_label: string;
  street_address: string;
  city: string;
  state_name: string;
  zip: string;
  unit_name: string | null;
  start_date: string | null;
  end_date: string | null;
  monthly_rent: number;
  rent_due_day: string | null;
};

export type TenantAccessRow = {
  id: string;
  property_id: string;
  lease_id: string;
  invite_status?: string | null;
  created_at?: string | null;
};

export type TenantPropertyRow = {
  id: string;
  owner_profile_id: string | null;
  property_label: string | null;
  street_address: string | null;
  city: string | null;
  state_name: string | null;
  zip: string | null;
  unit_name: string | null;
};

export type PropertyContact = {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
};

export type TenantLeaseRow = {
  id: string;
  start_date: string | null;
  end_date: string | null;
  monthly_rent: number | null;
  rent_due_day: string | null;
};

export type LeaseDocument = {
  id: string;
  property_id?: string | null;
  lease_id: string;
  file_name: string;
  file_url: string | null;
  file_type: string | null;
  storage_path?: string | null;
  file_size?: number | null;
  uploaded_by_profile_id?: string | null;
  created_at?: string | null;
};

export type PropertyNote = {
  id: string;
  property_id: string;
  lease_id: string | null;
  profile_id: string | null;
  note_type: "private" | "shared";
  text: string;
  created_by_role: "landlord" | "tenant";
  created_at: string;
};

export type DeleteTarget =
  | {
      type: "note";
      item: PropertyNote;
    }
  | {
      type: "document";
      item: LeaseDocument;
    };

export type PaymentMethod = {
  id: string;
  lease_id: string;
  brand: string | null;
  last4: string | null;
  exp_month: string | null;
  exp_year: string | null;
  is_default: boolean | null;
};

export type RentPayment = {
  id: string;
  lease_id: string;
  payment_method_id: string | null;
  amount: number;
  period_label: string | null;
  status: string | null;
  receipt_url: string | null;
  paid_at: string | null;
  created_at: string | null;
};

export type ActivityLog = {
  id: string;
  property_id: string | null;
  lease_id: string | null;
  activity_type: string;
  title: string;
  description: string | null;
  created_at: string;
};

export type TenantActivityIcon =
  | "payment-success"
  | "payment-pending"
  | "payment-alert"
  | "document"
  | "note"
  | "delete";

export type TenantActivity = {
  id: string;
  timestamp: string;
  icon: TenantActivityIcon;
  title: string;
  subtitle: string;
  amount?: string;
  badge?: string;
  badgeClass?: string;
  iconClass: string;
  amountClass?: string;
  propertyId?: string;
  leaseId?: string;
};

export type UserInfo = {
  name: string;
  email: string;
};
