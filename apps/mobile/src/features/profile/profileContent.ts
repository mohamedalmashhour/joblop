// Pure helpers for the profile screen (same keys and save body as the website's HR profile page).
import type { WorkerIntake } from "../../auth/secureSession";

const STANDING_KEY: Readonly<Record<string, string>> = {
  active: "hr.standingActive",
  review_required: "hr.standingReview",
  restricted: "hr.standingRestricted",
  suspended: "hr.standingSuspended",
  inactive: "hr.standingInactive"
};

const CREDENTIAL_KEY: Readonly<Record<string, string>> = {
  valid: "hr.credValid",
  expiring: "hr.credExpiring",
  expired: "hr.credExpired",
  replaced: "hr.credReplaced",
  revoked: "hr.credRevoked"
};

const CATEGORY_KEY: Readonly<Record<string, string>> = {
  kitchen: "cat.kitchen",
  care_nursing: "cat.careNursing",
  housekeeping_support: "cat.housekeepingSupport",
  maintenance: "cat.maintenance",
  pharmacy: "cat.pharmacy",
  factory_production: "cat.factoryProduction",
  warehouse_logistics: "cat.warehouseLogistics",
  construction_trades: "cat.constructionTrades",
  retail_sales: "cat.retailSales",
  hospitality_events: "cat.hospitalityEvents",
  transport_delivery: "cat.transportDelivery",
  security: "cat.security",
  office_admin: "cat.officeAdmin",
  childcare_education: "cat.childcareEducation",
  farming_agriculture: "cat.farmingAgriculture"
};

export function standingKey(standing: string): string {
  return STANDING_KEY[standing] ?? "hr.standingInactive";
}

export function credentialStatusKey(status: string): string {
  return CREDENTIAL_KEY[status] ?? "hr.credValid";
}

export function categoryLabelKey(key: string): string | null {
  return CATEGORY_KEY[key] ?? null;
}

/** The PUT /hr/worker body, exactly as the website sends it. */
export function intakeBody(form: WorkerIntake): Record<string, string | boolean | null> {
  return {
    legalFirstName: form.legalFirstName,
    legalLastName: form.legalLastName,
    phone: form.phone,
    addressLine: form.addressLine,
    city: form.city,
    province: form.province,
    postalCode: form.postalCode,
    hasDrivingLicence: form.hasDrivingLicence,
    licenceClass: form.hasDrivingLicence ? form.licenceClass : null,
    licenceExpiry: form.hasDrivingLicence ? form.licenceExpiry || null : null,
    hasVehicle: form.hasVehicle,
    vehicleType: null,
    canTravelKm: null,
    transportNotes: form.transportNotes,
    marketingEmailOptIn: form.marketingEmailOptIn
  };
}
