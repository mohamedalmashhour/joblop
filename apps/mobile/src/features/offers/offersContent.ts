// Pure helpers for the "My offers" screen (same status words as the website's offers page).

const RESPONDABLE = new Set(["sent", "delivered", "viewed"]);

const STATUS_KEY: Readonly<Record<string, string>> = {
  draft: "offers.statusPreparing",
  approved: "offers.statusPreparing",
  sent: "offers.statusAwaiting",
  delivered: "offers.statusAwaiting",
  viewed: "offers.statusAwaiting",
  accepted: "offers.statusAccepted",
  declined: "offers.statusDeclined",
  expired: "offers.statusExpired",
  withdrawn: "offers.statusWithdrawn",
  cancelled: "offers.statusCancelled"
};

export function isRespondable(status: string): boolean {
  return RESPONDABLE.has(status);
}

export function offerStatusKey(status: string): string {
  return STATUS_KEY[status] ?? "offers.statusPreparing";
}

export function offerStatusTone(status: string): "neutral" | "success" | "warning" | "danger" {
  if (status === "accepted") return "success";
  if (["declined", "expired", "withdrawn", "cancelled"].includes(status)) return "danger";
  if (RESPONDABLE.has(status)) return "warning";
  return "neutral";
}

/** "Wed, Jul 1, 8:00 a.m. – 4:00 p.m." in the offer's time zone, or null when unknown. */
export function offerWhen(
  offer: Readonly<{ startAt: string | null; endAt: string | null; timezone: string | null }>,
  formatLocale: string
): string | null {
  if (!offer.startAt) return null;
  const start = new Date(offer.startAt);
  if (Number.isNaN(start.getTime())) return null;
  const zone = offer.timezone ? { timeZone: offer.timezone } : {};
  try {
    const day = start.toLocaleDateString(formatLocale, { weekday: "short", month: "short", day: "numeric", ...zone });
    const time = (d: Date) => d.toLocaleTimeString(formatLocale, { hour: "numeric", minute: "2-digit", ...zone });
    if (!offer.endAt) return `${day}, ${time(start)}`;
    const end = new Date(offer.endAt);
    return Number.isNaN(end.getTime()) ? `${day}, ${time(start)}` : `${day}, ${time(start)} – ${time(end)}`;
  } catch {
    return start.toISOString().slice(0, 16).replace("T", " ");
  }
}
