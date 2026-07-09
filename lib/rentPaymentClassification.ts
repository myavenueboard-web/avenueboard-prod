export type RentPaymentClassificationRecord = {
  id: string;
  lease_id?: string | null;
  property_id?: string | null;
  tenant_access_id?: string | null;
  status?: string | null;
  amount?: number | null;
  rent_amount_cents?: number | null;
  tenant_service_fee_cents?: number | null;
  period_label?: string | null;
  rent_cycle_key?: string | null;
  due_date?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_checkout_session_id?: string | null;
  stripe_charge_id?: string | null;
  payment_intent_id?: string | null;
  charge_id?: string | null;
  payout_id?: string | null;
  stripe_payout_id?: string | null;
  processor_reference?: string | null;
  processor_payment_id?: string | null;
  receipt_url?: string | null;
};

export type CollectedRentPayment<T extends RentPaymentClassificationRecord> = {
  payment: T;
  amount: number;
  cycleKey: string;
};

export function isCollectedRentStatus(status?: string | null) {
  const normalized = String(status || "").toLowerCase();
  return ["paid", "completed", "complete", "succeeded", "success", "posted"].includes(
    normalized
  );
}

export function hasActualRentReceiptMarker(
  payment: RentPaymentClassificationRecord
) {
  return Boolean(
    payment.stripe_payment_intent_id ||
      payment.stripe_checkout_session_id ||
      payment.stripe_charge_id ||
      payment.payment_intent_id ||
      payment.charge_id ||
      payment.payout_id ||
      payment.stripe_payout_id ||
      payment.processor_reference ||
      payment.processor_payment_id ||
      payment.receipt_url
  );
}

export function getActualRentAmount(payment: RentPaymentClassificationRecord) {
  const rentAmountCents = Number(payment.rent_amount_cents || 0);
  if (rentAmountCents > 0) return rentAmountCents / 100;

  const amount = Number(payment.amount || 0);
  return amount > 0 ? amount : 0;
}

export function representsActualCollectedRent(
  payment: RentPaymentClassificationRecord
) {
  return (
    isCollectedRentStatus(payment.status) &&
    Boolean(payment.paid_at) &&
    hasActualRentReceiptMarker(payment) &&
    getActualRentAmount(payment) > 0
  );
}

export function getPaymentMonthKey(date: Date) {
  return formatYearMonthKey(date);
}

export function paymentMatchesCycle(
  payment: RentPaymentClassificationRecord,
  date: Date
) {
  const paymentKey = getPaymentMonthKey(date);
  if (normalizeRentCycleKey(payment.rent_cycle_key) === paymentKey) return true;

  const labelKey = normalizePeriodLabel(payment.period_label);
  if (labelKey === paymentKey) return true;

  const month = date.toLocaleDateString("en-US", { month: "long" }).toLowerCase();
  const shortMonth = date
    .toLocaleDateString("en-US", { month: "short" })
    .toLowerCase();
  const year = String(date.getFullYear());
  const label = String(payment.period_label || "").toLowerCase();

  return (
    (label.includes(month) || label.includes(shortMonth)) &&
    (!label.match(/\d{4}/) || label.includes(year))
  );
}

export function findCollectedPaymentForCycle<
  T extends RentPaymentClassificationRecord
>(payments: T[], date: Date) {
  const matchingPayments = payments.filter(
    (payment) => representsActualCollectedRent(payment) && paymentMatchesCycle(payment, date)
  );
  if (!matchingPayments.length) return undefined;

  return getCollectedRentPayments(matchingPayments)[0]?.payment;
}

export function getPaymentCycleKey(payment: RentPaymentClassificationRecord) {
  const ownerKey = payment.lease_id || payment.property_id || payment.tenant_access_id;
  if (!ownerKey) return null;

  const cycleKey =
    normalizeRentCycleKey(payment.rent_cycle_key) ||
    normalizePeriodLabel(payment.period_label) ||
    normalizePaymentMonth(payment.due_date) ||
    normalizePaymentMonth(payment.paid_at) ||
    normalizePaymentMonth(payment.created_at);

  return cycleKey ? `${ownerKey}:${cycleKey}` : null;
}

export function getCollectedRentPayments<T extends RentPaymentClassificationRecord>(
  payments: T[],
  isInRange?: (payment: T) => boolean
) {
  const groupedPayments = new Map<
    string,
    Array<CollectedRentPayment<T>>
  >();

  payments.forEach((payment) => {
    if (!representsActualCollectedRent(payment)) return;
    if (isInRange && !isInRange(payment)) return;

    const cycleKey = getPaymentCycleKey(payment);
    if (!cycleKey) return;

    const group = groupedPayments.get(cycleKey) || [];
    group.push({
      payment,
      amount: getActualRentAmount(payment),
      cycleKey,
    });
    groupedPayments.set(cycleKey, group);
  });

  return Array.from(groupedPayments.values()).map((group) =>
    group.sort(compareCollectedRentPayments)[0]
  );
}

function compareCollectedRentPayments<T extends RentPaymentClassificationRecord>(
  first: CollectedRentPayment<T>,
  second: CollectedRentPayment<T>
) {
  const firstScore = getCollectedRentPaymentScore(first.payment, first.amount);
  const secondScore = getCollectedRentPaymentScore(second.payment, second.amount);
  if (firstScore !== secondScore) return secondScore - firstScore;

  const firstTime = Date.parse(first.payment.paid_at || first.payment.created_at || "");
  const secondTime = Date.parse(second.payment.paid_at || second.payment.created_at || "");
  return (Number.isFinite(secondTime) ? secondTime : 0) - (Number.isFinite(firstTime) ? firstTime : 0);
}

function getCollectedRentPaymentScore(
  payment: RentPaymentClassificationRecord,
  amount: number
) {
  let score = 0;
  if (payment.paid_at) score += 100;
  if (hasActualRentReceiptMarker(payment)) score += 75;
  if ((payment.rent_amount_cents || 0) > 0) score += 50;
  if (amount > 0) score += 10;
  return score;
}

function normalizeRentCycleKey(value?: string | null) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || null;
}

function normalizePeriodLabel(value?: string | null) {
  const periodDate = parsePeriodMonth(value);
  if (periodDate) return formatYearMonthKey(periodDate);
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || null;
}

function normalizePaymentMonth(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : formatYearMonthKey(date);
}

function parsePeriodMonth(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(`${value} 1`);
  return Number.isNaN(parsed.getTime())
    ? null
    : new Date(parsed.getFullYear(), parsed.getMonth(), 1);
}

function formatYearMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
