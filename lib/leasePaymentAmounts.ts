export type LeaseAmountLike = {
  amount_type?: string | null;
  amount?: number | string | null;
};

type LeasePaymentAmountInput = {
  cycleDate: Date;
  firstCycleDate: Date;
  monthlyRent: number;
  leaseSetupType?: string | null;
  leaseAmounts?: LeaseAmountLike[];
};

type FirstCycleInput = {
  startDate?: string | null;
  paymentTrackingStartDate?: string | null;
  leaseSetupType?: string | null;
  leaseAmounts?: LeaseAmountLike[];
};

export function getLeaseFirstPaymentCycleDate({
  startDate,
  paymentTrackingStartDate,
  leaseSetupType,
}: FirstCycleInput) {
  if (leaseSetupType === "existing" && paymentTrackingStartDate) {
    return getMonthStart(paymentTrackingStartDate);
  }

  if (!startDate) return null;

  const start = parseLocalDate(startDate);

  if (start.getDate() === 1) {
    return new Date(start.getFullYear(), start.getMonth(), 1);
  }

  return new Date(start.getFullYear(), start.getMonth() + 1, 1);
}

export function getLeasePaymentAmountForCycle({
  cycleDate,
  firstCycleDate,
  monthlyRent,
  leaseSetupType,
  leaseAmounts = [],
}: LeasePaymentAmountInput) {
  const isFirstCycle = isSamePaymentMonth(cycleDate, firstCycleDate);

  if (!isFirstCycle) return monthlyRent;

  const proratedRent =
    leaseSetupType === "new" ? getProratedRentAmount(leaseAmounts) || 0 : 0;
  const adjustmentTotal = leaseAmounts.reduce((sum, item) => {
    const type = normalizeAmountType(item.amount_type);
    if (!type || type === "prorated rent") return sum;

    const amount = Number(item.amount || 0);
    if (!Number.isFinite(amount)) return sum;

    if (type === "one-time discount") return sum - amount;
    return sum + amount;
  }, 0);

  return Math.max(0, roundCurrency(monthlyRent + proratedRent + adjustmentTotal));
}

export function getProratedRentAmount(leaseAmounts: LeaseAmountLike[] = []) {
  const row = leaseAmounts.find(
    (item) => normalizeAmountType(item.amount_type) === "prorated rent"
  );

  if (!row) return null;

  const amount = Number(row.amount || 0);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function parseLocalDate(value: string) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSamePaymentMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function getMonthStart(value: string) {
  const date = parseLocalDate(value);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function normalizeAmountType(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}
