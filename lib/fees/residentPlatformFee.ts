export const AVENUEBOARD_PLATFORM_FEE_CENTS = 1000;

export function parseLandlordAbsorbsResidentPlatformFee(value: unknown) {
  if (value === true) return true;
  if (typeof value === "string") return value.trim().toLowerCase() === "true";
  return false;
}

export function calculateResidentPlatformFee({
  rentAmountCents,
  landlordAbsorbsFee,
}: {
  rentAmountCents: number;
  landlordAbsorbsFee: boolean;
}) {
  const applicationFeeCents = AVENUEBOARD_PLATFORM_FEE_CENTS;
  const residentPlatformFeeCents = landlordAbsorbsFee
    ? 0
    : AVENUEBOARD_PLATFORM_FEE_CENTS;

  return {
    applicationFeeCents,
    residentPlatformFeeCents,
    totalAmountCents: rentAmountCents + residentPlatformFeeCents,
  };
}
