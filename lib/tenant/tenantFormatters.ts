export function formatDueDate(rentDueDay?: string | null) {
  const day = String(rentDueDay || "1st of the Month").match(/\d+/)?.[0] || "1";
  return `June ${day}, 2026`;
}

export function formatDate(date?: string | null) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getFileLabel(fileName?: string | null, fileType?: string | null) {
  const extension = fileName?.split(".").pop()?.toUpperCase();

  if (extension) return extension.slice(0, 4);
  if (fileType?.includes("pdf")) return "PDF";
  if (fileType?.includes("image")) return "IMG";
  if (fileType?.includes("word")) return "DOC";

  return "FILE";
}

export function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatCurrency(amount?: number | null) {
  return `$${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatActivityStatus(status: string) {
  return status
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function truncateActivityText(text: string) {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (normalized.length <= 90) return normalized;
  return `${normalized.slice(0, 87)}...`;
}

export function getTenantActivityStorageKey(profileId: string) {
  return `avenueboard:tenant-activity:${profileId}`;
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function getFirstName(name: string) {
  return name.split(" ").filter(Boolean)[0] || "there";
}

export function getTimeBasedGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function formatBrand(brand?: string | null) {
  if (!brand) return "Payment Method";
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

export function getMonthsRemaining(endDate?: string | null) {
  if (!endDate) return 0;

  const end = new Date(endDate);
  const today = new Date();

  const months =
    (end.getFullYear() - today.getFullYear()) * 12 +
    (end.getMonth() - today.getMonth());

  return Math.max(months, 0);
}
