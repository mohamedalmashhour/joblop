import { z } from "zod";
import { preferredLanguages, verificationStatuses, workEligibilityStatuses } from "@rwos/shared";

export const isoDateTimeSchema = z
  .string()
  .refine(
    (value) => !Number.isNaN(Date.parse(value)),
    "Expected an ISO-compatible datetime string"
  );

export const workerIdentitySchema = z
  .object({
    id: z.string().min(1).max(120),
    firstName: z.string().min(1).max(120),
    lastName: z.string().min(1).max(120),
    displayName: z.string().min(1).max(160),
    email: z.string().email(),
    phone: z.string().min(7).max(40),
    preferredLanguage: z.enum(preferredLanguages),
    profilePhotoUrl: z.string().url().nullable(),
    city: z.string().min(1).max(120),
    province: z.string().min(1).max(80),
    country: z.string().min(2).max(80),
    workEligibilityStatus: z.enum(workEligibilityStatuses),
    profileCompletionPercent: z.number().int().min(0).max(100),
    verificationStatus: z.enum(verificationStatuses),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema
  })
  .readonly();

export type WorkerIdentityInput = z.input<typeof workerIdentitySchema>;
