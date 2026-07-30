import {
  getCommandCenterAdminClient,
  type StaffUser,
} from "@/lib/command-center/server";
import { staffHasCapability } from "@/lib/command-center/permissions";

export type CommandCenterRangeId = "today" | "7d" | "30d";
export type CommandCenterGrowthMetricId = "users" | "rent";

export type CommandCenterMetric = {
  label: string;
  value: string;
  help: string;
  state?: "ready" | "deferred" | "error";
};

export type CommandCenterGrowthPoint = {
  key: string;
  label: string;
  tooltipLabel: string;
  value: number;
  displayValue: string;
};

export type CommandCenterGrowthOverview = {
  metricId: CommandCenterGrowthMetricId;
  metricLabel: string;
  state: "ready" | "error";
  totalLabel: string;
  totalDisplay: string;
  averageDisplay: string;
  bestDisplay: string;
  bestSubLabel: string;
  periodLabel: string;
  points: CommandCenterGrowthPoint[];
};

export type CommandCenterSection = {
  title: string;
  eyebrow: string;
  metrics: CommandCenterMetric[];
};

type CountResult = { count: number | null; error: unknown };
type CountQuery = PromiseLike<CountResult>;

export function getCommandCenterRange(range: string | undefined) {
  const rangeId: CommandCenterRangeId =
    range === "today" || range === "7d" || range === "30d" ? range : "7d";
  const now = new Date();
  const start = new Date(now);

  if (rangeId === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (rangeId === "30d") {
    start.setDate(start.getDate() - 30);
  } else {
    start.setDate(start.getDate() - 7);
  }

  return { rangeId, start, end: now };
}

export async function getCommandCenterOverview(range: {
  start: Date;
  end: Date;
}, staff: StaffUser) {
  if (!staffHasCapability(staff, "command_center.view")) {
    throw new Error("Active Command Center staff authorization required.");
  }

  const supabase = getCommandCenterAdminClient();
  const startIso = range.start.toISOString();
  const endIso = range.end.toISOString();

  const [
    profiles,
    landlords,
    residents,
    newSignups,
    properties,
    activeLeases,
    rentCollectingProperties,
    successfulPayments,
    failedPayments,
    processingPayments,
    supportNew,
    supportOpen,
    supportUrgent,
    bankIssues,
    pendingInvites,
    setupProperties,
  ] = await Promise.all([
    countRows(() => supabase.from("profiles").select("id", { count: "exact", head: true })),
    countRows(() =>
      supabase
        .from("user_roles")
        .select("profile_id", { count: "exact", head: true })
        .eq("role", "landlord")
    ),
    countRows(() =>
      supabase
        .from("user_roles")
        .select("profile_id", { count: "exact", head: true })
        .eq("role", "tenant")
    ),
    countRows(() =>
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startIso)
        .lte("created_at", endIso)
    ),
    countRows(() =>
      supabase.from("properties").select("id", { count: "exact", head: true })
    ),
    countRows(() =>
      supabase
        .from("leases")
        .select("id", { count: "exact", head: true })
        .eq("lease_status", "active")
        .lte("start_date", endIso)
        .gte("end_date", endIso)
    ),
    getRentCollectingLandlords(),
    countRows(() =>
      supabase
        .from("rent_payments")
        .select("id", { count: "exact", head: true })
        .in("status", ["paid", "completed", "succeeded", "posted"])
        .gte("paid_at", startIso)
        .lte("paid_at", endIso)
    ),
    countRows(() =>
      supabase
        .from("rent_payments")
        .select("id", { count: "exact", head: true })
        .in("status", ["failed", "declined"])
        .gte("created_at", startIso)
        .lte("created_at", endIso)
    ),
    countRows(() =>
      supabase
        .from("rent_payments")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "processing"])
        .gte("created_at", startIso)
        .lte("created_at", endIso)
    ),
    countRows(() =>
      supabase
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startIso)
        .lte("created_at", endIso)
    ),
    countRows(() =>
      supabase
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "in_review"])
    ),
    countRows(() =>
      supabase
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .eq("priority", "urgent")
        .in("status", ["open", "in_review"])
    ),
    countRows(() =>
      supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .or("bank_status.is.null,bank_status.neq.connected")
    ),
    countRows(() =>
      supabase
        .from("tenant_access")
        .select("id", { count: "exact", head: true })
        .or("invite_status.is.null,invite_status.neq.accepted")
    ),
    countRows(() =>
      supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .or(
          "bank_status.is.null,bank_status.neq.connected,status.is.null,status.neq.active"
        )
    ),
  ]);

  const rentProcessed = await getRentProcessed(startIso, endIso);

  return [
    {
      title: "People",
      eyebrow: "Identity and engagement",
      metrics: [
        metric("Total registered users", profiles, "Supabase profiles."),
        metric("Landlords", landlords, "Profiles with landlord role."),
        metric("Residents", residents, "Profiles with tenant role."),
        metric("New signups", newSignups, "Profiles created in selected period."),
        deferred(
          "Engaged users",
          "Meaningful authenticated action tracking needs a consolidated event source."
        ),
      ],
    },
    {
      title: "Activation",
      eyebrow: "Portfolio setup",
      metrics: [
        deferred(
          "Setup incomplete landlords",
          "Requires milestone tracking across onboarding, leases, invites, and payouts."
        ),
        metric("Properties created", properties, "All property records."),
        metric("Active leases", activeLeases, "Leases active on the current date."),
        metric(
          "Rent-collecting landlords",
          rentCollectingProperties,
          "Distinct landlords with at least one connected payout property."
        ),
      ],
    },
    {
      title: "Payments",
      eyebrow: "Rent movement",
      metrics: [
        {
          label: "Rent processed",
          value: rentProcessed,
          help: "Successful rent payment volume in selected period.",
        },
        metric("Successful payments", successfulPayments, "Paid rent payment rows."),
        metric("Failed payments", failedPayments, "Failed or declined payments."),
        metric("Currently processing", processingPayments, "Pending or processing payments."),
      ],
    },
    {
      title: "Support",
      eyebrow: "Cases",
      metrics: [
        metric("New cases", supportNew, "Support tickets created in selected period."),
        metric("Open cases", supportOpen, "Open or in-review support tickets."),
        metric("Time-sensitive cases", supportUrgent, "Urgent open or in-review tickets."),
      ],
    },
    {
      title: "Operations",
      eyebrow: "Needs review",
      metrics: [
        metric("Bank connection issues", bankIssues, "Properties without connected payout."),
        metric("Pending resident invitations", pendingInvites, "Tenant access not accepted."),
        metric("Properties requiring setup", setupProperties, "Properties with incomplete status or payout."),
        metric("Failed payment items", failedPayments, "Failed payment rows requiring review."),
      ],
    },
  ] satisfies CommandCenterSection[];
}

export async function getCommandCenterGrowthOverview(
  range: {
    rangeId: CommandCenterRangeId;
    start: Date;
    end: Date;
  },
  metricId: CommandCenterGrowthMetricId
): Promise<CommandCenterGrowthOverview> {
  const definition = growthMetricDefinitions[metricId] || growthMetricDefinitions.users;
  const points = buildGrowthPoints(range);

  try {
    const supabase = getCommandCenterAdminClient();
    const startIso = points[0]?.start.toISOString() || range.start.toISOString();
    const endIso = range.end.toISOString();

    if (definition.id === "users") {
      const { data, error } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", startIso)
        .lte("created_at", endIso);

      if (error) throw error;

      for (const profile of data || []) {
        addToGrowthPoint(points, profile.created_at, 1);
      }
    } else {
      const { data, error } = await supabase
        .from("rent_payments")
        .select("amount, rent_amount_cents, paid_at")
        .in("status", ["paid", "completed", "succeeded", "posted"])
        .gte("paid_at", startIso)
        .lte("paid_at", endIso);

      if (error) throw error;

      for (const payment of data || []) {
        const cents = Number(payment.rent_amount_cents || 0);
        const amount = cents > 0 ? cents / 100 : Number(payment.amount || 0);
        addToGrowthPoint(points, payment.paid_at, Number.isFinite(amount) ? amount : 0);
      }
    }

    const values = points.map((point) => point.value);
    const total = values.reduce((sum, value) => sum + value, 0);
    const average = points.length ? total / points.length : 0;
    const best = values.length ? Math.max(...values) : 0;
    const bestPoint = best > 0 ? points.find((point) => point.value === best) : null;

    return {
      metricId: definition.id,
      metricLabel: definition.label,
      state: "ready",
      totalLabel: definition.totalLabel,
      totalDisplay: definition.format(total),
      averageDisplay: definition.formatAverage(average),
      bestDisplay: definition.format(best),
      bestSubLabel: bestPoint?.tooltipLabel || "No activity",
      periodLabel: formatGrowthPeriodLabel(range.rangeId, points),
      points: points.map((point) => ({
        key: point.key,
        label: point.label,
        tooltipLabel: point.tooltipLabel,
        value: point.value,
        displayValue: definition.format(point.value),
      })),
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center growth overview failed:", error);
    }

    return {
      metricId: definition.id,
      metricLabel: definition.label,
      state: "error",
      totalLabel: definition.totalLabel,
      totalDisplay: "Unavailable",
      averageDisplay: "Unavailable",
      bestDisplay: "Unavailable",
      bestSubLabel: "Unavailable",
      periodLabel: formatGrowthPeriodLabel(range.rangeId, points),
      points: points.map((point) => ({
        key: point.key,
        label: point.label,
        tooltipLabel: point.tooltipLabel,
        value: 0,
        displayValue: "Unavailable",
      })),
    };
  }
}

async function countRows(run: () => CountQuery) {
  try {
    const { count, error } = await run();
    if (error) throw error;
    return { count: count || 0, error: null };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center metric failed:", error);
    }
    return { count: null, error };
  }
}

async function getRentCollectingLandlords() {
  try {
    const supabase = getCommandCenterAdminClient();
    const { data, error } = await supabase
      .from("properties")
      .select("owner_profile_id")
      .eq("bank_status", "connected");

    if (error) throw error;

    const landlordIds = new Set(
      (data || [])
        .map((property) => property.owner_profile_id)
        .filter((id): id is string => Boolean(id))
    );

    return { count: landlordIds.size, error: null };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center rent-collecting landlords metric failed:", error);
    }
    return { count: null, error };
  }
}

async function getRentProcessed(startIso: string, endIso: string) {
  try {
    const supabase = getCommandCenterAdminClient();
    const { data, error } = await supabase
      .from("rent_payments")
      .select("amount, rent_amount_cents")
      .in("status", ["paid", "completed", "succeeded", "posted"])
      .gte("paid_at", startIso)
      .lte("paid_at", endIso);

    if (error) throw error;

    const total = (data || []).reduce((sum, payment) => {
      const cents = Number(payment.rent_amount_cents || 0);
      if (cents > 0) return sum + cents / 100;
      return sum + Number(payment.amount || 0);
    }, 0);

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(total);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center rent processed metric failed:", error);
    }
    return "Unavailable";
  }
}

function metric(label: string, result: Awaited<ReturnType<typeof countRows>>, help: string) {
  if (result.error) {
    return { label, value: "Unavailable", help, state: "error" as const };
  }

  return { label, value: String(result.count || 0), help };
}

function deferred(label: string, help: string): CommandCenterMetric {
  return { label, value: "Not configured", help, state: "deferred" };
}

type GrowthPointDraft = {
  key: string;
  label: string;
  tooltipLabel: string;
  start: Date;
  end: Date;
  value: number;
};

type GrowthMetricDefinition = {
  id: CommandCenterGrowthMetricId;
  label: string;
  totalLabel: string;
  format: (value: number) => string;
  formatAverage: (value: number) => string;
};

const countFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const averageFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

const commandCenterCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const growthMetricDefinitions: Record<CommandCenterGrowthMetricId, GrowthMetricDefinition> = {
  users: {
    id: "users",
    label: "Users",
    totalLabel: "Total users added",
    format: (value) => countFormatter.format(Math.round(value)),
    formatAverage: (value) => averageFormatter.format(value),
  },
  rent: {
    id: "rent",
    label: "Rent Processed",
    totalLabel: "Total rent processed",
    format: (value) => commandCenterCurrencyFormatter.format(value),
    formatAverage: (value) => commandCenterCurrencyFormatter.format(value),
  },
};

function buildGrowthPoints(range: { rangeId: CommandCenterRangeId; end: Date }) {
  const days = range.rangeId === "today" ? 1 : range.rangeId === "30d" ? 30 : 7;
  const endDay = startOfDay(range.end);
  const startDay = new Date(endDay);
  startDay.setDate(startDay.getDate() - (days - 1));

  return Array.from({ length: days }, (_, index): GrowthPointDraft => {
    const start = new Date(startDay);
    start.setDate(start.getDate() + index);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return {
      key: formatDateKey(start),
      label: range.rangeId === "today" ? "Today" : formatCompactDay(start),
      tooltipLabel: range.rangeId === "today" ? formatLongDay(start) : formatLongDay(start),
      start,
      end,
      value: 0,
    };
  });
}

function addToGrowthPoint(points: GrowthPointDraft[], dateValue: string | null, amount: number) {
  if (!dateValue || amount <= 0) return;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return;
  const point = points.find((item) => date >= item.start && date < item.end);
  if (point) point.value += amount;
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
    value.getDate()
  ).padStart(2, "0")}`;
}

function formatCompactDay(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(value);
}

function formatLongDay(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function formatGrowthPeriodLabel(rangeId: CommandCenterRangeId, points: GrowthPointDraft[]) {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return "Selected period";

  if (rangeId === "today") {
    return `Today · ${formatLongDay(last.start)}`;
  }

  const prefix = rangeId === "30d" ? "Last 30 Days" : "Last 7 Days";
  return `${prefix} · ${formatRangeDay(first.start)} – ${formatRangeDay(last.start, true)}`;
}

function formatRangeDay(value: Date, includeYear = false) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: includeYear ? "numeric" : undefined,
  }).format(value);
}
