import type { Currency, MoneyAmount } from "./moneyEngine";
import type { PreferredLanguage } from "./worker";

export const shiftStatuses = [
  "draft",
  "published",
  "open",
  "reserved",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "expired"
] as const;

export const shiftUrgencies = ["normal", "urgent", "immediate"] as const;

export const shiftCategories = ["kitchen", "care", "housekeeping", "maintenance"] as const;

export const timesOfDay = ["morning", "afternoon", "evening", "night"] as const;

export type ShiftStatus = (typeof shiftStatuses)[number];
export type ShiftUrgency = (typeof shiftUrgencies)[number];
export type ShiftCategory = (typeof shiftCategories)[number];
export type TimeOfDay = (typeof timesOfDay)[number];

export type ShiftDiscoveryRecord = Readonly<{
  id: string;
  employerId: string;
  employerName: string;
  employerRating: number;
  title: string;
  category: ShiftCategory;
  description: string;
  duties: readonly string[];
  city: string;
  province: string;
  country: string;
  addressSummary: string;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  startAt: string;
  endAt: string;
  hourlyRate: MoneyAmount;
  currency: Currency;
  estimatedTotal: MoneyAmount;
  requiredExperienceYears: number;
  requiredCertifications: readonly string[];
  requiredLanguages: readonly PreferredLanguage[];
  dressCode: string;
  breakPolicy: string;
  cancellationPolicy: string;
  applicationDeadline: string;
  status: ShiftStatus;
  urgency: ShiftUrgency;
  createdAt: string;
  updatedAt: string;
}>;

export type ShiftDiscoveryFilters = Readonly<{
  keyword?: string;
  city?: string;
  category?: ShiftCategory;
  date?: string;
  minimumHourlyRateMinor?: number;
  timeOfDay?: TimeOfDay;
  urgency?: ShiftUrgency;
}>;

export type ShiftDiscoveryRepository = Readonly<{
  listAvailableShifts(filters?: ShiftDiscoveryFilters): Promise<readonly ShiftDiscoveryRecord[]>;
  getShiftById(id: string): Promise<ShiftDiscoveryRecord | null>;
  listShiftCategories(): Promise<readonly ShiftCategory[]>;
  listSupportedCities(): Promise<readonly string[]>;
}>;
