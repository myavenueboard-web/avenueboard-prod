export const ENABLE_AVENUE_PERKS = false;
export const ENABLE_CREDIT_BUILDING = false;

export function isPhaseOneHiddenFeature(id: string) {
  const normalizedId = id.toLowerCase();

  return (
    (!ENABLE_AVENUE_PERKS &&
      (normalizedId.includes("avenue-perks") ||
        normalizedId.includes("perks") ||
        normalizedId.includes("rewards"))) ||
    (!ENABLE_CREDIT_BUILDING &&
      (normalizedId.includes("credit-building") ||
        normalizedId.includes("credit-reporting") ||
        normalizedId.includes("credit")))
  );
}
