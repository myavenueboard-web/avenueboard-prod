"use client";

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Building2, Headset } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type SupportUser = {
  id: string;
  name: string;
  email: string;
  initials: string;
  hasLandlordRole: boolean;
  hasTenantAccess: boolean;
};

type SupportTicket = {
  id: string;
  ticket_number: string | null;
  category: string | null;
  message: string | null;
  status: string | null;
  priority: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type ActiveSupportSection = "faq" | "cases" | "contact";

type CaseFilter = "all" | "open" | "closed";
type CasePriorityId = "standard" | "important" | "time_sensitive";

type FaqTopic = {
  id: string;
  name: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  questions: {
    question: string;
    answer: string;
  }[];
};

const faqTopics: FaqTopic[] = [
  {
    id: "landlord_workspace",
    name: "Landlord Portal",
    eyebrow: "LANDLORD PORTAL",
    title: "Manage your properties with ease",
    subtitle:
      "Learn how to add properties, invite tenants, manage documents and organize daily rental operations.",
    questions: [
      {
        question: "How do I create my first property?",
        answer:
          "From the landlord dashboard, choose Add Property and enter the basic property details, address, rent amount, lease information and tenant information where available. Once saved, AvenueBoard creates a property workspace that keeps the tenant details, lease status, documents, notes, activity and payment setup organized in one place.",
      },
      {
        question: "How do I invite a tenant?",
        answer:
          "After a property and lease are set up, use the tenant management area to invite the tenant by email. The tenant receives an invitation, creates or signs into an AvenueBoard account, and accepts access to the property. Once accepted, the tenant can use their tenant portal for the connected rental workspace.",
      },
      {
        question: "Can I manage more than one tenant for a property?",
        answer:
          "Yes. AvenueBoard supports multiple tenant access records for a property or lease. The property dashboard stays clean by showing the primary tenant first, while additional tenants can be viewed or managed through the tenant controls for that property.",
      },
      {
        question: "Where can I manage property notes and documents?",
        answer:
          "Open the individual property workspace. Landlords can add property notes, mark notes as private or shared when supported, upload property documents, and review recent activity for that property. Shared notes and documents can appear in the tenant portal when they are connected to the tenant's property access.",
      },
      {
        question: "How do I remove or update landlord portal access?",
        answer:
          "If your account has both tenant and landlord access, Profile Settings can allow you to remove the landlord portal without deleting your full AvenueBoard account. AvenueBoard blocks removal when it would leave you without another active portal or when active owned properties would be orphaned. You can create a landlord portal again later if needed.",
      },
    ],
  },
  {
    id: "tenant_workspace",
    name: "Tenant Portal",
    eyebrow: "TENANT PORTAL",
    title: "Stay organized as a renter",
    subtitle:
      "Learn how tenants access rent details, lease status, shared notes, documents and property contact information.",
    questions: [
      {
        question: "What can tenants see in their portal?",
        answer:
          "Tenants can view the rental workspace connected to an accepted invitation. The tenant portal can show rent due, payment progress, lease status, shared notes, property documents, recent activity and property contact information. Some tenant benefits, such as Avenue Perks or credit-building opportunities, may appear as planned or future-facing features unless they are enabled for that account.",
      },
      {
        question: "How do I access my tenant dashboard?",
        answer:
          "Use the email address your landlord invited, then sign in or create an AvenueBoard account. After accepting the invitation, AvenueBoard connects your account to the property or lease and opens the tenant portal. If you have access to more than one rental workspace, the tenant portal can let you select the correct lease or property.",
      },
      {
        question: "Where can I find shared notes and documents?",
        answer:
          "Shared notes and property documents appear inside the tenant dashboard sections for the selected rental workspace. If you do not see a document or note you expected, confirm you are viewing the correct property or lease and ask your landlord whether it has been shared with your tenant access.",
      },
      {
        question: "How do I contact my landlord?",
        answer:
          "The tenant dashboard includes a Property Contact card with the owner or property contact details available for that rental workspace. If an email address is available, you can contact the property contact from there. For AvenueBoard account or platform issues, use Ava or open a support case instead.",
      },
      {
        question: "What happens if I am invited to AvenueBoard by my landlord?",
        answer:
          "You will receive an invitation tied to a specific property or lease. After accepting, AvenueBoard activates your tenant workspace for that rental. Your landlord may see that the invite was accepted, and you can begin viewing the information your landlord has made available through AvenueBoard.",
      },
    ],
  },
  {
    id: "payments_autopay",
    name: "Payments & AutoPay",
    eyebrow: "PAYMENTS & AUTOPAY",
    title: "Understand rent payments and AutoPay",
    subtitle:
      "Learn how rent cycles, payment status, Stripe setup and upcoming payment features are handled.",
    questions: [
      {
        question: "When is rent considered due in AvenueBoard?",
        answer:
          "For the AvenueBoard MVP, rent is due on the 1st of each month. Payment progress and landlord payout history are generated from monthly rent cycles, then shown as paid, upcoming, late or future based on the due date and available payment status.",
      },
      {
        question: "What happens if my lease starts in the middle of a month?",
        answer:
          "If the lease starts on the 1st, the first rent cycle starts that same month. If the lease starts after the 1st, the first AvenueBoard rent cycle starts on the 1st of the next month. For example, a May 31 lease start should begin with a June 1 rent cycle, not a late May cycle.",
      },
      {
        question: "How will Pay Now work?",
        answer:
          "Pay Now is being prepared as part of AvenueBoard's payment workflow. Once payment features are enabled for a property, tenants should be able to start a rent payment from the tenant portal and landlords should be able to track the payment status from the property workspace. Availability may depend on Stripe setup and production payment readiness.",
      },
      {
        question: "How will AutoPay work?",
        answer:
          "AutoPay is intended to help tenants schedule recurring rent payments when payment features are live and enabled for the property. Until AutoPay is fully available in production, AvenueBoard may show setup or payment status information without processing live recurring payments.",
      },
      {
        question: "Are payment methods and bank details handled securely?",
        answer:
          "AvenueBoard uses Stripe Connect for landlord payout and bank setup workflows. Sensitive payment and bank details should be handled by Stripe's secure payment infrastructure rather than being stored directly in AvenueBoard's client interface. Never send bank information through notes, support messages or email.",
      },
    ],
  },
  {
    id: "leases_documents",
    name: "Leases & Documents",
    eyebrow: "LEASES & DOCUMENTS",
    title: "Find leases and property documents",
    subtitle:
      "Learn how lease details, uploaded files and tenant document access work in AvenueBoard.",
    questions: [
      {
        question: "Where can I view lease details?",
        answer:
          "Landlords can review lease information inside the property workspace. Tenants can see lease status and related lease information in the tenant portal after they accept access to the property or lease. The exact details shown depend on what has been entered and enabled for that workspace.",
      },
      {
        question: "Can landlords upload documents?",
        answer:
          "Yes. Landlords can upload property documents from the property workspace. Documents can be used to organize lease files, notices, inspection records or other property-related materials. Use the document controls in the property workspace to view, download or delete files when those actions are available.",
      },
      {
        question: "Can tenants view shared property documents?",
        answer:
          "Tenants can view documents that are available to their tenant access for the selected property or lease. If a document should be tenant-facing but does not appear, the landlord should confirm the document is connected to the correct property and available to the tenant workspace.",
      },
      {
        question: "What file types can be uploaded?",
        answer:
          "AvenueBoard is designed for common property document formats such as PDFs and standard image files. If a file does not upload, check the file type and size, then try again. For sensitive documents, confirm the file belongs in the property workspace before uploading.",
      },
      {
        question: "What happens when a lease ends?",
        answer:
          "A lease end date helps AvenueBoard display lease status and upcoming lease context. Ending a lease does not automatically delete property records, tenant access, notes or documents. Landlords should review the property workspace and update tenant or lease information as needed.",
      },
    ],
  },
  {
    id: "account_profile",
    name: "Account & Profile",
    eyebrow: "ACCOUNT & PROFILE",
    title: "Manage your AvenueBoard account",
    subtitle:
      "Learn how portal switching, profile access and account roles work in AvenueBoard.",
    questions: [
      {
        question: "How do I switch between landlord and tenant portals?",
        answer:
          "If your account has both landlord and tenant access, the profile menu shows the direct switch action for the other portal. From the tenant portal, you can switch to the landlord dashboard. From the landlord dashboard, you can switch to the tenant dashboard when tenant access exists.",
      },
      {
        question: "How do I create a landlord portal from a tenant account?",
        answer:
          "If you are signed in as a tenant and do not already have landlord access, the profile menu can show Create landlord portal. AvenueBoard asks for confirmation first because a landlord portal is only needed when you manage or rent out a property. After confirmation, landlord access is enabled and you can go to the landlord dashboard.",
      },
      {
        question: "Can I remove landlord portal access?",
        answer:
          "Yes, if your account also has another active portal such as tenant access. Removing the landlord portal removes the landlord role only; it does not delete your AvenueBoard account, tenant portal, tenant access or auth user. AvenueBoard may block removal if you own active properties that would lose a valid landlord owner.",
      },
      {
        question: "How do I update my profile information?",
        answer:
          "Use the profile or settings area available from your dashboard menu. Support case updates are sent to the email address on your AvenueBoard account, so make sure your account email is accurate before opening a case.",
      },
      {
        question: "How does AvenueBoard decide which portal I see?",
        answer:
          "AvenueBoard uses your account roles and accepted tenant access to determine which portals are available. Landlord users can access the landlord dashboard. Tenants with accepted invitations can access the tenant portal. Dual-role users can switch directly between available portals.",
      },
    ],
  },
  {
    id: "maintenance",
    name: "Maintenance",
    eyebrow: "MAINTENANCE",
    title: "Know where to get property help",
    subtitle:
      "Learn what AvenueBoard currently supports for property notes, requests and urgent property issues.",
    questions: [
      {
        question: "Can I submit maintenance requests?",
        answer:
          "A full maintenance request workflow is planned, but AvenueBoard currently focuses on rental workspace organization, notes, documents, payment readiness, tenant access and support cases. Tenants should contact their landlord or property contact directly for property maintenance needs unless a dedicated workflow is visible in their portal.",
      },
      {
        question: "Can landlords track maintenance notes?",
        answer:
          "Landlords can use property notes to keep internal records or share relevant updates with tenants when supported. Notes can help document property context, but they are not a replacement for a dedicated maintenance management system or emergency communication process.",
      },
      {
        question: "Are maintenance workflows fully automated?",
        answer:
          "Not yet. Automated maintenance workflows, vendor coordination and repair tracking are planned future areas, but they should not be treated as fully live unless they appear in your AvenueBoard workspace. For now, use notes, documents and direct communication for property maintenance coordination.",
      },
      {
        question: "How should tenants report urgent property issues?",
        answer:
          "Urgent safety, habitability or emergency issues should be reported directly to the landlord, property contact, emergency services or the appropriate local service provider. AvenueBoard support can help with account or platform issues, but it should not be used as the primary emergency channel.",
      },
    ],
  },
  {
    id: "reports_statements",
    name: "Reports & Statements",
    eyebrow: "REPORTS & STATEMENTS",
    title: "Review records and history",
    subtitle:
      "Learn what property history, payment visibility and reporting tools are currently available.",
    questions: [
      {
        question: "What reports are available for landlords?",
        answer:
          "Landlords can review property-level activity, notes, documents, tenant status, lease context and payout/payment visibility where available. AvenueBoard is still building deeper reporting, so advanced portfolio analytics and formal statements may be limited or planned rather than fully live.",
      },
      {
        question: "Can I track rent collection history?",
        answer:
          "The landlord property workspace includes payout performance and payment history views based on the property's rent cycles and available payment data. As payment processing moves from sandbox readiness to live availability, these views are intended to provide clearer month-by-month rent collection tracking.",
      },
      {
        question: "Can I view payment status by month?",
        answer:
          "Yes. AvenueBoard displays monthly rent cycles with statuses such as paid, upcoming, late or future when payment data and lease dates are available. The tenant payment progress and landlord payout performance views should follow the same rent cycle logic.",
      },
      {
        question: "Are tax documents or 1099 reports available?",
        answer:
          "Tax documents and 1099-style reporting are not part of the current MVP experience. AvenueBoard may expand reporting over time, but landlords should continue using their existing tax and accounting processes and consult qualified professionals for tax guidance.",
      },
      {
        question: "Can I export property data?",
        answer:
          "Full export tools are planned, but may not be available in the current workspace. If you need specific records, use the visible property, document, activity and payment views, or open a support case so the AvenueBoard team can help review what is available.",
      },
    ],
  },
  {
    id: "general",
    name: "General",
    eyebrow: "GENERAL",
    title: "Get to know AvenueBoard",
    subtitle:
      "Learn what AvenueBoard is, who it is built for and how to get help.",
    questions: [
      {
        question: "What is AvenueBoard?",
        answer:
          "AvenueBoard is a rental workspace for self-managing landlords and tenants. It helps organize properties, tenants, lease information, documents, notes, payment readiness, activity and support in a clean shared experience.",
      },
      {
        question: "Who can use AvenueBoard?",
        answer:
          "AvenueBoard is built for landlords who manage their own rental properties and tenants who are invited into a rental workspace by their landlord. It is designed to make rental operations feel more organized without the complexity of traditional property management software.",
      },
      {
        question: "Is AvenueBoard free for landlords?",
        answer:
          "The landlord portal is currently free to use. When payment features are fully live, tenant-facing payment services may include a tenant service fee. AvenueBoard will make fees clear before users complete payment-related actions.",
      },
      {
        question: "What is Ava?",
        answer:
          "Ava is AvenueBoard's assistant for product help, navigation guidance and support triage. Ava can answer AvenueBoard-focused questions, help with common account, lease, document or payment setup topics, and help create a support case when additional review is needed.",
      },
      {
        question: "How do I open a support case?",
        answer:
          "Open the My Cases tab in the Help Center and choose Create Case or Open Case. Add a priority, subject and description so the support team has enough context. Signed-in users can track support requests from My Cases, and follow-up communication is sent to the email on the account.",
      },
    ],
  },
];

const supportTabs: { id: ActiveSupportSection; label: string }[] = [
  { id: "faq", label: "FAQ" },
  { id: "cases", label: "My Cases" },
  { id: "contact", label: "Contact Us" },
];

const caseTableGridClass =
  "grid-cols-[minmax(96px,0.8fr)_minmax(220px,1.5fr)_minmax(120px,0.7fr)_minmax(150px,0.95fr)_minmax(112px,112px)]";

const casePriorities: {
  id: CasePriorityId;
  label: string;
  description: string;
  apiPriority: "normal" | "high" | "urgent";
}[] = [
  {
    id: "standard",
    label: "Standard",
    description: "General questions or product feedback.",
    apiPriority: "normal",
  },
  {
    id: "important",
    label: "Important",
    description: "Setup, account, lease, or workflow issue.",
    apiPriority: "high",
  },
  {
    id: "time_sensitive",
    label: "Time-sensitive",
    description: "Payment, rent, or urgent access issue.",
    apiPriority: "urgent",
  },
];

function getInitialSupportSection(tabParam: string | null): ActiveSupportSection {
  if (tabParam === "my-cases") return "cases";
  if (tabParam === "contact-us") return "contact";
  return "faq";
}

export default function SupportCenterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTabParam = searchParams.get("tab");

  const [user, setUser] = useState<SupportUser | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingCases, setLoadingCases] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const [createCaseOpen, setCreateCaseOpen] = useState(false);
  const [creatingCase, setCreatingCase] = useState(false);
  const [closingCaseId, setClosingCaseId] = useState("");
  const [createCaseError, setCreateCaseError] = useState("");
  const [casePriority, setCasePriority] = useState<CasePriorityId>("standard");
  const [caseSubjectInput, setCaseSubjectInput] = useState("");
  const [caseDescription, setCaseDescription] = useState("");
  const [activeSection, setActiveSection] = useState<ActiveSupportSection>(() =>
    getInitialSupportSection(activeTabParam)
  );
  const [activeFaqTopicId, setActiveFaqTopicId] = useState(faqTopics[0].id);
  const [expandedFaqQuestion, setExpandedFaqQuestion] = useState(0);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadSupportUser() {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          setUser(null);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, display_name, email")
          .eq("user_id", authUser.id)
          .maybeSingle();

        const profileId = profile?.id || "";
        const [{ data: roles }, { data: tenantAccess }] = await Promise.all([
          profileId
            ? supabase
                .from("user_roles")
                .select("role")
                .eq("profile_id", profileId)
            : Promise.resolve({ data: [] }),
          profileId
            ? supabase
                .from("tenant_access")
                .select("id")
                .eq("tenant_profile_id", profileId)
                .eq("invite_status", "accepted")
                .limit(1)
            : Promise.resolve({ data: [] }),
        ]);

        const name =
          profile?.display_name ||
          authUser.user_metadata?.full_name ||
          authUser.email?.split("@")[0] ||
          "User";
        const email = profile?.email || authUser.email || "";

        setUser({
          id: authUser.id,
          name,
          email,
          initials: getInitials(name || email),
          hasLandlordRole: (roles || []).some((item) => item.role === "landlord"),
          hasTenantAccess: (tenantAccess || []).length > 0,
        });
      } finally {
        setLoadingUser(false);
      }
    }

    loadSupportUser();
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    async function loadCases() {
      if (!user) {
        setTickets([]);
        return;
      }

      setLoadingCases(true);
      try {
        const { data, error } = await supabase
          .from("support_tickets")
          .select(
            "id, ticket_number, category, message, status, priority, metadata, created_at, updated_at"
          )
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(8);

        if (error) {
          console.error("Support cases load error:", error);
          setTickets([]);
          return;
        }

        setTickets((data || []) as SupportTicket[]);
      } finally {
        setLoadingCases(false);
      }
    }

    loadCases();
  }, [user]);

  function handleCasesClick() {
    setActiveSection("cases");
  }

  function handleCreateCaseClick() {
    if (!user) {
      setActiveSection("cases");
      return;
    }

    setCreateCaseError("");
    setCreateCaseOpen(true);
  }

  function handleFaqSupportCaseClick() {
    setActiveSection("cases");
    handleCreateCaseClick();
  }

  async function handleSubmitCase() {
    if (!user) {
      setSignInModalOpen(true);
      return;
    }

    const subject = caseSubjectInput.trim();
    const description = caseDescription.trim();
    const communicationEmail = user.email.trim();

    if (!subject || !description) {
      setCreateCaseError("Add a subject and description before submitting.");
      return;
    }

    if (!communicationEmail) {
      setCreateCaseError("Please update your account email before creating a case.");
      return;
    }

    setCreatingCase(true);
    setCreateCaseError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setCreateCaseError("Please sign in again before creating a case.");
        return;
      }

      const message = `${subject}\n\n${description}`;
      const selectedPriority =
        casePriorities.find((item) => item.id === casePriority) ||
        casePriorities[0];
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message,
          priority: selectedPriority.apiPriority,
          metadata: {
            created_from: "support_center",
            support_center_priority: selectedPriority.label,
            communication_email: communicationEmail,
            original_user_message: description,
            confirmed_issue_summary: subject,
          },
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok || !result.ticket) {
        setCreateCaseError(
          result?.error || "Unable to create your case right now."
        );
        return;
      }

      const now = new Date().toISOString();
      setTickets((current) => [
        {
          id: result.ticket.id,
          ticket_number: result.ticket.ticket_number,
          category: result.ticket.category || "general_support",
          message,
          status: result.ticket.status || "open",
          priority: result.ticket.priority || selectedPriority.apiPriority,
          metadata: result.ticket.metadata || {
            created_from: "support_center",
            support_center_priority: selectedPriority.label,
            communication_email: communicationEmail,
            original_user_message: description,
            confirmed_issue_summary: subject,
          },
          created_at: result.ticket.created_at || now,
          updated_at: result.ticket.created_at || now,
        },
        ...current,
      ]);
      setCasePriority("standard");
      setCaseSubjectInput("");
      setCaseDescription("");
      setCreateCaseOpen(false);
      setActiveSection("cases");
    } catch (error) {
      console.error("Help Center case submit error:", error);
      setCreateCaseError("Unable to create your case right now.");
    } finally {
      setCreatingCase(false);
    }
  }

  async function handleCloseCase(ticketId: string, closeNote?: string) {
    if (!user || closingCaseId) return false;

    setClosingCaseId(ticketId);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) return false;

      const response = await fetch("/api/support/tickets", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ticketId,
          status: "closed",
          closeNote: closeNote?.trim() || "",
        }),
      });

      const result = await response.json().catch(() => null);
      console.log("Help Center close case API response", {
        ok: response.ok,
        status: response.status,
        result,
      });

      if (!response.ok || !result?.ok) {
        console.error("Help Center close case error:", result?.error);
        return false;
      }

      const updatedAt =
        result.ticket?.updated_at || new Date().toISOString();

      setTickets((current) =>
        current.map((ticket) =>
          ticket.id === ticketId
            ? {
                ...ticket,
                status: "closed",
                updated_at: updatedAt,
                metadata: result.ticket?.metadata || ticket.metadata,
              }
            : ticket
        )
      );

      return true;
    } catch (error) {
      console.error("Help Center close case error:", error);
      return false;
    } finally {
      setClosingCaseId("");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setProfileMenuOpen(false);
    setTickets([]);
  }

  const dashboardItems = getDashboardItems(user);
  const activeTabIndex = supportTabs.findIndex((tab) => tab.id === activeSection);

  return (
    <main className="flex min-h-screen flex-col bg-white font-sans text-[#0F172A]">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto grid h-[68px] max-w-[1680px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center"
            aria-label="AvenueBoard home"
          >
            <Image
              src="/logo.png"
              alt="AvenueBoard"
              width={172}
              height={32}
              className="h-8 w-auto"
              priority
            />
          </button>

          <nav
            className="relative hidden min-w-[740px] grid-cols-3 rounded-full border border-zinc-200 bg-white p-1.5 shadow-[0_8px_28px_rgba(15,23,42,0.04)] sm:grid"
            aria-label="Help Center sections"
          >
            <span
              className="absolute left-1.5 top-1.5 h-9 rounded-full bg-slate-950 shadow-[0_8px_20px_rgba(15,23,42,0.14)] transition-transform duration-300 ease-out"
              style={{
                width: "calc((100% - 12px) / 3)",
                transform: `translateX(${Math.max(activeTabIndex, 0) * 100}%)`,
              }}
              aria-hidden="true"
            />
            {supportTabs.map((tab) => {
              const active = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    tab.id === "cases" ? handleCasesClick() : setActiveSection(tab.id)
                  }
                  className={`relative z-10 h-9 rounded-full bg-transparent px-8 text-[13px] font-semibold transition-colors duration-200 focus:bg-transparent focus:outline-none active:bg-transparent ${
                    active
                      ? "text-white"
                      : "text-zinc-600 hover:bg-transparent hover:text-slate-950"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {loadingUser ? (
            <div className="ml-auto h-10 w-32 animate-pulse rounded-2xl bg-zinc-100" />
          ) : user ? (
            <div ref={profileMenuRef} className="relative ml-auto">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((value) => !value)}
                className="flex items-center gap-3 rounded-2xl px-2 py-1.5 transition hover:bg-zinc-50"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-[12px] font-semibold text-slate-800">
                  {user.initials}
                </span>
                <span className="hidden max-w-[180px] truncate text-[13px] font-semibold text-slate-900 sm:block">
                  {user.name}
                </span>
                <span className="text-zinc-400">⌄</span>
              </button>

              {profileMenuOpen && (
                  <div className="absolute right-0 top-14 z-50 w-[240px] overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-[0_18px_60px_rgba(15,23,42,0.12)]">
                    <div className="border-b border-zinc-100 px-3 py-3">
                      <p className="truncate text-[13px] font-semibold text-slate-900">
                        {user.name}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-zinc-500">
                        {user.email}
                      </p>
                    </div>
                    {dashboardItems.map((item) => (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          router.push(item.href);
                        }}
                        className="mt-1 w-full rounded-xl px-3 py-3 text-left text-[13px] font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        {item.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full rounded-xl px-3 py-3 text-left text-[13px] font-medium text-red-600 hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </div>
              )}
            </div>
          ) : (
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="h-10 rounded-2xl px-4 text-[13px] font-semibold text-slate-800 transition hover:bg-zinc-50"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => router.push("/signup")}
                className="h-10 rounded-2xl border border-zinc-200 bg-white px-4 text-[13px] font-semibold text-slate-950 transition hover:bg-zinc-50"
              >
                Create Account
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto border-t border-zinc-100 px-4 py-2 sm:hidden">
          {supportTabs.map((tab) => {
            const active = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  tab.id === "cases" ? handleCasesClick() : setActiveSection(tab.id)
                }
                className={`h-9 shrink-0 rounded-full px-4 text-[13px] font-semibold transition ${
                  active
                    ? "bg-slate-950 text-white"
                    : "border border-zinc-200 bg-white text-zinc-600"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <section className="mx-auto w-full max-w-[1680px] flex-1 px-4 pb-2 pt-4 sm:px-6 lg:px-8">
        {activeSection === "faq" && (
          <FaqPanel
            activeTopicId={activeFaqTopicId}
            expandedQuestion={expandedFaqQuestion}
            onTopicChange={(topicId) => {
              setActiveFaqTopicId(topicId);
              setExpandedFaqQuestion(0);
            }}
            onQuestionToggle={(questionIndex) =>
              setExpandedFaqQuestion((current) =>
                current === questionIndex ? -1 : questionIndex
              )
            }
            onOpenSupportCase={handleFaqSupportCaseClick}
          />
        )}

        {activeSection === "cases" && (
          <CasesPanel
            user={user}
            tickets={tickets}
            loadingCases={loadingCases}
            onSignIn={() =>
              router.push(
                `/login?returnTo=${encodeURIComponent(
                  "/help-center?tab=my-cases"
                )}`
              )
            }
            onCreateAccount={() => router.push("/signup")}
            onCreateCase={handleCreateCaseClick}
            onCloseCase={handleCloseCase}
            closingCaseId={closingCaseId}
          />
        )}

        {activeSection === "contact" && <ContactPanel />}
      </section>

      <footer className="mx-auto flex w-full max-w-[1680px] shrink-0 items-center justify-center border-t border-zinc-200 px-4 pb-6 pt-4 text-[12.5px] font-medium text-zinc-500 sm:px-6 lg:px-8">
        <div className="flex flex-nowrap items-center justify-center gap-2.5 leading-none">
          <span>© 2026</span>
          <Image
            src="/logo.png"
            alt="AvenueBoard"
            width={98}
            height={18}
            className="h-[18px] w-auto"
          />
          <span className="text-zinc-300">·</span>
          <span>All rights reserved.</span>
          <span className="text-zinc-300">·</span>
          <button type="button" onClick={() => router.push("/privacy")} className="hover:text-slate-950">
            Privacy Policy
          </button>
          <span className="text-zinc-300">·</span>
          <button type="button" onClick={() => router.push("/terms")} className="hover:text-slate-950">
            Terms of Service
          </button>
        </div>
      </footer>

      {signInModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
          <button
            className="absolute inset-0 cursor-default"
            onClick={() => setSignInModalOpen(false)}
            aria-label="Close sign in modal"
          />
          <div className="relative w-full max-w-[420px] rounded-[28px] border border-zinc-200 bg-white p-6 text-center shadow-[0_30px_90px_rgba(15,23,42,0.24)]">
            <button
              type="button"
              onClick={() => setSignInModalOpen(false)}
              className="absolute right-5 top-5 text-[22px] leading-none text-zinc-400 hover:text-slate-900"
              aria-label="Close"
            >
              ×
            </button>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-950">
              <LockIcon />
            </div>
            <h2 className="mt-6 text-[22px] font-medium tracking-[-0.045em] text-slate-950">
              Sign in to view your cases
            </h2>
            <p className="mx-auto mt-3 max-w-[280px] text-[13.5px] font-medium leading-6 text-zinc-500">
              Support requests are linked to your AvenueBoard account.
            </p>
            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="h-12 rounded-2xl bg-[#0F172A] text-[14px] font-semibold text-white transition hover:bg-[#172033]"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => router.push("/signup")}
                className="h-12 rounded-2xl border border-zinc-200 bg-white text-[14px] font-semibold text-slate-950 transition hover:bg-zinc-50"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}

      {createCaseOpen && (
        <CreateCaseModal
          email={user?.email || ""}
          priority={casePriority}
          subject={caseSubjectInput}
          description={caseDescription}
          error={createCaseError}
          submitting={creatingCase}
          onPriorityChange={setCasePriority}
          onSubjectChange={setCaseSubjectInput}
          onDescriptionChange={setCaseDescription}
          onClose={() => {
            if (!creatingCase) {
              setCreateCaseOpen(false);
              setCreateCaseError("");
            }
          }}
          onSubmit={handleSubmitCase}
        />
      )}
    </main>
  );
}

function FaqPanel({
  activeTopicId,
  expandedQuestion,
  onTopicChange,
  onQuestionToggle,
  onOpenSupportCase,
}: {
  activeTopicId: string;
  expandedQuestion: number;
  onTopicChange: (topicId: string) => void;
  onQuestionToggle: (questionIndex: number) => void;
  onOpenSupportCase: () => void;
}) {
  const activeTopic =
    faqTopics.find((topic) => topic.id === activeTopicId) || faqTopics[0];

  return (
    <div className="px-1 pb-5 pt-5 sm:px-2 lg:pt-9">
      <div>
        <h1 className="text-[34px] font-medium tracking-[-0.065em] text-slate-950">
          Everything You Need to Know
        </h1>
        <div className="mt-5 h-px w-16 bg-zinc-200" />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="lg:border-r lg:border-zinc-200 lg:pr-8">
          <h2 className="px-1 text-[11.5px] font-bold uppercase tracking-[0.16em] text-slate-500">
            Topics
          </h2>
          <div className="mt-4 grid gap-2">
            {faqTopics.map((topic) => {
              const active = activeTopic.id === topic.id;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => onTopicChange(topic.id)}
                  className={`relative flex min-h-12 w-full items-center justify-between gap-4 rounded-2xl px-4 text-left text-[14px] font-semibold transition ${
                    active
                      ? "bg-blue-50/70 text-slate-950"
                      : "bg-transparent text-slate-600 hover:bg-zinc-50 hover:text-slate-950"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-2.5 h-7 w-0.5 rounded-full bg-[#2563EB]" />
                  )}
                  <span>{topic.name}</span>
                  <span className={active ? "text-slate-800" : "text-slate-400"}>
                    →
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="lg:pl-3">
          <div>
            <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#2563EB]">
              {activeTopic.eyebrow}
            </p>
            <h2 className="mt-3 text-[26px] font-medium tracking-[-0.055em] text-slate-950 sm:text-[28px]">
              {activeTopic.title}
            </h2>
            <p className="mt-2 max-w-[760px] text-[14px] font-medium leading-6 text-slate-600">
              {activeTopic.subtitle}
            </p>
          </div>

          <div className="mt-7 border-y border-zinc-200">
            {activeTopic.questions.map((item, index) => {
              const expanded = expandedQuestion === index;
              return (
                <div
                  key={item.question}
                  className={index === 0 ? "" : "border-t border-zinc-200"}
                >
                  <button
                    type="button"
                    onClick={() => onQuestionToggle(index)}
                    className="flex min-h-[58px] w-full items-center justify-between gap-6 bg-transparent py-4 text-left text-[14px] font-semibold text-slate-950 transition hover:text-[#1E40AF]"
                  >
                    <span>{item.question}</span>
                    <span className="text-[18px] font-medium leading-none text-zinc-400">
                      {expanded ? "⌃" : "⌄"}
                    </span>
                  </button>

                  {expanded && (
                    <div className="pb-5 pr-10">
                      <p className="max-w-[820px] text-[13.5px] font-medium leading-6 text-slate-600">
                        {item.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-7 rounded-[22px] bg-blue-50/70 px-6 py-5 sm:flex sm:items-center sm:justify-between sm:gap-8">
            <div>
              <h3 className="text-[20px] font-medium tracking-[-0.05em] text-slate-950">
                Still have questions?
              </h3>
              <p className="mt-1 text-[13.5px] font-medium text-slate-600">
                Open a support case and we&apos;ll follow up directly.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenSupportCase}
              className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-[#0F172A] px-5 text-[13px] font-semibold text-white transition hover:bg-[#172033] sm:mt-0"
            >
              Open a Support Case →
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function CasesPanel({
  user,
  tickets,
  loadingCases,
  onSignIn,
  onCreateAccount,
  onCreateCase,
  onCloseCase,
  closingCaseId,
}: {
  user: SupportUser | null;
  tickets: SupportTicket[];
  loadingCases: boolean;
  onSignIn: () => void;
  onCreateAccount: () => void;
  onCreateCase: () => void;
  onCloseCase: (ticketId: string, closeNote?: string) => Promise<boolean>;
  closingCaseId: string;
}) {
  const [filter, setFilter] = useState<CaseFilter>("all");
  const [closeTarget, setCloseTarget] = useState<SupportTicket | null>(null);
  const [detailTarget, setDetailTarget] = useState<SupportTicket | null>(null);
  const [closeNote, setCloseNote] = useState("");
  const [closeError, setCloseError] = useState("");
  const openCases = tickets.filter((ticket) => !isClosedCase(ticket.status));
  const closedCases = tickets.filter((ticket) => isClosedCase(ticket.status));
  const filteredTickets =
    filter === "open" ? openCases : filter === "closed" ? closedCases : tickets;
  const activeDetailTicket = detailTarget
    ? tickets.find((ticket) => ticket.id === detailTarget.id) || detailTarget
    : null;
  const emptyState = getCaseEmptyState(filter);
  const filters: { id: CaseFilter; label: string; count: number }[] = [
    { id: "all", label: "All Cases", count: tickets.length },
    { id: "open", label: "Open", count: openCases.length },
    { id: "closed", label: "Closed", count: closedCases.length },
  ];

  return (
    <div className="relative min-h-[calc(100vh-170px)] px-1 pb-5 pt-5 sm:px-2 lg:pt-9">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[34px] font-medium tracking-[-0.065em] text-slate-950">
            Support Requests
          </h1>
          <p className="mt-2 text-[14px] font-medium leading-6 text-slate-600">
            View, track, and manage your AvenueBoard support requests.
          </p>
        </div>
        <button
          type="button"
          onClick={user ? onCreateCase : onSignIn}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#1E40AF] px-5 text-[13px] font-semibold text-white shadow-[0_12px_28px_rgba(30,64,175,0.18)] transition hover:bg-[#1E3A8A]"
        >
          <span className="text-lg leading-none">+</span>
          Create Case
        </button>
      </div>

      <div className={`mt-7 ${!user ? "blur-[2px]" : ""}`}>
        <div className="rounded-[24px] border border-zinc-200 bg-white px-5 pt-2.5 shadow-[0_16px_55px_rgba(15,23,42,0.035)]">
          <div className="flex flex-wrap gap-5 sm:gap-10">
            {filters.map((item) => {
              const active = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  disabled={!user}
                  className={`relative flex h-10 items-center gap-3 bg-transparent px-2 text-[13.5px] font-semibold transition focus:outline-none disabled:cursor-default ${
                    active ? "text-slate-950" : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  <span className={caseFilterIconClass(item.id, active)}>
                    {item.id === "all" && <AllCasesIcon />}
                    {item.id === "open" && <OpenCaseIcon />}
                    {item.id === "closed" && <ClosedCaseIcon />}
                  </span>
                  {item.label}
                  <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-zinc-100 px-2 text-[12px] font-semibold text-slate-600">
                    {item.count}
                  </span>
                  {active && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#2563EB]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-[0_16px_55px_rgba(15,23,42,0.035)]">
          <div className={`grid min-h-16 ${caseTableGridClass} items-center gap-4 border-b border-zinc-200 px-6 text-[11.5px] font-bold uppercase tracking-[0.08em] text-slate-500`}>
            <span>Case ID</span>
            <span>Subject</span>
            <span>Status</span>
            <span>Last Updated</span>
            <span className="text-right">Action</span>
          </div>

          {!user ? (
            <div className="grid min-h-[360px] place-items-center px-6 py-10">
              <div className="w-full max-w-[620px] space-y-4">
                {[0, 1, 2].map((item) => (
                  <div key={item} className={`grid ${caseTableGridClass} gap-4`}>
                    <div className="h-4 rounded-full bg-zinc-100" />
                    <div className="h-4 rounded-full bg-zinc-100" />
                    <div className="h-4 rounded-full bg-zinc-100" />
                    <div className="h-4 rounded-full bg-zinc-100" />
                    <div className="h-4 w-20 rounded-full bg-zinc-100" />
                  </div>
                ))}
              </div>
            </div>
          ) : loadingCases ? (
            <div className="space-y-0">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className={`grid min-h-16 animate-pulse ${caseTableGridClass} items-center gap-4 border-b border-zinc-100 px-6 last:border-b-0`}
                >
                  <div className="h-4 rounded-full bg-zinc-100" />
                  <div className="h-4 rounded-full bg-zinc-100" />
                  <div className="h-7 rounded-full bg-zinc-100" />
                  <div className="h-4 rounded-full bg-zinc-100" />
                  <div className="h-8 w-20 rounded-full bg-zinc-100" />
                </div>
              ))}
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="grid min-h-[360px] place-items-center px-6 py-10 text-center">
              <div>
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-blue-50 text-[#1E40AF]">
                  <CaseEmptyIcon />
                </div>
                <h2 className="mt-7 text-[21px] font-semibold tracking-[-0.045em] text-slate-950">
                  {emptyState.title}
                </h2>
                <p className="mt-2 text-[14px] font-medium text-slate-500">
                  {emptyState.text}
                </p>
                {emptyState.showAction && (
                  <button
                    type="button"
                    onClick={onCreateCase}
                    className="mt-7 h-11 rounded-2xl bg-[#1E40AF] px-6 text-[13px] font-semibold text-white shadow-[0_12px_28px_rgba(30,64,175,0.18)] transition hover:bg-[#1E3A8A]"
                  >
                    + Open Case
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div>
              {filteredTickets.map((ticket, index) => (
                <div
                  key={ticket.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetailTarget(ticket)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setDetailTarget(ticket);
                    }
                  }}
                  className={`grid min-h-16 ${caseTableGridClass} cursor-pointer items-center gap-4 px-6 transition hover:bg-zinc-50/70 ${
                    index === filteredTickets.length - 1
                      ? ""
                      : "border-b border-zinc-100"
                  }`}
                >
                  <p className="truncate text-[13px] font-semibold text-slate-950">
                    {ticket.ticket_number || shortCaseId(ticket.id)}
                  </p>
                  <p className="line-clamp-1 text-[13px] font-medium text-slate-600">
                    {caseDetailSubject(ticket)}
                  </p>
                  <span className={statusClass(ticket.status)}>
                    {statusLabel(ticket.status)}
                  </span>
                  <div className="text-[12.5px] font-medium leading-5 text-slate-500">
                    <p>{formatDate(ticket.updated_at || ticket.created_at)}</p>
                    <p>{formatTime(ticket.updated_at || ticket.created_at)}</p>
                  </div>
                  <div className="flex justify-end">
                    {!isClosedCase(ticket.status) ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setCloseError("");
                          setCloseNote("");
                          setCloseTarget(ticket);
                        }}
                        onKeyDown={(event) => event.stopPropagation()}
                        className="h-8 rounded-xl border border-zinc-200 bg-white px-3 text-[12px] font-semibold text-slate-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                      >
                        Close Case
                      </button>
                    ) : (
                      <span className="text-[12px] font-medium text-zinc-400">
                        —
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {!user && (
        <div className="absolute inset-0 flex items-center justify-center rounded-[32px] bg-white/35 px-4 backdrop-blur-[1px]">
          <div className="w-full max-w-[400px] rounded-[28px] border border-zinc-200 bg-white p-6 text-center shadow-[0_30px_90px_rgba(15,23,42,0.16)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-950">
              <LockIcon />
            </div>
            <h2 className="mt-6 text-[22px] font-medium tracking-[-0.045em] text-slate-950">
              Sign in to view your cases
            </h2>
            <p className="mx-auto mt-3 max-w-[270px] text-[13.5px] font-medium leading-6 text-zinc-500">
              Support requests are linked to your AvenueBoard account.
            </p>
            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={onSignIn}
                className="h-11 rounded-2xl bg-[#0F172A] text-[13px] font-semibold text-white transition hover:bg-[#172033]"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={onCreateAccount}
                className="h-11 rounded-2xl border border-zinc-200 bg-white text-[13px] font-semibold text-slate-950 transition hover:bg-zinc-50"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}

      {activeDetailTicket && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-md">
          <button
            className="absolute inset-0 cursor-default"
            onClick={() => setDetailTarget(null)}
            aria-label="Close case details"
          />
          <div className="relative max-h-[calc(100vh-48px)] w-full max-w-[1160px] overflow-hidden rounded-[30px] border border-zinc-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.20)]">
            <button
              type="button"
              onClick={() => setDetailTarget(null)}
              className="absolute right-6 top-6 z-10 text-[28px] leading-none text-zinc-400 transition hover:text-slate-900"
              aria-label="Close"
            >
              ×
            </button>

            <div className="border-b border-zinc-200 px-6 py-6 sm:px-9">
              <div className="grid gap-5 pr-8">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                      {activeDetailTicket.ticket_number ||
                        shortCaseId(activeDetailTicket.id)}
                    </p>
                    <span className={statusClass(activeDetailTicket.status)}>
                      {statusLabel(activeDetailTicket.status)}
                    </span>
                    {isClosedCase(activeDetailTicket.status) && (
                      <span className="text-[13px] font-medium text-slate-500">
                        Closed on {caseClosedDate(activeDetailTicket)}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-4 max-w-[820px] text-[30px] font-semibold leading-tight tracking-[-0.065em] text-slate-950 sm:text-[36px]">
                    {caseIssueSummary(activeDetailTicket)}
                  </h2>
                  <div className="mt-4 space-y-1 text-[14px] font-semibold text-slate-500">
                    <p>
                      Submitted by{" "}
                      <span className="text-[#2563EB]">
                        {caseSubmittedByLabel(activeDetailTicket)}
                      </span>
                    </p>
                    <p className="text-[13px] font-medium text-slate-500">
                      {isAvaSubmittedCase(activeDetailTicket)
                        ? "Generated from tenant conversation"
                        : formatDateTime(activeDetailTicket.created_at)}
                    </p>
                    {isAvaSubmittedCase(activeDetailTicket) && (
                      <p className="text-[13px] font-medium text-slate-500">
                        {formatDateTime(activeDetailTicket.created_at)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid max-h-[calc(100vh-250px)] overflow-y-auto lg:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="space-y-0 border-b border-zinc-200 px-6 py-5 sm:px-9 lg:border-b-0 lg:border-r lg:py-7">
                <CaseDetailMeta
                  label="Category"
                  value={caseDetailTopic(activeDetailTicket)}
                />
                <CaseDetailMeta
                  label="Priority"
                  value={caseDetailPriority(activeDetailTicket)}
                  badge
                />
                <CaseDetailMeta
                  label="Created"
                  value={formatDateTime(activeDetailTicket.created_at)}
                />
                <CaseDetailMeta
                  label="Last updated"
                  value={formatDateTime(
                    activeDetailTicket.updated_at || activeDetailTicket.created_at
                  )}
                />
                {caseDetailContext(activeDetailTicket) && (
                  <CaseDetailMeta
                    label="Context"
                    value={caseDetailContext(activeDetailTicket)}
                  />
                )}
              </aside>

              <div className="space-y-8 px-6 py-5 sm:px-9 lg:py-7">
                <section>
                  <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                    Description
                  </p>
                  <div className="mt-4 max-h-[260px] overflow-y-auto whitespace-pre-wrap rounded-[22px] border border-zinc-200 bg-white px-5 py-5 text-[15px] font-medium leading-8 text-slate-800">
                    {caseDetailDescription(activeDetailTicket)}
                  </div>
                </section>

                <section>
                  <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                    Activity Timeline
                  </p>
                  <div className="mt-5 space-y-0">
                    {caseTimelineItems(activeDetailTicket).map((item, index, items) => (
                      <CaseTimelineItem
                        key={`${item.title}-${item.date || index}`}
                        item={item}
                        isLast={index === items.length - 1}
                      />
                    ))}
                  </div>
                </section>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-zinc-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-9">
              <button
                type="button"
                onClick={() => setDetailTarget(null)}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-5 text-[13px] font-semibold text-slate-700 transition hover:bg-zinc-50"
              >
                ← Back to My Cases
              </button>
              {isClosedCase(activeDetailTicket.status) ? (
                <p className="text-[13px] font-semibold text-zinc-500">
                  This case is closed.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setCloseError("");
                    setCloseNote("");
                    setCloseTarget(activeDetailTicket);
                  }}
                  disabled={Boolean(closingCaseId)}
                  className="h-11 rounded-2xl bg-[#0F172A] px-5 text-[13px] font-semibold text-white transition hover:bg-[#172033] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Close Case
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {closeTarget && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
          <button
            className="absolute inset-0 cursor-default"
            onClick={() => {
              if (!closingCaseId) {
                setCloseTarget(null);
                setCloseNote("");
                setCloseError("");
              }
            }}
            aria-label="Cancel close case"
          />
          <div className="relative w-full max-w-[430px] rounded-[28px] border border-zinc-200 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
            <h2 className="text-[22px] font-medium tracking-[-0.045em] text-slate-950">
              Close support case?
            </h2>
            <p className="mt-3 text-[13.5px] font-medium leading-6 text-zinc-500">
              Are you sure you want to close this support case? You can still
              view it later from My Cases if you need to reference it.
            </p>
            <div className="mt-5">
              <label className="text-[13px] font-semibold text-slate-800">
                Optional note
              </label>
              <textarea
                value={closeNote}
                onChange={(event) => setCloseNote(event.target.value)}
                rows={3}
                placeholder="Add a short note about why you're closing this case..."
                className="mt-2 w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[13.5px] font-medium leading-6 text-slate-900 outline-none transition placeholder:text-zinc-400 focus:border-slate-300 focus:ring-4 focus:ring-slate-200/70"
              />
              <p className="mt-2 text-[12.5px] font-medium leading-5 text-zinc-500">
                This helps our team understand whether your issue was resolved
                or no longer needs follow-up.
              </p>
            </div>
            {closeError && (
              <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">
                {closeError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={Boolean(closingCaseId)}
                onClick={() => {
                  setCloseTarget(null);
                  setCloseNote("");
                  setCloseError("");
                }}
                className="h-11 rounded-2xl border border-zinc-200 bg-white px-5 text-[13px] font-semibold text-slate-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(closingCaseId)}
                onClick={async () => {
                  const success = await onCloseCase(closeTarget.id, closeNote);
                  if (success) {
                    setCloseTarget(null);
                    setCloseNote("");
                    setCloseError("");
                    return;
                  }
                  setCloseError("Unable to close this case. Please try again.");
                }}
                className="h-11 rounded-2xl bg-[#0F172A] px-5 text-[13px] font-semibold text-white transition hover:bg-[#172033] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {closingCaseId ? "Closing..." : "Close Case"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type CaseTimelineEntry = {
  title: string;
  text: string;
  date: string;
  tone: "blue" | "green" | "neutral";
};

function CaseDetailMeta({
  label,
  value,
  badge = false,
}: {
  label: string;
  value: string;
  badge?: boolean;
}) {
  return (
    <div className="border-b border-zinc-200 py-5 last:border-b-0 first:pt-0 last:pb-0">
      <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      {badge ? (
        <span className={priorityBadgeClass(value)}>{value || "—"}</span>
      ) : (
        <p className="mt-3 text-[14px] font-semibold leading-5 text-slate-950">
          {value || "—"}
        </p>
      )}
    </div>
  );
}

function CaseTimelineItem({
  item,
  isLast,
}: {
  item: CaseTimelineEntry;
  isLast: boolean;
}) {
  return (
    <div className="grid grid-cols-[46px_minmax(0,1fr)_120px] gap-4">
      <div className="relative flex justify-center">
        {!isLast && (
          <span className="absolute top-10 h-[calc(100%-18px)] w-px bg-zinc-200" />
        )}
        <span className={timelineIconClass(item.tone)}>
          {item.tone === "green" ? <CaseCheckIcon /> : <CaseSparkleIcon />}
        </span>
      </div>
      <div className="pb-7">
        <p className="text-[14px] font-semibold text-slate-950">{item.title}</p>
        <p className="mt-1 text-[13.5px] font-medium leading-6 text-slate-500">
          {item.text}
        </p>
      </div>
      <p className="whitespace-pre-line pb-7 text-right text-[13px] font-medium leading-5 text-slate-500">
        {formatTimelineDate(item.date)}
      </p>
    </div>
  );
}

function ContactPanel() {
  return (
    <div className="px-1 pb-5 pt-1 sm:px-2">
      <div className="grid items-center gap-4 rounded-[30px] bg-white px-5 py-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_390px]">
        <div>
          <span className="inline-flex h-8 items-center gap-2 rounded-full bg-blue-50 px-3.5 text-[12.5px] font-semibold text-blue-700">
            <span className="flex h-5 w-5 items-center justify-center">
              <HeadsetSmallIcon />
            </span>
            We’re here for you
          </span>
          <h1 className="mt-3.5 max-w-[720px] text-[40px] font-medium leading-[1.02] tracking-[-0.075em] text-slate-950 sm:text-[52px]">
            Let’s talk.
            <br />
            We’re here to help.
          </h1>
          <p className="mt-3 max-w-[620px] text-[15px] font-medium leading-7 text-slate-600">
            Whether you have a question, need support, or want to talk business
            — our team is ready to assist you.
          </p>
        </div>

        <ContactIllustration />
      </div>

      <div className="mt-3.5 grid gap-4 lg:grid-cols-2">
        <ContactCard
          tone="support"
          Icon={Headset}
          title="Support"
          text="Have a question or need help with your account? Our support team is here for you."
          email="support@avenueboard.com"
          cta="Email Support"
          href="mailto:support@avenueboard.com"
          items={[
            "Account or payment questions",
            "Tenant and landlord portal help",
            "Feedback, improvements, or product questions",
            "Response within 3 business days",
          ]}
        />
        <ContactCard
          tone="business"
          Icon={Building2}
          title="Talk Business"
          text="Interested in partnerships, pricing, or enterprise solutions? Let’s start a conversation."
          email="sales@avenueboard.com"
          cta="Contact Sales"
          href="mailto:sales@avenueboard.com"
          items={[
            "Partnerships and integrations",
            "Pricing or business inquiries",
            "Property management or growth conversations",
            "Enterprise or team needs",
          ]}
        />
      </div>
    </div>
  );
}

function ContactIllustration() {
  return (
    <div className="hidden items-center justify-center lg:flex">
      <Image
        src="/contactus.png"
        alt="AvenueBoard Contact Us"
        width={460}
        height={307}
        sizes="(min-width: 1024px) 460px, 0px"
        className="h-auto w-[460px] max-w-none object-contain"
        unoptimized
        priority
      />
    </div>
  );
}

function ContactCard({
  tone,
  Icon,
  title,
  text,
  email,
  items,
  cta,
  href,
}: {
  tone: "support" | "business";
  Icon: LucideIcon;
  title: string;
  text: string;
  email: string;
  items: string[];
  cta: string;
  href: string;
}) {
  const isBusiness = tone === "business";

  return (
    <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_14px_55px_rgba(15,23,42,0.035)] sm:p-5 lg:p-6">
      <div className="flex items-start gap-4">
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${
            isBusiness
              ? "bg-blue-50 text-[#1E40AF]"
              : "bg-blue-50 text-blue-700"
          }`}
        >
          <Icon size={30} strokeWidth={1.9} />
        </span>
        <div>
          <h2 className="text-[22px] font-semibold tracking-[-0.045em] text-slate-950">
            {title}
          </h2>
          <p className="mt-2 max-w-[560px] text-[14px] font-medium leading-6 text-zinc-600">
            {text}
          </p>
          <a
            href={href}
            className={`mt-4 inline-flex items-center gap-3 text-[16px] font-semibold tracking-[-0.025em] ${
              isBusiness ? "text-[#1E40AF]" : "text-blue-700"
            }`}
          >
            <MailMiniIcon />
            {email}
          </a>
        </div>
      </div>

      <div className="ml-[34px] mt-4 grid gap-1.5">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-3">
            <span
              className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                isBusiness ? "bg-[#1E40AF]" : "bg-slate-900"
              }`}
            />
            <p className="text-[13.5px] font-medium leading-[1.55] text-zinc-600">
              {item}
            </p>
          </div>
        ))}
      </div>

      <a
        href={href}
        className={`mt-5 flex h-11 items-center justify-center gap-3 rounded-2xl text-[14px] font-semibold text-white transition ${
          isBusiness
            ? "bg-[#1E40AF] hover:bg-[#1E3A8A]"
            : "bg-[#0F172A] hover:bg-[#172033]"
        }`}
      >
        <SendIcon />
        {cta}
      </a>
    </div>
  );
}

function CreateCaseModal({
  email,
  priority,
  subject,
  description,
  error,
  submitting,
  onPriorityChange,
  onSubjectChange,
  onDescriptionChange,
  onClose,
  onSubmit,
}: {
  email: string;
  priority: CasePriorityId;
  subject: string;
  description: string;
  error: string;
  submitting: boolean;
  onPriorityChange: (value: CasePriorityId) => void;
  onSubjectChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
      <button
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Close create case"
      />
      <div className="relative max-h-[92vh] w-full max-w-[780px] overflow-y-auto rounded-[30px] border border-zinc-200 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.24)] sm:p-6">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="absolute right-5 top-5 text-[22px] leading-none text-zinc-400 hover:text-slate-900 disabled:opacity-50"
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-[26px] font-medium tracking-[-0.055em] text-slate-950">
          Create support case
        </h2>
        <p className="mt-2 max-w-[420px] text-[13.5px] font-medium leading-6 text-zinc-500">
          Tell us what is happening and our team will review the request.
        </p>

        <div className="mt-5 border-t border-zinc-100 pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                Communication
              </p>
              <p className="mt-1 max-w-[420px] text-[13px] font-medium leading-5 text-zinc-500">
                We’ll use this email to communicate updates regarding your support request.
              </p>
            </div>
            <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50/80 px-3 py-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <MailMiniIcon />
              </span>
              <p className="min-w-0 truncate text-[14px] font-semibold text-slate-950">
                {email || "Email unavailable"}
              </p>
            </div>
          </div>
          <p className="mt-2 rounded-2xl bg-blue-50/70 px-3 py-2 text-[12.5px] font-medium leading-5 text-blue-800">
            Support updates and follow-up communication will be sent to this
            email address.
          </p>
        </div>

        <div className="mt-4 grid gap-3.5">
          <div className="grid gap-2">
            <div>
              <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                Priority
              </span>
              <p className="mt-1 text-[12.5px] font-medium text-zinc-500">
                Help us understand how quickly this needs attention.
              </p>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {casePriorities.map((item) => {
                const active = priority === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onPriorityChange(item.id)}
                    disabled={submitting}
                    className={`rounded-2xl border px-3 py-2.5 text-left transition disabled:opacity-60 ${
                      active
                        ? "border-blue-200 bg-blue-50/80 text-slate-950 shadow-[0_10px_24px_rgba(37,99,235,0.08)]"
                        : "border-zinc-200 bg-white text-slate-800 hover:border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="text-[13px] font-semibold">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-[12px] font-medium leading-4 text-zinc-500">
                      {item.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="grid gap-2">
            <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-zinc-400">
              Subject
            </span>
            <input
              value={subject}
              onChange={(event) => onSubjectChange(event.target.value)}
              placeholder="Briefly describe the issue"
              className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-[14px] font-semibold text-slate-900 outline-none transition placeholder:text-zinc-400 focus:border-slate-300"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-zinc-400">
              Description
            </span>
            <textarea
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="Add the details our team should know."
              className="min-h-[132px] resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[14px] font-medium leading-6 text-slate-900 outline-none transition placeholder:text-zinc-400 focus:border-slate-300"
            />
          </label>
        </div>

        {error && (
          <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-11 rounded-2xl border border-zinc-200 bg-white px-5 text-[13px] font-semibold text-slate-900 transition hover:bg-zinc-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="h-11 rounded-2xl bg-[#0F172A] px-5 text-[13px] font-semibold text-white transition hover:bg-[#172033] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit Case"}
          </button>
        </div>
      </div>
    </div>
  );
}

function getDashboardItems(user: SupportUser | null) {
  if (!user) return [];

  const items: { label: string; href: string }[] = [];
  if (user.hasLandlordRole) items.push({ label: "Landlord Portal", href: "/dashboard" });
  if (user.hasTenantAccess) items.push({ label: "Tenant Portal", href: "/tenant" });

  return items.length ? items : [{ label: "Select Mode", href: "/select-mode" }];
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (value[0] || "U").toUpperCase();
}

function getCaseEmptyState(filter: CaseFilter) {
  if (filter === "open") {
    return {
      title: "No open cases",
      text: "Any active support requests will appear here.",
      showAction: true,
    };
  }

  if (filter === "closed") {
    return {
      title: "No closed cases",
      text: "Resolved support requests will appear here.",
      showAction: false,
    };
  }

  return {
    title: "No support requests yet",
    text: "When you open a case, it will appear here.",
    showAction: true,
  };
}

function getTicketMetadata(ticket: SupportTicket) {
  if (
    ticket.metadata &&
    typeof ticket.metadata === "object" &&
    !Array.isArray(ticket.metadata)
  ) {
    return ticket.metadata;
  }

  return {};
}

function metadataString(
  metadata: Record<string, unknown>,
  key: string
): string {
  const value = metadata[key];
  return typeof value === "string" ? value.trim() : "";
}

function metadataBoolean(metadata: Record<string, unknown>, key: string) {
  return metadata[key] === true;
}

function splitTicketMessage(message?: string | null) {
  const trimmed = (message || "").trim();
  if (!trimmed) return { subject: "", description: "" };

  const [subject, ...descriptionParts] = trimmed.split(/\n\s*\n/);
  return {
    subject: subject.trim(),
    description: descriptionParts.join("\n\n").trim(),
  };
}

function caseDetailSubject(ticket: SupportTicket) {
  const metadata = getTicketMetadata(ticket);
  const metadataSubject =
    metadataString(metadata, "confirmed_issue_summary") ||
    metadataString(metadata, "issue_summary");
  if (metadataSubject && !looksLikeTranscript(metadataSubject)) {
    return metadataSubject;
  }

  const splitMessage = splitTicketMessage(ticket.message);
  if (looksLikeTranscript(splitMessage.subject)) {
    return isAvaSubmittedCase(ticket)
      ? "Support request from Ava Assistant"
      : "Support request";
  }

  return splitMessage.subject || "Support request";
}

function caseIssueSummary(ticket: SupportTicket) {
  const metadata = getTicketMetadata(ticket);
  const explicitSummary =
    metadataString(metadata, "issue_summary") ||
    metadataString(metadata, "confirmed_issue_summary");

  if (
    explicitSummary &&
    !looksLikeTranscript(explicitSummary) &&
    !looksLikeRawUserRequest(explicitSummary)
  ) {
    return explicitSummary;
  }

  const category = String(ticket.category || "").toLowerCase();
  const searchableText = [
    ticket.category || "",
    metadataString(metadata, "topic"),
    metadataString(metadata, "support_topic"),
    metadataString(metadata, "original_user_message"),
    metadataString(metadata, "issue_details"),
    metadataString(metadata, "conversation_summary"),
    ticket.message || "",
  ]
    .join(" ")
    .toLowerCase();

  if (
    category.includes("payment") ||
    searchableText.includes("payment") ||
    searchableText.includes("autopay") ||
    searchableText.includes("auto pay") ||
    searchableText.includes("rent collection")
  ) {
    return searchableText.includes("setup") || searchableText.includes("autopay")
      ? "Payment Setup Question"
      : "Payment Support Request";
  }

  if (
    category.includes("lease") ||
    category.includes("document") ||
    searchableText.includes("lease") ||
    searchableText.includes("document")
  ) {
    return searchableText.includes("document")
      ? "Lease Document Assistance"
      : "Lease Support Request";
  }

  if (
    category.includes("account") ||
    searchableText.includes("login") ||
    searchableText.includes("access") ||
    searchableText.includes("tenant portal") ||
    searchableText.includes("dashboard")
  ) {
    return searchableText.includes("tenant")
      ? "Tenant Portal Access Issue"
      : "Account Configuration Help";
  }

  if (
    searchableText.includes("credit") ||
    searchableText.includes("rent reporting") ||
    searchableText.includes("report rent")
  ) {
    return "Credit Reporting Inquiry";
  }

  if (
    searchableText.includes("landlord portal") ||
    searchableText.includes("property") ||
    searchableText.includes("invite tenant")
  ) {
    return "Landlord Portal Assistance";
  }

  return "General Support Request";
}

function caseDetailDescription(ticket: SupportTicket) {
  const metadata = getTicketMetadata(ticket);
  const metadataDescription =
    metadataString(metadata, "issue_details") ||
    metadataString(metadata, "conversation_summary") ||
    metadataString(metadata, "original_user_message") ||
    metadataString(metadata, "description");
  if (metadataDescription && !looksLikeTranscript(metadataDescription)) {
    return metadataDescription;
  }

  const splitMessage = splitTicketMessage(ticket.message);
  const fallbackDescription = splitMessage.description || splitMessage.subject;

  if (looksLikeTranscript(fallbackDescription)) {
    return isAvaSubmittedCase(ticket)
      ? "A support case was created from an Ava Assistant conversation. Review the case summary and follow up with the user as needed."
      : "A support case was created from the user's request. Review the available case details and follow up as needed.";
  }

  return fallbackDescription || "No description provided.";
}

function caseDetailTopic(ticket: SupportTicket) {
  const metadata = getTicketMetadata(ticket);
  const topic =
    metadataString(metadata, "topic") ||
    metadataString(metadata, "support_topic") ||
    ticket.category ||
    "general_support";

  return titleizeSupportValue(topic);
}

function caseDetailPriority(ticket: SupportTicket) {
  const metadata = getTicketMetadata(ticket);
  const supportCenterPriority = metadataString(
    metadata,
    "support_center_priority"
  );
  const normalizedSupportCenterPriority = supportCenterPriority.toLowerCase();
  if (normalizedSupportCenterPriority === "time-sensitive") return "Critical";
  if (normalizedSupportCenterPriority === "important") return "High";
  if (normalizedSupportCenterPriority === "standard") return "Standard";

  const priority = String(ticket.priority || "normal").toLowerCase();
  if (priority === "urgent" || priority === "critical") return "Critical";
  if (priority === "high") return "High";
  if (priority === "low") return "Low";
  return "Standard";
}

function caseDetailSource(ticket: SupportTicket) {
  const metadata = getTicketMetadata(ticket);
  const source =
    metadataString(metadata, "created_from") || metadataString(metadata, "source");
  const normalizedSource = source.toLowerCase();

  if (!source) return "";
  if (normalizedSource.includes("support_center")) return "Help Center";
  if (normalizedSource.includes("ava")) return "Ava";
  return titleizeSupportValue(source);
}

function isAvaSubmittedCase(ticket: SupportTicket) {
  const metadata = getTicketMetadata(ticket);
  const source =
    metadataString(metadata, "created_from") ||
    metadataString(metadata, "source") ||
    "";

  return source.toLowerCase().includes("ava");
}

function caseSubmittedByLabel(ticket: SupportTicket) {
  return isAvaSubmittedCase(ticket) ? "Ava Assistant" : "User";
}

function caseDetailContext(ticket: SupportTicket) {
  const metadata = getTicketMetadata(ticket);
  return (
    metadataString(metadata, "property_name") ||
    metadataString(metadata, "page_context") ||
    metadataString(metadata, "current_page") ||
    metadataString(metadata, "portal_context")
  );
}

function caseDetailCloseNote(ticket: SupportTicket) {
  const metadata = getTicketMetadata(ticket);
  return metadataString(metadata, "close_note");
}

function caseClosedDate(ticket: SupportTicket) {
  const metadata = getTicketMetadata(ticket);
  return formatDateTime(
    metadataString(metadata, "closed_at") || ticket.updated_at || ticket.created_at
  );
}

function caseTimelineItems(ticket: SupportTicket): CaseTimelineEntry[] {
  const metadata = getTicketMetadata(ticket);
  const submittedByAva = isAvaSubmittedCase(ticket);
  const items: CaseTimelineEntry[] = [
    {
      title: submittedByAva
        ? "Case created by Ava Assistant"
        : "Case created by User",
      text: submittedByAva
        ? "A support case was created from the user's request to Ava."
        : "A support case was created by the user from Help Center.",
      date: ticket.created_at || "",
      tone: "blue",
    },
  ];

  const reviewedAt =
    metadataString(metadata, "support_reviewed_at") ||
    metadataString(metadata, "admin_reviewed_at") ||
    metadataString(metadata, "reviewed_at");

  if (reviewedAt || metadataBoolean(metadata, "support_reviewed")) {
    items.push({
      title: "Support reviewed request",
      text: "Our support team reviewed this support request.",
      date: reviewedAt || ticket.updated_at || ticket.created_at || "",
      tone: "neutral",
    });
  }

  const supportResponseAt =
    metadataString(metadata, "support_response_sent_at") ||
    metadataString(metadata, "response_sent_at") ||
    metadataString(metadata, "emailed_at");

  if (supportResponseAt) {
    items.push({
      title: "Support response sent via email",
      text: "A support response was sent to the email address on the case.",
      date: supportResponseAt,
      tone: "neutral",
    });
  }

  const caseUpdatedAt =
    metadataString(metadata, "case_updated_at") ||
    metadataString(metadata, "support_updated_at");

  if (caseUpdatedAt) {
    items.push({
      title: "Case updated",
      text: "The support case details were updated.",
      date: caseUpdatedAt,
      tone: "neutral",
    });
  }

  if (isClosedCase(ticket.status)) {
    const closedFrom = metadataString(metadata, "closed_from").toLowerCase();
    const closedBySupport =
      closedFrom.includes("support") ||
      closedFrom.includes("admin") ||
      metadataBoolean(metadata, "closed_by_support");

    items.push({
      title: closedBySupport ? "Case resolved by Support" : "Case closed by User",
      text: closedBySupport
        ? "The support team resolved this case."
        : "The user closed this case.",
      date:
        metadataString(metadata, "closed_at") ||
        ticket.updated_at ||
        ticket.created_at ||
        "",
      tone: "green",
    });
  }

  return items;
}

function looksLikeTranscript(value?: string | null) {
  const text = (value || "").toLowerCase();
  return (
    text.includes("user:") ||
    text.includes("assistant:") ||
    text.includes("ava:") ||
    text.includes("conversation") ||
    text.split("\n").length > 6
  );
}

function looksLikeRawUserRequest(value?: string | null) {
  const text = (value || "").trim().toLowerCase();
  return (
    text.startsWith("i ") ||
    text.startsWith("i'm ") ||
    text.startsWith("i am ") ||
    text.startsWith("i need ") ||
    text.startsWith("can you ") ||
    text.startsWith("please ") ||
    text.length > 70
  );
}

function priorityBadgeClass(priority: string) {
  const normalized = priority.toLowerCase();
  const base = "mt-3 inline-flex rounded-xl px-3 py-1.5 text-[13px] font-semibold";

  if (normalized === "critical") return `${base} bg-red-50 text-red-700`;
  if (normalized === "high") return `${base} bg-amber-50 text-amber-950`;
  if (normalized === "low") return `${base} bg-zinc-100 text-zinc-500`;
  return `${base} bg-amber-50 text-amber-950`;
}

function formatDateTime(value?: string | null) {
  const date = formatDate(value);
  const time = formatTime(value);
  if (date === "—") return date;
  return `${date}${time ? ` ${time}` : ""}`;
}

function formatTimelineDate(value?: string | null) {
  const date = formatDate(value);
  const time = formatTime(value);
  if (date === "—") return "—";
  return `${date}${time ? `\n${time}` : ""}`;
}

function timelineIconClass(tone: CaseTimelineEntry["tone"]) {
  const base =
    "relative z-10 flex h-10 w-10 items-center justify-center rounded-full";
  if (tone === "green") return `${base} bg-emerald-50 text-emerald-700`;
  if (tone === "neutral") return `${base} bg-slate-50 text-slate-500`;
  return `${base} bg-blue-50 text-[#2563EB]`;
}

function titleizeSupportValue(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function shortCaseId(id: string) {
  return `#${id.slice(0, 6).toUpperCase()}`;
}

function statusLabel(status?: string | null) {
  const normalizedStatus = String(status || "open").toLowerCase();
  if (normalizedStatus === "resolved" || normalizedStatus === "closed") {
    return "Closed";
  }

  const normalized = normalizedStatus.replace(/_/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function statusClass(status?: string | null) {
  const normalized = String(status || "open").toLowerCase();
  const base =
    "inline-flex rounded-full px-3 py-1 text-[11.5px] font-semibold capitalize";

  if (normalized === "in_review") return `${base} bg-amber-50 text-amber-700`;
  if (normalized === "closed" || normalized === "resolved") {
    return `${base} bg-zinc-100 text-zinc-500`;
  }
  return `${base} bg-emerald-50 text-emerald-700`;
}

function isClosedCase(status?: string | null) {
  const normalized = String(status || "open").toLowerCase();
  return normalized === "closed" || normalized === "resolved";
}

function caseFilterIconClass(filter: CaseFilter, active: boolean) {
  const base = "inline-flex h-6 w-6 items-center justify-center";
  if (filter === "all") {
    return `${base} ${active ? "text-[#2563EB]" : "text-slate-500"}`;
  }
  if (filter === "closed") {
    return `${base} ${active ? "text-[#2563EB]" : "text-slate-500"}`;
  }
  return `${base} ${active ? "text-[#2563EB]" : "text-slate-500"}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function CaseSparkleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.75 13.9 8.1l4.35 1.9-4.35 1.9L12 16.25l-1.9-4.35L5.75 10l4.35-1.9L12 3.75Zm5.75 10.5.85 1.95 1.9.8-1.9.85-.85 1.9-.85-1.9-1.9-.85 1.9-.8.85-1.95Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CaseUserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 7a7 7 0 0 0-14 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CaseTagIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.75 5.75v5.6c0 .4.16.78.44 1.06l6.4 6.4c.6.6 1.58.6 2.18 0l5.04-5.04c.6-.6.6-1.58 0-2.18l-6.4-6.4a1.5 1.5 0 0 0-1.06-.44h-5.6a1 1 0 0 0-1 1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 8.5h.01"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CaseFlagIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 20V5.75m0 0c3-1.5 5 .9 8 0 1.1-.33 2.15-.92 3-1.75v8.25c-.85.83-1.9 1.42-3 1.75-3 .9-5-1.5-8 0V5.75Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CaseCalendarIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 4.5v3m10-3v3M5.75 8.75h12.5M6.5 6.25h11a1.75 1.75 0 0 1 1.75 1.75v9.5a1.75 1.75 0 0 1-1.75 1.75h-11a1.75 1.75 0 0 1-1.75-1.75V8A1.75 1.75 0 0 1 6.5 6.25Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CaseClockIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13.25V12l2.75 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CaseContextIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.75 19.25V9.8L12 4.75l7.25 5.05v9.45h-5v-5.5h-4.5v5.5h-5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CaseCheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m6.75 12.5 3.25 3.25 7.25-7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AllCasesIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m12 4 7 3.8-7 3.8-7-3.8L12 4Zm7 8.2-7 3.8-7-3.8m14 4.4-7 3.8-7-3.8"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OpenCaseIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}

function ClosedCaseIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="m8.8 12.2 2.1 2.1 4.6-4.8"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CaseEmptyIcon() {
  return (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 8.5h4.2l1.5 2H19v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 4.5v4m-2-2h4"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HeadsetSmallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 13v-1a8 8 0 0 1 16 0v1M4 13h3v6H5a1 1 0 0 1-1-1v-5Zm16 0h-3v6h2a1 1 0 0 0 1-1v-5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailMiniIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 6h16v12H4V6Zm1.5 1.5L12 13l6.5-5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m20 4-7.4 16-2.2-7.2L4 10.2 20 4Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6v-9Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path d="M12 15v2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}
