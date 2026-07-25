export function formatNumber(value: number) {
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 }).format(value || 0);
}

export function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

export function formatDate(value?: string | null, withTime = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(
    "it-IT",
    withTime
      ? { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }
      : { day: "numeric", month: "long", year: "numeric" },
  ).format(new Date(value));
}
