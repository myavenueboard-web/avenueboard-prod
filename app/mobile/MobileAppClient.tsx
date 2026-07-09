"use client";

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Camera,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  DollarSign,
  Download,
  FileText,
  Headphones,
  Home,
  House,
  Landmark,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Phone,
  ShieldCheck,
  ReceiptText,
  Sparkles,
  Trash2,
  User,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import AvaChatPanel from "@/app/components/ava/AvaChatPanel";
import { createActivity } from "@/lib/createActivity";
import { triggerEmailEvent } from "@/lib/email/triggerEmailEvent";
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
type MobileTab = "home" | "rent" | "perks" | "hub" | "activity" | "ava" | "reports";
type MobilePerksSection = "avenue-perks" | "credit-building";
type MobileAccountDrawerTab = "profile" | "notifications";
type MobileWorkspaceRole = "resident" | "landlord";
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
  nextLandlordProperties?: MobileLandlordProperty[];
  nextSelectedLandlordPropertyId?: string;
};
type LandlordMobileHomeProperty = {
  name: string;
  address: string;
  rent: string;
  tenant: string;
  due: string;
  bank: string;
  status: string;
  needsConnection: boolean;
};
type MobileAdditionalTenant = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
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

type MobileLandlordProperty = {
  id: string;
  propertyName: string;
  propertyAddress: string;
  unitName: string;
};

type MobileTabIcon = (props: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) => ReactNode;

type MobileNavTab = { id: MobileTab; label: string; Icon: MobileTabIcon };

const mobileTabs: MobileNavTab[] = [
  { id: "home", label: "Home", Icon: Home },
  { id: "rent", label: "Rent", Icon: ReceiptText },
  { id: "perks", label: "Perks", Icon: Sparkles },
  { id: "hub", label: "Ava", Icon: MessageSquare },
  { id: "activity", label: "Activity", Icon: FileText },
];

const landlordMobileTabs: MobileNavTab[] = [
  { id: "home", label: "Home", Icon: Home },
  { id: "rent", label: "Rent", Icon: ReceiptText },
  { id: "perks", label: "Perks", Icon: Sparkles },
  { id: "ava", label: "Ava", Icon: MessageSquare },
  { id: "reports", label: "Reports", Icon: BarChart3 },
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

const landlordMobileRentPreviewData: MobileHomeData = {
  tenantAccessId: "landlord-mobile-preview",
  propertyId: "landlord-mobile-property",
  leaseId: "landlord-mobile-lease",
  lease: {
    id: "landlord-mobile-lease",
    start_date: "2026-01-01",
    end_date: "2027-05-30",
    payment_tracking_start_date: null,
    monthly_rent: 2650,
    rent_due_day: "1st of the Month",
  },
  paymentMethods: [
    {
      id: "landlord-mobile-method",
      autopay_status: "active",
      autopay_enrolled: true,
      brand: "visa",
      last4: "0000",
      is_default: true,
    },
  ],
  rentPayments: [
    {
      id: "landlord-mobile-payment-june",
      amount: 2650,
      rent_cycle_key: "2026-06",
      rent_cycle_month_label: "June 2026",
      period_label: "June 2026",
      status: "paid",
      paid_at: "2026-06-01T12:00:00.000Z",
      created_at: "2026-06-01T12:00:00.000Z",
    },
    {
      id: "landlord-mobile-payment-july",
      amount: 2650,
      rent_cycle_key: "2026-07",
      rent_cycle_month_label: "July 2026",
      period_label: "July 2026",
      status: "upcoming",
      paid_at: null,
      created_at: "2026-07-01T12:00:00.000Z",
    },
    {
      id: "landlord-mobile-payment-august",
      amount: 2650,
      rent_cycle_key: "2026-08",
      rent_cycle_month_label: "August 2026",
      period_label: "August 2026",
      status: "future",
      paid_at: null,
      created_at: "2026-08-01T12:00:00.000Z",
    },
  ],
  notes: [],
  documents: [],
  activities: [],
};

const landlordMobileRentProperties: Array<{
  id: string;
  name: string;
  address: string;
  rent: string;
  status: string;
  nextDue: string;
  bankStatus: string;
  homeData: MobileHomeData;
}> = [
  {
    id: "wind-energy",
    name: "Wind Energy",
    address: "1531 Wind Energy Pass, Naperville",
    rent: "$120/mo",
    status: "Payment setup pending",
    nextDue: "Next due Jul 1",
    bankStatus: "Bank pending",
    homeData: {
      ...landlordMobileRentPreviewData,
      lease: {
        ...landlordMobileRentPreviewData.lease!,
        monthly_rent: 120,
      },
      rentPayments: landlordMobileRentPreviewData.rentPayments.map((payment) => ({
        ...payment,
        amount: 120,
      })),
    },
  },
  {
    id: "aneelas-home",
    name: "Aneela's Home",
    address: "Sri ramana Enclave, Hyderabad",
    rent: "$2,550/mo",
    status: "Rent collection active",
    nextDue: "Paid through July 2026",
    bankStatus: "Payout connected",
    homeData: {
      ...landlordMobileRentPreviewData,
      lease: {
        ...landlordMobileRentPreviewData.lease!,
        monthly_rent: 2550,
      },
      rentPayments: landlordMobileRentPreviewData.rentPayments.map((payment) => ({
        ...payment,
        amount: 2550,
      })),
    },
  },
];

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
  const [dualLandlordSelected, setDualLandlordSelected] = useState(false);
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
  const [landlordProperties, setLandlordProperties] = useState<
    MobileLandlordProperty[]
  >([]);
  const [selectedLandlordPropertyId, setSelectedLandlordPropertyId] =
    useState<string | null>(null);
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
        setLandlordProperties,
        setSelectedLandlordPropertyId,
        setDualResidentSelected,
        setDualLandlordSelected,
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
          setLandlordProperties,
          setSelectedLandlordPropertyId,
          setDualResidentSelected,
          setDualLandlordSelected,
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
            setLandlordProperties,
            setSelectedLandlordPropertyId,
            setDualResidentSelected,
            setDualLandlordSelected,
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
  const showLandlordShell =
    state === "landlord-only" || (state === "dual" && dualLandlordSelected);
  const dualWorkspaceRoles: MobileWorkspaceRole[] =
    state === "dual" ? ["resident", "landlord"] : [];

  const handleWorkspaceSwitch = (role: MobileWorkspaceRole) => {
    if (state !== "dual") return;
    setDualResidentSelected(role === "resident");
    setDualLandlordSelected(role === "landlord");
    setActiveTab("home");
  };

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
            availableWorkspaces={
              dualWorkspaceRoles.length > 0 ? dualWorkspaceRoles : ["resident"]
            }
            currentWorkspace="resident"
            onSwitchWorkspace={handleWorkspaceSwitch}
          />
        ) : showLandlordShell ? (
          <LandlordMobileShell
            activeTab={activeTab}
            context={context}
            properties={landlordProperties}
            selectedPropertyId={selectedLandlordPropertyId}
            onSelectProperty={(property) => {
              setSelectedLandlordPropertyId(property.id);
              setContext((current) => ({
                ...current,
                propertyAddress: property.propertyAddress,
                unitName: property.unitName,
              }));
            }}
            onContextChange={setContext}
            onTabChange={setActiveTab}
            availableWorkspaces={
              dualWorkspaceRoles.length > 0 ? dualWorkspaceRoles : ["landlord"]
            }
            currentWorkspace="landlord"
            onSwitchWorkspace={handleWorkspaceSwitch}
          />
        ) : (
          <MobilePlaceholder
            state={state}
            onResidentApp={() => {
              setDualResidentSelected(true);
              setDualLandlordSelected(false);
              setActiveTab("home");
            }}
            onLandlordApp={() => {
              setDualResidentSelected(false);
              setDualLandlordSelected(true);
              setActiveTab("home");
            }}
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
  const landlordProperties = hasLandlordRole
    ? await loadMobileLandlordProperties(profile.id)
    : [];
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
      nextLandlordProperties: landlordProperties,
      nextSelectedLandlordPropertyId: landlordProperties[0]?.id,
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
    const selectedLandlordProperty = landlordProperties[0];
    const landlordPropertyAddress =
      selectedLandlordProperty?.propertyAddress ||
      "101 Main St, Unit 2B, Chicago, IL";

    return {
      nextState: "landlord-only",
      nextContext: {
        ...fallbackContext,
        tenantName: profile.display_name || "Landlord",
        tenantEmail: profile.email || "Not available",
        tenantPhone: profile.phone || "Not available",
        propertyAddress: landlordPropertyAddress,
        unitName: selectedLandlordProperty?.unitName || "Not available",
        landlordName: profile.display_name || "Landlord",
        landlordEmail: profile.email || "Not available",
      },
      nextLandlordProperties: landlordProperties,
      nextSelectedLandlordPropertyId: selectedLandlordProperty?.id,
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
    setLandlordProperties: (properties: MobileLandlordProperty[]) => void;
    setSelectedLandlordPropertyId: (id: string | null) => void;
    setDualResidentSelected: (selected: boolean) => void;
    setDualLandlordSelected: (selected: boolean) => void;
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
  if (result.nextLandlordProperties) {
    setters.setLandlordProperties(result.nextLandlordProperties);
  }
  if (result.nextSelectedLandlordPropertyId) {
    setters.setSelectedLandlordPropertyId(result.nextSelectedLandlordPropertyId);
  } else {
    setters.setSelectedLandlordPropertyId(null);
  }

  if (result.nextState !== "dual") {
    setters.setDualResidentSelected(false);
    setters.setDualLandlordSelected(false);
  }
  if (result.nextState === "signed-out") {
    setters.setHomeData(emptyHomeData);
    setters.setRentals([]);
    setters.setLandlordProperties([]);
  }

  setters.setState(result.nextState);
}

async function loadMobileLandlordProperties(
  profileId: string
): Promise<MobileLandlordProperty[]> {
  const { data } = await supabase
    .from("properties")
    .select("id, property_label, street_address, city, state_name, zip, unit_name")
    .eq("owner_profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(12);

  return (data || [])
    .filter((property): property is {
      id: string;
      property_label: string | null;
      street_address: string | null;
      city: string | null;
      state_name: string | null;
      zip: string | null;
      unit_name: string | null;
    } => Boolean(property.id))
    .map((property) => {
      const propertyAddress = formatPropertyAddress(property);
      return {
        id: property.id,
        propertyName: property.property_label || "Rental property",
        propertyAddress:
          propertyAddress === "Resident workspace"
            ? "101 Main St, Unit 2B, Chicago, IL"
            : propertyAddress,
        unitName: property.unit_name || "Not available",
      };
    });
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
  availableWorkspaces,
  currentWorkspace,
  onSelectRental,
  onHomeDataChange,
  onContextChange,
  onRentalsChange,
  onTabChange,
  onSwitchWorkspace,
}: {
  activeTab: MobileTab;
  context: MobileContext;
  homeData: MobileHomeData;
  rentals: MobileRental[];
  selectedRentalId: string | null;
  availableWorkspaces: MobileWorkspaceRole[];
  currentWorkspace: MobileWorkspaceRole;
  onSelectRental: (rental: MobileRental) => void;
  onHomeDataChange: (homeData: MobileHomeData) => void;
  onContextChange: (context: MobileContext) => void;
  onRentalsChange: (rentals: MobileRental[]) => void;
  onTabChange: (tab: MobileTab) => void;
  onSwitchWorkspace: (role: MobileWorkspaceRole) => void;
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
        <div className={`px-5 ${activeTab === "home" ? "pt-5" : "pt-7"}`}>
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
          availableWorkspaces={availableWorkspaces}
          currentWorkspace={currentWorkspace}
          onChangeTab={setAccountDrawerTab}
          onClose={() => setAccountDrawerOpen(false)}
          onProfileSaved={updateCurrentContext}
          onSwitchWorkspace={onSwitchWorkspace}
        />
      )}
    </>
  );
}

function LandlordMobileShell({
  activeTab,
  context,
  properties,
  selectedPropertyId,
  availableWorkspaces,
  currentWorkspace,
  onSelectProperty,
  onContextChange,
  onTabChange,
  onSwitchWorkspace,
}: {
  activeTab: MobileTab;
  context: MobileContext;
  properties: MobileLandlordProperty[];
  selectedPropertyId: string | null;
  availableWorkspaces: MobileWorkspaceRole[];
  currentWorkspace: MobileWorkspaceRole;
  onSelectProperty: (property: MobileLandlordProperty) => void;
  onContextChange: (context: MobileContext) => void;
  onTabChange: (tab: MobileTab) => void;
  onSwitchWorkspace: (role: MobileWorkspaceRole) => void;
}) {
  const activeLabel =
    landlordMobileTabs.find((tab) => tab.id === activeTab)?.label || "Home";
  const selectedProperty =
    properties.find((property) => property.id === selectedPropertyId) || properties[0];
  const displayContext = {
    ...context,
    propertyAddress:
      selectedProperty?.propertyAddress ||
      (context.propertyAddress !== "Resident workspace"
        ? context.propertyAddress
        : "101 Main St, Unit 2B, Chicago, IL"),
    unitName: selectedProperty?.unitName || context.unitName,
  };
  const [propertySelectorOpen, setPropertySelectorOpen] = useState(false);
  const [dealsOpen, setDealsOpen] = useState(false);
  const [detailProperty, setDetailProperty] =
    useState<LandlordMobileHomeProperty | null>(null);
  const [addPropertyOpen, setAddPropertyOpen] = useState(false);
  const [landlordAvaMessages, setLandlordAvaMessages] = useState<MobileAvaMessage[]>([
    {
      id: "landlord-ava-welcome",
      role: "assistant",
      content:
        "Hi, I'm Ava 👋\n\nI'm here to help with your properties, rent collection, tenants, and setup tasks.\n\nHow can I help today?",
    },
  ]);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [accountDrawerTab, setAccountDrawerTab] =
    useState<MobileAccountDrawerTab>("profile");
  const [landlordReportsSection, setLandlordReportsSection] =
    useState<"reports" | "expenses">("reports");
  const perksTabActive = activeTab === "perks";
  const avaTabActive = activeTab === "ava";
  const rentTabActive = activeTab === "rent";
  const reportsTabActive = activeTab === "reports";
  const propertyDetailOpen = activeTab === "home" && detailProperty;

  const openAccountDrawer = (tab: MobileAccountDrawerTab) => {
    setAccountDrawerTab(tab);
    setAccountDrawerOpen(true);
  };

  return (
    <>
      <section
        className={`scrollbar-hide min-h-0 flex-1 bg-white ${
          addPropertyOpen
            ? "overflow-hidden pb-0"
            : "overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+104px)]"
        }`}
      >
        {addPropertyOpen ? (
          <LandlordAddPropertyScreen
            context={displayContext}
            onBack={() => setAddPropertyOpen(false)}
          />
        ) : perksTabActive ? (
          <LandlordPerksHeader />
        ) : reportsTabActive ? (
          <LandlordReportsHeader
            activeSection={landlordReportsSection}
            onSectionChange={setLandlordReportsSection}
          />
        ) : propertyDetailOpen ? (
          <LandlordPropertyDetailScreen
            property={propertyDetailOpen}
            onBack={() => setDetailProperty(null)}
          />
        ) : (
          <>
            {!avaTabActive ? (
              <MobileHeader
                context={displayContext}
                onOpenNotifications={() => openAccountDrawer("notifications")}
                onOpenProfile={() => openAccountDrawer("profile")}
              />
            ) : null}
            <WorkspaceRow
              address={displayContext.propertyAddress}
              label={
                avaTabActive
                  ? "Ava"
                  : rentTabActive
                    ? "Rent"
                    : "Landlord"
              }
              value={
                avaTabActive
                  ? "AI Assistant"
                  : rentTabActive
                    ? "Performance"
                    : undefined
              }
              interactive={false}
              singleLabel={!avaTabActive && !rentTabActive}
              multipleProperties={false}
              trailingAction={!avaTabActive && !rentTabActive ? (
                <button
                  type="button"
                  onClick={() => setAddPropertyOpen(true)}
                  className="h-8 rounded-xl border border-zinc-200 bg-white px-3 text-[12px] font-semibold text-[#0F172A] transition active:scale-[0.99]"
                >
                  + Add Property
                </button>
              ) : undefined}
              onOpenContext={() =>
                properties.length > 1 ? setPropertySelectorOpen(true) : undefined
              }
            />
          </>
        )}
        {!addPropertyOpen && !propertyDetailOpen && (
          <div className={`px-5 ${activeTab === "home" ? "pt-5" : "pt-7"}`}>
            {perksTabActive ? (
              <LandlordPerksTab
                onViewAllDeals={() => setDealsOpen(true)}
              />
            ) : reportsTabActive ? (
              <LandlordReportsTab activeSection={landlordReportsSection} />
            ) : activeTab === "home" ? (
              <LandlordHomeTab
                context={displayContext}
                onOpenProperty={setDetailProperty}
                onOpenAddProperty={() => setAddPropertyOpen(true)}
              />
            ) : activeTab === "ava" ? (
              <LandlordAvaTab
                messages={landlordAvaMessages}
                onMessagesChange={setLandlordAvaMessages}
              />
            ) : activeTab === "rent" ? (
              <LandlordRentTab />
            ) : (
              <MobileTabPlaceholder label={activeLabel} />
            )}
          </div>
        )}
      </section>
      {!addPropertyOpen && (
        <MobileBottomNav
          activeTab={activeTab}
          tabs={landlordMobileTabs}
          onTabChange={(tab) => {
            setDetailProperty(null);
            setAddPropertyOpen(false);
            onTabChange(tab);
          }}
        />
      )}
      {propertySelectorOpen && (
        <LandlordPropertySelectorSheet
          properties={properties}
          selectedPropertyId={selectedProperty?.id || null}
          onSelect={(property) => {
            onSelectProperty(property);
            setPropertySelectorOpen(false);
          }}
          onClose={() => setPropertySelectorOpen(false)}
        />
      )}
      {dealsOpen && (
        <MobileDealsSheet deals={mobilePartnerDeals} onClose={() => setDealsOpen(false)} />
      )}
      {accountDrawerOpen && (
        <MobileAccountDrawer
          activeTab={accountDrawerTab}
          context={displayContext}
          homeData={emptyHomeData}
          availableWorkspaces={availableWorkspaces}
          currentWorkspace={currentWorkspace}
          onChangeTab={setAccountDrawerTab}
          onClose={() => setAccountDrawerOpen(false)}
          onProfileSaved={onContextChange}
          onSwitchWorkspace={onSwitchWorkspace}
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
    <div className="space-y-4">
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

function LandlordHomeTab({
  context,
  onOpenProperty,
  onOpenAddProperty,
}: {
  context: MobileContext;
  onOpenProperty: (property: LandlordMobileHomeProperty) => void;
  onOpenAddProperty: () => void;
}) {
  const properties: LandlordMobileHomeProperty[] = [
    {
      name: "Wind Energy",
      address: "1531 Wind Energy Pass, Naperville",
      rent: "$100",
      tenant: "Patrik Hester",
      due: "Next: Jul 1",
      bank: "Bank pending",
      status: "Action Needed",
      needsConnection: true,
    },
    {
      name: "Aneela's Home",
      address: "Sri ramana Enclave, Hyderabad",
      rent: "$2,550",
      tenant: "Aneela M",
      due: "Next: Jul 1",
      bank: "Verified",
      status: "Active",
      needsConnection: false,
    },
  ];

  return (
    <div className="space-y-4">
      <section>
        <p className="text-[24px] font-semibold tracking-[-0.06em] text-[#050B1F]">
          {getMobileGreeting()}, {context.firstName}
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold tracking-[-0.045em] text-[#050B1F]">
            Properties
          </h2>
          <p className="text-[12px] font-semibold text-zinc-400">2 active</p>
        </div>

        {properties.map((property) => (
          <article
            key={property.name}
            role="button"
            tabIndex={0}
            onClick={() => onOpenProperty(property)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpenProperty(property);
              }
            }}
            className="-mx-1 relative overflow-hidden rounded-2xl border border-zinc-200 bg-white px-4 py-3.5"
          >
            <span
              aria-hidden="true"
              className={`absolute inset-y-0 left-0 w-1 ${
                property.status === "Active" ? "bg-emerald-500" : "bg-blue-500"
              }`}
            />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h3 className="truncate text-[18px] font-semibold tracking-[-0.045em] text-[#050B1F]">
                    {property.name}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${
                      property.status === "Active"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    {property.status}
                  </span>
                </div>
                <p className="mt-1 truncate text-[12px] font-medium leading-5 text-zinc-500">
                  {property.address}
                </p>
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenProperty(property);
                }}
                className="h-8 shrink-0 px-1 text-[12px] font-semibold text-[#0F172A] transition hover:opacity-75 active:scale-[0.99]"
              >
                View
              </button>
            </div>

            <div className="mt-3 border-t border-zinc-100 pt-3">
              <div className="grid grid-cols-4 divide-x divide-zinc-100">
                <div className="min-w-0 pr-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    Rent
                  </p>
                  <p className="mt-1 truncate text-[16px] font-semibold tracking-[-0.05em] text-emerald-600">
                    {property.rent}
                    <span className="ml-0.5 text-[12px] font-medium tracking-[-0.02em] text-zinc-500">
                      /mo
                    </span>
                  </p>
                </div>
                <div className="min-w-0 px-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    Tenant
                  </p>
                  <p className="mt-1 truncate text-[12px] font-semibold text-[#050B1F]">
                    {property.tenant}
                  </p>
                </div>
                <div className="min-w-0 px-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    Due
                  </p>
                  <p className="mt-1 truncate text-[12px] font-semibold text-[#050B1F]">
                    {property.due}
                  </p>
                </div>
                <div className="min-w-0 pl-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    Bank
                  </p>
                  <p
                    className={`mt-1 truncate text-[12px] font-semibold ${
                      property.needsConnection ? "text-amber-600" : "text-emerald-600"
                    }`}
                  >
                    {property.bank}
                  </p>
                </div>
              </div>
            </div>
          </article>
        ))}

        <button
          type="button"
          onClick={onOpenAddProperty}
          className="-mx-1 flex h-12 w-[calc(100%+0.5rem)] items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white text-[14px] font-semibold text-[#0F172A] transition active:scale-[0.99]"
        >
          + Add Property
        </button>
      </section>

      <section className="-mx-1 mt-2 rounded-2xl border border-zinc-200 bg-white p-3.5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[18px] font-semibold tracking-[-0.055em] text-[#050B1F]">
            Portfolio Summary
          </h2>
          <span className="flex h-9 items-center rounded-xl border border-zinc-200 bg-white px-3 text-[12px] font-semibold text-[#0F172A]">
            This Month
          </span>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] gap-4">
          <div className="min-w-0">
            <p className="text-[14px] font-medium tracking-[-0.035em] text-zinc-500">
              Monthly Rent
            </p>
            <p className="mt-1 text-[30px] font-semibold leading-none tracking-[-0.08em] text-[#050B1F]">
              $2,650
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Stable
            </div>
          </div>

          <div className="my-2 w-px bg-zinc-200" />

          <div className="min-w-0">
            <p className="text-[14px] font-medium tracking-[-0.035em] text-zinc-500">
              Total Properties
            </p>
            <p className="mt-1 text-[30px] font-semibold leading-none tracking-[-0.08em] text-[#050B1F]">
              2
            </p>
            <div className="mt-3 flex items-center gap-2 text-[13px] font-medium leading-5 text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active 2
            </div>
          </div>
        </div>

        <div className="my-4 h-px bg-zinc-100" />

        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[17px] font-semibold tracking-[-0.05em] text-[#050B1F]">
              Payout Performance
            </h3>
            <span className="flex h-8 items-center rounded-xl border border-zinc-200 bg-white px-3 text-[12px] font-semibold text-[#0F172A]">
              12 Months
            </span>
          </div>

          <div className="mt-3 rounded-2xl border border-zinc-100 bg-white p-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold text-zinc-500">
                  Collection Rate
                </p>
                <p className="mt-1 text-[34px] font-semibold leading-none tracking-[-0.08em] text-[#050B1F]">
                  0%
                </p>
              </div>
              <div className="space-y-2 text-[12px] font-medium text-zinc-500">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  0 paid
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  0 late
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-end justify-between gap-2">
                {Array.from({ length: 12 }).map((_, index) => (
                  <span
                    key={index}
                    className="h-12 w-3 rounded-full bg-zinc-200"
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-zinc-400">
                <span>Jan</span>
                <span>Dec</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 divide-x divide-zinc-100 border-t border-zinc-100 pt-3">
              <div>
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Paid
                </p>
                <p className="mt-1 text-[22px] font-semibold leading-none tracking-[-0.06em] text-emerald-600">
                  0
                </p>
              </div>
              <div className="px-3">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-500">
                  <span className="h-2 w-2 rounded-full bg-zinc-400" />
                  Upcoming
                </p>
                <p className="mt-1 text-[22px] font-semibold leading-none tracking-[-0.06em] text-zinc-500">
                  0
                </p>
              </div>
              <div className="pl-3">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-500">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  Late
                </p>
                <p className="mt-1 text-[22px] font-semibold leading-none tracking-[-0.06em] text-orange-600">
                  0
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="my-4 h-px bg-zinc-100" />

        <div>
          <h3 className="text-[17px] font-semibold tracking-[-0.05em] text-[#050B1F]">
            At a Glance
          </h3>
          <div className="mt-2 divide-y divide-zinc-100">
            {[
              {
                icon: AlertCircle,
                title: "Action Needed",
                text: "Setup, lease, or payment review",
                value: "1",
                className: "text-blue-600",
              },
              {
                icon: Landmark,
                title: "Bank Status",
                text: "Connection needed",
                value: "1 not connected",
                className: "text-amber-600",
              },
              {
                icon: CalendarDays,
                title: "Next Due",
                text: "Upcoming rent cycle",
                value: "1st",
                className: "text-zinc-500",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.title}
                  className="flex w-full items-center gap-3 py-2.5 text-left"
                >
                  <Icon className={`h-5 w-5 shrink-0 ${item.className}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-[#050B1F]">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] font-medium text-zinc-500">
                      {item.text}
                    </span>
                  </span>
                  <span className="shrink-0 text-[14px] font-semibold text-[#050B1F]">
                    {item.value}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function LandlordAddPropertyScreen({
  context,
  onBack,
}: {
  context: MobileContext;
  onBack: () => void;
}) {
  const steps = [
    { label: "Property", Icon: House },
    { label: "Tenant", Icon: User },
    { label: "Lease", Icon: FileText },
    { label: "Review", Icon: ClipboardCheck || CheckCircle2 },
  ];
  const submitInProgressRef = useRef(false);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [submissionId] = useState(() => createMobileSubmissionId());
  const [createdPropertyId, setCreatedPropertyId] = useState("");
  const [createdLeaseId, setCreatedLeaseId] = useState("");
  const [propertyCreatedEventSent, setPropertyCreatedEventSent] = useState(false);
  const [tenantRowsCreated, setTenantRowsCreated] = useState(false);
  const [preferencesCreated, setPreferencesCreated] = useState(false);
  const [propertyForm, setPropertyForm] = useState({
    streetAddress: "",
    city: "",
    stateName: "",
    zip: "",
    propertyType: "Apartment",
    units: "1 Unit",
    unitName: "",
    propertyLabel: "",
  });
  const [tenantForm, setTenantForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [additionalTenants, setAdditionalTenants] = useState<MobileAdditionalTenant[]>(
    []
  );
  const [additionalTenantDraft, setAdditionalTenantDraft] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [additionalTenantOpen, setAdditionalTenantOpen] = useState(false);
  const [leaseSetupType, setLeaseSetupType] = useState<"new" | "existing">(
    "new"
  );
  const [paymentTrackingStartDate, setPaymentTrackingStartDate] = useState(
    getMobileNextFirstOfMonthDate()
  );
  const [leaseForm, setLeaseForm] = useState({
    startDate: "",
    endDate: "",
    monthlyRent: "",
    securityDeposit: "",
    rentDueDay: "1st of the Month",
  });
  const [preferencesForm, setPreferencesForm] = useState({
    phone: "",
    landlordAbsorbsFee: false,
    authorizedAgreement: false,
    termsAgreement: false,
  });
  const propertyValid =
    propertyForm.streetAddress.trim() &&
    propertyForm.city.trim() &&
    propertyForm.stateName.trim() &&
    propertyForm.zip.trim() &&
    propertyForm.propertyLabel.trim();
  const tenantValid =
    tenantForm.firstName.trim() &&
    tenantForm.lastName.trim() &&
    isMobileValidEmail(tenantForm.email) &&
    isMobileValidOptionalPhone(tenantForm.phone);
  const leaseValid =
    leaseForm.startDate.trim() &&
    leaseForm.endDate.trim() &&
    leaseForm.monthlyRent.trim() &&
    Number(leaseForm.monthlyRent) > 0 &&
    leaseForm.rentDueDay.trim() &&
    (leaseSetupType === "new"
      ? isMobileNewLeaseStartAllowed(leaseForm.startDate)
      : paymentTrackingStartDate.trim());
  const reviewValid =
    preferencesForm.authorizedAgreement &&
    preferencesForm.termsAgreement &&
    isMobileValidOptionalPhone(preferencesForm.phone);
  const canContinue =
    step === 1
      ? Boolean(propertyValid)
      : step === 2
        ? Boolean(tenantValid)
        : step === 3
          ? Boolean(leaseValid)
          : Boolean(reviewValid);
  const progress = step === 4 ? 90 : step * 25;

  function updatePropertyForm(field: keyof typeof propertyForm, value: string) {
    setPropertyForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateTenantForm(field: keyof typeof tenantForm, value: string) {
    setTenantForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateAdditionalTenantDraft(
    field: keyof typeof additionalTenantDraft,
    value: string
  ) {
    setAdditionalTenantDraft((prev) => ({ ...prev, [field]: value }));
  }

  function updateLeaseForm(field: keyof typeof leaseForm, value: string) {
    setLeaseForm((prev) => ({ ...prev, [field]: value }));
  }

  function addAdditionalTenant() {
    if (
      !additionalTenantDraft.firstName.trim() ||
      !additionalTenantDraft.lastName.trim()
    ) {
      return;
    }

    setAdditionalTenants((prev) => [
      ...prev,
      {
        id: Date.now(),
        firstName: additionalTenantDraft.firstName.trim(),
        lastName: additionalTenantDraft.lastName.trim(),
        email: additionalTenantDraft.email.trim(),
        phone: additionalTenantDraft.phone.trim(),
      },
    ]);
    setAdditionalTenantDraft({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    });
    setAdditionalTenantOpen(false);
  }

  function removeAdditionalTenant(id: number) {
    setAdditionalTenants((prev) => prev.filter((tenant) => tenant.id !== id));
  }

  function updatePreferencesForm(
    field: keyof typeof preferencesForm,
    value: string | boolean
  ) {
    setPreferencesForm((prev) => ({ ...prev, [field]: value }));
  }

  function validationMessage() {
    if (!validationAttempted) return "";
    if (step === 1) return "Complete the required property details to continue.";
    if (step === 2) {
      if (tenantForm.email.trim() && !isMobileValidEmail(tenantForm.email)) {
        return "Enter a valid resident email address.";
      }
      if (!isMobileValidOptionalPhone(tenantForm.phone)) {
        return "Enter a valid phone number or leave it blank.";
      }
      return "Add the primary resident's name and email to continue.";
    }
    if (step === 3) {
      if (
        leaseSetupType === "new" &&
        leaseForm.startDate &&
        !isMobileNewLeaseStartAllowed(leaseForm.startDate)
      ) {
        return "This looks like an existing lease. Use a recent start date for a new lease.";
      }
      return "Complete lease dates, rent amount, and due date to continue.";
    }
    if (!isMobileValidOptionalPhone(preferencesForm.phone)) {
      return "Enter a valid phone number or leave it blank.";
    }
    return "Confirm both agreement checkboxes to submit.";
  }

  function handleContinue() {
    setErrorMessage("");
    if (!canContinue) {
      setValidationAttempted(true);
      return;
    }

    setValidationAttempted(false);
    if (step < 4) {
      setStep((current) => current + 1);
      return;
    }

    savePropertySetup();
  }

  function handleBack() {
    setErrorMessage("");
    if (step > 1) {
      setValidationAttempted(false);
      setStep((current) => current - 1);
      return;
    }

    onBack();
  }

  async function savePropertySetup() {
    if (!canContinue || saving || submitInProgressRef.current) return;

    submitInProgressRef.current = true;
    setSaving(true);
    setErrorMessage("");

    try {
      const profile =
        context.profileId && context.landlordEmail
          ? { id: context.profileId, email: context.landlordEmail }
          : await getOrCreateProfile();
      const profileId = profile.id;
      const notificationEmail = profile.email || context.landlordEmail || "";

      const property = await createOrReuseMobileProperty({
        profileId,
        submissionId,
        propertyForm,
        existingPropertyId: createdPropertyId,
      });
      setCreatedPropertyId(property.id);

      if (!propertyCreatedEventSent) {
        await triggerEmailEvent({
          trigger: "property_created",
          propertyId: property.id,
        });
        setPropertyCreatedEventSent(true);
      }

      const lease = await createOrReuseMobileLease({
        propertyId: property.id,
        leaseForm,
        leaseSetupType,
        paymentTrackingStartDate,
        existingLeaseId: createdLeaseId,
      });
      setCreatedLeaseId(lease.id);

      await ensureMobileStarterPropertyNotes({
        propertyId: property.id,
        leaseId: lease.id,
        profileId,
      });

      if (!tenantRowsCreated) {
        const { data: existingTenants, error: existingTenantsError } = await supabase
          .from("lease_tenants")
          .select("id")
          .eq("lease_id", lease.id)
          .limit(1);

        if (existingTenantsError) throw existingTenantsError;

        if (!existingTenants?.length) {
          const tenantRows = [
            {
              lease_id: lease.id,
              first_name: tenantForm.firstName.trim(),
              last_name: tenantForm.lastName.trim(),
              email: tenantForm.email.trim(),
              phone: tenantForm.phone.trim() || null,
              tenant_role: "primary",
              invite_status: "not_sent",
            },
            ...additionalTenants.map((tenant) => ({
              lease_id: lease.id,
              first_name: tenant.firstName.trim(),
              last_name: tenant.lastName.trim(),
              email: tenant.email.trim() || null,
              phone: tenant.phone.trim() || null,
              tenant_role: "secondary",
              invite_status: "not_sent",
            })),
          ];

          const { error: tenantError } = await supabase
            .from("lease_tenants")
            .insert(tenantRows);

          if (tenantError) throw tenantError;
        }

        setTenantRowsCreated(true);
      }

      if (!preferencesCreated) {
        const now = new Date().toISOString();
        const { error: preferencesError } = await supabase
          .from("lease_preferences")
          .upsert(
            {
              lease_id: lease.id,
              notification_email: notificationEmail,
              notification_phone: preferencesForm.phone.trim() || null,
              whatsapp_enabled: false,
              sms_enabled: false,
              landlord_absorbs_fee: preferencesForm.landlordAbsorbsFee === true,
              authorized_agreement: preferencesForm.authorizedAgreement,
              terms_agreement: preferencesForm.termsAgreement,
              authorized_agreed_at: preferencesForm.authorizedAgreement ? now : null,
              terms_agreed_at: preferencesForm.termsAgreement ? now : null,
            },
            { onConflict: "lease_id" }
          );

        if (preferencesError) throw preferencesError;
        setPreferencesCreated(true);
      }

      await Promise.allSettled([
        createActivity({
          profile_id: profileId,
          property_id: property.id,
          lease_id: lease.id,
          activity_type: "property_added",
          title: "Property added",
          description: `${propertyForm.propertyLabel.trim()} was added to your board.`,
        }),
        createActivity({
          profile_id: profileId,
          property_id: property.id,
          lease_id: lease.id,
          activity_type: "tenant_added",
          title: "Resident record added",
          description: `${tenantForm.firstName.trim()} ${tenantForm.lastName.trim()} was added as the primary resident.`,
        }),
        createActivity({
          profile_id: profileId,
          property_id: property.id,
          lease_id: lease.id,
          activity_type: "bank_pending",
          title: "Bank setup pending",
          description: "Connect your bank account to activate rent collection.",
        }),
      ]);

      onBack();
    } catch (error) {
      console.error("Mobile property setup save error:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while saving. Please try again."
      );
    } finally {
      submitInProgressRef.current = false;
      setSaving(false);
    }
  }

  const currentValidationMessage = validationMessage();

  return (
    <div className="flex h-full min-h-0 flex-col bg-white landlord-mobile-detail-slide">
      <style>{`
        @keyframes landlordMobileDetailSlide {
          from { transform: translateX(100%); opacity: 0.98; }
          to { transform: translateX(0); opacity: 1; }
        }
        .landlord-mobile-detail-slide {
          animation: landlordMobileDetailSlide 220ms ease-out;
        }
      `}</style>

      <header className="shrink-0 bg-white px-5 pt-[calc(env(safe-area-inset-top)+14px)]">
        <div className="grid h-12 grid-cols-[44px_1fr_44px] items-center">
          <button
            type="button"
            onClick={onBack}
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-zinc-500 transition active:scale-[0.98]"
            aria-label="Back to landlord home"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-center text-[17px] font-semibold tracking-[-0.04em] text-[#050B1F]">
            Add Property
          </h1>
        </div>
      </header>

      <main className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        <div className="pt-4">
          <div className="flex items-center">
            {steps.map((stepItem, index) => {
              const active = index + 1 === step;
              const completed = index + 1 < step;
              const StepIcon = stepItem.Icon;
              return (
                <Fragment key={stepItem.label}>
                  <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold ${
                        active || completed
                          ? "bg-blue-600 text-white"
                          : "bg-zinc-100 text-zinc-400"
                      }`}
                    >
                      <StepIcon className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </span>
                    <span
                      className={`truncate text-[11px] font-semibold ${
                        active ? "text-blue-600" : "text-zinc-400"
                      }`}
                    >
                      {stepItem.label}
                    </span>
                  </div>
                  {index < steps.length - 1 ? (
                    <div className="-mx-2 mb-6 h-px w-7 shrink-0 bg-zinc-200" />
                  ) : null}
                </Fragment>
              );
            })}
          </div>

          <section className="mt-8">
            <h2 className="text-[26px] font-semibold leading-[1.08] tracking-[-0.07em] text-[#050B1F]">
              {step === 1
                ? "Enter property details and continue."
                : step === 2
                  ? "Add the primary resident."
                  : step === 3
                    ? "Set up the lease details."
                    : "Review and confirm."}
            </h2>

            {step === 1 && (
              <div className="mt-6 space-y-4">
                <MobileAddPropertyInput
                  label="Street Address"
                  placeholder="e.g. 12 Oak Street"
                  value={propertyForm.streetAddress}
                  onChange={(value) => updatePropertyForm("streetAddress", value)}
                  error={validationAttempted && !propertyForm.streetAddress.trim()}
                />
                <div className="grid grid-cols-2 gap-3">
                  <MobileAddPropertyInput
                    label="City"
                    placeholder="San Francisco"
                    value={propertyForm.city}
                    onChange={(value) => updatePropertyForm("city", value)}
                    error={validationAttempted && !propertyForm.city.trim()}
                  />
                  <MobileAddPropertyInput
                    label="State"
                    placeholder="CA"
                    value={propertyForm.stateName}
                    onChange={(value) => updatePropertyForm("stateName", value)}
                    error={validationAttempted && !propertyForm.stateName.trim()}
                  />
                </div>
                <MobileAddPropertyInput
                  label="ZIP"
                  placeholder="94102"
                  value={propertyForm.zip}
                  onChange={(value) => updatePropertyForm("zip", value)}
                  error={validationAttempted && !propertyForm.zip.trim()}
                />
                <div className="grid grid-cols-2 gap-3">
                  <MobileAddPropertySelect
                    label="Property Type"
                    value={propertyForm.propertyType}
                    onChange={(value) => updatePropertyForm("propertyType", value)}
                    options={["Apartment", "House", "Condo", "Townhome", "Other"]}
                  />
                  <MobileAddPropertySelect
                    label="Number Of Units"
                    value={propertyForm.units}
                    onChange={(value) => updatePropertyForm("units", value)}
                    options={["1 Unit", "2 Units", "3 Units", "4 Units", "5+ Units"]}
                  />
                </div>
                <MobileAddPropertyInput
                  label="Unit Name / Identifier"
                  optional
                  placeholder="e.g. Apt 2B"
                  value={propertyForm.unitName}
                  onChange={(value) => updatePropertyForm("unitName", value)}
                />
                <MobileAddPropertyInput
                  label="Property Label"
                  placeholder="Name this property for your board"
                  value={propertyForm.propertyLabel}
                  onChange={(value) => updatePropertyForm("propertyLabel", value)}
                  error={validationAttempted && !propertyForm.propertyLabel.trim()}
                />
                <p className="-mt-1 text-[13px] font-medium leading-5 text-zinc-500">
                  Examples: Willow's Apartment, Downtown Apartment, Unit 2B
                </p>
              </div>
            )}

            {step === 2 && (
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <MobileAddPropertyInput
                    label="First Name"
                    placeholder="Aneela"
                    value={tenantForm.firstName}
                    onChange={(value) => updateTenantForm("firstName", value)}
                    error={validationAttempted && !tenantForm.firstName.trim()}
                  />
                  <MobileAddPropertyInput
                    label="Last Name"
                    placeholder="M"
                    value={tenantForm.lastName}
                    onChange={(value) => updateTenantForm("lastName", value)}
                    error={validationAttempted && !tenantForm.lastName.trim()}
                  />
                </div>
                <MobileAddPropertyInput
                  label="Email"
                  placeholder="resident@email.com"
                  value={tenantForm.email}
                  onChange={(value) => updateTenantForm("email", value)}
                  error={validationAttempted && !isMobileValidEmail(tenantForm.email)}
                  inputMode="email"
                />
                <MobileAddPropertyInput
                  label="Phone"
                  optional
                  placeholder="(415) 555-0000"
                  value={tenantForm.phone}
                  onChange={(value) => updateTenantForm("phone", value)}
                  error={validationAttempted && !isMobileValidOptionalPhone(tenantForm.phone)}
                  inputMode="tel"
                />
                <p className="text-[13px] font-medium leading-5 text-zinc-500">
                  Resident invites are sent after bank setup is complete.
                </p>
                {additionalTenants.length > 0 && (
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[14px] font-semibold text-[#050B1F]">
                        Additional Tenants
                      </h3>
                      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[12px] font-semibold text-zinc-500">
                        {additionalTenants.length} added
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {additionalTenants.map((tenant) => (
                        <div
                          key={tenant.id}
                          className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-[#050B1F]">
                              {tenant.firstName} {tenant.lastName}
                            </p>
                            <p className="mt-0.5 truncate text-[12px] font-medium text-zinc-500">
                              {tenant.email || "No email"}
                              {tenant.phone ? ` • ${tenant.phone}` : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAdditionalTenant(tenant.id)}
                            className="shrink-0 text-[12px] font-semibold text-red-500"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {additionalTenantOpen ? (
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-[15px] font-semibold text-[#050B1F]">
                          Add Additional Tenant
                        </h3>
                        <p className="mt-1 text-[12px] font-medium leading-5 text-zinc-500">
                          Optional contacts only. No board invite will be sent.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAdditionalTenantOpen(false)}
                        className="text-[12px] font-semibold text-zinc-400"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="mt-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <MobileAddPropertyInput
                          label="First Name"
                          placeholder="John"
                          value={additionalTenantDraft.firstName}
                          onChange={(value) =>
                            updateAdditionalTenantDraft("firstName", value)
                          }
                        />
                        <MobileAddPropertyInput
                          label="Last Name"
                          placeholder="Doe"
                          value={additionalTenantDraft.lastName}
                          onChange={(value) =>
                            updateAdditionalTenantDraft("lastName", value)
                          }
                        />
                      </div>
                      <MobileAddPropertyInput
                        label="Email"
                        placeholder="additional@email.com"
                        value={additionalTenantDraft.email}
                        onChange={(value) =>
                          updateAdditionalTenantDraft("email", value)
                        }
                        inputMode="email"
                      />
                      <MobileAddPropertyInput
                        label="Phone"
                        placeholder="(415) 555-0000"
                        value={additionalTenantDraft.phone}
                        onChange={(value) =>
                          updateAdditionalTenantDraft("phone", value)
                        }
                        inputMode="tel"
                      />
                      <button
                        type="button"
                        onClick={addAdditionalTenant}
                        disabled={
                          !additionalTenantDraft.firstName.trim() ||
                          !additionalTenantDraft.lastName.trim()
                        }
                        className="h-11 w-full rounded-2xl bg-blue-600 text-[14px] font-semibold text-white transition disabled:bg-zinc-100 disabled:text-zinc-400"
                      >
                        Add Tenant
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAdditionalTenantOpen(true)}
                    className="h-12 w-full rounded-2xl border border-zinc-200 bg-white text-[14px] font-semibold text-blue-600 transition active:scale-[0.99]"
                  >
                    + Add Additional Tenant
                  </button>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="mt-6 space-y-4">
                <div className="space-y-3">
                  <p className="text-[14px] font-semibold text-[#0F172A]">
                    Lease Type
                  </p>
                  {[
                    {
                      value: "new" as const,
                      label: "New Lease",
                      helper:
                        "For residents starting soon, today, or within the past 15 days.",
                    },
                    {
                      value: "existing" as const,
                      label: "Existing Lease",
                      helper:
                        "For active leases that started more than 15 days ago.",
                    },
                  ].map((option) => {
                    const active = leaseSetupType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setLeaseSetupType(option.value)}
                        className={`w-full rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
                          active
                            ? "border-blue-600 bg-blue-50"
                            : "border-zinc-200 bg-white"
                        }`}
                      >
                        <span
                          className={`text-[14px] font-semibold ${
                            active ? "text-blue-700" : "text-[#050B1F]"
                          }`}
                        >
                          {option.label}
                        </span>
                        <span className="mt-1 block text-[12px] font-medium leading-5 text-zinc-500">
                          {option.helper}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MobileAddPropertyInput
                    label="Start Date"
                    value={leaseForm.startDate}
                    onChange={(value) => updateLeaseForm("startDate", value)}
                    error={
                      validationAttempted &&
                      (!leaseForm.startDate.trim() ||
                        !isMobileNewLeaseStartAllowed(leaseForm.startDate))
                    }
                    type="date"
                  />
                  <MobileAddPropertyInput
                    label="End Date"
                    value={leaseForm.endDate}
                    onChange={(value) => updateLeaseForm("endDate", value)}
                    error={validationAttempted && !leaseForm.endDate.trim()}
                    type="date"
                  />
                </div>
                <div>
                  <p className="text-[14px] font-semibold tracking-[-0.025em] text-[#0F172A]">
                    Rent Due Day
                  </p>
                  <div className="mt-2 flex h-12 items-center rounded-2xl border border-zinc-200 bg-white px-4 text-[15px] font-medium text-[#0F172A]">
                    1st of the Month
                  </div>
                  <p className="mt-2 text-[12px] font-medium leading-5 text-zinc-500">
                    AvenueBoard currently supports monthly rent payments due on
                    the 1st of each month.
                  </p>
                </div>
                <MobileAddPropertyInput
                  label="Monthly Rent"
                  placeholder="2650"
                  value={leaseForm.monthlyRent}
                  onChange={(value) => updateLeaseForm("monthlyRent", value)}
                  error={
                    validationAttempted &&
                    (!leaseForm.monthlyRent.trim() ||
                      Number(leaseForm.monthlyRent) <= 0)
                  }
                  inputMode="decimal"
                />
                {leaseSetupType === "new" ? (
                  <MobileAddPropertyInput
                    label="Security Deposit"
                    optional
                    placeholder="2650"
                    value={leaseForm.securityDeposit}
                    onChange={(value) =>
                      updateLeaseForm("securityDeposit", value)
                    }
                    inputMode="decimal"
                  />
                ) : (
                  <MobileAddPropertyInput
                    label="Rent payments will begin from"
                    value={paymentTrackingStartDate}
                    onChange={setPaymentTrackingStartDate}
                    type="date"
                  />
                )}
                <p className="text-[13px] font-medium leading-5 text-zinc-500">
                  {leaseSetupType === "new"
                    ? "For mid-month starts, AvenueBoard can calculate prorated rent on the full desktop setup."
                    : "Previous rent payments won't be recreated. AvenueBoard begins tracking from this payment cycle."}
                </p>
              </div>
            )}

            {step === 4 && (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <h3 className="text-[15px] font-semibold text-[#050B1F]">
                    Property
                  </h3>
                  <p className="mt-2 text-[14px] font-medium leading-5 text-zinc-500">
                    {propertyForm.propertyLabel || "Property label"}
                    <br />
                    {propertyForm.streetAddress || "Street address"}
                    {propertyForm.unitName ? `, ${propertyForm.unitName}` : ""}
                    <br />
                    {propertyForm.city || "City"}, {propertyForm.stateName || "State"} {propertyForm.zip || "ZIP"}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <h3 className="text-[15px] font-semibold text-[#050B1F]">
                    Resident & Lease
                  </h3>
                  <p className="mt-2 text-[14px] font-medium leading-5 text-zinc-500">
                    {tenantForm.firstName} {tenantForm.lastName}
                    <br />
                    {tenantForm.email}
                    <br />
                    {leaseSetupType === "new" ? "New Lease" : "Existing Lease"} • $
                    {leaseForm.monthlyRent || "0"} / month • {leaseForm.rentDueDay}
                    {additionalTenants.length > 0 ? (
                      <>
                        <br />
                        {additionalTenants.length} additional tenant
                        {additionalTenants.length === 1 ? "" : "s"}
                      </>
                    ) : null}
                  </p>
                </div>
                <label className="block">
                  <span className="text-[14px] font-semibold tracking-[-0.025em] text-[#0F172A]">
                    Phone Number <span className="font-medium text-zinc-400">(Optional)</span>
                  </span>
                  <input
                    type="tel"
                    placeholder="(415) 555-0000"
                    value={preferencesForm.phone}
                    onChange={(event) =>
                      updatePreferencesForm("phone", event.target.value)
                    }
                    className={`mt-2 h-12 w-full rounded-2xl border bg-white px-4 text-[15px] font-medium text-[#0F172A] outline-none placeholder:text-zinc-400 focus:border-blue-500 ${
                      validationAttempted &&
                      !isMobileValidOptionalPhone(preferencesForm.phone)
                        ? "border-red-300"
                        : "border-zinc-200"
                    }`}
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    updatePreferencesForm(
                      "landlordAbsorbsFee",
                      !preferencesForm.landlordAbsorbsFee
                    )
                  }
                  className={`flex h-12 w-full items-center justify-center rounded-2xl border text-[14px] font-semibold transition active:scale-[0.99] ${
                    preferencesForm.landlordAbsorbsFee
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-zinc-200 bg-white text-[#0F172A]"
                  }`}
                >
                  {preferencesForm.landlordAbsorbsFee ? "Absorbed" : "Absorb Fee"}
                </button>
                <MobileAddPropertyCheckbox
                  checked={preferencesForm.authorizedAgreement}
                  onChange={(checked) =>
                    updatePreferencesForm("authorizedAgreement", checked)
                  }
                  label="I confirm that I am authorized to collect rent for this property as the owner or property manager."
                />
                <MobileAddPropertyCheckbox
                  checked={preferencesForm.termsAgreement}
                  onChange={(checked) =>
                    updatePreferencesForm("termsAgreement", checked)
                  }
                  label="I have read and agree to the Terms of Service and Privacy Policy."
                />
              </div>
            )}

            {(currentValidationMessage || errorMessage) && (
              <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-[13px] font-medium leading-5 text-red-600">
                {errorMessage || currentValidationMessage}
              </p>
            )}
          </section>
        </div>
      </main>

      <footer className="shrink-0 border-t border-zinc-100 bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4">
        <div className="flex items-center justify-between text-[12px] font-semibold text-zinc-500">
          <span>Step {step} of 4</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={saving}
            className="h-11 rounded-2xl px-4 text-[14px] font-semibold text-zinc-500 transition active:scale-[0.99]"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={saving}
            className="h-11 rounded-2xl bg-blue-600 px-6 text-[14px] font-semibold text-white transition active:scale-[0.99] disabled:opacity-50"
          >
            {saving ? "Saving..." : step === 4 ? "Submit" : "Continue"}
          </button>
        </div>
      </footer>
    </div>
  );
}

function MobileAddPropertyInput({
  label,
  optional,
  placeholder,
  value,
  onChange,
  error,
  type = "text",
  inputMode,
}: {
  label: string;
  optional?: boolean;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  type?: string;
  inputMode?: "text" | "email" | "tel" | "decimal" | "numeric";
}) {
  return (
    <label className="block">
      <span className="text-[14px] font-semibold tracking-[-0.025em] text-[#0F172A]">
        {label}
        {optional ? (
          <span className="ml-1 font-medium text-zinc-400">(Optional)</span>
        ) : null}
      </span>
      <input
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-2 h-12 w-full rounded-2xl border bg-white px-4 text-[15px] font-medium text-[#0F172A] outline-none placeholder:text-zinc-400 focus:border-blue-500 ${
          error ? "border-red-300" : "border-zinc-200"
        }`}
      />
    </label>
  );
}

function MobileAddPropertySelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-[14px] font-semibold tracking-[-0.025em] text-[#0F172A]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full appearance-none rounded-2xl border border-zinc-200 bg-white px-4 text-[15px] font-medium text-[#0F172A] outline-none focus:border-blue-500"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function MobileAddPropertyCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-5 w-5 rounded border-zinc-300 accent-blue-600"
      />
      <span className="text-[14px] font-medium leading-5 text-[#0F172A]">
        {label}
      </span>
    </label>
  );
}

function LandlordPropertyDetailScreen({
  property,
  onBack,
}: {
  property: LandlordMobileHomeProperty;
  onBack: () => void;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);

  return (
    <div className="min-h-full bg-white px-5 pb-8 pt-[calc(env(safe-area-inset-top)+18px)] landlord-mobile-detail-slide">
      <style>{`
        @keyframes landlordMobileDetailSlide {
          from { transform: translateX(100%); opacity: 0.98; }
          to { transform: translateX(0); opacity: 1; }
        }
        .landlord-mobile-detail-slide {
          animation: landlordMobileDetailSlide 220ms ease-out;
        }
      `}</style>
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full text-zinc-500 transition active:scale-[0.98]"
        aria-label="Back to landlord home"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="mt-1">
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="min-w-0 truncate text-[20px] font-semibold leading-[1.08] tracking-[-0.055em] text-[#050B1F]">
            {property.name}
          </h1>
          <span className="h-4 w-px shrink-0 bg-zinc-200" />
          <span className="shrink-0 text-[13px] font-medium tracking-[-0.02em] text-zinc-500">
            Workspace
          </span>
        </div>

        <div className="mt-1.5 flex items-start gap-2 text-[13px] font-medium leading-5 text-[#6B7280]">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.9} />
          <span>1531 Wind Energy Pass, Naperville, IL 60563</span>
        </div>

        <div className="mt-4 h-px bg-zinc-100" />
      </div>

      <section className="mt-5 border-b border-zinc-100 pb-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Monthly Rent
            </p>
          </div>

          <div className="relative flex items-center gap-2">
            <button
              type="button"
              className="h-8 rounded-full border border-zinc-200 bg-white px-3 text-[12px] font-semibold text-[#0F172A] transition active:scale-[0.99]"
            >
              Edit Lease
            </button>
            <button
              type="button"
              onClick={() => setActionsOpen((open) => !open)}
              className="flex h-8 w-6 items-center justify-center text-zinc-500 transition active:scale-[0.98]"
              aria-label="Property actions"
              aria-expanded={actionsOpen}
            >
              <span className="text-[20px] font-medium leading-none">⋮</span>
            </button>

            {actionsOpen ? (
              <div className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-2xl border border-zinc-200 bg-white py-1 shadow-[0_14px_34px_rgba(15,23,42,0.12)]">
                <button
                  type="button"
                  onClick={() => setActionsOpen(false)}
                  className="flex w-full px-4 py-3 text-left text-[13px] font-semibold text-[#0F172A] transition hover:bg-zinc-50"
                >
                  End Lease
                </button>
                <button
                  type="button"
                  onClick={() => setActionsOpen(false)}
                  className="flex w-full px-4 py-3 text-left text-[13px] font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Delete Property
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-2 flex items-center gap-3">
          <h2 className="text-[34px] font-semibold leading-none tracking-[-0.08em] text-[#050B1F]">
            {property.rent}
          </h2>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-600">
            Active
          </span>
        </div>

        <div className="mt-4">
          <p className="text-[13px] font-semibold text-[#0F172A]">
            Lease ends on May 30, 2027
          </p>
          <p className="mt-1 text-[12px] font-medium leading-5 text-zinc-500">
            Bank status: {property.needsConnection ? "Pending" : "Connected"}
          </p>
        </div>

        <div className="mt-5">
          <button
            type="button"
            className="flex h-12 w-full items-center justify-center rounded-xl bg-[#0F172A] text-[13px] font-semibold text-white active:scale-[0.99]"
          >
            {property.needsConnection ? "Connect Bank" : "Manage Payout Settings"}
          </button>
        </div>
      </section>

      <section className="mt-6 border-b border-zinc-100 pb-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-semibold tracking-[-0.045em] text-[#050B1F]">
              Tenant
            </h2>
            <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-zinc-100 px-2 text-[12px] font-semibold text-zinc-500">
              1
            </span>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#0F172A]"
          >
            Manage Tenant
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.1} />
          </button>
        </div>

        <article className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
          <div className="grid grid-cols-[minmax(0,1fr)_1px_auto] items-center gap-x-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#050B1F] text-[14px] font-semibold text-white">
                PH
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[13px] font-semibold tracking-[-0.035em] text-[#111827]">
                  Patrik Hester
                </h3>
                <p className="mt-0.5 truncate text-[11px] font-medium text-[#6B7280]">
                  Pat@Hes.com
                </p>
                <div className="mt-1.5 flex items-center gap-1 overflow-visible">
                  <span className="whitespace-nowrap rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                    Primary
                  </span>
                  <span className="whitespace-nowrap rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                    Bank setup required
                  </span>
                </div>
              </div>
            </div>

            <span className="h-14 w-px bg-zinc-100" />

            <div className="flex items-center gap-1">
              <button
                type="button"
                className="h-9 whitespace-nowrap rounded-[10px] bg-[#1F2937] px-3.5 text-[11px] font-medium text-white transition active:scale-[0.99]"
              >
                Connect Bank
              </button>
              <button
                type="button"
                className="flex h-9 w-4 items-center justify-center text-[#6B7280] transition active:scale-[0.98]"
                aria-label="Tenant actions"
              >
                <span className="text-[17px] font-medium leading-none">⋮</span>
              </button>
            </div>
          </div>
        </article>
      </section>

      <div className="mt-6 space-y-6">
        <MobileHomeSection
          title="Notes"
          count={3}
          action={
            <button className="text-[12px] font-semibold text-[#B9476D]">
              + Add
            </button>
          }
          onViewAll={() => undefined}
          viewAllLabel="View all"
        >
          <article className="rounded-2xl border border-[#D4E9FF] bg-[#EFF7FF] px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold leading-5 text-[#111827]">
                  Shared Note Test - Jashwanth
                </p>
                <p className="mt-3 text-[12px] font-medium text-[#6B7280]">
                  Jun 2, 2026
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[#DCEEFF] px-2.5 py-1 text-[10px] font-semibold leading-none text-[#1D5F9F]">
                Shared Note
              </span>
            </div>
          </article>

          <article className="rounded-2xl border border-[#FFE1A8] bg-[#FFF8EA] px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold leading-5 text-[#111827]">
                  test
                </p>
                <p className="mt-3 text-[12px] font-medium text-[#6B7280]">
                  Jun 2, 2026
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[#FFE8B8] px-2.5 py-1 text-[10px] font-semibold leading-none text-[#8A5A00]">
                Private Note
              </span>
            </div>
          </article>
        </MobileHomeSection>

        <MobileHomeSection
          title="Property Documents"
          count={1}
          action={
            <button className="text-[12px] font-semibold text-[#B9476D]">
              Upload
            </button>
          }
          onViewAll={() => undefined}
          viewAllLabel="View all"
        >
          <article className="rounded-2xl border border-zinc-100 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3F4F6] text-[10px] font-semibold uppercase text-zinc-500">
                FILE
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-[#050B1F]">
                  avenueboard-payment-history.csv
                </p>
                <p className="mt-1 text-[12px] font-medium text-[#6B7280]">
                  Jul 2, 2026 · 832 B
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-end gap-3 text-[13px] font-medium text-zinc-600">
              <button type="button">View</button>
              <span className="text-zinc-300">/</span>
              <button type="button" className="inline-flex items-center gap-1">
                <Download size={16} />
                Download
              </button>
            </div>
          </article>
        </MobileHomeSection>

        <MobileHomeSection
          title="Recent Activity"
          count={5}
          onViewAll={() => undefined}
          viewAllLabel="View more activity"
        >
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            {[
              {
                title: "Property updated",
                description: "Wind Energy details were updated.",
                date: "Jun 30, 2026",
                Icon: Home,
              },
              {
                title: "Document uploaded",
                description: "authBG.png",
                date: "Jun 30, 2026",
                Icon: FileText,
              },
              {
                title: "Bank setup pending",
                description: "Connect your bank account to receive payouts.",
                date: "Jun 29, 2026",
                Icon: DollarSign,
              },
              {
                title: "Lease updated",
                description: "Lease details were updated.",
                date: "Jun 29, 2026",
                Icon: CheckCircle2,
              },
              {
                title: "Tenant added",
                description: "Patrik Hester was added as a tenant.",
                date: "Jun 28, 2026",
                Icon: UserPlus,
              },
            ].map(({ title, description, date, Icon }, index) => (
              <button
                key={title}
                type="button"
                className={`flex min-h-[72px] w-full items-center gap-3 px-4 py-3 text-left transition active:bg-zinc-50 ${
                  index === 0 ? "" : "border-t border-zinc-100"
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-[#F3F4F6] text-[#0F172A]">
                  <Icon className="h-4 w-4" strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium tracking-[-0.025em] text-[#111827]">
                    {title}
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] font-medium text-[#6B7280]">
                    {description}
                  </span>
                </span>
                <span className="ml-3 shrink-0 self-start pt-1 text-right text-[12px] font-medium text-[#6B7280]">
                  {date}
                </span>
              </button>
            ))}
          </div>
        </MobileHomeSection>
      </div>
    </div>
  );
}

function LandlordAvaTab({
  messages,
  onMessagesChange,
}: {
  messages: MobileAvaMessage[];
  onMessagesChange: (messages: MobileAvaMessage[]) => void;
}) {
  const promptChips = [
    "Summarize my properties",
    "Which tenant needs attention?",
    "Help me understand rent collection",
    "Create a support request",
  ];

  async function sendLandlordAvaMessage(messageText: string) {
    const trimmed = messageText.trim();
    if (!trimmed) return;

    const userMessage: MobileAvaMessage = {
      id: `landlord-mobile-user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    onMessagesChange([
      ...messages,
      userMessage,
      {
        id: `landlord-mobile-ava-${Date.now()}`,
        role: "assistant",
        content:
          "I can help with landlord workflows here soon. For now, this preview keeps the Ava experience ready for property, tenant, and rent collection support.",
      },
    ]);
  }

  return (
    <AvaChatPanel
      className="min-h-[calc(100vh-170px)]"
      messages={messages}
      prompts={promptChips}
      onSend={sendLandlordAvaMessage}
    />
  );
}

function LandlordRentTab() {
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {landlordMobileRentProperties.map((property) => {
        const expanded = expandedPropertyId === property.id;
        return (
          <section
            key={property.id}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"
          >
            <button
              type="button"
              onClick={() => setExpandedPropertyId(expanded ? null : property.id)}
              className="w-full px-4 py-4 text-left active:bg-zinc-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-[17px] font-semibold tracking-[-0.045em] text-[#050B1F]">
                    {property.name}
                  </h2>
                  <p className="mt-1 truncate text-[12px] font-medium text-zinc-500">
                    {property.address}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    property.bankStatus === "Payout connected"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-orange-50 text-orange-600"
                  }`}
                >
                  {property.bankStatus}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                    Monthly Rent
                  </p>
                  <p className="mt-1 text-[22px] font-semibold leading-none tracking-[-0.07em] text-[#050B1F]">
                    {property.rent}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                    Status
                  </p>
                  <p className="mt-1 text-[13px] font-semibold leading-5 text-[#0F172A]">
                    {property.status}
                  </p>
                  <p className="mt-0.5 text-[12px] font-medium text-zinc-500">
                    {property.nextDue}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end">
                <span className="text-[12px] font-semibold text-[#0F172A]">
                  {expanded ? "Hide details ↑" : "View details ↓"}
                </span>
              </div>
            </button>

            {expanded ? (
              <div className="border-t border-zinc-100 px-4 pb-4 pt-5">
                <LandlordRentDetail homeData={property.homeData} />
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function LandlordRentDetail({ homeData }: { homeData: MobileHomeData }) {
  const rows = buildMobilePaymentRows(homeData);
  const progress = buildMobilePaymentSummary(rows);
  const nextStatement =
    rows.find((row) => row.status === "upcoming") ||
    rows.find((row) => row.status === "late");

  return (
    <div className="space-y-5">
      <LandlordRentStatusCard homeData={homeData} />

      <section>
        <div className="grid grid-cols-2 gap-3">
          <RentSummaryTile
            label="Next Statement"
            value={nextStatement?.label || "Not available"}
          />
          <RentSummaryTile label="Progress" value={`${progress.percent}% complete`} />
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
              <EmptyMobileText text="Payment history will appear after the lease schedule is ready." />
            </div>
          ) : (
            rows.map((row) => <MobilePaymentHistoryRow key={row.id} row={row} />)
          )}
        </div>
      </section>
    </div>
  );
}

function LandlordRentStatusCard({ homeData }: { homeData: MobileHomeData }) {
  const summary = getMobileRentSummary(homeData);
  const method = getDefaultPaymentMethod(homeData.paymentMethods);
  const methodLabel = method?.last4
    ? `${formatBrand(method.brand)} ending in ${method.last4}`
    : "No saved payout method";

  return (
    <section>
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
          Payout Ready
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

      <div className="mt-5">
        <button
          type="button"
          className="flex h-12 w-full items-center justify-center rounded-xl bg-[#0F172A] text-[13px] font-semibold text-white active:scale-[0.99]"
        >
          Manage Payout
        </button>
      </div>
    </section>
  );
}

function LandlordReportsHeader({
  activeSection,
  onSectionChange,
}: {
  activeSection: "reports" | "expenses";
  onSectionChange: (section: "reports" | "expenses") => void;
}) {
  const tabs: Array<{ id: "reports" | "expenses"; label: string }> = [
    { id: "reports", label: "Reports" },
    { id: "expenses", label: "Expenses" },
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
              onClick={() => onSectionChange(tab.id)}
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

function LandlordReportsTab({
  activeSection,
}: {
  activeSection: "reports" | "expenses";
}) {
  if (activeSection === "expenses") {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white px-5 py-6">
        <h2 className="text-[18px] font-semibold tracking-[-0.045em] text-[#050B1F]">
          Expenses
        </h2>
        <p className="mt-2 text-[13px] font-medium leading-5 text-zinc-500">
          Mobile expense management will appear here soon.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[18px] font-semibold tracking-[-0.045em] text-[#050B1F]">
            Financial Overview
          </h2>
          <div className="flex rounded-full border border-zinc-200 bg-white p-0.5">
            {["This Month", "YTD", "Custom"].map((label, index) => (
              <button
                key={label}
                type="button"
                className={`h-8 rounded-full px-3 text-[10px] font-semibold transition ${
                  index === 0
                    ? "bg-[#0F172A] text-white"
                    : "text-zinc-500 active:bg-zinc-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Rent Collected YTD
            </p>
            <p className="mt-2 text-[32px] font-semibold leading-none tracking-[-0.08em] text-[#050B1F]">
              $186,450
            </p>
            <p className="mt-2 text-[13px] font-medium text-[#42526B]">
              of $245,000 expected
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full w-[76%] rounded-full bg-emerald-500" />
            </div>
            <div className="mt-3 flex items-center justify-between text-[12px] font-semibold">
              <span className="text-emerald-600">76% collected</span>
              <span className="text-[#42526B]">$58,550 remaining</span>
            </div>
          </div>

          <div className="h-px bg-zinc-100" />

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Total Expenses YTD
            </p>
            <p className="mt-2 text-[32px] font-semibold leading-none tracking-[-0.08em] text-[#050B1F]">
              $48,230
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-xl bg-red-50 px-2.5 py-1.5 text-[12px] font-semibold text-red-500">
                ↑ 12.4%
              </span>
              <span className="text-[12px] font-semibold text-[#42526B]">
                vs last year
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-semibold tracking-[-0.045em] text-[#050B1F]">
              Expense Breakdown
            </h2>
            <p className="mt-1 text-[13px] font-medium text-[#6B7280]">
              See where your money is going monthly.
            </p>
          </div>
          <button
            type="button"
            className="h-9 shrink-0 rounded-xl bg-[#0F172A] px-3 text-[12px] font-semibold text-white active:scale-[0.99]"
          >
            + Add Expense
          </button>
        </div>

        <div className="mt-5 flex flex-col items-center">
          <div
            className="relative h-48 w-48 rounded-full"
            style={{
              background:
                "conic-gradient(#17477F 0deg 181deg, #61C7C1 181deg 242deg, #8DBEF2 242deg 283deg, #A879E5 283deg 314deg, #F4B13D 314deg 338deg, #A7D77B 338deg 354deg, #CBD0D8 354deg 360deg)",
            }}
          >
            <div className="absolute inset-[38px] flex flex-col items-center justify-center rounded-full bg-white text-center">
              <span className="text-[12px] font-medium text-[#6B7280]">
                Total Expenses
              </span>
              <span className="mt-1 text-[26px] font-semibold tracking-[-0.07em] text-[#050B1F]">
                $2,480
              </span>
              <span className="mt-1 text-[12px] font-medium text-[#6B7280]">
                May 2026
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          {[
            ["Mortgage", "$1,250", "#17477F"],
            ["Property Tax", "$420", "#61C7C1"],
            ["Insurance", "$280", "#8DBEF2"],
            ["Maintenance", "$210", "#A879E5"],
            ["HOA / PM", "$160", "#F4B13D"],
            ["Utilities", "$110", "#A7D77B"],
            ["Other", "$50", "#CBD0D8"],
          ].map(([label, value, color]) => (
            <div key={label} className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-[4px]"
                  style={{ backgroundColor: color }}
                />
                <span className="truncate text-[13px] font-semibold text-[#111827]">
                  {label}
                </span>
              </div>
              <span className="shrink-0 text-[13px] font-semibold text-[#111827]">
                {value}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function isMobileValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function isMobileValidOptionalPhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function createMobileSubmissionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `mobile-add-property-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function getMobileNextFirstOfMonthDate() {
  const today = new Date();
  const nextFirst = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  return `${nextFirst.getFullYear()}-${String(
    nextFirst.getMonth() + 1
  ).padStart(2, "0")}-${String(nextFirst.getDate()).padStart(2, "0")}`;
}

function isMobileNewLeaseStartAllowed(value: string) {
  const start = parseLocalDate(value);
  if (!start) return false;

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const earliestAllowed = new Date(todayStart);
  earliestAllowed.setDate(todayStart.getDate() - 15);

  return start >= earliestAllowed;
}

async function createOrReuseMobileProperty({
  profileId,
  submissionId,
  propertyForm,
  existingPropertyId,
}: {
  profileId: string;
  submissionId: string;
  propertyForm: {
    streetAddress: string;
    city: string;
    stateName: string;
    zip: string;
    propertyType: string;
    units: string;
    unitName: string;
    propertyLabel: string;
  };
  existingPropertyId?: string;
}) {
  if (existingPropertyId) {
    const { data, error } = await supabase
      .from("properties")
      .select("id")
      .eq("id", existingPropertyId)
      .eq("owner_profile_id", profileId)
      .single();

    if (error) throw error;
    return data as { id: string };
  }

  const { data: existing, error: existingError } = await supabase
    .from("properties")
    .select("id")
    .eq("owner_profile_id", profileId)
    .eq("creation_submission_id", submissionId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing as { id: string };

  const { data, error } = await supabase
    .from("properties")
    .insert({
      owner_profile_id: profileId,
      creation_submission_id: submissionId,
      street_address: propertyForm.streetAddress.trim(),
      city: propertyForm.city.trim(),
      state_name: propertyForm.stateName.trim(),
      zip: propertyForm.zip.trim(),
      property_type: propertyForm.propertyType,
      units: propertyForm.units,
      unit_name: propertyForm.unitName.trim() || null,
      property_label: propertyForm.propertyLabel.trim(),
      bank_status: "pending",
      status: "active",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data as { id: string };
}

async function createOrReuseMobileLease({
  propertyId,
  leaseForm,
  leaseSetupType,
  paymentTrackingStartDate,
  existingLeaseId,
}: {
  propertyId: string;
  leaseForm: {
    startDate: string;
    endDate: string;
    monthlyRent: string;
    securityDeposit: string;
    rentDueDay: string;
  };
  leaseSetupType: "new" | "existing";
  paymentTrackingStartDate: string;
  existingLeaseId?: string;
}) {
  if (existingLeaseId) {
    const { data, error } = await supabase
      .from("leases")
      .select("id")
      .eq("id", existingLeaseId)
      .eq("property_id", propertyId)
      .single();

    if (error) throw error;
    return data as { id: string };
  }

  const { data: existingLeases, error: existingLeaseError } = await supabase
    .from("leases")
    .select("id")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (existingLeaseError) throw existingLeaseError;
  if (existingLeases?.[0]) return existingLeases[0] as { id: string };

  const { data, error } = await supabase
    .from("leases")
    .insert({
      property_id: propertyId,
      start_date: leaseForm.startDate,
      end_date: leaseForm.endDate,
      monthly_rent: Number(leaseForm.monthlyRent),
      security_deposit: leaseSetupType === "new" && leaseForm.securityDeposit
        ? Number(leaseForm.securityDeposit)
        : null,
      rent_due_day: leaseForm.rentDueDay,
      lease_setup_type: leaseSetupType,
      payment_tracking_start_date:
        leaseSetupType === "existing" ? paymentTrackingStartDate : null,
      lease_status: "active",
      payment_status: "bank_pending",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data as { id: string };
}

async function ensureMobileStarterPropertyNotes({
  propertyId,
  leaseId,
  profileId,
}: {
  propertyId: string;
  leaseId: string;
  profileId: string;
}) {
  const { data: existingNotes, error: existingNotesError } = await supabase
    .from("property_notes")
    .select("id")
    .eq("property_id", propertyId)
    .limit(1);

  if (existingNotesError) throw existingNotesError;
  if (existingNotes?.length) return;

  const now = Date.now();
  const { error } = await supabase.from("property_notes").insert([
    {
      property_id: propertyId,
      lease_id: leaseId,
      profile_id: profileId,
      note_type: "shared",
      text: "Welcome to AvenueBoard\n\nUse shared notes to communicate important information with your resident, such as move-in instructions, maintenance updates, reminders, or lease-related notices.",
      created_by_role: "landlord",
      created_at: new Date(now).toISOString(),
    },
    {
      property_id: propertyId,
      lease_id: leaseId,
      profile_id: profileId,
      note_type: "private",
      text: "Save reminders, updates, and important property notes.\n\nGetting Started • AvenueBoard",
      created_by_role: "landlord",
      created_at: new Date(now - 1000).toISOString(),
    },
  ]);

  if (error) throw error;
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

function LandlordPerksHeader() {
  return (
    <div className="sticky top-0 z-20 bg-white">
      <div className="grid grid-cols-2 px-5 pt-[calc(env(safe-area-inset-top)+14px)]">
        <div className="relative flex h-12 items-center justify-center whitespace-nowrap text-[14px] font-semibold text-[#0F172A]">
          Avenue Perks
          <span className="absolute bottom-0 left-0 h-[2px] w-full bg-[#0F172A]" />
        </div>
        <div aria-hidden="true" className="h-12" />
      </div>
      <div className="h-px bg-zinc-200" />
    </div>
  );
}

function LandlordPerksTab({ onViewAllDeals }: { onViewAllDeals: () => void }) {
  return (
    <PerksTab activeSection="avenue-perks" onViewAllDeals={onViewAllDeals} />
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

function LandlordPropertySelectorSheet({
  properties,
  selectedPropertyId,
  onSelect,
  onClose,
}: {
  properties: MobileLandlordProperty[];
  selectedPropertyId: string | null;
  onSelect: (property: MobileLandlordProperty) => void;
  onClose: () => void;
}) {
  return (
    <MobileSheet title="Landlord properties" count={properties.length} onClose={onClose}>
      <div className="space-y-3">
        {properties.map((property) => {
          const active = property.id === selectedPropertyId;

          return (
            <button
              key={property.id}
              type="button"
              onClick={() => onSelect(property)}
              className={`w-full rounded-2xl border px-4 py-4 text-left transition active:scale-[0.99] ${
                active
                  ? "border-[#0F172A] bg-[#F8FAFC]"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-[#050B1F]">
                    {property.propertyName}
                  </p>
                  <p className="mt-1 text-[12px] font-medium leading-5 text-zinc-500">
                    {property.propertyAddress || "Not available"}
                  </p>
                  <p className="mt-2 text-[11px] font-semibold text-zinc-400">
                    Unit {property.unitName || "Not available"}
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
  interactive = true,
  trailingAction,
  multipleProperties,
  onOpenContext,
}: {
  address: string;
  label?: string;
  value?: string;
  singleLabel?: boolean;
  interactive?: boolean;
  trailingAction?: ReactNode;
  multipleProperties: boolean;
  onOpenContext: () => void;
}) {
  const displayAddress =
    value || (address && address !== "Resident workspace" ? address : "Rent workspace");
  const propertySwitcherEnabled = multipleProperties && !value;
  const rowContent = (
    <>
      <span className="shrink-0 font-semibold text-[#0F172A]">{label}</span>
      <span className="h-4 w-px shrink-0 bg-zinc-200" />
      <span className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-medium text-zinc-500 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {displayAddress}
      </span>
      {propertySwitcherEnabled ? (
        <span className="shrink-0 text-[12px] font-semibold text-zinc-400">Switch</span>
      ) : null}
    </>
  );

  if (singleLabel) {
    return (
      <div className="sticky top-0 z-20 bg-white">
        <div className="flex w-full min-w-0 items-center justify-between gap-3 px-5 py-3 text-left text-[15px]">
          <span className="font-semibold text-[#0F172A]">{label}</span>
          {trailingAction ? <div className="shrink-0">{trailingAction}</div> : null}
        </div>
        <div className="h-px bg-zinc-200" />
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-20 bg-white">
      {interactive ? (
        <button
          type="button"
          onClick={onOpenContext}
          className="flex w-full min-w-0 cursor-pointer items-center gap-3 px-5 py-3 text-left text-[15px] transition active:scale-[0.995]"
          aria-label={propertySwitcherEnabled ? "Switch resident property" : "Open resident and property details"}
        >
          {rowContent}
        </button>
      ) : (
        <div className="flex w-full min-w-0 items-center gap-3 px-5 py-3 text-left text-[15px]">
          {rowContent}
        </div>
      )}
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
  availableWorkspaces,
  currentWorkspace,
  onChangeTab,
  onClose,
  onProfileSaved,
  onSwitchWorkspace,
}: {
  activeTab: MobileAccountDrawerTab;
  context: MobileContext;
  homeData: MobileHomeData;
  availableWorkspaces: MobileWorkspaceRole[];
  currentWorkspace: MobileWorkspaceRole;
  onChangeTab: (tab: MobileAccountDrawerTab) => void;
  onClose: () => void;
  onProfileSaved: (context: MobileContext) => void;
  onSwitchWorkspace: (role: MobileWorkspaceRole) => void;
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

  function handleSwitchWorkspace(role: MobileWorkspaceRole) {
    if (role === currentWorkspace) return;
    onSwitchWorkspace(role);
    onClose();
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
              availableWorkspaces={availableWorkspaces}
              currentWorkspace={currentWorkspace}
              saving={saving}
              status={status}
              onDisplayNameChange={setDisplayName}
              onPhoneChange={setPhone}
              onSave={handleSave}
              onSignOut={handleSignOut}
              onSwitchWorkspace={handleSwitchWorkspace}
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
  availableWorkspaces,
  currentWorkspace,
  saving,
  status,
  onDisplayNameChange,
  onPhoneChange,
  onSave,
  onSignOut,
  onSwitchWorkspace,
}: {
  context: MobileContext;
  displayName: string;
  phone: string;
  availableWorkspaces: MobileWorkspaceRole[];
  currentWorkspace: MobileWorkspaceRole;
  saving: boolean;
  status: string;
  onDisplayNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onSave: () => void;
  onSignOut: () => void;
  onSwitchWorkspace: (role: MobileWorkspaceRole) => void;
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
            {currentWorkspace === "landlord" ? "Landlord profile" : "Resident profile"}
          </p>
          <p className="mt-1 text-[11px] font-medium text-zinc-400">
            Photo upload preview only for now.
          </p>
        </div>
      </section>

      <section className="space-y-2.5">
        <h4 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
          Workspace
        </h4>
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          {availableWorkspaces.map((role, index) => {
            const selected = role === currentWorkspace;
            const singleWorkspace = availableWorkspaces.length === 1;
            return (
              <button
                key={role}
                type="button"
                disabled={selected || singleWorkspace}
                onClick={() => onSwitchWorkspace(role)}
                className={`flex h-12 w-full items-center justify-between px-4 text-[14px] font-semibold transition ${
                  selected
                    ? "bg-[#F8FAFC] text-[#0F172A]"
                    : "bg-white text-zinc-500 active:bg-zinc-50"
                } ${index > 0 ? "border-t border-zinc-100" : ""}`}
              >
                <span>{role === "landlord" ? "Landlord" : "Resident"}</span>
                {selected ? (
                  <CheckCircle2 size={17} className="text-[#2563EB]" />
                ) : null}
              </button>
            );
          })}
        </div>
        {availableWorkspaces.length > 1 ? (
          <p className="text-[12px] font-medium leading-5 text-zinc-400">
            Switch between your AvenueBoard workspaces.
          </p>
        ) : null}
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
  tabs = mobileTabs,
  onTabChange,
}: {
  activeTab: MobileTab;
  tabs?: MobileNavTab[];
  onTabChange: (tab: MobileTab) => void;
}) {
  return (
    <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[440px] -translate-x-1/2 bg-white pb-[max(env(safe-area-inset-bottom),12px)]">
      <nav className="w-full max-w-[440px] border-t border-zinc-200 bg-white px-2 pb-3 pt-2">
        <div className="grid grid-cols-5">
          {tabs.map(({ id, label, Icon }) => {
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
  onLandlordApp,
}: {
  state: MobileState;
  onResidentApp: () => void;
  onLandlordApp: () => void;
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
        text="Open your resident or landlord mobile workspace."
        action={
          <div className="space-y-3">
            <button
              type="button"
              onClick={onResidentApp}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-[#0F172A] text-[14px] font-semibold text-white transition active:scale-[0.99]"
            >
              Resident App
            </button>
            <button
              type="button"
              onClick={onLandlordApp}
              className="flex h-12 w-full items-center justify-center rounded-xl border border-zinc-200 bg-white text-[14px] font-semibold text-[#0F172A] transition active:scale-[0.99]"
            >
              Landlord App
            </button>
          </div>
        }
      />
    );
  }

  return (
    <CenteredPlaceholder
      title="Mobile app"
      text="Choose a mobile workspace to continue."
      action={
        <button
          type="button"
          onClick={onLandlordApp}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-[#0F172A] text-[14px] font-semibold text-white transition active:scale-[0.99]"
        >
          Landlord App
        </button>
      }
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
