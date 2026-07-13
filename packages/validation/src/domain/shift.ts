import { z } from "zod";
import { currencies, preferredLanguages, shiftCategories, shiftStatuses, shiftUrgencies, timesOfDay } from "@rwos/shared";
import { isoDateTimeSchema } from "./worker";

export const moneyAmountSchema = z
  .object({
    amountMinor: z.number().int().min(0),
    currency: z.enum(currencies)
  })
  .readonly();

export const shiftDiscoveryRecordSchema = z
  .object({
    id: z.string().min(1).max(120),
    employerId: z.string().min(1).max(120),
    employerName: z.string().min(1).max(180),
    employerRating: z.number().min(0).max(5),
    title: z.string().min(1).max(180),
    category: z.enum(shiftCategories),
    description: z.string().min(1).max(2_000),
    duties: z.array(z.string().min(1).max(240)).min(1).readonly(),
    city: z.string().min(1).max(120),
    province: z.string().min(1).max(80),
    country: z.string().min(2).max(80),
    addressSummary: z.string().min(1).max(240),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    distanceKm: z.number().min(0).nullable(),
    startAt: isoDateTimeSchema,
    endAt: isoDateTimeSchema,
    hourlyRate: moneyAmountSchema,
    currency: z.enum(currencies),
    estimatedTotal: moneyAmountSchema,
    requiredExperienceYears: z.number().int().min(0).max(80),
    requiredCertifications: z.array(z.string().min(1).max(160)).readonly(),
    requiredLanguages: z.array(z.enum(preferredLanguages)).min(1).readonly(),
    dressCode: z.string().min(1).max(500),
    breakPolicy: z.string().min(1).max(500),
    cancellationPolicy: z.string().min(1).max(500),
    applicationDeadline: isoDateTimeSchema,
    status: z.enum(shiftStatuses),
    urgency: z.enum(shiftUrgencies),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema
  })
  .readonly()
  .superRefine((shift, context) => {
    if (Date.parse(shift.endAt) <= Date.parse(shift.startAt)) {
      context.addIssue({
        code: "custom",
        message: "Shift endAt must be after startAt",
        path: ["endAt"]
      });
    }

    if (Date.parse(shift.applicationDeadline) > Date.parse(shift.startAt)) {
      context.addIssue({
        code: "custom",
        message: "Application deadline must be before the shift starts",
        path: ["applicationDeadline"]
      });
    }

    if (
      shift.hourlyRate.currency !== shift.currency ||
      shift.estimatedTotal.currency !== shift.currency
    ) {
      context.addIssue({
        code: "custom",
        message: "Shift money values must match the shift currency",
        path: ["currency"]
      });
    }
  });

export const shiftDiscoveryFiltersSchema = z
  .object({
    keyword: z.string().min(1).max(120).optional(),
    city: z.string().min(1).max(120).optional(),
    category: z.enum(shiftCategories).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u).optional(),
    minimumHourlyRateMinor: z.number().int().min(0).optional(),
    timeOfDay: z.enum(timesOfDay).optional(),
    urgency: z.enum(shiftUrgencies).optional()
  })
  .readonly();

export type ShiftDiscoveryRecordInput = z.input<typeof shiftDiscoveryRecordSchema>;
export type ShiftDiscoveryFiltersInput = z.input<typeof shiftDiscoveryFiltersSchema>;
