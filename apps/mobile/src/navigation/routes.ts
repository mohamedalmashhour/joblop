export const productName = "Resident Workforce OS";

export const mobileTabs = [
  { id: "home", label: "Home", status: "Shell route only" },
  { id: "available", label: "Available", status: "G01 will implement shift discovery" },
  { id: "my-shifts", label: "My Shifts", status: "Reserved for G03" },
  { id: "billing", label: "Billing", status: "Reserved for G04" },
  { id: "profile", label: "Profile", status: "Worker identity foundation starts in G01" },
  { id: "notifications", label: "Notifications", status: "Reserved notification center" }
] as const;

export type MobileTabId = (typeof mobileTabs)[number]["id"];
