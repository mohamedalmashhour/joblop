export const notificationCategories = [
  "shift",
  "application",
  "attendance",
  "billing",
  "payment",
  "document",
  "account",
  "support",
  "platform"
] as const;

export type NotificationCategory = (typeof notificationCategories)[number];
