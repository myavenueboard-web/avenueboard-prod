"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Camera,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  Headphones,
  Home,
  LogOut,
  Mail,
  MessageSquare,
  Phone,
  ShieldCheck,
  ReceiptText,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import AvaChatPanel from "@/app/components/ava/AvaChatPanel";
import { getOrCreateProfile } from "@/lib/getOrCreateProfile";
import { supabase } from "@/lib/supabase";
import { buildTenantActivities } from "@/lib/tenant/tenantActivity";
import type {
  ActivityLog,
  LeaseDocument,
  PropertyNote,
  RentPayment,
  TenantActivity,
} from "@/lib/tenant/tenantTypes";

type MobileState = "signed-out" | "tenant" | "dual" | "landlord-only";
type MobileTab = "home" | "rent" | "perks" | "hub" | "activity";
type MobilePerksSection = "avenue-perks" | "credit-building";
type MobileAccountDrawerTab = "profile" | "notifications";
type MobileAvaMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};
type MobileAvaPendingTicketDraft = {
  status?: string;
  originalUserMessage?: string;
  issueSummary?: string;
  details?: string;
  category?: string;
  priority?: string;
  conversationSummary?: string;
} | null;
type MobileResolution = {
  nextState: MobileState;
  nextContext?: MobileContext;
  nextHomeData?: MobileHomeData;
  nextRentals?: MobileRental[];
  nextSelectedRentalId?: string;
};

type MobileContext = {
  profileId: string | null;
  firstName: string;
  initials: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  propertyAddress: string;
  unitName: string;
  landlordName: string;
  landlordEmail: string;
};

type MobileLease = {
  id: string;
  start_date: string | null;
  end_date: string | null;
  payment_tracking_start_date?: string | null;
  monthly_rent: number | null;
  rent_due_day: string | null;
};

type MobilePaymentMethod = {
  id: string;
  autopay_status: string | null;
  autopay_enrolled: boolean | null;
  brand: string | null;
  last4: string | null;
  is_default: boolean | null;
};

type MobileRentPayment = {
  id: string;
  amount: number | null;
  rent_cycle_key: string | null;
  rent_cycle_month_label: string | null;
  period_label: string | null;
  status: string | null;
  paid_at: string | null;
  created_at: string | null;
};

type MobilePaymentRow = {
  id: string;
  cycleKey: string;
  label: string;
  dueText: string;
  amount: number | null;
  status: "paid" | "upcoming" | "late" | "future";
  statementHref: string | null;
};

type MobileDeal = {
  name: string;
  logo: string;
  logoClass: string;
  description: string;
  category: string;
};

type MobileNote = {
  id: string;
  profile_id: string | null;
  note_type: "private" | "shared";
  text: string;
  created_by_role: "landlord" | "tenant" | null;
  created_at: string | null;
};

type MobileDocument = {
  id: string;
  uploaded_by_profile_id: string | null;
  storage_path: string | null;
  file_name: string;
  file_url: string | null;
  file_type: string | null;
  file_size: number | null;
  created_at: string | null;
};

type MobileHomeData = {
  tenantAccessId: string | null;
  propertyId: string | null;
  leaseId: string | null;
  lease: MobileLease | null;
  paymentMethods: MobilePaymentMethod[];
  rentPayments: MobileRentPayment[];
  notes: MobileNote[];
  documents: MobileDocument[];
  activities: TenantActivity[];
};

type MobileRental = {
  accessId: string;
  propertyId: string;
  leaseId: string;
  propertyName: string;
  propertyAddress: string;
  unitName: string;
  context: MobileContext;
  homeData: MobileHomeData;
};

type MobileTabIcon = (props: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) => ReactNode;

const mobileTabs: { id: MobileTab; label: string; Icon: MobileTabIcon }[] = [
  { id: "home", label: "Home", Icon: Home },
  { id: "rent", label: "Rent", Icon: ReceiptText },
  { id: "perks", label: "Perks", Icon: Sparkles },
  { id: "hub", label: "Ava", Icon: MessageSquare },
  { id: "activity", label: "Activity", Icon: FileText },
];

const emptyHomeData: MobileHomeData = {
  tenantAccessId: null,
  propertyId: null,
  leaseId: null,
  lease: null,
  paymentMethods: [],
  rentPayments: [],
  notes: [],
  documents: [],
  activities: [],
};

const mobilePerksCategories = [
  "All Deals",
  "Food & Dining",
  "Travel",
  "Shopping",
  "Entertainment",
  "Wellness",
  "Tech",
  "Auto",
  "Kids",
  "Finance",
];

const mobilePartnerDeals: MobileDeal[] = [
  {
    name: "DoorDash",
    logo: "D",
    logoClass: "bg-red-50 text-red-600",
    description: "Save up to 15% off your next order.",
    category: "Food & Dining",
  },
  {
    name: "Uber",
    logo: "Uber",
    logoClass: "bg-zinc-950 text-white",
    description: "Save up to 15% on rides.",
    category: "Travel",
  },
  {
    name: "Starbucks",
    logo: "★",
    logoClass: "bg-emerald-50 text-emerald-700",
    description: "Earn rewards faster with member perks.",
    category: "Food & Drinks",
  },
  {
    name: "Booking.com",
    logo: "B.",
    logoClass: "bg-blue-50 text-blue-700",
    description: "Save up to 20% on stays worldwide.",
    category: "Travel",
  },
  {
    name: "Nike",
    logo: "Nike",
    logoClass: "bg-zinc-100 text-zinc-950",
    description: "Up to 20% off select styles.",
    category: "Shopping",
  },
  {
    name: "Hulu",
    logo: "hulu",
    logoClass: "bg-green-50 text-green-600",
    description: "Get up to 20% off your plan.",
    category: "Entertainment",
  },
  {
    name: "Walmart+",
    logo: "✦",
    logoClass: "bg-sky-50 text-sky-600",
    description: "Members save more every day.",
    category: "Shopping",
  },
  {
    name: "iHerb",
    logo: "iHerb",
    logoClass: "bg-lime-50 text-lime-700",
    description: "Up to 10% off wellness essentials.",
    category: "Wellness",
  },
];

const mobileGroupedDeals: { title: string; count: number; deals: MobileDeal[] }[] = [
  {
    title: "Food & Dining",
    count: 12,
    deals: [
      mobilePartnerDeals[0],
      mobilePartnerDeals[2],
      {
        name: "Uber Eats",
        logo: "Eats",
        logoClass: "bg-zinc-950 text-emerald-400",
        description: "Enjoy up to 20% off your orders.",
        category: "Food & Dining",
      },
    ],
  },
  {
    title: "Travel",
    count: 8,
    deals: [mobilePartnerDeals[1], mobilePartnerDeals[3]],
  },
];

export default function MobileAppClient() {
  const routeLoadedAtRef = useRef(0);
  const [state, setState] = useState<MobileState>("signed-out");
  const [authResolved, setAuthResolved] = useState(false);
  const [minimumSplashDone, setMinimumSplashDone] = useState(false);
  const [splashExpired, setSplashExpired] = useState(false);
  const [nowMs, setNowMs] = useState(0);
  const [dualResidentSelected, setDualResidentSelected] = useState(false);
  const [context, setContext] = useState<MobileContext>({
    profileId: null,
    firstName: "there",
    initials: "AB",
    tenantName: "Resident",
    tenantEmail: "Not available",
    tenantPhone: "Not available",
    propertyAddress: "Resident workspace",
    unitName: "Not available",
    landlordName: "Not available",
    landlordEmail: "Not available",
  });
  const [homeData, setHomeData] = useState<MobileHomeData>(emptyHomeData);
  const [rentals, setRentals] = useState<MobileRental[]>([]);
  const [selectedRentalId, setSelectedRentalId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MobileTab>("home");

  useEffect(() => {
    let mounted = true;
    const mountedAt = Date.now();
    routeLoadedAtRef.current = mountedAt;
    setNowMs(mountedAt);

    async function resolveMobileEntry() {
      const result = await resolveMobileSession();
      if (!mounted) return;

      applyMobileResolution(result, {
        setState,
        setContext,
        setHomeData,
        setRentals,
        setSelectedRentalId,
        setDualResidentSelected,
      });
      setAuthResolved(true);
    }

    resolveMobileEntry().catch(() => {
      if (!mounted) return;
      setState("signed-out");
      setAuthResolved(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT" || !session) {
        applyMobileResolution({ nextState: "signed-out" }, {
          setState,
          setContext,
          setHomeData,
          setRentals,
          setSelectedRentalId,
          setDualResidentSelected,
        });
        setAuthResolved(true);
        return;
      }

      resolveMobileSession()
        .then((result) => {
          if (!mounted) return;
          applyMobileResolution(result, {
            setState,
            setContext,
            setHomeData,
            setRentals,
            setSelectedRentalId,
            setDualResidentSelected,
          });
          setAuthResolved(true);
        })
        .catch(() => {
          if (!mounted) return;
          setState("signed-out");
          setAuthResolved(true);
        });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const minimumTimer = window.setTimeout(() => setMinimumSplashDone(true), 900);
    const maximumTimer = window.setTimeout(() => {
      setMinimumSplashDone(true);
      setSplashExpired(true);
    }, 2500);

    return () => {
      window.clearTimeout(minimumTimer);
      window.clearTimeout(maximumTimer);
    };
  }, []);

  useEffect(() => {
    let animationFrame = 0;
    const interval = window.setInterval(() => setNowMs(Date.now()), 150);

    function tick() {
      setNowMs(Date.now());
      animationFrame = window.requestAnimationFrame(tick);
    }

    animationFrame = window.requestAnimationFrame(tick);

    return () => {
      window.clearInterval(interval);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  const splashElapsedMs =
    routeLoadedAtRef.current > 0 ? Math.max(0, nowMs - routeLoadedAtRef.current) : 0;
  const splashTimedOut = splashExpired || splashElapsedMs >= 2500;
  const showSplash =
    !splashTimedOut && (!minimumSplashDone || !authResolved || splashElapsedMs < 900);
  const showTenantShell = state === "tenant" || (state === "dual" && dualResidentSelected);

  return (
    <main className="min-h-screen bg-[#F5F6F8] text-[#0F172A]">
      <div className="mx-auto flex h-screen w-full max-w-[440px] flex-col overflow-hidden bg-white shadow-[0_0_80px_rgba(15,23,42,0.08)]">
        {showSplash ? (
          <MobileSplash />
        ) : showTenantShell ? (
          <MobileShell
            activeTab={activeTab}
            context={context}
            homeData={homeData}
            rentals={rentals}
            selectedRentalId={selectedRentalId}
            onSelectRental={(rental) => {
              setSelectedRentalId(rental.accessId);
              setContext(rental.context);
              setHomeData(rental.homeData);
            }}
            onHomeDataChange={setHomeData}
            onContextChange={setContext}
            onRentalsChange={setRentals}
            onTabChange={setActiveTab}
          />
        ) : (
          <MobilePlaceholder
            state={state}
            onResidentApp={() => setDualResidentSelected(true)}
          />
        )}
      </div>
    </main>
  );
}

async function resolveMobileSession(): Promise<MobileResolution> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return { nextState: "signed-out" };

  const profile = await getOrCreateProfile();

  const [{ data: roles }, { data: accessRows }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("profile_id", profile.id),
    supabase
      .from("tenant_access")
      .select("id, property_id, lease_id")
      .eq("tenant_profile_id", profile.id)
      .eq("invite_status", "accepted")
      .order("created_at", { ascending: false }),
  ]);

  const hasLandlordRole = (roles || []).some(
    (role) => String(role.role) === "landlord"
  );
  const validAccessRows = (accessRows || []).filter(
    (row): row is { id: string; property_id: string; lease_id: string } =>
      Boolean(row.id && row.property_id && row.lease_id)
  );
  const hasTenantAccess = validAccessRows.length > 0;
  const rentals = await Promise.all(
    validAccessRows.map((access) => loadMobileRental(access, profile))
  );
  const availableRentals = rentals.filter(Boolean) as MobileRental[];
  const selectedRental = availableRentals[0];
  const fallbackContext: MobileContext = {
    profileId: profile.id,
    firstName: getFirstName(profile.display_name || profile.email || "there"),
    initials: getInitials(profile.display_name || profile.email || "AB"),
    tenantName: profile.display_name || "Resident",
    tenantEmail: profile.email || "Not available",
    tenantPhone: profile.phone || "Not available",
    propertyAddress: "Resident workspace",
    unitName: "Not available",
    landlordName: "Not available",
    landlordEmail: "Not available",
  };

  if (hasTenantAccess && hasLandlordRole) {
    return {
      nextState: "dual",
      nextContext: selectedRental?.context || fallbackContext,
      nextHomeData: selectedRental?.homeData || emptyHomeData,
      nextRentals: availableRentals,
      nextSelectedRentalId: selectedRental?.accessId,
    };
  }

  if (hasTenantAccess) {
    return {
      nextState: "tenant",
      nextContext: selectedRental?.context || fallbackContext,
      nextHomeData: selectedRental?.homeData || emptyHomeData,
      nextRentals: availableRentals,
      nextSelectedRentalId: selectedRental?.accessId,
    };
  }

  if (hasLandlordRole) {
    return {
      nextState: "landlord-only",
      nextContext: fallbackContext,
    };
  }

  return {
    nextState: "signed-out",
    nextContext: fallbackContext,
  };
}

function applyMobileResolution(
  result: MobileResolution,
  setters: {
    setState: (state: MobileState) => void;
    setContext: (context: MobileContext) => void;
    setHomeData: (homeData: MobileHomeData) => void;
    setRentals: (rentals: MobileRental[]) => void;
    setSelectedRentalId: (id: string | null) => void;
    setDualResidentSelected: (selected: boolean) => void;
  }
) {
  if (result.nextContext) setters.setContext(result.nextContext);
  if (result.nextHomeData) setters.setHomeData(result.nextHomeData);
  if (result.nextRentals) setters.setRentals(result.nextRentals);
  if (result.nextSelectedRentalId) {
    setters.setSelectedRentalId(result.nextSelectedRentalId);
  } else {
    setters.setSelectedRentalId(null);
  }

  if (result.nextState !== "dual") setters.setDualResidentSelected(false);
  if (result.nextState === "signed-out") {
    setters.setHomeData(emptyHomeData);
    setters.setRentals([]);
  }

  setters.setState(result.nextState);
}

async function loadMobileRental(
  access: { id: string; property_id: string; lease_id: string },
  profile: {
    id: string;
    display_name?: string | null;
    email?: string | null;
    phone?: string | null;
  }
): Promise<MobileRental | null> {
  const { data: property } = await supabase
    .from("properties")
    .select(
      "id, owner_profile_id, property_label, street_address, city, state_name, zip, unit_name"
    )
    .eq("id", access.property_id)
    .maybeSingle();

  const { data: landlord } = property?.owner_profile_id
    ? await supabase
        .from("profiles")
        .select("display_name, email")
        .eq("id", property.owner_profile_id)
        .maybeSingle()
    : { data: null };

  const [
    { data: lease },
    { data: paymentMethods },
    { data: rentPayments },
    { data: documents },
    privateNotesResult,
    sharedNotesResult,
    { data: activityLogs },
  ] = await Promise.all([
    supabase
      .from("leases")
      .select(
        "id, start_date, end_date, payment_tracking_start_date, monthly_rent, rent_due_day"
      )
      .eq("id", access.lease_id)
      .maybeSingle(),
    supabase
      .from("payment_methods")
      .select("id, autopay_status, autopay_enrolled, brand, last4, is_default")
      .eq("tenant_access_id", access.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("rent_payments")
      .select(
        "id, amount, rent_cycle_key, rent_cycle_month_label, period_label, status, paid_at, created_at"
      )
      .eq("tenant_access_id", access.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("lease_documents")
      .select(
        "id, uploaded_by_profile_id, storage_path, file_name, file_url, file_type, file_size, created_at"
      )
      .eq("property_id", access.property_id)
      .eq("lease_id", access.lease_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("property_notes")
      .select("id, profile_id, note_type, text, created_by_role, created_at")
      .eq("property_id", access.property_id)
      .eq("lease_id", access.lease_id)
      .eq("profile_id", profile.id)
      .eq("created_by_role", "tenant")
      .eq("note_type", "private")
      .order("created_at", { ascending: false }),
    supabase
      .from("property_notes")
      .select("id, profile_id, note_type, text, created_by_role, created_at")
      .eq("property_id", access.property_id)
      .eq("lease_id", access.lease_id)
      .eq("note_type", "shared")
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_logs")
      .select("id, property_id, lease_id, activity_type, title, description, created_at")
      .eq("property_id", access.property_id)
      .eq("lease_id", access.lease_id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const propertyAddress = formatPropertyAddress(property);
  const notes = [
    ...((privateNotesResult.data || []) as MobileNote[]),
    ...((sharedNotesResult.data || []) as MobileNote[]),
  ].sort((a, b) => dateMs(b.created_at) - dateMs(a.created_at));

  return {
    accessId: access.id,
    propertyId: access.property_id,
    leaseId: access.lease_id,
    propertyName: property?.property_label || "Rental property",
    propertyAddress,
    unitName: property?.unit_name || "Not available",
    context: {
      profileId: profile.id,
      firstName: getFirstName(profile.display_name || profile.email || "there"),
      initials: getInitials(profile.display_name || profile.email || "AB"),
      tenantName: profile.display_name || "Resident",
      tenantEmail: profile.email || "Not available",
      tenantPhone: profile.phone || "Not available",
      propertyAddress,
      unitName: property?.unit_name || "Not available",
      landlordName: landlord?.display_name || "Not available",
      landlordEmail: landlord?.email || "Not available",
    },
    homeData: {
      tenantAccessId: access.id,
      propertyId: access.property_id,
      leaseId: access.lease_id,
      lease: (lease || null) as MobileLease | null,
      paymentMethods: (paymentMethods || []) as MobilePaymentMethod[],
      rentPayments: (rentPayments || []) as MobileRentPayment[],
      notes,
      documents: (documents || []) as MobileDocument[],
      activities: buildTenantActivities(
        (activityLogs || []) as ActivityLog[],
        (rentPayments || []) as RentPayment[],
        (documents || []) as LeaseDocument[],
        notes as PropertyNote[],
        [],
        profile.id
      ),
    },
  };
}

function MobileShell({
  activeTab,
  context,
  homeData,
  rentals,
  selectedRentalId,
  onSelectRental,
  onHomeDataChange,
  onContextChange,
  onRentalsChange,
  onTabChange,
}: {
  activeTab: MobileTab;
  context: MobileContext;
  homeData: MobileHomeData;
  rentals: MobileRental[];
  selectedRentalId: string | null;
  onSelectRental: (rental: MobileRental) => void;
  onHomeDataChange: (homeData: MobileHomeData) => void;
  onContextChange: (context: MobileContext) => void;
  onRentalsChange: (rentals: MobileRental[]) => void;
  onTabChange: (tab: MobileTab) => void;
}) {
  const activeLabel = mobileTabs.find((tab) => tab.id === activeTab)?.label || "Home";
  const rentTabActive = activeTab === "rent";
  const perksTabActive = activeTab === "perks";
  const avaTabActive = activeTab === "hub";
  const activityTabActive = activeTab === "activity";
  const [contextOpen, setContextOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [dealsOpen, setDealsOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [accountDrawerTab, setAccountDrawerTab] =
    useState<MobileAccountDrawerTab>("profile");
  const [propertySelectorOpen, setPropertySelectorOpen] = useState(false);
  const [perksSection, setPerksSection] =
    useState<MobilePerksSection>("avenue-perks");
  const [deletingNoteId, setDeletingNoteId] = useState("");
  const [deletingDocumentId, setDeletingDocumentId] = useState("");
  const [avaMessages, setAvaMessages] = useState<MobileAvaMessage[]>([
    {
      id: "ava-welcome",
      role: "assistant",
      content:
        "Hi, I'm Ava 👋\n\nI'm here to help with anything related to your rental.\n\nHow can I help today?",
    },
  ]);
  const [avaConversationId, setAvaConversationId] = useState<string | null>(null);
  const [avaPendingTicketDraft, setAvaPendingTicketDraft] =
    useState<MobileAvaPendingTicketDraft>(null);

  const updateCurrentRentalHomeData = (nextHomeData: MobileHomeData) => {
    onHomeDataChange(nextHomeData);
    if (!selectedRentalId) return;
    onRentalsChange(
      rentals.map((rental) =>
        rental.accessId === selectedRentalId
          ? { ...rental, homeData: nextHomeData }
          : rental
      )
    );
  };

  const updateCurrentContext = (nextContext: MobileContext) => {
    onContextChange(nextContext);
    if (!selectedRentalId) return;
    onRentalsChange(
      rentals.map((rental) =>
        rental.accessId === selectedRentalId
          ? { ...rental, context: nextContext }
          : rental
      )
    );
  };

  const openAccountDrawer = (tab: MobileAccountDrawerTab) => {
    setAccountDrawerTab(tab);
    setAccountDrawerOpen(true);
  };

  async function handleDeleteNote(note: MobileNote) {
    if (!canDeleteMobileNote(note, context.profileId) || deletingNoteId) return;

    setDeletingNoteId(note.id);
    const { error } = await supabase
      .from("property_notes")
      .delete()
      .eq("id", note.id)
      .eq("profile_id", context.profileId)
      .eq("created_by_role", "tenant")
      .select("id")
      .maybeSingle();

    setDeletingNoteId("");
    if (error) return;

    updateCurrentRentalHomeData({
      ...homeData,
      notes: homeData.notes.filter((item) => item.id !== note.id),
      activities: homeData.activities.filter((item) => item.id !== `note-${note.id}`),
    });
  }

  async function handleDeleteDocument(document: MobileDocument) {
    if (!canDeleteMobileDocument(document, context.profileId) || deletingDocumentId) return;

    setDeletingDocumentId(document.id);
    const { error } = await supabase
      .from("lease_documents")
      .delete()
      .eq("id", document.id)
      .eq("uploaded_by_profile_id", context.profileId)
      .select("id")
      .maybeSingle();

    if (!error && document.storage_path) {
      await supabase.storage.from("lease-documents").remove([document.storage_path]);
    }

    setDeletingDocumentId("");
    if (error) return;

    updateCurrentRentalHomeData({
      ...homeData,
      documents: homeData.documents.filter((item) => item.id !== document.id),
      activities: homeData.activities.filter((item) => item.id !== `document-${document.id}`),
    });
  }

  return (
    <>
      <section className="scrollbar-hide min-h-0 flex-1 overflow-y-auto bg-white pb-[calc(env(safe-area-inset-bottom)+104px)]">
        {!perksTabActive && !avaTabActive && (
          <MobileHeader
            context={context}
            onOpenNotifications={() => openAccountDrawer("notifications")}
            onOpenProfile={() => openAccountDrawer("profile")}
          />
        )}
        {perksTabActive ? (
          <PerksStickyTabs activeSection={perksSection} onChange={setPerksSection} />
        ) : (
          <WorkspaceRow
            address={context.propertyAddress}
            label={
              activityTabActive
                ? "Recent Activity"
                : avaTabActive
                  ? "Ava"
                  : rentTabActive
                    ? "Rent"
                    : "Resident"
            }
            value={
              activityTabActive
                ? ""
                : avaTabActive
                  ? "AI Assistant"
                  : rentTabActive
                    ? "Performance"
                    : undefined
            }
            singleLabel={activityTabActive}
            multipleProperties={
              !rentTabActive && !activityTabActive && !avaTabActive && rentals.length > 1
            }
            onOpenContext={() =>
              rentTabActive || activityTabActive || avaTabActive
                ? setContextOpen(false)
                : rentals.length > 1
                  ? setPropertySelectorOpen(true)
                  : setContextOpen(true)
            }
          />
        )}
        <div className="px-5 pt-7">
          {activeTab === "home" ? (
            <HomeTab
              context={context}
              homeData={homeData}
              onViewAllNotes={() => setNotesOpen(true)}
              onViewAllDocuments={() => setDocumentsOpen(true)}
            />
          ) : activeTab === "rent" ? (
            <RentTab homeData={homeData} />
          ) : activeTab === "perks" ? (
            <PerksTab
              activeSection={perksSection}
              onViewAllDeals={() => setDealsOpen(true)}
            />
          ) : activeTab === "hub" ? (
            <AvaTab
              context={context}
              homeData={homeData}
              messages={avaMessages}
              conversationId={avaConversationId}
              pendingTicketDraft={avaPendingTicketDraft}
              onMessagesChange={setAvaMessages}
              onConversationIdChange={setAvaConversationId}
              onPendingTicketDraftChange={setAvaPendingTicketDraft}
            />
          ) : activeTab === "activity" ? (
            <ActivityTab activities={homeData.activities} />
          ) : (
            <MobileTabPlaceholder label={activeLabel} />
          )}
        </div>
      </section>
      <MobileBottomNav activeTab={activeTab} onTabChange={onTabChange} />
      {contextOpen && (
        <ResidentContextSheet
          context={context}
          onClose={() => setContextOpen(false)}
        />
      )}
      {propertySelectorOpen && (
        <PropertySelectorSheet
          rentals={rentals}
          selectedRentalId={selectedRentalId}
          onSelect={(rental) => {
            onSelectRental(rental);
            setPropertySelectorOpen(false);
          }}
          onClose={() => setPropertySelectorOpen(false)}
        />
      )}
      {notesOpen && (
        <MobileNotesSheet
          notes={homeData.notes}
          profileId={context.profileId}
          deletingNoteId={deletingNoteId}
          onDeleteNote={handleDeleteNote}
          onClose={() => setNotesOpen(false)}
        />
      )}
      {documentsOpen && (
        <MobileDocumentsSheet
          documents={homeData.documents}
          profileId={context.profileId}
          deletingDocumentId={deletingDocumentId}
          onDeleteDocument={handleDeleteDocument}
          onClose={() => setDocumentsOpen(false)}
        />
      )}
      {dealsOpen && (
        <MobileDealsSheet deals={mobilePartnerDeals} onClose={() => setDealsOpen(false)} />
      )}
      {accountDrawerOpen && (
        <MobileAccountDrawer
          activeTab={accountDrawerTab}
          context={context}
          homeData={homeData}
          onChangeTab={setAccountDrawerTab}
          onClose={() => setAccountDrawerOpen(false)}
          onProfileSaved={updateCurrentContext}
        />
      )}
    </>
  );
}

function MobileSplash() {
  return (
    <section className="flex min-h-screen flex-col bg-white px-8 pb-[calc(env(safe-area-inset-bottom)+36px)] pt-[env(safe-area-inset-top)]">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <img
          src="/logo.png"
          alt="AvenueBoard"
          className="h-12 w-auto object-contain"
        />
        <p className="mt-5 text-[18px] font-semibold tracking-[-0.04em] text-[#0F172A]">
          Rent, simplified.
        </p>
      </div>
      <div className="mx-auto h-px w-44 overflow-hidden bg-zinc-200">
        <div className="h-full w-16 animate-[mobileLoading_1.1s_ease-in-out_infinite] bg-[#0F172A]" />
      </div>
      <style jsx>{`
        @keyframes mobileLoading {
          0% {
            transform: translateX(-4rem);
          }
          100% {
            transform: translateX(11rem);
          }
        }
      `}</style>
    </section>
  );
}

function HomeTab({
  context,
  homeData,
  onViewAllNotes,
  onViewAllDocuments,
}: {
  context: MobileContext;
  homeData: MobileHomeData;
  onViewAllNotes: () => void;
  onViewAllDocuments: () => void;
}) {
  return (
    <div className="space-y-5">
      <section>
        <p className="text-[24px] font-semibold tracking-[-0.06em] text-[#050B1F]">
          {getMobileGreeting()}, {context.firstName}
        </p>
      </section>

      <RentStatusCard homeData={homeData} />
      <MobileNotesSection notes={homeData.notes} onViewAll={onViewAllNotes} />
      <MobileDocumentsSection
        documents={homeData.documents}
        onViewAll={onViewAllDocuments}
      />
      <PropertyContactCard context={context} />
    </div>
  );
}

function RentTab({ homeData }: { homeData: MobileHomeData }) {
  const rows = buildMobilePaymentRows(homeData);
  const progress = buildMobilePaymentSummary(rows);
  const nextStatement =
    rows.find((row) => row.status === "upcoming") ||
    rows.find((row) => row.status === "late");
  const nextEligible = rows.find((row) => row.status === "upcoming" || row.status === "late");
  const monthlyRent = homeData.lease?.monthly_rent ?? rows[0]?.amount ?? null;
  const actionNeeded = getMobileActionNeeded(nextEligible);

  return (
    <div className="space-y-5">
      <RentStatusCard homeData={homeData} showDivider={false} />

      <section>
        <div className="grid grid-cols-2 gap-3">
          <RentSummaryTile label="Monthly Rent" value={formatCurrency(monthlyRent)} />
          <RentSummaryTile label="Progress" value={`${progress.percent}% complete`} />
          <RentSummaryTile
            label="Next Statement"
            value={nextStatement?.label || "Not available"}
          />
          <RentSummaryTile label="Action Needed" value={actionNeeded} />
        </div>
      </section>

      <section>
        <div className="mb-4">
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width]"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            <PaymentLegendItem label="Paid" count={progress.paid} className="bg-emerald-500" />
            <PaymentLegendItem label="Upcoming" count={progress.upcoming} className="bg-blue-500" />
            <PaymentLegendItem label="Late" count={progress.late} className="bg-orange-500" />
            <PaymentLegendItem label="Future" count={progress.future} className="bg-zinc-300" />
          </div>
        </div>

        <div className="divide-y divide-zinc-100 border-y border-zinc-100">
          {rows.length === 0 ? (
            <div className="py-5">
              <EmptyMobileText text="Payment history will appear after your lease schedule is ready." />
            </div>
          ) : (
            rows.map((row) => <MobilePaymentHistoryRow key={row.id} row={row} />)
          )}
        </div>
      </section>
    </div>
  );
}

function ActivityTab({ activities }: { activities: TenantActivity[] }) {
  const latestActivities = activities.slice(0, 10);

  return (
    <div className="space-y-5">
      <section className="pt-1">
        <p className="text-[13px] font-medium leading-6 text-zinc-500">
          The latest updates from your rent, documents, notes, lease, and support
          activity.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-100 bg-white">
        {latestActivities.length === 0 ? (
          <div className="px-5 py-9 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
              <CheckCircle2 size={20} />
            </div>
            <h2 className="mt-4 text-[17px] font-semibold tracking-[-0.045em] text-[#050B1F]">
              No recent activity yet
            </h2>
            <p className="mx-auto mt-2 max-w-[260px] text-[13px] font-medium leading-5 text-zinc-500">
              Payment updates, notes, documents, and support activity will appear
              here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {latestActivities.map((activity) => (
              <MobileActivityRow key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AvaTab({
  context,
  homeData,
  messages,
  conversationId,
  pendingTicketDraft,
  onMessagesChange,
  onConversationIdChange,
  onPendingTicketDraftChange,
}: {
  context: MobileContext;
  homeData: MobileHomeData;
  messages: MobileAvaMessage[];
  conversationId: string | null;
  pendingTicketDraft: MobileAvaPendingTicketDraft;
  onMessagesChange: (messages: MobileAvaMessage[]) => void;
  onConversationIdChange: (conversationId: string | null) => void;
  onPendingTicketDraftChange: (draft: MobileAvaPendingTicketDraft) => void;
}) {
  const [loading, setLoading] = useState(false);
  const promptChips = [
    "Where is my lease?",
    "How do I pay rent?",
    "Enable AutoPay",
    "Contact my landlord",
    "View documents",
    "Report an issue",
  ];

  async function sendAvaMessage(messageText: string) {
    const trimmed = messageText.trim();
    if (!trimmed || loading) return;

    const userMessage: MobileAvaMessage = {
      id: `mobile-user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    const nextMessages = [...messages, userMessage];
    onMessagesChange(nextMessages);
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) throw new Error("Missing session");

      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          messages: nextMessages
            .filter((message) => message.id !== "ava-welcome")
            .slice(-8)
            .map((message) => ({
              role: message.role,
              content: message.content,
            })),
          context: buildMobileAvaContext(context, homeData),
          conversationId,
          pendingTicketDraft,
        }),
      });

      if (!response.ok) throw new Error("Ava request failed");

      const data = (await response.json()) as {
        reply?: string;
        conversationId?: string | null;
        pendingTicketDraft?: MobileAvaPendingTicketDraft;
      };

      if (data.conversationId) onConversationIdChange(data.conversationId);
      if ("pendingTicketDraft" in data) {
        onPendingTicketDraftChange(data.pendingTicketDraft || null);
      }

      onMessagesChange([
        ...nextMessages,
        {
          id: `mobile-ava-${Date.now()}`,
          role: "assistant",
          content:
            data.reply ||
            "I’m having trouble responding right now. Please try again in a moment.",
        },
      ]);
    } catch {
      onMessagesChange([
        ...nextMessages,
        {
          id: `mobile-ava-error-${Date.now()}`,
          role: "assistant",
          content:
            "I’m having trouble connecting right now. You can still open Help Center for support.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AvaChatPanel
      className="min-h-[calc(100vh-170px)]"
      messages={messages}
      loading={loading}
      prompts={promptChips}
      onSend={sendAvaMessage}
    />
  );
}

function buildMobileAvaContext(context: MobileContext, homeData: MobileHomeData) {
  const rentSummary = getMobileRentSummary(homeData);

  return {
    userName: context.tenantName,
    tenantName: context.tenantName,
    role: "tenant",
    tenantStatus: homeData.tenantAccessId ? "active" : null,
    tenantAccessId: homeData.tenantAccessId,
    propertyId: homeData.propertyId,
    leaseId: homeData.leaseId,
    propertyLabel: context.propertyAddress,
    leaseStatus: homeData.lease ? "Active" : null,
    rentAmount:
      typeof homeData.lease?.monthly_rent === "number"
        ? formatCurrency(homeData.lease.monthly_rent)
        : null,
    dueDate: rentSummary.paidThrough,
    paymentStatus: rentSummary.message,
    availableFeatures: ["payments", "autopay", "documents", "notes", "support"],
    currentPage: "mobile_ava",
    monthlyRent: homeData.lease?.monthly_rent ?? null,
    notesEnabled: true,
    documentsCount: homeData.documents.length,
  };
}

function MobileActivityRow({ activity }: { activity: TenantActivity }) {
  const { Icon, iconClass } = getMobileActivityDisplay(activity);

  return (
    <article className="px-4 py-4">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconClass}`}
        >
          <Icon size={16} strokeWidth={2.1} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold leading-5 tracking-[-0.035em] text-[#050B1F]">
                {activity.title}
              </p>
              <p className="mt-1 line-clamp-2 text-[12px] font-medium leading-5 text-zinc-500">
                {activity.subtitle}
              </p>
            </div>

            {activity.amount ? (
              <p
                className={`shrink-0 text-right text-[12px] font-semibold ${
                  activity.amountClass || "text-zinc-500"
                }`}
              >
                {activity.amount}
              </p>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-medium text-zinc-400">
              {formatShortDate(activity.timestamp)}
            </p>
            {activity.badge ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  activity.badgeClass || "bg-zinc-100 text-zinc-500"
                }`}
              >
                {activity.badge}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function RentSummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
        {label}
      </p>
      <p className="mt-2 min-h-[34px] text-[14px] font-semibold leading-[17px] tracking-[-0.025em] text-[#0F172A]">
        {value}
      </p>
    </div>
  );
}

function PaymentLegendItem({
  label,
  count,
  className,
}: {
  label: string;
  count: number;
  className: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 shrink-0 rounded-full ${className}`} />
        <span className="truncate text-[10px] font-semibold text-zinc-500">{label}</span>
      </div>
      <p className="mt-1 text-[18px] font-semibold leading-none text-[#0F172A]">{count}</p>
    </div>
  );
}

function MobilePaymentHistoryRow({ row }: { row: MobilePaymentRow }) {
  const statusStyles = {
    paid: "bg-emerald-500 text-white",
    upcoming: "bg-blue-500 text-white",
    late: "bg-orange-500 text-white",
    future: "bg-zinc-200 text-zinc-500",
  }[row.status];

  return (
    <article className="py-4">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${statusStyles}`}
        >
          {row.status === "paid" ? "✓" : ""}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold tracking-[-0.025em] text-[#050B1F]">
                {row.label}
              </p>
              <p className="mt-1 text-[12px] font-medium leading-5 text-zinc-500">
                {row.dueText}
              </p>
            </div>
            <p className="shrink-0 text-right text-[13px] font-semibold text-[#0F172A]">
              {formatCurrency(row.amount)}
            </p>
          </div>
          <div className="mt-3">
            {row.statementHref ? (
              <Link
                href={row.statementHref}
                className="text-[12px] font-semibold text-[#0F172A]"
              >
                Download
              </Link>
            ) : (
              <span className="text-[12px] font-semibold text-zinc-400">Not ready</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function PerksTab({
  activeSection,
  onViewAllDeals,
}: {
  activeSection: MobilePerksSection;
  onViewAllDeals: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState("All Deals");

  if (activeSection === "credit-building") {
    return <CreditBuildingMobilePlaceholder />;
  }

  return (
    <div className="space-y-6 pt-4">
      <section>
        <h1 className="text-[31px] font-semibold leading-[1.03] tracking-[-0.075em] text-[#050B1F]">
          Exclusive savings.
          <br />
          Because you&apos;re on track.
        </h1>
        <p className="mt-3 max-w-[310px] text-[13px] font-medium leading-5 text-zinc-600">
          Explore special offers and member benefits from trusted partners.
        </p>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <h2 className="text-[21px] font-semibold tracking-[-0.06em] text-[#050B1F]">
            Featured Deals
          </h2>
          <button
            type="button"
            onClick={onViewAllDeals}
            className="shrink-0 text-[12px] font-semibold text-[#6B4A3A] active:scale-[0.98]"
          >
            View all deals →
          </button>
        </div>

        <div className="flex snap-x gap-4 overflow-x-auto bg-white pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {mobilePartnerDeals.slice(0, 5).map((deal) => (
            <MobileDealCard key={deal.name} deal={deal} variant="featured" />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[21px] font-semibold tracking-[-0.06em] text-[#050B1F]">
          Browse by Category
        </h2>
        <div className="-mx-5 mt-3 flex gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {mobilePerksCategories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`flex h-10 shrink-0 items-center rounded-xl border px-3.5 text-[11.5px] font-semibold transition active:scale-[0.99] ${
                activeCategory === category
                  ? "border-[#6B4A3A] bg-[#6B4A3A] text-white"
                  : "border-zinc-200 bg-white text-zinc-600"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-6 pb-2">
        {mobileGroupedDeals.map((section) => (
          <MobileDealSection key={section.title} section={section} />
        ))}
      </section>
    </div>
  );
}

function CreditBuildingMobilePlaceholder() {
  return (
    <section className="rounded-2xl border border-zinc-100 bg-white px-5 py-6 shadow-[0_16px_44px_rgba(15,23,42,0.04)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
        ✓
      </div>
      <h1 className="mt-5 text-[30px] font-semibold leading-[1.05] tracking-[-0.07em] text-[#050B1F]">
        Credit Building
      </h1>
      <p className="mt-3 text-[15px] font-semibold leading-6 text-[#0F172A]">
        Build credit with on-time rent.
      </p>
      <p className="mt-2 text-[13px] font-medium leading-6 text-zinc-500">
        Coming soon as a partner-enabled AvenueBoard feature. Availability and
        reporting options may vary.
      </p>
    </section>
  );
}

function MobileDealCard({
  deal,
  variant = "default",
}: {
  deal: MobileDeal;
  variant?: "default" | "featured";
}) {
  const featured = variant === "featured";

  return (
    <article
      className={`shrink-0 snap-start rounded-2xl border border-zinc-200 bg-white ${
        featured ? "w-[158px] px-3.5 py-3" : "w-[164px] px-3.5 py-3.5"
      }`}
    >
      <div>
        <div
          className={`flex shrink-0 items-center justify-center rounded-xl font-bold ${deal.logoClass} ${
            featured ? "h-10 w-10 text-[11px]" : "h-11 w-11 text-[11.5px]"
          }`}
        >
          {deal.logo}
        </div>
        <h3 className="mt-2.5 truncate text-[14.5px] font-semibold tracking-[-0.035em] text-[#050B1F]">
          {deal.name}
        </h3>
        <p className="mt-1 line-clamp-2 min-h-[32px] text-[12px] font-medium leading-4 text-zinc-600">
          {deal.description}
        </p>
      </div>

      {!featured ? (
        <span className="mt-3 inline-flex h-6 items-center rounded-full bg-zinc-100 px-2.5 text-[10.5px] font-semibold text-zinc-600">
          {deal.category}
        </span>
      ) : null}

      <button
        type="button"
        className={`flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#6B4A3A] text-[11.5px] font-semibold text-white active:scale-[0.99] ${
          featured ? "mt-2.5 h-8" : "mt-3 h-9"
        }`}
      >
        View Deal <span>→</span>
      </button>

      <p className="mt-2 text-[10.5px] font-medium text-zinc-400">Terms apply.</p>
    </article>
  );
}

function MobileDealSection({
  section,
}: {
  section: { title: string; count: number; deals: MobileDeal[] };
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between gap-4">
        <h2 className="text-[21px] font-semibold tracking-[-0.06em] text-[#050B1F]">
          {section.title}
        </h2>
        <button
          type="button"
          className="shrink-0 text-[12px] font-semibold text-[#6B4A3A] active:scale-[0.98]"
        >
          See all {section.count} →
        </button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {section.deals.map((deal) => (
          <MobileCompactDealRow key={deal.name} deal={deal} />
        ))}
      </div>
    </div>
  );
}

function MobileCompactDealRow({ deal }: { deal: MobileDeal }) {
  return (
    <article className="flex items-center gap-3 border-b border-zinc-100 px-3 py-2.5 last:border-b-0">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[10.5px] font-bold ${deal.logoClass}`}
      >
        {deal.logo}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[13.5px] font-semibold tracking-[-0.03em] text-[#050B1F]">
          {deal.name}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-[11.5px] font-medium text-zinc-500">
          {deal.description}
        </p>
      </div>
      <button
        type="button"
        className="flex h-8 shrink-0 items-center justify-center rounded-xl bg-[#6B4A3A] px-2.5 text-[11px] font-semibold text-white active:scale-[0.99]"
      >
        View Deal →
      </button>
    </article>
  );
}

function RentStatusCard({
  homeData,
  showDivider = true,
}: {
  homeData: MobileHomeData;
  showDivider?: boolean;
}) {
  const summary = getMobileRentSummary(homeData);
  const method = getDefaultPaymentMethod(homeData.paymentMethods);
  const autoPayActive = Boolean(
    method &&
      method.autopay_enrolled !== false &&
      String(method.autopay_status || "").toLowerCase() !== "disabled"
  );
  const methodLabel = method?.last4
    ? `${formatBrand(method.brand)} ending in ${method.last4}`
    : "No saved payment method";

  return (
    <section className={showDivider ? "border-b border-zinc-100 pb-5" : ""}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Rent paid through
          </p>
          <h2 className="mt-2 text-[34px] font-semibold leading-none tracking-[-0.08em] text-[#050B1F]">
            {summary.paidThrough}
          </h2>
        </div>
        <div className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-semibold text-zinc-600">
          {autoPayActive ? "AutoPay Active" : "AutoPay Off"}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-[13px] font-semibold text-[#0F172A]">
          {summary.message}
        </p>
        <p className="mt-1 text-[12px] font-medium leading-5 text-zinc-500">
          {methodLabel}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link
          href="/tenant"
          className="flex h-12 items-center justify-center rounded-xl bg-[#0F172A] text-[13px] font-semibold text-white active:scale-[0.99]"
        >
          Pay Rent
        </Link>
        <Link
          href="/tenant"
          className="flex h-12 items-center justify-center rounded-xl border border-zinc-300 bg-white text-[13px] font-semibold text-[#0F172A] active:scale-[0.99]"
        >
          Manage AutoPay
        </Link>
      </div>
    </section>
  );
}

function PropertyContactCard({ context }: { context: MobileContext }) {
  const contactName =
    context.landlordName !== "Not available" ? context.landlordName : "Landlord";
  const contactEmail =
    context.landlordEmail !== "Not available" ? context.landlordEmail : "";

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-semibold tracking-[-0.045em] text-[#050B1F]">
          Property Contact
        </h2>
        <Link
          href="/help-center?section=faq"
          className="text-[12px] font-semibold text-zinc-500"
        >
          Need Help?
        </Link>
      </div>

      <div className="mt-5 flex items-center gap-4">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0F172A] text-[17px] font-semibold text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)]">
          {getInitials(contactName)}
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-blue-50 text-blue-600">
            <Home size={11} strokeWidth={2.2} />
          </span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-[-0.035em] text-[#050B1F]">
            {contactName}
          </p>
          <p className="mt-1 text-[12px] font-medium text-zinc-500">Owner</p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-xl border border-zinc-100 px-3 py-3 text-[12px] font-medium text-zinc-600">
        <Mail size={15} className="shrink-0 text-blue-600" />
        <span className="min-w-0 truncate">
          {contactEmail || "Landlord email unavailable"}
        </span>
      </div>

      <a
        href={contactEmail ? `mailto:${contactEmail}?subject=Tenant inquiry` : undefined}
        aria-disabled={!contactEmail}
        className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-[13px] font-semibold text-[#0F172A] active:scale-[0.99]"
      >
        Email Landlord
        <ArrowRight size={15} />
      </a>
    </section>
  );
}

function MobileNotesSection({
  notes,
  onViewAll,
}: {
  notes: MobileNote[];
  onViewAll: () => void;
}) {
  return (
    <MobileHomeSection
      title="Notes"
      count={notes.length}
      action={<button className="text-[12px] font-semibold text-[#B9476D]">+ Add</button>}
      onViewAll={notes.length > 2 ? onViewAll : undefined}
      viewAllLabel="View all"
    >
      {notes.length === 0 ? (
        <EmptyMobileText text="No notes yet." />
      ) : (
        notes.slice(0, 2).map((note) => <MobileNoteCard key={note.id} note={note} />)
      )}
    </MobileHomeSection>
  );
}

function MobileNoteCard({
  note,
  canDelete = false,
  deleting = false,
  onDelete,
}: {
  note: MobileNote;
  canDelete?: boolean;
  deleting?: boolean;
  onDelete?: () => void;
}) {
  const privateNote = note.note_type === "private";
  return (
    <article
      className={`rounded-2xl border px-4 py-4 ${
        privateNote ? "border-[#FFE1A8] bg-[#FFF8EA]" : "border-[#D4E9FF] bg-[#EFF7FF]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-[13px] font-medium leading-5 text-zinc-900">
          {note.text}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
              privateNote ? "bg-[#FFE8B8] text-[#8A5A00]" : "bg-[#DCEEFF] text-[#1D5F9F]"
            }`}
          >
            {privateNote ? "Private Note" : "Shared Note"}
          </span>
          {canDelete && onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              aria-label="Delete note"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/75 text-zinc-400 transition hover:text-red-500 disabled:opacity-50"
            >
              {deleting ? (
                <span className="h-3 w-3 animate-spin rounded-full border border-red-500 border-t-transparent" />
              ) : (
                <Trash2 size={14} />
              )}
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-[11px] font-medium text-zinc-500">
        {formatShortDate(note.created_at)}
      </p>
    </article>
  );
}

function MobileDocumentsSection({
  documents,
  onViewAll,
}: {
  documents: MobileDocument[];
  onViewAll: () => void;
}) {
  return (
    <MobileHomeSection
      title="Property Documents"
      count={documents.length}
      action={<button className="text-[12px] font-semibold text-[#B9476D]">Upload</button>}
      onViewAll={onViewAll}
      viewAllLabel="View all"
    >
      {documents.length === 0 ? (
        <EmptyMobileText text="No property documents yet." />
      ) : (
        documents.slice(0, 3).map((doc) => (
          <MobileDocumentRow key={doc.id} document={doc} />
        ))
      )}
    </MobileHomeSection>
  );
}

function MobileDocumentRow({
  document,
  canDelete = false,
  deleting = false,
  onDelete,
}: {
  document: MobileDocument;
  canDelete?: boolean;
  deleting?: boolean;
  onDelete?: () => void;
}) {
  return (
    <article className="rounded-2xl border border-zinc-100 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-[10px] font-semibold uppercase text-zinc-500">
          {getFileLabel(document.file_type || document.file_name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-[#050B1F]">
            {document.file_name}
          </p>
          <p className="mt-1 text-[11px] font-medium text-zinc-500">
            {formatShortDate(document.created_at)}
            {document.file_size ? ` · ${formatFileSize(document.file_size)}` : ""}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] font-semibold text-zinc-600">
        <a href={document.file_url || "#"}>View</a>
        <span className="text-zinc-300">/</span>
        <a href={document.file_url || "#"} download className="inline-flex items-center gap-1">
          <Download size={13} />
          Download
        </a>
        {canDelete && onDelete ? (
          <>
            <span className="text-zinc-300">/</span>
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="text-red-600 disabled:opacity-50"
            >
              {deleting ? "Deleting" : "Delete"}
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
}

function MobileHomeSection({
  title,
  count,
  action,
  onViewAll,
  viewAllLabel,
  children,
}: {
  title: string;
  count: number;
  action?: ReactNode;
  onViewAll?: () => void;
  viewAllLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-zinc-100 pb-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[17px] font-semibold tracking-[-0.045em] text-[#050B1F]">
            {title}
          </h2>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-500">
            {count}
          </span>
          {action}
        </div>
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="text-[12px] font-semibold text-zinc-950 active:scale-[0.98]"
          >
            {viewAllLabel || "View all"} →
          </button>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function EmptyMobileText({ text }: { text: string }) {
  return <p className="text-[13px] font-medium leading-5 text-zinc-500">{text}</p>;
}

function MobileNotesSheet({
  notes,
  profileId,
  deletingNoteId,
  onDeleteNote,
  onClose,
}: {
  notes: MobileNote[];
  profileId: string | null;
  deletingNoteId: string;
  onDeleteNote: (note: MobileNote) => void;
  onClose: () => void;
}) {
  return (
    <MobileSheet title="Notes" count={notes.length} onClose={onClose}>
      {notes.length === 0 ? (
        <EmptyMobileText text="No notes yet." />
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <MobileNoteCard
              key={note.id}
              note={note}
              canDelete={canDeleteMobileNote(note, profileId)}
              deleting={deletingNoteId === note.id}
              onDelete={() => onDeleteNote(note)}
            />
          ))}
        </div>
      )}
    </MobileSheet>
  );
}

function MobileDocumentsSheet({
  documents,
  profileId,
  deletingDocumentId,
  onDeleteDocument,
  onClose,
}: {
  documents: MobileDocument[];
  profileId: string | null;
  deletingDocumentId: string;
  onDeleteDocument: (document: MobileDocument) => void;
  onClose: () => void;
}) {
  return (
    <MobileSheet title="Property Documents" count={documents.length} onClose={onClose}>
      {documents.length === 0 ? (
        <EmptyMobileText text="No property documents yet." />
      ) : (
        <div className="space-y-3">
          {documents.map((document) => (
            <MobileDocumentRow
              key={document.id}
              document={document}
              canDelete={canDeleteMobileDocument(document, profileId)}
              deleting={deletingDocumentId === document.id}
              onDelete={() => onDeleteDocument(document)}
            />
          ))}
        </div>
      )}
    </MobileSheet>
  );
}

function MobileDealsSheet({
  deals,
  onClose,
}: {
  deals: MobileDeal[];
  onClose: () => void;
}) {
  return (
    <MobileSheet title="Partner Deals" count={deals.length} onClose={onClose}>
      <div className="space-y-3">
        {deals.map((deal) => (
          <MobileCompactDealRow key={deal.name} deal={deal} />
        ))}
      </div>
    </MobileSheet>
  );
}

function PropertySelectorSheet({
  rentals,
  selectedRentalId,
  onSelect,
  onClose,
}: {
  rentals: MobileRental[];
  selectedRentalId: string | null;
  onSelect: (rental: MobileRental) => void;
  onClose: () => void;
}) {
  return (
    <MobileSheet title="Resident properties" count={rentals.length} onClose={onClose}>
      <div className="space-y-3">
        {rentals.map((rental) => {
          const active = rental.accessId === selectedRentalId;

          return (
            <button
              key={rental.accessId}
              type="button"
              onClick={() => onSelect(rental)}
              className={`w-full rounded-2xl border px-4 py-4 text-left transition active:scale-[0.99] ${
                active
                  ? "border-[#0F172A] bg-[#F8FAFC]"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-[#050B1F]">
                    {rental.propertyName}
                  </p>
                  <p className="mt-1 text-[12px] font-medium leading-5 text-zinc-500">
                    {rental.propertyAddress || "Not available"}
                  </p>
                  <p className="mt-2 text-[11px] font-semibold text-zinc-400">
                    Unit {rental.unitName || "Not available"}
                  </p>
                </div>
                {active ? (
                  <span className="shrink-0 rounded-full bg-[#0F172A] px-2.5 py-1 text-[10px] font-semibold text-white">
                    Current
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </MobileSheet>
  );
}

function MobileSheet({
  title,
  count,
  children,
  onClose,
}: {
  title: string;
  count?: number;
  children: ReactNode;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const closedOffset = 90;
  const dragStartY = useRef<number | null>(null);
  const dragStartExpanded = useRef(false);
  const draggedHandle = useRef(false);

  function handleDragStart(event: PointerEvent<HTMLButtonElement>) {
    dragStartY.current = event.clientY;
    dragStartExpanded.current = expanded;
    draggedHandle.current = false;
    setDragging(true);
    setTranslateY(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleDragMove(event: PointerEvent<HTMLButtonElement>) {
    if (dragStartY.current === null) return;
    const deltaY = event.clientY - dragStartY.current;
    if (Math.abs(deltaY) > 6) draggedHandle.current = true;
    const upwardLimit = dragStartExpanded.current ? 0 : -closedOffset;
    const downwardLimit = Math.max(window.innerHeight * 0.55, 260);
    setTranslateY(Math.min(Math.max(deltaY, upwardLimit), downwardLimit));
  }

  function handleDragEnd(event: PointerEvent<HTMLButtonElement>) {
    if (dragStartY.current === null) return;
    const deltaY = event.clientY - dragStartY.current;
    const closeThreshold = window.innerHeight * 0.4;

    if (deltaY > closeThreshold) {
      onClose();
      return;
    }

    if (deltaY < -44) {
      setExpanded(true);
    } else if (deltaY > 86) {
      setExpanded(false);
    } else {
      setExpanded(dragStartExpanded.current);
    }

    dragStartY.current = null;
    setDragging(false);
    setTranslateY(0);
  }

  function handleDragCancel() {
    dragStartY.current = null;
    setDragging(false);
    setTranslateY(0);
  }

  function handleHandleClick() {
    if (draggedHandle.current) {
      draggedHandle.current = false;
      return;
    }
    setExpanded((value) => !value);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30">
      <button
        type="button"
        aria-label={`Close ${title}`}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <section
        className={`relative z-10 flex w-full max-w-[440px] flex-col rounded-t-[28px] bg-white shadow-[0_-24px_70px_rgba(15,23,42,0.18)] ${
          dragging ? "" : "transition-[height,transform] duration-200 ease-out"
        } ${
          expanded ? "h-[94vh]" : "h-[78vh]"
        }`}
        style={{ transform: `translateY(${Math.max(translateY, expanded ? 0 : -closedOffset)}px)` }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 top-full h-40 bg-white"
        />
        <div className="px-5 pt-3">
          <button
            type="button"
            aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}
            onClick={handleHandleClick}
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragCancel}
            className="mx-auto block touch-none rounded-full px-7 py-2"
          >
            <span className="block h-1 w-11 rounded-full bg-zinc-300" />
          </button>
          <div className="mt-5 flex items-center justify-between gap-4 border-b border-zinc-100 pb-4">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-[24px] font-semibold tracking-[-0.06em] text-[#050B1F]">
                {title}
              </h2>
              {typeof count === "number" ? (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-500">
                  {count}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={`Close ${title}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:text-zinc-900"
            >
              <X size={17} />
            </button>
          </div>
        </div>
        <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-5 py-5 pb-[calc(env(safe-area-inset-bottom)+24px)]">
          {children}
        </div>
      </section>
    </div>
  );
}

function MobileTabPlaceholder({ label }: { label: string }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
          {label}
        </p>
        <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.07em] text-[#050B1F]">
          {label}
        </h2>
      </div>
      <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.04)]">
        <p className="text-[13px] font-medium leading-6 text-zinc-500">
          This mobile section will be built next.
        </p>
      </div>
    </div>
  );
}

function MobileHeader({
  context,
  onOpenNotifications,
  onOpenProfile,
}: {
  context: MobileContext;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
}) {
  return (
    <header className="shrink-0 bg-white px-5 pb-6 pt-[calc(env(safe-area-inset-top)+30px)]">
      <div className="flex items-start justify-between gap-5">
        <img
          src="/logo.png"
          alt="AvenueBoard"
          className="mt-0.5 h-9 w-auto object-contain"
        />
        <div className="flex items-start gap-5">
          <HeaderIcon
            label="Notifications"
            Icon={Bell}
            onClick={onOpenNotifications}
          />
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex flex-col items-center transition active:scale-[0.97]"
            aria-label="Open profile settings"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 bg-white text-[11px] font-semibold text-[#0F172A]">
              {context.initials || <UserRound size={18} />}
            </div>
            <span className="mt-2 text-[10px] font-medium text-zinc-600">
              Profile
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}

function WorkspaceRow({
  address,
  label = "Resident",
  value,
  singleLabel = false,
  multipleProperties,
  onOpenContext,
}: {
  address: string;
  label?: string;
  value?: string;
  singleLabel?: boolean;
  multipleProperties: boolean;
  onOpenContext: () => void;
}) {
  const displayAddress =
    value || (address && address !== "Resident workspace" ? address : "Rent workspace");
  const propertySwitcherEnabled = multipleProperties && !value;

  if (singleLabel) {
    return (
      <div className="sticky top-0 z-20 bg-white">
        <div className="flex w-full min-w-0 items-center px-5 py-3 text-left text-[15px]">
          <span className="font-semibold text-[#0F172A]">{label}</span>
        </div>
        <div className="h-px bg-zinc-200" />
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-20 bg-white">
      <button
        type="button"
        onClick={onOpenContext}
        className="flex w-full min-w-0 cursor-pointer items-center gap-3 px-5 py-3 text-left text-[15px] transition active:scale-[0.995]"
        aria-label={propertySwitcherEnabled ? "Switch resident property" : "Open resident and property details"}
      >
        <span className="shrink-0 font-semibold text-[#0F172A]">{label}</span>
        <span className="h-4 w-px shrink-0 bg-zinc-200" />
        <span className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-medium text-zinc-500 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {displayAddress}
        </span>
        {propertySwitcherEnabled ? (
          <span className="shrink-0 text-[12px] font-semibold text-zinc-400">Switch</span>
        ) : null}
      </button>
      <div className="h-px bg-zinc-200" />
    </div>
  );
}

function PerksStickyTabs({
  activeSection,
  onChange,
}: {
  activeSection: MobilePerksSection;
  onChange: (section: MobilePerksSection) => void;
}) {
  const tabs: { id: MobilePerksSection; label: string }[] = [
    { id: "avenue-perks", label: "Avenue Perks" },
    { id: "credit-building", label: "Credit Building" },
  ];

  return (
    <div className="sticky top-0 z-20 bg-white">
      <div className="grid grid-cols-2 px-5 pt-[calc(env(safe-area-inset-top)+14px)]">
        {tabs.map((tab) => {
          const active = activeSection === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`relative flex h-12 items-center justify-center whitespace-nowrap text-[14px] font-semibold transition ${
                active ? "text-[#0F172A]" : "text-zinc-500"
              }`}
            >
              {tab.label}
              {active ? (
                <span className="absolute bottom-0 left-0 h-[2px] w-full bg-[#0F172A]" />
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="h-px bg-zinc-200" />
    </div>
  );
}

function MobileAccountDrawer({
  activeTab,
  context,
  homeData,
  onChangeTab,
  onClose,
  onProfileSaved,
}: {
  activeTab: MobileAccountDrawerTab;
  context: MobileContext;
  homeData: MobileHomeData;
  onChangeTab: (tab: MobileAccountDrawerTab) => void;
  onClose: () => void;
  onProfileSaved: (context: MobileContext) => void;
}) {
  const [displayName, setDisplayName] = useState(context.tenantName);
  const [phone, setPhone] = useState(
    context.tenantPhone === "Not available" ? "" : context.tenantPhone
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setDisplayName(context.tenantName);
    setPhone(context.tenantPhone === "Not available" ? "" : context.tenantPhone);
    setStatus("");
  }, [context.profileId, context.tenantName, context.tenantPhone]);

  async function handleSave() {
    if (!context.profileId || saving) return;

    setSaving(true);
    setStatus("");
    const nextName = displayName.trim() || context.tenantName;
    const nextPhone = phone.trim();
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: nextName,
        phone: nextPhone || null,
      })
      .eq("id", context.profileId);

    setSaving(false);

    if (error) {
      setStatus("Unable to save settings right now.");
      return;
    }

    onProfileSaved({
      ...context,
      firstName: getFirstName(nextName || context.tenantEmail || "there"),
      initials: getInitials(nextName || context.tenantEmail || "AB"),
      tenantName: nextName,
      tenantPhone: nextPhone || "Not available",
    });
    setStatus("Settings saved.");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login?returnTo=%2Fmobile";
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 bg-[#0F172A]/18 backdrop-blur-[3px]"
      />
      <aside className="relative ml-auto flex h-[100dvh] w-[88vw] max-w-[390px] animate-[mobileDrawerIn_180ms_ease-out] flex-col bg-white shadow-[-24px_0_70px_rgba(15,23,42,0.18)]">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 pb-4 pt-[calc(env(safe-area-inset-top)+18px)]">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.06em] text-[#050B1F]">
              Account
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account drawer"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-50 text-zinc-500 transition active:scale-[0.96]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 border-b border-zinc-100 px-5">
          {[
            { id: "notifications" as const, label: "Notifications" },
            { id: "profile" as const, label: "Account Settings" },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeTab(tab.id)}
                className={`relative h-12 text-[13px] font-semibold transition ${
                  active ? "text-[#0F172A]" : "text-zinc-500"
                }`}
              >
                {tab.label}
                {active ? (
                  <span className="absolute bottom-0 left-0 h-[2px] w-full bg-[#0F172A]" />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-5 py-5 pb-[calc(env(safe-area-inset-bottom)+24px)]">
          {activeTab === "profile" ? (
            <MobileProfileSettingsPanel
              context={context}
              displayName={displayName}
              phone={phone}
              saving={saving}
              status={status}
              onDisplayNameChange={setDisplayName}
              onPhoneChange={setPhone}
              onSave={handleSave}
              onSignOut={handleSignOut}
            />
          ) : (
            <MobileNotificationsPanel activities={homeData.activities} />
          )}
        </div>
      </aside>
      <style jsx>{`
        @keyframes mobileDrawerIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

function MobileProfileSettingsPanel({
  context,
  displayName,
  phone,
  saving,
  status,
  onDisplayNameChange,
  onPhoneChange,
  onSave,
  onSignOut,
}: {
  context: MobileContext;
  displayName: string;
  phone: string;
  saving: boolean;
  status: string;
  onDisplayNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onSave: () => void;
  onSignOut: () => void;
}) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <section className="flex items-center gap-4">
        <label className="group relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-[#0F172A] text-[18px] font-semibold text-white">
          {photoPreview ? (
            <img
              src={photoPreview}
              alt="Selected profile preview"
              className="h-full w-full object-cover"
            />
          ) : (
            context.initials || "AB"
          )}
          <span className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-white bg-white text-[#0F172A] shadow-sm">
            <Camera size={13} />
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setPhotoPreview(URL.createObjectURL(file));
            }}
          />
        </label>
        <div className="min-w-0">
          <h3 className="truncate text-[18px] font-semibold tracking-[-0.05em] text-[#050B1F]">
            {context.tenantName}
          </h3>
          <p className="mt-1 truncate text-[13px] font-medium text-zinc-500">
            Resident profile
          </p>
          <p className="mt-1 text-[11px] font-medium text-zinc-400">
            Photo upload preview only for now.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <MobileProfileField label="Display name">
          <input
            value={displayName}
            onChange={(event) => onDisplayNameChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-[14px] font-semibold text-[#0F172A] outline-none focus:border-zinc-400"
          />
        </MobileProfileField>
        <MobileProfileField label="Email">
          <div className="flex h-11 items-center rounded-xl border border-zinc-100 bg-zinc-50 px-3 text-[13px] font-semibold text-zinc-500">
            <Mail size={15} className="mr-2 shrink-0 text-zinc-400" />
            <span className="truncate">{context.tenantEmail}</span>
          </div>
          <p className="mt-1.5 text-[11px] font-medium text-zinc-400">
            Linked to your AvenueBoard account.
          </p>
        </MobileProfileField>
        <MobileProfileField label="Phone number">
          <div className="relative">
            <Phone
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              value={phone}
              onChange={(event) => onPhoneChange(event.target.value)}
              placeholder="Optional"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-[14px] font-semibold text-[#0F172A] outline-none placeholder:text-zinc-400 focus:border-zinc-400"
            />
          </div>
        </MobileProfileField>
      </section>

      {status ? (
        <p className="text-[12px] font-semibold text-zinc-500">{status}</p>
      ) : null}

      <section className="space-y-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="h-11 w-full rounded-xl bg-[#2563EB] text-[14px] font-semibold text-white transition active:scale-[0.99] disabled:bg-zinc-300"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white text-[14px] font-semibold text-red-600 transition active:scale-[0.99]"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </section>

      <section className="pt-2">
        <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
          Support & Legal
        </h4>
        <div className="divide-y divide-zinc-100 border-y border-zinc-100">
          <MobileAccountLink
            href="/help-center?section=faq"
            icon={<MessageSquare size={16} />}
            label="FAQ"
          />
          <MobileAccountLink
            href="/help-center?section=contact"
            icon={<Headphones size={16} />}
            label="Contact Support"
          />
          <MobileAccountLink
            href="/help-center"
            icon={<Bell size={16} />}
            label="Need Help?"
          />
          <MobileAccountLink
            href="/terms-of-service"
            icon={<FileText size={16} />}
            label="Terms of Service"
          />
          <MobileAccountLink
            href="/privacy-policy"
            icon={<ShieldCheck size={16} />}
            label="Privacy Policy"
          />
        </div>
      </section>
    </div>
  );
}

function MobileAccountLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 py-3.5 text-[14px] font-semibold text-[#0F172A] transition active:scale-[0.99]"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-50 text-zinc-500">
        {icon}
      </span>
      <span className="min-w-0 flex-1">{label}</span>
      <ChevronRight size={16} className="shrink-0 text-zinc-400" />
    </Link>
  );
}

function MobileProfileField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function MobileNotificationsPanel({ activities }: { activities: TenantActivity[] }) {
  const notifications = activities.slice(0, 8);

  if (notifications.length === 0) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-500">
          <Bell size={21} />
        </div>
        <h3 className="mt-4 text-[18px] font-semibold tracking-[-0.05em] text-[#050B1F]">
          No notifications yet.
        </h3>
        <p className="mt-2 max-w-[230px] text-[13px] font-medium leading-5 text-zinc-500">
          Payment updates, shared documents, notes, and support activity will
          appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {notifications.map((notification) => {
        const { Icon, iconClass } = getMobileActivityDisplay(notification);

        return (
          <article
            key={notification.id}
            className="flex gap-3 border-b border-zinc-100 py-4 last:border-b-0"
          >
            <span
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconClass}`}
            >
              <Icon size={16} strokeWidth={2.1} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold leading-5 tracking-[-0.035em] text-[#050B1F]">
                {notification.title}
              </p>
              <p className="mt-1 line-clamp-2 text-[12px] font-medium leading-5 text-zinc-500">
                {notification.subtitle || "Account activity updated."}
              </p>
              <p className="mt-2 text-[11px] font-semibold text-zinc-400">
                {formatShortDate(notification.timestamp)}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ResidentContextSheet({
  context,
  onClose,
}: {
  context: MobileContext;
  onClose: () => void;
}) {
  return (
    <MobileSheet title="Resident details" onClose={onClose}>
      <div className="space-y-1">
        <SheetRow label="Tenant name" value={context.tenantName} />
        <SheetRow label="Tenant email" value={context.tenantEmail} />
        <SheetRow label="Property address" value={context.propertyAddress} />
        <SheetRow label="Unit" value={context.unitName} />
        <SheetRow label="Landlord name" value={context.landlordName} />
        <SheetRow label="Landlord email" value={context.landlordEmail} />
      </div>
    </MobileSheet>
  );
}

function SheetRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-zinc-100 py-4 last:border-b-0">
      <span className="shrink-0 text-[13px] font-medium text-zinc-500">{label}</span>
      <span className="max-w-[220px] text-right text-[13px] font-semibold leading-5 text-[#0F172A]">
        {value || "Not available"}
      </span>
    </div>
  );
}

function HeaderIcon({
  label,
  Icon,
  onClick,
}: {
  label: string;
  Icon: MobileTabIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center transition active:scale-[0.97]"
      aria-label={`Open ${label.toLowerCase()}`}
    >
      <div className="relative flex h-8 w-8 items-center justify-center">
        <Icon size={25} strokeWidth={1.9} className="text-[#0F172A]" />
        {label === "Notifications" && (
          <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        )}
      </div>
      <span className="mt-2 text-[10px] font-medium text-zinc-600">{label}</span>
    </button>
  );
}

function MobileBottomNav({
  activeTab,
  onTabChange,
}: {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}) {
  return (
    <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[440px] -translate-x-1/2 bg-white pb-[max(env(safe-area-inset-bottom),12px)]">
      <nav className="w-full max-w-[440px] border-t border-zinc-200 bg-white px-2 pb-3 pt-2">
        <div className="grid grid-cols-5">
          {mobileTabs.map(({ id, label, Icon }) => {
            const active = activeTab === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                className={`flex h-[62px] flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium transition active:scale-[0.98] ${
                  active ? "text-[#0F172A]" : "text-zinc-500"
                }`}
              >
                <Icon
                  size={24}
                  strokeWidth={active ? 2.35 : 2}
                  className={active ? "text-[#0F172A]" : "text-zinc-500"}
                />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function MobilePlaceholder({
  state,
  onResidentApp,
}: {
  state: MobileState;
  onResidentApp: () => void;
}) {
  if (state === "signed-out") {
    return (
      <CenteredPlaceholder
        title="Rent, simplified."
        text="Sign in to continue to your resident app."
        action={<MobileButton href="/login?returnTo=%2Fmobile">Sign in</MobileButton>}
      />
    );
  }

  if (state === "dual") {
    return (
      <CenteredPlaceholder
        title="Choose your workspace"
        text="Open the resident mobile app or continue to the Landlord Board."
        action={
          <div className="space-y-3">
            <button
              type="button"
              onClick={onResidentApp}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-[#0F172A] text-[14px] font-semibold text-white transition active:scale-[0.99]"
            >
              Resident App
            </button>
            <MobileButton href="/dashboard" variant="secondary">
              Landlord Board
            </MobileButton>
          </div>
        }
      />
    );
  }

  return (
    <CenteredPlaceholder
      title="Resident app"
      text="The mobile app is currently optimized for residents."
      action={<MobileButton href="/dashboard">Open Landlord Board</MobileButton>}
    />
  );
}

function CenteredPlaceholder({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action: ReactNode;
}) {
  return (
    <section className="flex flex-1 items-center justify-center">
      <div className="w-full text-center">
        <img
          src="/logo.png"
          alt="AvenueBoard"
          className="mx-auto h-10 w-auto object-contain"
        />
        <h1 className="mt-10 text-[31px] font-semibold leading-[1.03] tracking-[-0.07em] text-[#050B1F]">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-[300px] text-[15px] font-medium leading-6 text-zinc-500">
          {text}
        </p>
        <div className="mt-8">{action}</div>
      </div>
    </section>
  );
}

function MobileButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={`flex h-12 w-full items-center justify-center rounded-xl text-[14px] font-semibold transition active:scale-[0.99] ${
        variant === "primary"
          ? "bg-[#0F172A] text-white"
          : "border border-zinc-200 bg-white text-[#0F172A]"
      }`}
    >
      {children}
    </Link>
  );
}

function getFirstName(value: string) {
  return value.split(/\s|@/).filter(Boolean)[0] || "there";
}

function getInitials(value: string) {
  return value
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getMobileGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getMobileActivityDisplay(activity: TenantActivity): {
  Icon: MobileTabIcon;
  iconClass: string;
} {
  const text = `${activity.icon} ${activity.title} ${activity.subtitle}`.toLowerCase();

  if (text.includes("payment") || text.includes("rent payment")) {
    return {
      Icon: CheckCircle2,
      iconClass: activity.iconClass || "bg-emerald-50 text-emerald-700",
    };
  }

  if (text.includes("note")) {
    return {
      Icon: MessageSquare,
      iconClass: activity.iconClass || "bg-[#DCEEFF] text-[#1D5F9F]",
    };
  }

  if (text.includes("document") || text.includes("file")) {
    return {
      Icon: FileText,
      iconClass: activity.iconClass || "bg-[#DCEEFF] text-[#1D5F9F]",
    };
  }

  if (text.includes("lease")) {
    return {
      Icon: Home,
      iconClass: activity.iconClass || "bg-violet-50 text-violet-700",
    };
  }

  if (text.includes("support") || text.includes("case") || text.includes("help")) {
    return {
      Icon: Headphones,
      iconClass: activity.iconClass || "bg-amber-50 text-amber-700",
    };
  }

  return {
    Icon: CheckCircle2,
    iconClass: activity.iconClass || "bg-slate-950 text-white",
  };
}

function buildMobilePaymentRows(homeData: MobileHomeData): MobilePaymentRow[] {
  const lease = homeData.lease;
  const amount = lease?.monthly_rent ?? null;
  const dueDay = parseRentDueDay(lease?.rent_due_day);
  const completedPayments = homeData.rentPayments.filter(isCompletedPayment);
  const paymentByCycleKey = new Map<string, MobileRentPayment>();

  completedPayments.forEach((payment) => {
    const keys = [
      payment.rent_cycle_key,
      cycleKeyFromLabel(payment.rent_cycle_month_label),
      cycleKeyFromLabel(payment.period_label),
    ].filter(Boolean) as string[];

    keys.forEach((key) => {
      if (!paymentByCycleKey.has(key)) paymentByCycleKey.set(key, payment);
    });
  });

  const months = buildLeaseCycleMonths(lease);
  const fallbackMonths =
    months.length > 0
      ? months
      : buildFallbackCycleMonths(completedPayments);

  const today = startOfDay(new Date());
  const firstUnpaidIndex = fallbackMonths.findIndex(
    (month) => !paymentByCycleKey.has(formatCycleKey(month))
  );

  return fallbackMonths.map((month, index) => {
    const cycleKey = formatCycleKey(month);
    const payment = paymentByCycleKey.get(cycleKey);
    const dueDate = new Date(month.getFullYear(), month.getMonth(), dueDay);
    const paid = Boolean(payment);
    const status: MobilePaymentRow["status"] = paid
      ? "paid"
      : firstUnpaidIndex === index
        ? dueDate < today
          ? "late"
          : "upcoming"
        : "future";

    return {
      id: cycleKey,
      cycleKey,
      label: formatCycleMonth(month),
      dueText: paid
        ? `Paid on ${formatCompactDate(payment?.paid_at || payment?.created_at)}`
        : `Due on ${formatCompactDate(dueDate.toISOString())}`,
      amount: payment?.amount ?? amount,
      status,
      statementHref:
        paid && homeData.tenantAccessId
          ? `/tenant/statements/${homeData.tenantAccessId}/${cycleKey}`
          : null,
    };
  });
}

function buildMobilePaymentSummary(rows: MobilePaymentRow[]) {
  const paid = rows.filter((row) => row.status === "paid").length;
  const upcoming = rows.filter((row) => row.status === "upcoming").length;
  const late = rows.filter((row) => row.status === "late").length;
  const future = rows.filter((row) => row.status === "future").length;
  const percent = rows.length ? Math.round((paid / rows.length) * 100) : 0;

  return { paid, upcoming, late, future, percent };
}

function getMobileActionNeeded(nextEligible?: MobilePaymentRow) {
  if (!nextEligible) return "No payment action needed";
  if (nextEligible.status === "late") {
    return `${formatCurrency(nextEligible.amount)} past due`;
  }
  const today = startOfDay(new Date());
  const dueDate = parseDueDateFromText(nextEligible.dueText);

  if (dueDate && dueDate <= today) {
    return `${formatCurrency(nextEligible.amount)} due now`;
  }

  return "No payment action needed";
}

function getMobileRentSummary(homeData: MobileHomeData) {
  const paidPayments = homeData.rentPayments
    .filter(isCompletedPayment)
    .sort((a, b) => {
      const cycleCompare = String(b.rent_cycle_key || "").localeCompare(
        String(a.rent_cycle_key || "")
      );
      return cycleCompare || dateMs(b.paid_at || b.created_at) - dateMs(a.paid_at || a.created_at);
    });

  const latestPaid = paidPayments[0];
  const paidThrough =
    latestPaid?.rent_cycle_month_label || latestPaid?.period_label || "Not available";

  return {
    paidThrough,
    message: latestPaid
      ? "No payment due at this time."
      : "Rent details will appear after your first recorded payment.",
  };
}

function isCompletedPayment(payment: MobileRentPayment) {
  return ["paid", "succeeded", "complete", "completed"].includes(
    String(payment.status || "").toLowerCase()
  );
}

function getDefaultPaymentMethod(methods: MobilePaymentMethod[]) {
  return (
    methods.find((method) => method.is_default) ||
    methods.find(
      (method) =>
        method.autopay_enrolled !== false &&
        String(method.autopay_status || "").toLowerCase() !== "disabled"
    ) ||
    methods[0]
  );
}

function formatBrand(brand?: string | null) {
  if (!brand) return "Payment method";
  if (brand.toLowerCase() === "link") return "Link";
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

function formatShortDate(value?: string | null) {
  if (!value) return "Not available";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCompactDate(value?: string | null) {
  if (!value) return "Not available";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Not available";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileLabel(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("pdf")) return "PDF";
  if (lower.includes("png")) return "PNG";
  if (lower.includes("jpg") || lower.includes("jpeg")) return "JPG";
  if (lower.includes("doc")) return "DOC";
  return "FILE";
}

function canDeleteMobileNote(note: MobileNote, profileId: string | null) {
  return Boolean(
    profileId &&
      note.profile_id === profileId &&
      note.created_by_role === "tenant" &&
      note.note_type === "private"
  );
}

function canDeleteMobileDocument(document: MobileDocument, profileId: string | null) {
  return Boolean(profileId && document.uploaded_by_profile_id === profileId);
}

function buildLeaseCycleMonths(lease?: MobileLease | null) {
  if (!lease?.start_date || !lease.end_date) return [];

  const startDate = parseLocalDate(
    lease.payment_tracking_start_date || lease.start_date
  );
  const endDate = parseLocalDate(lease.end_date);
  if (!startDate || !endDate) return [];

  const firstMonth =
    startDate.getDate() > 1
      ? new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1)
      : new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const leaseEndMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  const months: Date[] = [];
  const cursor = new Date(firstMonth);

  while (cursor <= leaseEndMonth) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

function buildFallbackCycleMonths(payments: MobileRentPayment[]) {
  const paidMonths = payments
    .map((payment) => cycleDateFromPayment(payment))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime());

  if (paidMonths.length === 0) return [];

  const firstMonth = paidMonths[0];
  const totalMonths = Math.max(12, paidMonths.length + 1);

  return Array.from({ length: totalMonths }, (_, index) => {
    return new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1);
  });
}

function cycleDateFromPayment(payment: MobileRentPayment) {
  const key =
    payment.rent_cycle_key ||
    cycleKeyFromLabel(payment.rent_cycle_month_label) ||
    cycleKeyFromLabel(payment.period_label);
  if (!key) return null;
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return null;
  return new Date(year, month - 1, 1);
}

function cycleKeyFromLabel(label?: string | null) {
  if (!label) return null;
  const directMatch = label.match(/\b(20\d{2})-(\d{2})\b/);
  if (directMatch) return `${directMatch[1]}-${directMatch[2]}`;

  const parsed = new Date(`${label} 1`);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatCycleKey(parsed);
}

function formatCycleKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatCycleMonth(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function parseRentDueDay(value?: string | null) {
  const parsed = Number(String(value || "").match(/\d+/)?.[0] || "1");
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(Math.max(parsed, 1), 28);
}

function parseDueDateFromText(value: string) {
  const dueText = value.replace(/^Due on\s+/i, "");
  const date = new Date(dueText);
  return Number.isNaN(date.getTime()) ? null : startOfDay(date);
}

function parseLocalDate(value?: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split("T")[0].split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateMs(value?: string | null) {
  if (!value) return 0;
  return new Date(value).getTime();
}

function formatPropertyAddress(
  property?: {
    street_address?: string | null;
    city?: string | null;
    state_name?: string | null;
    zip?: string | null;
    unit_name?: string | null;
  } | null
) {
  if (!property) return "Resident workspace";
  const unit = property.unit_name ? `, Unit ${property.unit_name}` : "";
  const cityState = [property.city, property.state_name].filter(Boolean).join(", ");
  const parts = [
    property.street_address ? `${property.street_address}${unit}` : "",
    cityState,
    property.zip,
  ].filter(Boolean);
  return parts.join(", ") || "Resident workspace";
}
