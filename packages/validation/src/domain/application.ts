import { z } from "zod";
import {
  applicationSources,
  applicationStatuses,
  auditActorTypes,
  auditEntityTypes,
  auditResults,
  confirmationStatuses,
  currencies,
  offerStatuses,
  shiftCategories,
  shiftStatuses,
  shiftUrgencies,
  preferredLanguages
} from "@rwos/shared";
import { moneyAmountSchema } from "./shift";
import { isoDateTimeSchema } from "./worker";

const nullableIsoDateTimeSchema = isoDateTimeSchema.nullable();

export const shiftOfferSnapshotSchema = z
  .object({
    id: z.string().min(1).max(120),
    employerId: z.string().min(1).max(120),
    employerName: z.string().min(1).max(180),
    title: z.string().min(1).max(180),
    category: z.enum(shiftCategories),
    city: z.string().min(1).max(120),
    province: z.string().min(1).max(80),
    country: z.string().min(2).max(80),
    addressSummary: z.string().min(1).max(240),
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
    urgency: z.enum(shiftUrgencies)
  })
  .readonly()
  .superRefine((snapshot, context) => {
    if (Date.parse(snapshot.endAt) <= Date.parse(snapshot.startAt)) {
      context.addIssue({
        code: "custom",
        message: "Shift snapshot endAt must be after startAt",
        path: ["endAt"]
      });
    }

    if (
      snapshot.hourlyRate.currency !== snapshot.currency ||
      snapshot.estimatedTotal.currency !== snapshot.currency
    ) {
      context.addIssue({
        code: "custom",
        message: "Shift snapshot money values must match currency",
        path: ["currency"]
      });
    }
  });

export const workerApplicationSchema = z
  .object({
    id: z.string().min(1).max(120),
    workerId: z.string().min(1).max(120),
    shiftId: z.string().min(1).max(120),
    status: z.enum(applicationStatuses),
    submittedAt: nullableIsoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
    withdrawnAt: nullableIsoDateTimeSchema,
    rejectionReason: z.string().min(1).max(500).nullable(),
    source: z.enum(applicationSources),
    workerNote: z.string().min(1).max(500).nullable()
  })
  .readonly();

export const shiftOfferSchema = z
  .object({
    id: z.string().min(1).max(120),
    applicationId: z.string().min(1).max(120),
    workerId: z.string().min(1).max(120),
    shiftId: z.string().min(1).max(120),
    employerId: z.string().min(1).max(120),
    status: z.enum(offerStatuses),
    offeredAt: isoDateTimeSchema,
    expiresAt: isoDateTimeSchema,
    respondedAt: nullableIsoDateTimeSchema,
    message: z.string().min(1).max(800).nullable(),
    originalShiftSnapshot: shiftOfferSnapshotSchema,
    currentShiftSnapshot: shiftOfferSnapshotSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema
  })
  .readonly()
  .superRefine((offer, context) => {
    if (Date.parse(offer.expiresAt) <= Date.parse(offer.offeredAt)) {
      context.addIssue({
        code: "custom",
        message: "Offer expiresAt must be after offeredAt",
        path: ["expiresAt"]
      });
    }
  });

export const workerConfirmationSchema = z
  .object({
    id: z.string().min(1).max(120),
    workerId: z.string().min(1).max(120),
    shiftId: z.string().min(1).max(120),
    applicationId: z.string().min(1).max(120),
    offerId: z.string().min(1).max(120),
    status: z.enum(confirmationStatuses),
    requestedAt: isoDateTimeSchema,
    confirmedAt: nullableIsoDateTimeSchema,
    declinedAt: nullableIsoDateTimeSchema,
    expiresAt: isoDateTimeSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema
  })
  .readonly()
  .superRefine((confirmation, context) => {
    if (Date.parse(confirmation.expiresAt) <= Date.parse(confirmation.requestedAt)) {
      context.addIssue({
        code: "custom",
        message: "Confirmation expiresAt must be after requestedAt",
        path: ["expiresAt"]
      });
    }
  });

export const localAuditEventSchema = z
  .object({
    id: z.string().min(1).max(120),
    timestamp: isoDateTimeSchema,
    actorType: z.enum(auditActorTypes),
    actorId: z.string().min(1).max(120),
    action: z.string().min(1).max(120),
    entityType: z.enum(auditEntityTypes),
    entityId: z.string().min(1).max(120),
    result: z.enum(auditResults),
    reason: z.string().min(1).max(500).nullable(),
    correlationId: z.string().min(1).max(120)
  })
  .readonly();

export const workerApplicationSummarySchema = z
  .object({
    application: workerApplicationSchema,
    shift: shiftOfferSnapshotSchema,
    offer: shiftOfferSchema.nullable(),
    confirmation: workerConfirmationSchema.nullable()
  })
  .readonly();

export type WorkerApplicationInput = z.input<typeof workerApplicationSchema>;
export type ShiftOfferInput = z.input<typeof shiftOfferSchema>;
export type WorkerConfirmationInput = z.input<typeof workerConfirmationSchema>;
