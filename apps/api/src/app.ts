import { createHmac } from "node:crypto";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import {
  AuthenticationError,
  AuthenticationRequiredError,
  AssignmentError,
  AssignmentTransactionUnavailableError,
  AttendanceError,
  CalendarRequestError,
  DepartmentError,
  DispatchError,
  EmployerOrganizationError,
  JobRequestError,
  OrganizationMembershipError,
  PasswordPolicyError,
  ResidenceError,
  RegistrationUnavailableError,
  RoleDefinitionError,
  TimesheetError,
  WorkerOfferError,
  WorkGroupError,
  authenticationErrorCode,
  authenticationErrorMessage,
  authenticationRequiredCode,
  authorizationDeniedCode,
  authorizationDeniedMessage,
  createAuthenticationService,
  createAssignmentService,
  createAttendanceService,
  createCalendarRequestService,
  createAuthorizationService,
  createDepartmentService,
  createDispatchService,
  createEmployerContractService,
  createEmployerCancellationService,
  createEmployerReduceService,
  createPrismaReduceJobRequestReader,
  createPrismaConfirmedAssignmentLister,
  createPrismaReduceContractRateReader,
  createPrismaReduceStore,
  EmployerReduceError,
  createEmployerRequestEditService,
  createPrismaProfileWriter,
  createPrismaProposalStore,
  EmployerRequestEditError,
  createWorkerSavedJobsService,
  createPrismaWorkerIdentityResolver,
  createPrismaSavedJobVisibilityReader,
  createPrismaSavedJobStore,
  WorkerSavedJobError,
  createWorkerJobInterestService,
  createPrismaInterestWorkerIdentityResolver,
  createPrismaInterestJobReader,
  createPrismaInterestEngagementReader,
  createPrismaInterestStore,
  WorkerJobInterestError,
  createVerificationService,
  createPrismaVerificationStore,
  createPrismaVerificationWorkerResolver,
  createFixtureIdentityProvider,
  createFixtureBackgroundCheckProvider,
  createFixtureBusinessProvider,
  createHmacCallbackVerifier,
  normalizeFixtureCallback,
  VerificationError,
  createHrService,
  createPrismaHrStore,
  createPrismaHrWorkerResolver,
  HrError,
  canWorkerExpressInterest,
  canWorkerReceiveOffer,
  DEFAULT_VERIFICATION_POLICY,
  type HrStanding,
  createHrDocumentService,
  createPrismaHrDocumentStore,
  createPrismaHrDocWorkerResolver,
  createFixtureDocumentStorageProvider,
  HrDocumentError,
  createComplianceEvaluator,
  createPrismaComplianceRequirementResolver,
  createPrismaComplianceEvidenceReader,
  createPayrollService,
  createSyntheticPayrollRuleProvider,
  assemblePayrollReviewContext,
  createSyntheticPayrollReviewProvider,
  runPayrollReview,
  type PayrollReviewProvider,
  assemblePayrollPeriodReviewContext,
  type RawPeriodReviewWorker,
  PAYROLL_PERIOD_REVIEW_MAX_WORKERS,
  assemblePayrollProvenance,
  computePayrollReviewFlags,
  DEFAULT_PAYROLL_REVIEW_THRESHOLDS,
  resolveEgressMode,
  createEgressGatedProvider,
  PAYROLL_REVIEW_PROMPT_VERSION,
  PAYROLL_REVIEW_FLAG_ENGINE_VERSION,
  PAYROLL_REVIEW_OUTPUT_CONTRACT_VERSION,
  PAYROLL_REVIEW_DEFAULT_TIMEOUT_MS,
  type PayrollReviewExternalProvider,
  emitPayrollReviewTelemetry,
  createLoggerTelemetrySink,
  mapTelemetryFailureReason,
  type PayrollReviewTelemetrySink,
  PayrollError,
  type HrDocumentStatus,
  createPrismaCancellationJobRequestReader,
  createPrismaConfirmedAssignmentReader,
  createPrismaContractRateReader,
  createPrismaCancellationStore,
  CONFIRMED_ASSIGNMENT_STATUSES,
  EmployerCancellationError,
  createPrismaEmployerContractRepository,
  EmployerContractError,
  createEmployerOrganizationService,
  createJobRequestService,
  createOrganizationMembershipService,
  createResidenceService,
  createRoleDefinitionService,
  createTimesheetService,
  createWorkerOfferService,
  createWorkGroupService,
  createPrismaAssignmentRepository,
  createPrismaAttendanceRepository,
  createPrismaCalendarRequestProfileRepository,
  createPrismaConfirmedAssignmentCoverageReader,
  createPrismaDepartmentRepository,
  createPrismaDispatchRepository,
  createPrismaAuthenticationRepository,
  createPrismaEmployerOrganizationRepository,
  createPrismaJobRequestRepository,
  createPrismaOrganizationMembershipRepository,
  createPrismaResidenceRepository,
  createPrismaRoleDefinitionRepository,
  createPrismaTimesheetRepository,
  createPrismaWorkerOfferRepository,
  createPrismaWorkGroupRepository,
  createHttpCandidateSource,
  createLocalMarketplaceCandidateSource,
  createHttpWorkerOfferDeliveryProvider,
  createResendWorkerOfferDeliveryProvider,
  passwordPolicyErrorCode,
  registrationUnavailableCode,
  toSafeAuthorizationResponse,
  type AuthorizationRoleKey,
  type AuthorizationService,
  type AssignmentService,
  type AssignmentStatus,
  type AttendanceService,
  type AttendanceStatus,
  type AuthenticationService,
  type CalendarRequestService,
  type CalendarVerificationState,
  type DepartmentService,
  type DepartmentStatus,
  type ContractRoleRateInput,
  type DispatchService,
  type DispatchPriority,
  type EmployerContractService,
  type AssignmentCancelPort,
  type SelectedAssignmentCancelPort,
  type EmployerOrganizationService,
  type JobRequestService,
  type JobRequestType,
  type JobRequestUrgency,
  type OrganizationMembershipService,
  type ResidenceService,
  type ResidenceStatus,
  type RoleDefinitionService,
  type TimesheetService,
  type TimesheetStatus,
  type WorkerOfferService,
  type WorkerOfferStatus,
  type WorkGroupService
} from "@rwos/auth";
import { getRuntimeConfig, type CountryAddressPort } from "@rwos/config";
import { createPrismaClient } from "@rwos/database";
import { createLogger } from "@rwos/observability";
import {
  createLocalFakePaymentProvider,
  classifyRequestEdit,
  createFixtureGeocodingProvider,
  createGoogleGeocodingProvider,
  searchNearbyJobs,
  boundingBoxKm,
  geodesicDistanceKm,
  isProvinceCode,
  isValidCoordinate,
  type RequestEditState,
  type GeocodingProvider,
  type MarketplaceJobCandidate,
  toMarketplaceJobDetail,
  toMarketplaceEmployerProfile,
  createGoogleDistanceMatrixProvider,
  toPublicTravelEstimate,
  type TravelTimeProvider,
  type MarketplaceJobDetailCandidate,
  type MarketplaceEmployerProfileCandidate,
  type ProvinceCode,
  buildVariableClientQuote,
  normalizeAdzunaJobs,
  dedupeLeads,
  rankLeadsForWorker,
  prioritizeProLeads,
  type WorkerMatchProfile,
  type ExternalJobLead
} from "@rwos/shared";
import {
  createTrustedServiceIdentityHeaders,
  type IdentityTokenProvider,
  type TrustedAudienceRegistry,
  type TrustedService
} from "@rwos/service-auth";
import { createAdzunaClient } from "./jobScannerClient";
import { upsertLeads, queryStoredLeads } from "./jobScannerRepository";
import { startJobScannerSchedule, type ScanQuery } from "./jobScannerScheduler";
import { type WorkerCvProfile, type TargetJob } from "./cvBuilder";
import { getCvProvider } from "./cvBuilderClaude";
import { createCvAsset, listCvAssets, deleteCvAsset } from "./cvAssetRepository";
import { isPro, getActiveEntitlement, grantEntitlement, revokeEntitlement, PRO_PLAN } from "./cvEntitlementRepository";
import {
  createPendingOrder,
  listOrders,
  claimETransfer,
  completeStripeOrder,
  listOrdersForReview,
  adminConfirmOrder,
  adminRejectOrder,
  eTransferInstructions,
  isPurchaseEnabled,
  PRO_PRICE,
  PRO_METHODS,
  type ProMethod
} from "./cvProOrderRepository";
import { createSyntheticCvProvider } from "./cvBuilder";
import {
  activeMembershipRoleQuery,
  activePlatformGrantQuery,
  activeWorkerIdentityQuery,
  createPrismaAuthorizationRoleResolver
} from "./authorizationRoles";
import {
  createEmailVerificationService,
  emailVerificationFailure,
  type EmailVerificationService
} from "./emailVerification";
import { createEmailSender, type EmailSender } from "./mailer/emailSender";
import {
  createPasswordResetService,
  passwordResetAccepted,
  passwordResetFailure,
  type PasswordResetService
} from "./passwordReset";
import { createPrismaPasswordResetRepository } from "./passwordResetRepository";
import {
  createFakeMalwareScanner,
  createLocalDocumentService,
  createLocalPrivateFileObjectStore,
  type DocumentUploadService
} from "./documentUpload";
import { createDocumentUploadContract } from "./documentUploadContract";
import { resolvePayrollPeriodTimezone } from "./payrollPeriodTimezone";
import { createPrismaDocumentMetadataRepository } from "./documentUploadRepository";
import { registerDocumentRoutes } from "./documentRoutes";
import { registerInvoiceRoutes } from "./invoiceRoutes";
import { createPrismaRequestPricingSnapshotCapture } from "./requestPricingSnapshot";
import { materializeAndListWorkerPayouts } from "./workerPayoutRepository";
import {
  WORKER_AGREEMENT_VERSIONS,
  electClassification,
  getActiveElection,
  type WorkerClassification
} from "./workerClassificationElection";
import { buildRemittanceSummary } from "./taxRemittance";
import { buildTaxSlips, type SlipCalcInput } from "./taxSlip";
import { GST_RATE_PPM, QST_RATE_PPM } from "./payChannel";
import { buildAccounting, type AccountingCalcRow } from "./accounting";
import {
  MIN_SAMPLES_FOR_LEARNED_MODEL,
  OFFER_OUTCOMES,
  proposeAndLogOffers,
  recordOfferOutcome,
  retrainAcceptanceModel,
  type OfferOutcome
} from "./offerMatchingRepository";
import { isWorkerDisputeCategory, normalizeWorkerDisputeReason } from "@rwos/shared";
import { normalizeEscalationReason } from "@rwos/shared";
import { buildCalendarExport } from "@rwos/shared";
import { deriveOrderLifecycle } from "@rwos/shared";
import { deriveWorkerCancellationPenalty } from "@rwos/shared";
import { notifyClient } from "./notifications/clientNotifications";
import { notifyWorkerPayoutPaid } from "./notifications/workerNotifications";
import { raiseWorkerDispute, listWorkerDisputes, withdrawWorkerDispute } from "./workerDisputeRepository";
import { createEmployerOrderWithChildren, listEmployerOrders, getEmployerOrder, submitEmployerOrder, cancelEmployerOrder } from "./employerOrderRepository";
import { listMarketWagesForResidence, listAllMarketWages, upsertMarketWage } from "./marketWageRepository";
import { listPlatformOrdersInReview, getPlatformOrder } from "./adminOrderRepository";
import { raiseEscalation, listOpenEscalations, closeEscalation } from "./escalationRepository";
import { workerAllowances } from "./workerAllowances";
import { createPrismaInvoiceRepository, type InvoiceRepository } from "./invoiceRepository";
import { autoGenerateInvoiceForLockedTimesheet } from "./invoiceFromTimesheet";
import { createPrismaPayrollRepository, createPrismaPayrollRateResolver, createPrismaPayrollJurisdictionResolver, createPrismaPayrollClassificationResolver } from "./payrollRepository";
import { registerPaymentRoutes } from "./paymentRoutes";
import { registerStripeWebhookRoute } from "./stripeWebhookRoute";
import { createPrismaPaymentRepository, type PaymentRepository } from "./paymentRepository";

export interface BuildApiOptions {
  authService?: AuthenticationService;
  emailVerificationService?: EmailVerificationService;
  passwordResetService?: PasswordResetService;
  emailSender?: EmailSender;
  authorizationService?: AuthorizationService;
  membershipService?: OrganizationMembershipService;
  organizationService?: EmployerOrganizationService;
  employerContractService?: EmployerContractService;
  residenceService?: ResidenceService;
  departmentService?: DepartmentService;
  dispatchService?: DispatchService;
  workerOfferService?: WorkerOfferService;
  assignmentService?: AssignmentService;
  attendanceService?: AttendanceService;
  timesheetService?: TimesheetService;
  calendarRequestService?: CalendarRequestService;
  geocodingProvider?: GeocodingProvider;
  travelTimeProvider?: TravelTimeProvider | null;
  workGroupService?: WorkGroupService;
  roleDefinitionService?: RoleDefinitionService;
  jobRequestService?: JobRequestService;
  resolveAuthorizationRoles?: (
    userId: string
  ) => Promise<readonly AuthorizationRoleKey[]> | readonly AuthorizationRoleKey[];
  readinessProbe?: () => Promise<boolean>;
  authRateLimiter?: AuthenticationRateLimiter;
  trustedServiceIdentity?: Readonly<{
    provider: IdentityTokenProvider;
    registry: TrustedAudienceRegistry;
    environment: "staging";
    releaseSha: string;
  }>;
  env?: NodeJS.ProcessEnv;
  documentService?: DocumentUploadService;
  documentUploadContract?: ReturnType<typeof createDocumentUploadContract>;
  invoiceRepository?: InvoiceRepository;
  paymentRepository?: PaymentRepository;
  localPaymentWebhookSecret?: string;
  // Stage 2b.4-C3-G-e1: OPTIONAL Stripe test-mode webhook recovery. Mounted only when a recovery is
  // injected (Stripe test env enabled by the caller). Default undefined → route NOT mounted, no live
  // binding, no scheduler. Never enabled in production without separate owner authorization.
  stripeWebhookRecovery?: { resolve(rawBody: Buffer, signature: string): Promise<{ status: string; eventType: string; paymentId?: string; newState?: string }> };
  publicWorkerIngressOnly?: boolean;
  publicWorkerWebOrigin?: string;
  // HR-6: advisory AI review provider. Defaults to the deterministic synthetic provider — no
  // network, no vendor. A future external model would be injected here and inherit every guard
  // (validation, evidence-binding, containment, fail-closed). Advisory only; never authoritative.
  payrollReviewProvider?: PayrollReviewProvider;
  // HR-6.1 Chunk 3: a FUTURE external AI provider. Used ONLY when PAYROLL_AI_EXTERNAL_ENABLED is on
  // (non-production) AND this is injected; it receives a validated, byte-scanned egress envelope —
  // never the raw context. Default absent → synthetic offline provider, no egress possible.
  payrollExternalReviewProvider?: PayrollReviewExternalProvider;
  // HR-6.1 Chunk 4: content-free telemetry sink (default: the structured logger). Best-effort.
  payrollTelemetrySink?: PayrollReviewTelemetrySink;
  // Phase 2b.2a: neutral timezone injected from the SELECTED country profile (never an implicit
  // Canada default). Used as the payroll-period fallback when a request omits `timezone`. Absent →
  // no fallback → the request must supply `timezone` or is rejected (fail-closed). Composition roots
  // inject this (server.ts from the resolved country); tests inject countries/canada's value.
  countryTimezone?: string | undefined;
  // Phase 2b.2b-i: neutral address port injected from the SELECTED country (never implicit Canada).
  // Master routes postal normalization, geographic-bounds checks, and the geocode country
  // restriction through this port. Absent → address operations fail closed. Composition roots inject
  // the selected country's adapter; the affected PostgreSQL suites inject countries/canada's adapter.
  countryAddress?: CountryAddressPort | undefined;
  // Phase 2b.3a: the SELECTED country's ISO 4217 currency, threaded from the existing
  // CountryProfile.currency (never an implicit Canada default; no `?? "CAD"`). This makes the country
  // profile authoritative for currency at the composition boundary. It is NOT yet consumed by any
  // money-computation or persistence path (those remain hard-coded CAD and are out of scope for this
  // stage); the composition root is responsible for fail-closing on a currency the money subsystem
  // cannot execute (see server.ts). Absent → no country currency asserted (local/test neutral fixture).
  countryCurrency?: string | undefined;
}

export type AuthenticationRateLimitDecision = Readonly<{
  allowed: boolean;
  retryAfterSeconds: number;
}>;

export interface AuthenticationRateLimiter {
  consume(
    input: Readonly<{
      action: "register" | "sign_in" | "email_verify_send" | "password_reset_request";
      ip: string;
      email: string;
    }>
  ): Promise<AuthenticationRateLimitDecision>;
  check?(): Promise<boolean>;
  close?(): Promise<void>;
}

// Formats a shift window for worker-facing offer emails (localized, Canada timezone).
function formatOfferWindow(start: Date, end: Date, lang: "en" | "fr"): string {
  const locale = lang === "fr" ? "fr-CA" : "en-CA";
  const tz = "America/Toronto";
  try {
    const day = new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric", timeZone: tz }).format(start);
    const clock = (d: Date) => new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: tz }).format(d);
    return `${day}, ${clock(start)}\u2013${clock(end)}`;
  } catch {
    return `${start.toISOString().slice(0, 16).replace("T", " ")} \u2192 ${end.toISOString().slice(11, 16)}`;
  }
}

export function buildApi(options: BuildApiOptions = {}) {
  const environment = options.env ?? process.env;
  const publicWorkerIngressOnly =
    options.publicWorkerIngressOnly ?? environment.RWOS_PUBLIC_WORKER_INGRESS_ONLY === "enabled";
  if (publicWorkerIngressOnly && environment.RWOS_ENV !== "staging") {
    throw new Error("RWOS_PUBLIC_WORKER_INGRESS_STAGING_ONLY");
  }
  const publicWorkerWebOrigin = publicWorkerIngressOnly
    ? trustedWorkerWebOrigin(options.publicWorkerWebOrigin ?? environment.WORKER_WEB_ORIGIN)
    : null;
  const runtimeConfig = getRuntimeConfig(environment);
  // Two-channel pay go-live gate. OFF unless FINANCE_LIVE_ENABLED=enabled (which the config schema
  // only permits with a recorded CPA sign-off in staging/production). While closed, the finance
  // engine accounts for everything but executes no money and files nothing.
  const financeLive = environment.FINANCE_LIVE_ENABLED === "enabled";
  const app = Fastify({
    logger: false,
    trustProxy: runtimeConfig.rwosEnv === "production" ? "loopback" : false
  });
  const logger = createLogger("api");
  // Marketplace bounds: never return "all of Canada" to the browser. We rank at most
  // CANDIDATE_CAP matched jobs server-side, then page the result set.
  const MARKETPLACE_PAGE_MAX = 50;
  const MARKETPLACE_CANDIDATE_CAP = 500;

  if (publicWorkerIngressOnly) {
    app.addHook("onRequest", async (request, reply) => {
      const requestOrigin = request.headers.origin;
      if (requestOrigin && requestOrigin !== publicWorkerWebOrigin) {
        return reply.code(403).send({
          error: "RWOS_AUTHORIZATION_DENIED",
          message: "Access denied."
        });
      }
      if (requestOrigin === publicWorkerWebOrigin) {
        reply.header("access-control-allow-origin", publicWorkerWebOrigin);
        reply.header("vary", "Origin");
      }
      if (request.method === "OPTIONS") {
        const requestedMethod = request.headers["access-control-request-method"];
        if (
          requestOrigin !== publicWorkerWebOrigin ||
          !isPublicWorkerIngressPath(request.url) ||
          (requestedMethod !== "GET" && requestedMethod !== "POST")
        ) {
          return reply.code(403).send({
            error: "RWOS_AUTHORIZATION_DENIED",
            message: "Access denied."
          });
        }
        return reply
          .header("access-control-allow-methods", "GET, POST, OPTIONS")
          .header("access-control-allow-headers", "Accept, Authorization, Content-Type")
          .header("access-control-max-age", "600")
          .code(204)
          .send();
      }
      if (!isPublicWorkerIngressPath(request.url)) {
        return reply.code(404).send({
          error: "RWOS_RESOURCE_UNAVAILABLE",
          message: "Resource unavailable."
        });
      }
    });
  }
  const requestStartedAt = new WeakMap<object, bigint>();
  const authRateLimiter =
    options.authRateLimiter ??
    (runtimeConfig.rwosEnv === "production"
      ? createRemoteAuthenticationRateLimiter({
          origin: runtimeConfig.authRateLimiterOrigin!,
          token: runtimeConfig.authRateLimiterToken!,
          keySecret: runtimeConfig.authRateLimiterKeySecret!,
          keyId: runtimeConfig.authRateLimiterKeyId!,
          namespace: runtimeConfig.authRateLimiterNamespace!,
          ...(options.trustedServiceIdentity
            ? {
                trustedIdentityHeaders: trustedIdentityHeaders(
                  options.trustedServiceIdentity,
                  "auth-limiter"
                )
              }
            : {})
        })
      : (runtimeConfig.rwosEnv === "local" || runtimeConfig.rwosEnv === "test") && process.env.RWOS_LOCAL_E2E === "enabled"
        // Local disposable browser-E2E only: many synthetic sign-ins share the loopback IP within
        // one 60s window and would trip the per-IP limiter. A ~zero window effectively disables
        // accumulation FOR LOCAL/TEST E2E ONLY — it requires rwosEnv local|test AND RWOS_LOCAL_E2E.
        // Production always uses the remote limiter above; STAGING falls through to the normal
        // memory limiter (never lenient), so this can never weaken staging or production.
        ? createMemoryAuthenticationRateLimiter({ accountMaxAttempts: 100000, networkMaxAttempts: 100000, windowMs: 1, maxBuckets: 20000, keySecret: "rwos-local-e2e-auth-rate-limit" })
        : createMemoryAuthenticationRateLimiter());
  const prisma = options.authService ? null : createPrismaClient(runtimeConfig.databaseUrl);
  const authenticationRepository = prisma ? createPrismaAuthenticationRepository(prisma) : null;
  const emailSender =
    options.emailSender ??
    createEmailSender({
      apiKey: runtimeConfig.emailApiKey,
      from: runtimeConfig.emailFrom,
      provider: runtimeConfig.emailProvider
    });
  const authService =
    options.authService ??
    createAuthenticationService(authenticationRepository!, {
      sessionTtlSeconds: 60 * 60 * 8
    });
  const emailVerificationService =
    options.emailVerificationService ??
    (authenticationRepository && hasEmailVerificationDelegate(prisma)
      ? createEmailVerificationService(authenticationRepository, emailSender, {
          exposeLocalCode: runtimeConfig.rwosEnv !== "production" && !runtimeConfig.hasEmailDelivery
        })
      : null);
  const passwordResetService =
    options.passwordResetService ??
    (prisma && "passwordResetToken" in prisma
      ? createPasswordResetService(createPrismaPasswordResetRepository(prisma), emailSender)
      : null);
  const authorizationService = options.authorizationService ?? createAuthorizationService();
  const membershipService =
    options.membershipService ??
    createOrganizationMembershipService(createPrismaOrganizationMembershipRepository(prisma!));
  const organizationRepository = prisma ? createPrismaEmployerOrganizationRepository(prisma) : null;
  const organizationService =
    options.organizationService ??
    createEmployerOrganizationService(
      organizationRepository!,
      membershipService,
      authorizationService
    );
  const employerContractService =
    options.employerContractService ??
    createEmployerContractService(
      createPrismaEmployerContractRepository(prisma!),
      membershipService,
      {
        // Publishing/modifying governed rates requires a PLATFORM_ADMINISTRATOR
        // platform grant. The role resolver strips PLATFORM_ADMINISTRATOR from
        // membership roles, so an org owner/administrator can never satisfy this.
        // Evaluated per-request; resolveAuthorizationRoles is defined below.
        isPlatformAdmin: async (userId: string) =>
          (await resolveAuthorizationRoles(userId)).includes("PLATFORM_ADMINISTRATOR")
      },
      { countryCurrency: options.countryCurrency } // Stage 2b.3b-3: active-country currency (fail-closed; never CAD default)
    );
  // Governed two-step employer cancellation. The default assignment-cancel port
  // fails closed — the confirmed-assignment handoff is only ever performed via the
  // platform-gated endpoint, which injects a port bound to its authorized actor.
  const employerCancellationService = createEmployerCancellationService({
    membershipReader: membershipService,
    jobRequestReader: createPrismaCancellationJobRequestReader(prisma!),
    confirmedAssignmentReader: createPrismaConfirmedAssignmentReader(prisma!),
    contractRateReader: createPrismaContractRateReader(prisma!),
    store: createPrismaCancellationStore(prisma!),
    countryCurrency: options.countryCurrency, // Stage 2b.3b-2: no-rate preview label (fail-closed; never CAD default)
    assignmentCancelPort: {
      async cancelConfirmedAssignments() {
        throw new Error("A platform-authorized assignment-cancel port must be provided.");
      }
    },
    // Transitions job_requests.status → cancelled under EMPLOYER authority (the
    // request owner). Evaluated per-request; jobRequestService is defined below.
    requestCancellerPort: {
      async cancelJobRequest({ actorUserId, organizationId, jobRequestId }) {
        try {
          const jobRequest = await jobRequestService.getForOrganization({
            actorUserId,
            organizationId,
            jobRequestIdOrNumber: jobRequestId
          });
          if (jobRequest.status === "cancelled") return true; // idempotent
          await jobRequestService.cancel({
            actorUserId,
            organizationId,
            jobRequestId,
            expectedVersion: jobRequest.versionToken,
            reason: "employer_cancelled"
          });
          return true;
        } catch {
          return false;
        }
      }
    }
  });
  // Employer Reduce Workers (governed capacity reduction with partial cancellation).
  // The selected-assignment handoff is platform-authorized (injected by the platform
  // endpoint). The capacity setter changes numberOfWorkers under employer authority,
  // reading the current version for optimistic concurrency.
  const reduceJobRequestRepository = createPrismaJobRequestRepository(prisma!);
  const employerReduceService = createEmployerReduceService({
    membershipReader: membershipService,
    jobRequestReader: createPrismaReduceJobRequestReader(prisma!),
    confirmedAssignmentLister: createPrismaConfirmedAssignmentLister(prisma!),
    contractRateReader: createPrismaReduceContractRateReader(prisma!),
    store: createPrismaReduceStore(prisma!),
    countryCurrency: options.countryCurrency, // Stage 2b.3b-2: no-rate preview label (fail-closed; never CAD default)
    assignmentCancelPort: {
      async cancelSelectedAssignments() {
        throw new Error("A platform-authorized selected-assignment cancel port must be provided.");
      }
    },
    capacitySetter: {
      async setRequestedCapacity({ actorUserId, jobRequestId, newTarget }) {
        const jobRequest = await reduceJobRequestRepository.findJobRequestById(jobRequestId);
        if (!jobRequest) return false;
        const now = new Date();
        const updated = await reduceJobRequestRepository.updateDraft({
          jobRequestId,
          expectedVersion: jobRequest.version,
          actorUserId,
          numberOfWorkers: newTarget,
          now
        });
        if (!updated) return false;
        await reduceJobRequestRepository.recordJobRequestAuditEvent({
          action: "job_request.updated",
          organizationId: jobRequest.organizationId,
          jobRequestId: jobRequest.id,
          jobRequestNumber: jobRequest.jobRequestNumber,
          actorUserId,
          priorState: `numberOfWorkers=${jobRequest.numberOfWorkers}`,
          newState: `numberOfWorkers=${newTarget}`,
          reason: "capacity_reduced",
          correlationId: `capacity_reduced_${jobRequest.id}`,
          createdAt: now
        });
        return true;
      }
    }
  });
  // Employer Material Edit / Reconfirmation. The classifier runs in the endpoint
  // (server-side, @rwos/shared); this service applies non-material edits directly and
  // records material edits as governed proposals without mutating accepted terms.
  const employerRequestEditService = createEmployerRequestEditService({
    membershipReader: membershipService,
    profileWriter: createPrismaProfileWriter(prisma!),
    proposalStore: createPrismaProposalStore(prisma!)
  });
  // Worker Saved Jobs — user(worker)-scoped bookmarks of open marketplace jobs. Free,
  // idempotent, no money. Visibility is server-authoritative (only open jobs saveable).
  const workerSavedJobsService = createWorkerSavedJobsService({
    identities: createPrismaWorkerIdentityResolver(prisma!),
    visibility: createPrismaSavedJobVisibilityReader(prisma!),
    store: createPrismaSavedJobStore(prisma!)
  });
  // Worker Job Interest — governed marketplace intent. Records interest ONLY; never creates
  // an offer or assignment (platform dispatch + the worker-offer service stay authoritative).
  const workerJobInterestService = createWorkerJobInterestService({
    identities: createPrismaInterestWorkerIdentityResolver(prisma!),
    jobs: createPrismaInterestJobReader(prisma!),
    engagement: createPrismaInterestEngagementReader(prisma!),
    store: createPrismaInterestStore(prisma!)
  });
  // Verification — provider-neutral trust states. Fixture providers by default (no vendor
  // lock, no network); production swaps real adapters behind the same interfaces. Callbacks
  // are HMAC-verified; the secret is inert until provisioned (unsigned callbacks rejected).
  const verificationService = createVerificationService({
    workers: createPrismaVerificationWorkerResolver(prisma!),
    store: createPrismaVerificationStore(prisma!),
    identityProvider: createFixtureIdentityProvider(),
    backgroundCheckProvider: createFixtureBackgroundCheckProvider(),
    businessProvider: createFixtureBusinessProvider()
  });
  const verificationCallbackVerifier = createHmacCallbackVerifier(runtimeConfig.verificationCallbackSecret ?? "");
  // HR — governed HR domain (HR-1). Owns profile/credentials/standing/cases; CONSUMES
  // verification (never owns it). HR standing is independent of verification.
  const hrService = createHrService({
    workers: createPrismaHrWorkerResolver(prisma!),
    store: createPrismaHrStore(prisma!)
  });
  // HR-3 Documents & Compliance. Provider-neutral storage (fixture in dev); file contents
  // never touch core. Compliance evaluator is centralized + explainable; requirements are
  // jurisdiction/role data, not hard-coded rules.
  const hrDocumentService = createHrDocumentService({
    workers: createPrismaHrDocWorkerResolver(prisma!),
    store: createPrismaHrDocumentStore(prisma!),
    storage: createFixtureDocumentStorageProvider()
  });
  const complianceEvaluator = createComplianceEvaluator({
    requirements: createPrismaComplianceRequirementResolver(prisma!),
    evidence: createPrismaComplianceEvidenceReader(prisma!)
  });
  // HR-5 Payroll / Finance FOUNDATION (TEST / SYNTHETIC — no execution). Consumes approved/locked
  // worked time only; jurisdiction rules live behind the provider seam (synthetic fixture here).
  // Shared READ-ONLY payroll resolvers — reused by the calculation service and by the HR-6.1
  // period review endpoint so the advisory "why no calc yet" flags mirror EXACTLY the resolvers
  // the governed engine consults (no business-logic re-derivation).
  const payrollRepositoryRead = createPrismaPayrollRepository(prisma!);
  const payrollRateResolver = createPrismaPayrollRateResolver(prisma!);
  const payrollJurisdictionResolver = createPrismaPayrollJurisdictionResolver(prisma!);
  const payrollService = createPayrollService({
    repository: payrollRepositoryRead,
    ruleProviders: [createSyntheticPayrollRuleProvider()],
    rateResolver: payrollRateResolver,
    jurisdictionResolver: payrollJurisdictionResolver,
    classificationResolver: createPrismaPayrollClassificationResolver(prisma!)
  });
  // HR-6 advisory AI review provider (offline synthetic by default). Advisory only — it consumes
  // the sanitized review context and cannot approve/lock/correct/pay or touch payroll state.
  const syntheticPayrollReviewProvider = options.payrollReviewProvider ?? createSyntheticPayrollReviewProvider();
  // HR-6.1 Chunk 3 capability gate: external egress is impossible unless BOTH the non-production
  // config flag is enabled AND an external provider is injected. Default → synthetic (offline).
  const payrollReviewEgressMode = resolveEgressMode({ externalEnabled: runtimeConfig.payrollAiExternalEnabled, externalProvider: options.payrollExternalReviewProvider });
  const payrollReviewProvider =
    payrollReviewEgressMode === "external"
      ? createEgressGatedProvider(
          options.payrollExternalReviewProvider!,
          { providerKey: options.payrollExternalReviewProvider!.key, providerVersion: options.payrollExternalReviewProvider!.version, promptVersion: PAYROLL_REVIEW_PROMPT_VERSION, flagEngineVersion: PAYROLL_REVIEW_FLAG_ENGINE_VERSION, outputContractVersion: PAYROLL_REVIEW_OUTPUT_CONTRACT_VERSION },
          PAYROLL_REVIEW_DEFAULT_TIMEOUT_MS
        )
      : syntheticPayrollReviewProvider;
  // HR-6.1 Chunk 4: content-free observability sink. Default = the existing structured logger.
  // Best-effort: emission failures never affect payroll behavior; no content/financials/PII/persist.
  const payrollTelemetrySink = options.payrollTelemetrySink ?? createLoggerTelemetrySink(logger);
  // Geocoding provider (provider-neutral seam). Default: a deterministic fixture over
  // major Canadian FSAs — no network, safe for local/CI. Production swaps in the OSM
  // (or Google) provider via options.geocodingProvider. Resolutions are persisted on
  // the residence (the cache), so providers are not called per render.
  // Single Maps key read, shared by geocoding + travel-time. Server-only; never exposed.
  const mapsApiKey = (environment.GOOGLE_MAPS_API_KEY ?? "").trim();
  const geocodingProvider: GeocodingProvider =
    options.geocodingProvider ??
    (mapsApiKey.length >= 20
      ? createGoogleGeocodingProvider({ fetch, apiKey: mapsApiKey, countryAddress: options.countryAddress })
      : createFixtureGeocodingProvider({
      "H7V": { province: "QC", city: "Laval", latitude: 45.5701, longitude: -73.7527 },
      "H2X": { province: "QC", city: "Montreal", latitude: 45.5088, longitude: -73.5678 },
      "M5V": { province: "ON", city: "Toronto", latitude: 43.6426, longitude: -79.3871 },
      "K1P": { province: "ON", city: "Ottawa", latitude: 45.4215, longitude: -75.6972 },
      "V6B": { province: "BC", city: "Vancouver", latitude: 49.2807, longitude: -123.1088 },
      "T2P": { province: "AB", city: "Calgary", latitude: 51.0486, longitude: -114.0708 }
    }, { countryAddress: options.countryAddress }));
  // Road travel-time (ETA) provider — "how long to get there" over the road network.
  // Fail-closed: only when GOOGLE_MAPS_API_KEY is set do we enrich job detail with a real
  // road ETA; otherwise the worker still sees the straight-line distance. Not called per
  // render beyond the single job-detail fetch.
  const travelTimeProvider: TravelTimeProvider | null =
    options.travelTimeProvider ??
    (mapsApiKey.length >= 20 ? createGoogleDistanceMatrixProvider({ fetch, apiKey: mapsApiKey }) : null);
  const residenceService =
    options.residenceService ??
    createResidenceService(
      createPrismaResidenceRepository(prisma!),
      organizationRepository!,
      membershipService,
      authorizationService
    );
  const departmentService =
    options.departmentService ??
    createDepartmentService(
      createPrismaDepartmentRepository(prisma!),
      createPrismaResidenceRepository(prisma!),
      organizationRepository!,
      membershipService,
      authorizationService
    );
  const workGroupService =
    options.workGroupService ??
    createWorkGroupService(createPrismaWorkGroupRepository(prisma!), authorizationService);
  const roleDefinitionService =
    options.roleDefinitionService ??
    createRoleDefinitionService(
      createPrismaRoleDefinitionRepository(prisma!),
      authorizationService
    );
  const jobRequestService =
    options.jobRequestService ??
    createJobRequestService(
      createPrismaJobRequestRepository(prisma!),
      organizationRepository!,
      createPrismaResidenceRepository(prisma!),
      createPrismaDepartmentRepository(prisma!),
      createPrismaWorkGroupRepository(prisma!),
      createPrismaRoleDefinitionRepository(prisma!),
      membershipService,
      authorizationService,
      { pricingSnapshotCapture: createPrismaRequestPricingSnapshotCapture(prisma!) }
    );
  // Candidate source selection is env-switched by configuration, not by RWOS_ENV: when an
  // external HTTPS candidate service is configured (CANDIDATE_SOURCE_ORIGIN + token), the
  // dispatch service below prefers it in every environment; otherwise dispatch falls back to
  // this marketplace-interest source, backed by JobLop's own interested workers. A self-
  // contained marketplace can launch with no external candidate API and swap one in later
  // purely via config, with no code change.
  const listInterestedWorkersForDispatch = async (jobRequestId: string) => {
    if (!prisma) return [] as { workerIdentityId: string; displayName: string | null }[];
    const interests = await workerJobInterestService.listInterestedForJob(jobRequestId);
    const offerable = interests.filter(
      (interest) =>
        interest.status === "submitted" ||
        interest.status === "under_review" ||
        interest.status === "shortlisted"
    );
    const ids = [...new Set(offerable.map((interest) => interest.workerIdentityId))];
    if (!ids.length) return [];
    const workers = await prisma.workerIdentity.findMany({
      where: { id: { in: ids } },
      select: { id: true, displayName: true }
    });
    const nameById = new Map(workers.map((worker) => [worker.id, worker.displayName]));
    return ids.map((id) => ({ workerIdentityId: id, displayName: nameById.get(id) ?? null }));
  };
  const localDispatchCandidateSource = prisma
    ? createLocalMarketplaceCandidateSource({
        listInterestedWorkers: listInterestedWorkersForDispatch
      })
    : undefined;
  const dispatchService =
    options.dispatchService ??
    (prisma
      ? createDispatchService(
          createPrismaDispatchRepository(prisma),
          createPrismaJobRequestRepository(prisma),
          organizationRepository!,
          membershipService,
          authorizationService,
          runtimeConfig.hasCandidateSource
            ? createHttpCandidateSource({
                origin: runtimeConfig.candidateSourceOrigin!,
                token: runtimeConfig.candidateSourceToken!,
                ...(options.trustedServiceIdentity
                  ? {
                      trustedIdentityHeaders: trustedIdentityHeaders(
                        options.trustedServiceIdentity,
                        "candidate-source"
                      )
                    }
                  : {})
              })
            : localDispatchCandidateSource
        )
      : createUnavailableDispatchService());
  // Worker-offer delivery channel. Prefer Resend email (free, reliable; reuses the email
  // config already used for verification), then the external HTTP delivery service, else none.
  // Fail-closed: with neither configured, offers simply aren't auto-delivered.
  const offerCtaOrigin = (options.publicWorkerWebOrigin ?? environment.WORKER_WEB_ORIGIN ?? "").trim() || null;
  const resendOfferDeliveryProvider =
    prisma && runtimeConfig.hasEmailDelivery && runtimeConfig.emailFrom
      ? createResendWorkerOfferDeliveryProvider({
          apiKey: runtimeConfig.resendApiKey!,
          fromAddress: runtimeConfig.emailFrom,
          resolveRecipient: async ({ workerOfferId, organizationId }) => {
            const offer = await prisma.workerOffer.findFirst({
              where: { id: workerOfferId, organizationId },
              select: {
                jobRequest: {
                  select: {
                    title: true,
                    startAt: true,
                    endAt: true,
                    roleDefinition: { select: { displayLabel: true } },
                    pricingSnapshot: { select: { workerHourlyRateMinor: true } }
                  }
                },
                residence: { select: { city: true, province: true } },
                workerIdentity: {
                  select: {
                    displayName: true,
                    preferredLanguage: true,
                    user: { select: { emailNormalized: true, displayName: true } }
                  }
                }
              }
            });
            const email = offer?.workerIdentity?.user?.emailNormalized ?? null;
            if (!offer || !email) return null;
            const language: "en" | "fr" = offer.workerIdentity.preferredLanguage === "fr" ? "fr" : "en";
            const role = offer.jobRequest?.roleDefinition?.displayLabel ?? null;
            const title = offer.jobRequest?.title ?? role ?? (language === "fr" ? "Quart" : "Shift");
            const city = offer.residence?.city ?? null;
            const province = offer.residence?.province ?? null;
            const areaLabel = city && province ? `${city}, ${province}` : province ?? city ?? null;
            const rateMinor = offer.jobRequest?.pricingSnapshot?.workerHourlyRateMinor ?? null;
            const compensation =
              rateMinor != null && options.countryCurrency
                ? `${new Intl.NumberFormat(language === "fr" ? "fr-CA" : "en-CA", {
                    style: "currency",
                    currency: options.countryCurrency
                  }).format(rateMinor / 100)}/h`
                : null;
            const whenLabel =
              offer.jobRequest?.startAt && offer.jobRequest?.endAt
                ? formatOfferWindow(offer.jobRequest.startAt, offer.jobRequest.endAt, language)
                : null;
            return {
              email,
              name: offer.workerIdentity.displayName ?? offer.workerIdentity.user.displayName ?? null,
              language,
              title,
              summary: null,
              compensation,
              whenLabel,
              areaLabel,
              ctaUrl: offerCtaOrigin ? `${offerCtaOrigin}/offers` : null
            };
          }
        })
      : null;
  const workerOfferDeliveryProvider =
    resendOfferDeliveryProvider ??
    (runtimeConfig.hasOfferDelivery
      ? createHttpWorkerOfferDeliveryProvider({
          origin: runtimeConfig.offerDeliveryOrigin!,
          token: runtimeConfig.offerDeliveryToken!,
          ...(options.trustedServiceIdentity
            ? {
                trustedIdentityHeaders: trustedIdentityHeaders(options.trustedServiceIdentity, "offer-delivery")
              }
            : {})
        })
      : null);
  const workerOfferService =
    options.workerOfferService ??
    (prisma
      ? createWorkerOfferService(
          createPrismaWorkerOfferRepository(prisma),
          createPrismaDispatchRepository(prisma),
          createPrismaJobRequestRepository(prisma),
          authorizationService,
          workerOfferDeliveryProvider ? { deliveryProvider: workerOfferDeliveryProvider } : {}
        )
      : createUnavailableWorkerOfferService());
  const assignmentService =
    options.assignmentService ??
    (prisma
      ? createAssignmentService(
          createPrismaAssignmentRepository(prisma),
          createPrismaWorkerOfferRepository(prisma),
          createPrismaDispatchRepository(prisma),
          createPrismaJobRequestRepository(prisma),
          authorizationService
        )
      : createUnavailableAssignmentService());
  const attendanceService =
    options.attendanceService ??
    (prisma
      ? createAttendanceService(
          createPrismaAttendanceRepository(prisma),
          createPrismaAssignmentRepository(prisma),
          createPrismaWorkerOfferRepository(prisma),
          authorizationService
        )
      : createUnavailableAttendanceService());
  const timesheetService =
    options.timesheetService ??
    (prisma
      ? createTimesheetService(
          createPrismaTimesheetRepository(prisma),
          createPrismaAttendanceRepository(prisma),
          createPrismaAssignmentRepository(prisma),
          createPrismaWorkerOfferRepository(prisma),
          authorizationService
        )
      : createUnavailableTimesheetService());
  const calendarRequestService =
    options.calendarRequestService ??
    (prisma
      ? createCalendarRequestService({
          repository: createPrismaCalendarRequestProfileRepository(prisma),
          jobRequestAccess: jobRequestService,
          workerOfferAccess: workerOfferService,
          assignmentCoverage: createPrismaConfirmedAssignmentCoverageReader(prisma)
        })
      : createUnavailableCalendarRequestService());
  const resolveAuthorizationRoles =
    options.resolveAuthorizationRoles ??
    (prisma
      ? createPrismaAuthorizationRoleResolver({
          findMemberships: (userId, now) =>
            prisma.organizationMembership.findMany(activeMembershipRoleQuery(userId, now)),
          findActiveWorker: (userId) =>
            prisma.workerIdentity.findFirst(activeWorkerIdentityQuery(userId)),
          findPlatformGrants: (userId) =>
            prisma.platformAccessGrant.findMany(activePlatformGrantQuery(userId))
        })
      : () => []);
  const documentService =
    options.documentService ??
    (runtimeConfig.documentLocalUploadEnabled && prisma
      ? createLocalDocumentService({
          store: createLocalPrivateFileObjectStore(runtimeConfig.documentLocalStorageRoot!),
          scanner: createFakeMalwareScanner("clean"),
          metadata: createPrismaDocumentMetadataRepository(prisma),
          now: () => new Date().toISOString(),
          referenceSecret: runtimeConfig.documentReferenceSecret!
        })
      : null);
  const documentUploadContract =
    options.documentUploadContract ??
    (runtimeConfig.documentLocalUploadEnabled
      ? createDocumentUploadContract({
          secret: runtimeConfig.documentReferenceSecret!,
          nowEpochSeconds: () => Math.floor(Date.now() / 1000)
        })
      : null);
  const invoiceRepository =
    options.invoiceRepository ?? (prisma ? createPrismaInvoiceRepository(prisma) : null);
  const paymentRepository =
    options.paymentRepository ??
    (prisma && runtimeConfig.localPaymentEnabled
      ? createPrismaPaymentRepository(prisma, createLocalFakePaymentProvider())
      : null);

  if (invoiceRepository) {
    registerInvoiceRoutes(app, {
      repository: invoiceRepository,
      authorize: async (request, organizationId) => {
        const session = await authService.validateSession(
          readBearerToken(request.headers.authorization)
        );
        if (!session.authenticated || !session.user) return null;
        const roles = await resolveAuthorizationRoles(session.user.id);
        if (roles.includes("PLATFORM_ADMINISTRATOR")) {
          return { actorId: session.user.id, role: "platform_admin" };
        }
        if (roles.includes("ORGANIZATION_OWNER") || roles.includes("ORGANIZATION_ADMINISTRATOR")) {
          try {
            await organizationService.getOrganization({
              actorUserId: session.user.id,
              organizationId
            });
            return { actorId: session.user.id, role: "finance_reviewer" };
          } catch {
            return null;
          }
        }
        return null;
      }
    });
  }

  const localPaymentWebhookSecret =
    options.localPaymentWebhookSecret ?? runtimeConfig.localPaymentWebhookSecret;
  if (paymentRepository && localPaymentWebhookSecret) {
    registerPaymentRoutes(app, {
      repository: paymentRepository,
      localWebhookSecret: localPaymentWebhookSecret,
      authorize: async (request, organizationId) => {
        const session = await authService.validateSession(
          readBearerToken(request.headers.authorization)
        );
        if (!session.authenticated || !session.user) return null;
        const roles = await resolveAuthorizationRoles(session.user.id);
        if (roles.includes("PLATFORM_ADMINISTRATOR")) {
          return { actorId: session.user.id, role: "admin" };
        }
        if (roles.includes("ORGANIZATION_OWNER") || roles.includes("ORGANIZATION_ADMINISTRATOR")) {
          try {
            await organizationService.getOrganization({
              actorUserId: session.user.id,
              organizationId
            });
            return { actorId: session.user.id, role: "employer" };
          } catch {
            return null;
          }
        }
        return null;
      }
    });
  }

  // Stage 2b.4-C3-G-e1: mount the Stripe test-mode webhook recovery endpoint ONLY when a recovery is
  // injected. Inert by default (no Stripe env, no live keys, no scheduler). The route is public (Stripe
  // presents no user session); correlation + safety live entirely inside the injected recovery handler.
  if (options.stripeWebhookRecovery) {
    registerStripeWebhookRoute(app, { recovery: options.stripeWebhookRecovery });
  }

  if (documentService && documentUploadContract) {
    registerDocumentRoutes(app, {
      service: documentService,
      contract: documentUploadContract,
      authorize: async (request, input) => {
        const session = await authService.validateSession(
          readBearerToken(request.headers.authorization)
        );
        if (!session.authenticated || !session.user) return null;
        const roles = await resolveAuthorizationRoles(session.user.id);
        if (roles.includes("PLATFORM_ADMINISTRATOR")) {
          return {
            actorId: session.user.id,
            ownerId: input.ownerId ?? session.user.id,
            role: "platform_admin"
          };
        }
        if (roles.includes("ORGANIZATION_OWNER") || roles.includes("ORGANIZATION_ADMINISTRATOR")) {
          try {
            await organizationService.getOrganization({
              actorUserId: session.user.id,
              organizationId: input.organizationId
            });
          } catch {
            return null;
          }
          if (
            input.type === "worker_certification" &&
            input.ownerId &&
            !(await workerHasOrganizationScope(prisma, input.ownerId, input.organizationId))
          ) {
            return null;
          }
          return {
            actorId: session.user.id,
            ownerId: input.ownerId ?? session.user.id,
            role: "employer_admin"
          };
        }
        if (
          roles.includes("WORKER_ACCESS") &&
          (!input.ownerId || input.ownerId === session.user.id) &&
          (!input.type || input.type === "worker_certification") &&
          (await workerHasOrganizationScope(prisma, session.user.id, input.organizationId))
        ) {
          return {
            actorId: session.user.id,
            ownerId: session.user.id,
            role: "worker"
          };
        }
        return null;
      }
    });
  }

  app.addHook("onRequest", async (request, reply) => {
    requestStartedAt.set(request, process.hrtime.bigint());
    applySecurityHeaders(
      reply,
      runtimeConfig.nodeEnv === "production"
    );
    if (
      runtimeConfig.rwosEnv === "production" &&
      isProductionDisabledOperation(request.method, request.url)
    ) {
      return reply.code(404).send({
        error: "RWOS_RESOURCE_UNAVAILABLE",
        message: "Resource unavailable."
      });
    }
  });

  app.addHook("onResponse", async (request, reply) => {
    const startedAt = requestStartedAt.get(request);
    const durationMs = startedAt ? Number(process.hrtime.bigint() - startedAt) / 1_000_000 : 0;
    const fields = {
      requestId: request.id,
      method: request.method,
      route: request.routeOptions.url ?? "unmatched",
      statusCode: reply.statusCode,
      durationMs: Math.round(durationMs * 100) / 100
    };
    if (reply.statusCode >= 500) logger.error("api.request.completed", fields);
    else if (reply.statusCode >= 400) logger.warn("api.request.completed", fields);
    else logger.info("api.request.completed", fields);
  });

  if (prisma) {
    app.addHook("onClose", async () => {
      await prisma.$disconnect();
    });
  }
  if (authRateLimiter.close) {
    app.addHook("onClose", async () => {
      await authRateLimiter.close?.();
    });
  }

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof OrganizationMembershipError) {
      return sendMembershipDenied(reply);
    }

    if (error instanceof EmployerOrganizationError) {
      return sendOrganizationDenied(reply);
    }

    if (error instanceof ResidenceError) {
      return sendResidenceDenied(reply);
    }

    if (error instanceof DepartmentError) {
      return sendDepartmentDenied(reply);
    }

    if (error instanceof WorkGroupError) {
      return sendWorkGroupDenied(reply);
    }

    if (error instanceof RoleDefinitionError) {
      return sendRoleDefinitionDenied(reply);
    }

    if (error instanceof JobRequestError) {
      return sendJobRequestFailure(reply, error);
    }

    if (error instanceof DispatchError) {
      return sendDispatchFailure(reply, error);
    }

    if (error instanceof WorkerOfferError) {
      return sendWorkerOfferFailure(reply, error);
    }

    if (error instanceof AssignmentError) {
      return sendAssignmentFailure(reply, error);
    }

    if (error instanceof AssignmentTransactionUnavailableError) {
      return reply.code(503).header("retry-after", "2").send({
        error: "RWOS_ASSIGNMENT_TEMPORARILY_UNAVAILABLE",
        message: "Assignment processing is temporarily unavailable."
      });
    }

    if (error instanceof AttendanceError) {
      return sendAttendanceFailure(reply, error);
    }

    if (error instanceof TimesheetError) {
      return sendTimesheetFailure(reply, error);
    }

    if (error instanceof CalendarRequestError) {
      const conflict =
        error.code === "RWOS_CALENDAR_REQUEST_NOT_EDITABLE" ||
        error.code === "RWOS_CALENDAR_REQUEST_VERSION_CONFLICT";
      return reply.code(conflict ? 409 : 400).send({
        error: error.code,
        message: "Calendar request operation was denied."
      });
    }

    logger.error("api.request.unhandled_error", { requestId: request.id });
    return reply.code(500).send({
      error: "RWOS_INTERNAL_ERROR",
      message: "Request could not be completed.",
      requestId: request.id
    });
  });

  app.get("/health", async (_request, reply) => {
    logger.info("api.health.checked");
    reply.header("cache-control", "no-store");

    return {
      ok: true,
      service: "resident-workforce-os-api",
      check: "liveness"
    };
  });

  app.get("/ready", async (_request, reply) => {
    reply.header("cache-control", "no-store");
    try {
      const databaseReady = options.readinessProbe
        ? await options.readinessProbe()
        : prisma
          ? runtimeConfig.hasDatabaseUrl
            ? await prisma.$queryRawUnsafe("SELECT 1").then(() => true)
            : false
          : true;
      const limiterReady = authRateLimiter.check ? await authRateLimiter.check() : true;
      if (!databaseReady || !limiterReady) {
        logger.warn("api.readiness.failed", {
          dependency: !databaseReady ? "database" : "auth_rate_limiter"
        });
        return reply.code(503).send({
          ready: false,
          service: "resident-workforce-os-api",
          check: "readiness"
        });
      }
      return reply.code(200).send({
        ready: true,
        service: "resident-workforce-os-api",
        check: "readiness"
      });
    } catch {
      logger.error("api.readiness.failed", { dependency: "database" });
      return reply.code(503).send({
        ready: false,
        service: "resident-workforce-os-api",
        check: "readiness"
      });
    }
  });

  app.post("/auth/register", async (request, reply) => {
    if (runtimeConfig.rwosEnv === "production") {
      return reply.code(404).send({
        error: "RWOS_RESOURCE_UNAVAILABLE",
        message: "Resource unavailable."
      });
    }
    const body = asRecord(request.body);
    const email = readRequiredString(body, "email");
    const password = readRequiredString(body, "password");
    const displayName = readOptionalString(body, "displayName");

    if (!email || !password) {
      return reply.code(400).send({
        error: "RWOS_INVALID_AUTH_REQUEST",
        message: "Invalid authentication request."
      });
    }

    const rateLimit = await consumeAuthenticationRateLimit(authRateLimiter, {
      action: "register",
      ip: request.ip,
      email
    });
    if (!rateLimit) return sendAuthenticationUnavailable(reply);
    if (!rateLimit.allowed) {
      return sendAuthenticationRateLimited(reply, rateLimit.retryAfterSeconds);
    }

    try {
      const result = await authService.register({
        email,
        password,
        displayName,
        source: "api",
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"] ?? null
      });

      return reply.code(201).send(serializeAuthenticationResult(result));
    } catch (error) {
      return sendAuthenticationError(reply, error);
    }
  });

  app.post("/auth/sign-in", async (request, reply) => {
    const body = asRecord(request.body);
    const email = readRequiredString(body, "email");
    const password = readRequiredString(body, "password");

    if (!email || !password) {
      return reply.code(401).send({
        error: authenticationErrorCode,
        message: authenticationErrorMessage
      });
    }

    const rateLimit = await consumeAuthenticationRateLimit(authRateLimiter, {
      action: "sign_in",
      ip: request.ip,
      email
    });
    if (!rateLimit) return sendAuthenticationUnavailable(reply);
    if (!rateLimit.allowed) {
      return sendAuthenticationRateLimited(reply, rateLimit.retryAfterSeconds);
    }

    try {
      const result = await authService.signIn({
        email,
        password,
        source: "api",
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"] ?? null
      });

      return reply.code(200).send(serializeAuthenticationResult(result));
    } catch (error) {
      return sendAuthenticationError(reply, error);
    }
  });

  app.post("/auth/password-reset/request", async (request, reply) => {
    const email = readRequiredString(asRecord(request.body), "email");
    if (!email || !passwordResetService || !runtimeConfig.passwordResetPublicOrigin) {
      return reply.code(202).send(passwordResetAccepted);
    }
    const rateLimit = await consumeAuthenticationRateLimit(authRateLimiter, {
      action: "password_reset_request",
      ip: request.ip,
      email
    });
    if (!rateLimit || !rateLimit.allowed) {
      return reply.code(202).send(passwordResetAccepted);
    }
    await passwordResetService.request({
      email,
      resetBaseUrl: runtimeConfig.passwordResetPublicOrigin
    });
    return reply.code(202).send(passwordResetAccepted);
  });

  app.post("/auth/password-reset/complete", async (request, reply) => {
    if (!passwordResetService) return reply.code(400).send(passwordResetFailure);
    const body = asRecord(request.body);
    const token = readRequiredString(body, "token");
    const newPassword = readRequiredString(body, "newPassword");
    if (!token || !newPassword) return reply.code(400).send(passwordResetFailure);
    const result = await passwordResetService.complete({ token, newPassword });
    return reply.code(result.status === "reset" ? 200 : 400).send(result);
  });

  app.get("/auth/session", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated) {
      return reply.code(401).send({
        error: authenticationRequiredCode,
        message: "Authentication required."
      });
    }

    return reply.code(200).send({
      authenticated: true,
      user: serializeSessionUser(session.user),
      session: serializeSessionRecord(session.session)
    });
  });

  app.post("/auth/email/send-code", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({
        error: authenticationRequiredCode,
        message: "Authentication required."
      });
    }
    if (!emailVerificationService) return sendAuthenticationUnavailable(reply);

    const rateLimit = await consumeAuthenticationRateLimit(authRateLimiter, {
      action: "email_verify_send",
      ip: request.ip,
      email: session.user.emailNormalized
    });
    if (!rateLimit) return sendAuthenticationUnavailable(reply);
    if (!rateLimit.allowed) {
      return sendAuthenticationRateLimited(reply, rateLimit.retryAfterSeconds);
    }

    const result = await emailVerificationService.issue({
      userId: session.user.id,
      emailNormalized: session.user.emailNormalized
    });
    return reply.code(202).send(result);
  });

  app.post("/auth/email/verify-code", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({
        error: authenticationRequiredCode,
        message: "Authentication required."
      });
    }
    if (!emailVerificationService) return sendAuthenticationUnavailable(reply);

    const code = readRequiredString(asRecord(request.body), "code");
    if (!code || !/^\d{6}$/u.test(code)) {
      return reply.code(400).send(emailVerificationFailure);
    }
    const result = await emailVerificationService.verify({
      userId: session.user.id,
      code
    });
    return reply.code(result.status === "verified" ? 200 : 400).send(result);
  });

  app.post("/auth/sign-out", async (request, reply) => {
    await authService.revokeSession({
      token: readBearerToken(request.headers.authorization),
      reason: "logout",
      source: "api"
    });

    return reply.code(204).send();
  });

  app.post("/auth/sessions/revoke", async (request, reply) => {
    await authService.revokeSession({
      token: readBearerToken(request.headers.authorization),
      reason: "session_revoked",
      source: "api"
    });

    return reply.code(204).send();
  });

  app.post("/authz/check", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return reply.code(403).send({
        error: authorizationDeniedCode,
        message: authorizationDeniedMessage
      });
    }

    const body = asRecord(request.body);
    const permission = readRequiredString(body, "permission");

    if (!permission) {
      return reply.code(400).send({
        error: "RWOS_INVALID_AUTHORIZATION_REQUEST",
        message: "Invalid authorization request."
      });
    }

    const organizationId = readOptionalString(body, "organizationId");
    const platform = body.platform === true;
    const decision = await authorizationService.decide({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      permission,
      resourceContext: { organizationId },
      platformContext: { platform }
    });

    return reply.code(decision.allow ? 200 : 403).send(toSafeAuthorizationResponse(decision));
  });

  app.post("/authz/platform-admin/probe", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return reply.code(403).send({
        error: authorizationDeniedCode,
        message: authorizationDeniedMessage
      });
    }

    const decision = await authorizationService.decide({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      permission: "platform.supervise",
      platformContext: { platform: true }
    });

    return reply.code(decision.allow ? 200 : 403).send(toSafeAuthorizationResponse(decision));
  });

  app.get("/authz/platform-admin/session", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return reply.code(403).send({
        error: authorizationDeniedCode,
        message: authorizationDeniedMessage
      });
    }

    const decision = await authorizationService.decide({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      permission: "platform.supervise",
      platformContext: { platform: true }
    });

    return reply
      .code(decision.allow ? 200 : 403)
      .send(
        decision.allow
          ? { authorized: true }
          : { error: authorizationDeniedCode, message: authorizationDeniedMessage }
      );
  });

  app.get("/work-groups", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendWorkGroupDenied(reply);
    }

    const roles = await resolveCatalogueReadRoles(
      session.user.id,
      readOptionalString(asRecord(request.query), "organizationId")
    );
    const workGroups = await workGroupService.listActiveWorkGroups({ session, roles });

    return reply.code(200).send({ workGroups: workGroups.map(serializeWorkGroup) });
  });

  app.get("/work-groups/:slug", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendWorkGroupDenied(reply);
    }

    const roles = await resolveCatalogueReadRoles(
      session.user.id,
      readOptionalString(asRecord(request.query), "organizationId")
    );
    const workGroup = await workGroupService.getActiveWorkGroup({
      session,
      roles,
      slug: readRouteParam(request.params, "slug")
    });

    return reply.code(200).send({ workGroup: serializeWorkGroup(workGroup) });
  });

  app.get("/platform/work-groups", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendWorkGroupDenied(reply);
    }

    const workGroups = await workGroupService.listAllWorkGroups({
      session,
      roles: await resolveAuthorizationRoles(session.user.id)
    });

    return reply.code(200).send({ workGroups: workGroups.map(serializeWorkGroup) });
  });

  app.get("/platform/work-groups/:slug", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendWorkGroupDenied(reply);
    }

    const workGroup = await workGroupService.getWorkGroupForManagement({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      slug: readRouteParam(request.params, "slug")
    });

    return reply.code(200).send({ workGroup: serializeWorkGroup(workGroup) });
  });

  app.patch("/platform/work-groups/:slug", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendWorkGroupDenied(reply);
    }

    const body = asRecord(request.body);
    const workGroup = await workGroupService.updateWorkGroup({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      slug: readRouteParam(request.params, "slug"),
      expectedVersion: readRequiredString(body, "expectedVersion") ?? "",
      displayLabel: readOptionalString(body, "displayLabel"),
      displayOrder: readOptionalNumber(body, "displayOrder"),
      iconKey: readOptionalString(body, "iconKey")
    });

    return reply.code(200).send({ workGroup: serializeWorkGroup(workGroup) });
  });

  app.post("/platform/work-groups/:slug/status", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendWorkGroupDenied(reply);
    }

    const body = asRecord(request.body);
    const status = readWorkGroupLifecycleStatus(readRequiredString(body, "status"));
    const reason = readRequiredString(body, "reason");

    if (!status || !reason) {
      return reply.code(400).send({
        error: "RWOS_INVALID_WORK_GROUP_REQUEST",
        message: "Invalid work group request."
      });
    }

    const workGroup = await workGroupService.updateWorkGroupStatus({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      slug: readRouteParam(request.params, "slug"),
      expectedVersion: readRequiredString(body, "expectedVersion") ?? "",
      status,
      reason
    });

    return reply.code(200).send({ workGroup: serializeWorkGroup(workGroup) });
  });

  app.get("/role-definitions", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendRoleDefinitionDenied(reply);
    }

    const query = asRecord(request.query);
    const roles = await resolveCatalogueReadRoles(
      session.user.id,
      readOptionalString(query, "organizationId")
    );
    const roleDefinitions = await roleDefinitionService.listActiveRoleDefinitions({
      session,
      roles,
      workGroupSlug: readOptionalString(query, "workGroup")
    });

    return reply.code(200).send({ roleDefinitions: roleDefinitions.map(serializeRoleDefinition) });
  });

  app.get("/role-definitions/:identifier", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendRoleDefinitionDenied(reply);
    }

    const roles = await resolveCatalogueReadRoles(
      session.user.id,
      readOptionalString(asRecord(request.query), "organizationId")
    );
    const roleDefinition = await roleDefinitionService.getActiveRoleDefinition({
      session,
      roles,
      identifier: readRouteParam(request.params, "identifier")
    });

    return reply.code(200).send({ roleDefinition: serializeRoleDefinition(roleDefinition) });
  });

  app.get("/platform/role-definitions", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendRoleDefinitionDenied(reply);
    }

    const roleDefinitions = await roleDefinitionService.listAllRoleDefinitions({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      workGroupSlug: readOptionalString(asRecord(request.query), "workGroup")
    });

    return reply.code(200).send({ roleDefinitions: roleDefinitions.map(serializeRoleDefinition) });
  });

  app.get("/platform/role-definitions/:identifier", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendRoleDefinitionDenied(reply);
    }

    const roleDefinition = await roleDefinitionService.getRoleDefinitionForManagement({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      identifier: readRouteParam(request.params, "identifier")
    });

    return reply.code(200).send({ roleDefinition: serializeRoleDefinition(roleDefinition) });
  });

  app.patch("/platform/role-definitions/:identifier", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendRoleDefinitionDenied(reply);
    }

    const body = asRecord(request.body);
    const roleDefinition = await roleDefinitionService.updateRoleDefinition({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      identifier: readRouteParam(request.params, "identifier"),
      expectedVersion: readRequiredString(body, "expectedVersion") ?? "",
      displayLabel: readOptionalString(body, "displayLabel"),
      displayOrder: readOptionalNumber(body, "displayOrder"),
      localizedLabelKey: readOptionalString(body, "localizedLabelKey"),
      qualificationSummary: readOptionalString(body, "qualificationSummary"),
      safetyRequirementSummary: readOptionalString(body, "safetyRequirementSummary")
    });

    return reply.code(200).send({ roleDefinition: serializeRoleDefinition(roleDefinition) });
  });

  app.post("/platform/role-definitions/:identifier/status", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendRoleDefinitionDenied(reply);
    }

    const body = asRecord(request.body);
    const status = readRoleDefinitionLifecycleStatus(readRequiredString(body, "status"));
    const reason = readRequiredString(body, "reason");

    if (!status || !reason) {
      return reply.code(400).send({
        error: "RWOS_INVALID_ROLE_DEFINITION_REQUEST",
        message: "Invalid role definition request."
      });
    }

    const roleDefinition = await roleDefinitionService.updateRoleDefinitionStatus({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      identifier: readRouteParam(request.params, "identifier"),
      expectedVersion: readRequiredString(body, "expectedVersion") ?? "",
      status,
      reason
    });

    return reply.code(200).send({ roleDefinition: serializeRoleDefinition(roleDefinition) });
  });

  app.get("/memberships", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendMembershipDenied(reply);
    }

    return reply.code(200).send({
      memberships: serializeMemberships(await membershipService.listMemberships(session.user.id))
    });
  });

  app.get("/authz/employer-calendar/session", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendOrganizationDenied(reply);
    const organizationId = readOptionalString(asRecord(request.query), "organizationId");
    if (!organizationId || !isCanonicalUuid(organizationId)) {
      return reply.code(400).send({
        error: "RWOS_INVALID_ORGANIZATION_CONTEXT",
        message: "Invalid organization context."
      });
    }
    const organization = await organizationService.getOrganization({
      actorUserId: session.user.id,
      organizationId
    });
    return reply.code(200).send({
      authorized: true,
      capability: "employer_calendar_read",
      organization: {
        id: organization.id,
        publicId: organization.publicId,
        displayName: organization.displayName
      }
    });
  });

  app.get("/memberships/:membershipId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendMembershipDenied(reply);
    }

    const membershipId = readRouteParam(request.params, "membershipId");
    const membership = membershipId
      ? await membershipService.getMembership(session.user.id, membershipId)
      : null;

    if (!membership) {
      return sendMembershipDenied(reply);
    }

    return reply.code(200).send({
      membership: serializeMembership(membership)
    });
  });

  app.post("/memberships/:membershipId/activate", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendMembershipDenied(reply);
    }

    const membership = await membershipService.activateMembership({
      userId: session.user.id,
      membershipId: readRouteParam(request.params, "membershipId"),
      actorUserId: session.user.id
    });

    return reply.code(200).send({ membership: serializeMembership(membership) });
  });

  app.post("/memberships/:membershipId/suspend", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendMembershipDenied(reply);
    }

    const membership = await membershipService.suspendMembership({
      userId: session.user.id,
      membershipId: readRouteParam(request.params, "membershipId"),
      actorUserId: session.user.id
    });

    return reply.code(200).send({ membership: serializeMembership(membership) });
  });

  app.post("/memberships/:membershipId/revoke", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendMembershipDenied(reply);
    }

    const membership = await membershipService.revokeMembership({
      userId: session.user.id,
      membershipId: readRouteParam(request.params, "membershipId"),
      actorUserId: session.user.id
    });

    return reply.code(200).send({ membership: serializeMembership(membership) });
  });

  app.post("/memberships/context/select", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendMembershipDenied(reply);
    }

    const body = asRecord(request.body);
    const decision = await membershipService.selectOrganizationContext({
      userId: session.user.id,
      organizationId: readOptionalString(body, "organizationId")
    });

    if (!decision.allow) {
      return sendMembershipDenied(reply);
    }

    return reply.code(200).send({
      organizationContext: {
        organizationId: decision.organizationId,
        membership: decision.membership ? serializeMembership(decision.membership) : null,
        roles: decision.roles
      }
    });
  });

  app.post("/organizations", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendOrganizationDenied(reply);
    }

    const body = asRecord(request.body);
    const legalName = readRequiredString(body, "legalName");
    const displayName = readRequiredString(body, "displayName");

    if (!legalName || !displayName) {
      return reply.code(400).send({
        error: "RWOS_INVALID_ORGANIZATION_REQUEST",
        message: "Invalid organization request."
      });
    }

    const created = await organizationService.createOrganization({
      actorUserId: session.user.id,
      legalName,
      displayName
    });

    return reply.code(201).send({
      organization: serializeOrganization(created.organization),
      membership: serializeMembership(created.membership),
      organizationContext: created.organizationContext
    });
  });

  app.get("/organizations/current", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendOrganizationDenied(reply);
    }

    const organizationId = readOptionalString(asRecord(request.query), "organizationId");

    if (!organizationId) {
      return sendOrganizationDenied(reply);
    }

    const organization = await organizationService.getOrganization({
      actorUserId: session.user.id,
      organizationId
    });

    return reply.code(200).send({ organization: serializeOrganization(organization) });
  });

  app.get("/organizations/:organizationId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendOrganizationDenied(reply);
    }

    const organization = await organizationService.getOrganization({
      actorUserId: session.user.id,
      organizationId: readRouteParam(request.params, "organizationId")
    });

    return reply.code(200).send({ organization: serializeOrganization(organization) });
  });

  app.get("/organizations/:organizationId/status", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendOrganizationDenied(reply);
    }

    const organization = await organizationService.getOrganizationStatus({
      actorUserId: session.user.id,
      organizationId: readRouteParam(request.params, "organizationId")
    });

    return reply.code(200).send({
      organizationId: organization.id,
      status: organization.status,
      version: organization.version
    });
  });

  app.patch("/organizations/:organizationId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendOrganizationDenied(reply);
    }

    const body = asRecord(request.body);
    const organization = await organizationService.updateOrganization({
      actorUserId: session.user.id,
      organizationId: readRouteParam(request.params, "organizationId"),
      expectedVersion: readRequiredString(body, "expectedVersion") ?? "",
      legalName: readOptionalString(body, "legalName"),
      displayName: readOptionalString(body, "displayName")
    });

    return reply.code(200).send({ organization: serializeOrganization(organization) });
  });

  app.post("/organizations/:organizationId/residences", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendResidenceDenied(reply);
    }

    const body = asRecord(request.body);
    const name = readRequiredString(body, "name");

    if (!name) {
      return reply.code(400).send({
        error: "RWOS_INVALID_RESIDENCE_REQUEST",
        message: "Invalid residence request."
      });
    }

    const residence = await residenceService.createResidence({
      actorUserId: session.user.id,
      organizationId: readRouteParam(request.params, "organizationId"),
      name,
      addressSummary: readOptionalString(body, "addressSummary"),
      city: readOptionalString(body, "city"),
      region: readOptionalString(body, "region"),
      country: readOptionalString(body, "country")
    });

    return reply.code(201).send({ residence: serializeResidence(residence) });
  });

  app.get("/organizations/:organizationId/residences", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendResidenceDenied(reply);
    }

    const status = readResidenceStatus(readOptionalString(asRecord(request.query), "status"));
    const residences = await residenceService.listResidences({
      actorUserId: session.user.id,
      organizationId: readRouteParam(request.params, "organizationId"),
      status
    });

    return reply.code(200).send({ residences: residences.map(serializeResidence) });
  });

  app.get("/organizations/:organizationId/contract", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) {
      return sendContractDenied(reply);
    }
    try {
      const contract = await employerContractService.getActiveContract({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId")
      });
      return reply.code(200).send({ contract });
    } catch (error) {
      return sendContractError(reply, error);
    }
  });

  // Publish/replace the governed rate card. PLATFORM-ADMIN ONLY — the service
  // (signContract → assertPlatformAdmin) denies any organization owner/administrator,
  // so an employer cannot create, publish, modify, or override governed rates even by
  // calling this endpoint directly. The employer app does not proxy this route.
  app.post("/organizations/:organizationId/contract", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) {
      return sendContractDenied(reply);
    }
    const body = asRecord(request.body);
    const currency = readOptionalString(body, "currency");
    try {
      const contract = await employerContractService.signContract({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId"),
        version: readRequiredString(body, "version") ?? "",
        ...(currency ? { currency } : {}),
        roleRates: readContractRoleRates(body)
      });
      return reply.code(201).send({ contract });
    } catch (error) {
      return sendContractError(reply, error);
    }
  });

  // Employer owner signs (accepts) the governed rate card. No rates are read from
  // the request body — the price cannot be set or altered client-side here.
  app.post("/organizations/:organizationId/contract/sign", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) {
      return sendContractDenied(reply);
    }
    try {
      const contract = await employerContractService.acknowledgeContract({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId")
      });
      return reply.code(200).send({ contract });
    } catch (error) {
      return sendContractError(reply, error);
    }
  });

  // Employer: read-only authoritative cancellation consequence. No amount/rate/count
  // from the browser — everything is derived server-side.
  app.post(
    "/organizations/:organizationId/job-requests/:jobRequestId/cancel/preview",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );
      if (!session.authenticated || !session.user) return sendCancellationDenied(reply);
      try {
        const preview = await employerCancellationService.previewCancellation({
          actorUserId: session.user.id,
          organizationId: readRouteParam(request.params, "organizationId"),
          jobRequestId: readRouteParam(request.params, "jobRequestId")
        });
        return reply.code(200).send({ preview });
      } catch (error) {
        return sendCancellationError(reply, error);
      }
    }
  );

  // Employer: confirm cancellation. Body carries only intent (idempotencyKey +
  // acknowledgement); rate/amount/count/cutoff are recalculated at confirm time.
  app.post(
    "/organizations/:organizationId/job-requests/:jobRequestId/cancel/confirm",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );
      if (!session.authenticated || !session.user) return sendCancellationDenied(reply);
      const body = asRecord(request.body);
      const idempotencyKey = readRequiredString(body, "idempotencyKey") ?? "";
      try {
        const result = await employerCancellationService.confirmCancellation({
          actorUserId: session.user.id,
          organizationId: readRouteParam(request.params, "organizationId"),
          jobRequestId: readRouteParam(request.params, "jobRequestId"),
          idempotencyKey
        });
        return reply.code(200).send(result);
      } catch (error) {
        return sendCancellationError(reply, error);
      }
    }
  );

  // Platform-only: complete the governed assignment handoff for a recorded
  // cancellation. Wraps the platform-authorized assignmentService.cancel; employer
  // code never reaches this.
  app.post(
    "/platform/request-cancellations/:cancellationId/complete-handoff",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );
      if (!session.authenticated || !session.user) return sendCancellationDenied(reply);
      const roles = await resolveAuthorizationRoles(session.user.id);
      if (!roles.includes("PLATFORM_ADMINISTRATOR")) {
        return reply
          .code(403)
          .send({ error: "RWOS_CANCELLATION_DENIED", message: "Platform authority is required." });
      }
      // Port bound to THIS platform actor: list still-confirmed assignments for the
      // request and cancel each via the governed path. Idempotent — already-cancelled
      // assignments drop out of the active-status list, so re-runs converge.
      const port: AssignmentCancelPort = {
        async cancelConfirmedAssignments({ organizationId, jobRequestId, reason }) {
          const assignments = await assignmentService.listAssignments({
            session,
            roles,
            organizationId,
            jobRequestId,
            statuses: [...CONFIRMED_ASSIGNMENT_STATUSES] as AssignmentStatus[]
          });
          let cancelled = 0;
          let failed = 0;
          for (const assignment of assignments) {
            try {
              await assignmentService.cancel({
                session,
                roles,
                assignmentId: assignment.id,
                expectedVersion: assignment.versionToken,
                reason,
                status: "employer_cancelled"
              });
              cancelled += 1;
            } catch {
              failed += 1;
            }
          }
          return { attempted: assignments.length, cancelled, failed };
        }
      };
      try {
        const result = await employerCancellationService.completeHandoff({
          cancellationId: readRouteParam(request.params, "cancellationId"),
          assignmentCancelPort: port
        });
        return reply.code(200).send(result);
      } catch (error) {
        return sendCancellationError(reply, error);
      }
    }
  );

  // Platform-only reconciliation queue: cancellations needing operator attention.
  app.get("/platform/request-cancellations", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendCancellationDenied(reply);
    const roles = await resolveAuthorizationRoles(session.user.id);
    if (!roles.includes("PLATFORM_ADMINISTRATOR")) {
      return reply
        .code(403)
        .send({ error: "RWOS_CANCELLATION_DENIED", message: "Platform authority is required." });
    }
    const statusFilter = readOptionalString(asRecord(request.query), "status");
    const statuses = statusFilter === "all"
      ? (["requested", "assignment_cancellation_pending", "completed", "failed", "requires_reconciliation"] as const)
      : (["requires_reconciliation"] as const);
    const cancellations = await employerCancellationService.listReconciliation({ statuses: [...statuses] });
    return reply.code(200).send({ cancellations });
  });

  app.get("/organizations/:organizationId/residences/:residenceId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendResidenceDenied(reply);
    }

    const residence = await residenceService.getResidence({
      actorUserId: session.user.id,
      organizationId: readRouteParam(request.params, "organizationId"),
      residenceId: readRouteParam(request.params, "residenceId")
    });

    return reply.code(200).send({ residence: serializeResidence(residence) });
  });

  app.patch("/organizations/:organizationId/residences/:residenceId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendResidenceDenied(reply);
    }

    const body = asRecord(request.body);
    const residence = await residenceService.updateResidence({
      actorUserId: session.user.id,
      organizationId: readRouteParam(request.params, "organizationId"),
      residenceId: readRouteParam(request.params, "residenceId"),
      expectedVersion: readRequiredString(body, "expectedVersion") ?? "",
      name: readOptionalString(body, "name"),
      addressSummary: readOptionalString(body, "addressSummary"),
      city: readOptionalString(body, "city"),
      region: readOptionalString(body, "region"),
      country: readOptionalString(body, "country")
    });

    return reply.code(200).send({ residence: serializeResidence(residence) });
  });

  app.post(
    "/organizations/:organizationId/residences/:residenceId/status",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );

      if (!session.authenticated || !session.user) {
        return sendResidenceDenied(reply);
      }

      const body = asRecord(request.body);
      const status = readResidenceLifecycleStatus(readRequiredString(body, "status"));
      const reason = readRequiredString(body, "reason");

      if (!status || !reason) {
        return reply.code(400).send({
          error: "RWOS_INVALID_RESIDENCE_REQUEST",
          message: "Invalid residence request."
        });
      }

      const residence = await residenceService.updateResidenceStatus({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId"),
        residenceId: readRouteParam(request.params, "residenceId"),
        expectedVersion: readRequiredString(body, "expectedVersion") ?? "",
        status,
        reason
      });

      return reply.code(200).send({ residence: serializeResidence(residence) });
    }
  );

  app.post(
    "/organizations/:organizationId/residences/:residenceId/departments",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );

      if (!session.authenticated || !session.user) {
        return sendDepartmentDenied(reply);
      }

      const body = asRecord(request.body);
      const name = readRequiredString(body, "name");

      if (!name) {
        return reply.code(400).send({
          error: "RWOS_INVALID_DEPARTMENT_REQUEST",
          message: "Invalid department request."
        });
      }

      const department = await departmentService.createDepartment({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId"),
        residenceId: readRouteParam(request.params, "residenceId"),
        name
      });

      return reply.code(201).send({ department: serializeDepartment(department) });
    }
  );

  app.get(
    "/organizations/:organizationId/residences/:residenceId/departments",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );

      if (!session.authenticated || !session.user) {
        return sendDepartmentDenied(reply);
      }

      const status = readDepartmentStatus(readOptionalString(asRecord(request.query), "status"));
      const departments = await departmentService.listDepartments({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId"),
        residenceId: readRouteParam(request.params, "residenceId"),
        status
      });

      return reply.code(200).send({ departments: departments.map(serializeDepartment) });
    }
  );

  app.get(
    "/organizations/:organizationId/residences/:residenceId/departments/:departmentId",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );

      if (!session.authenticated || !session.user) {
        return sendDepartmentDenied(reply);
      }

      const department = await departmentService.getDepartment({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId"),
        residenceId: readRouteParam(request.params, "residenceId"),
        departmentId: readRouteParam(request.params, "departmentId")
      });

      return reply.code(200).send({ department: serializeDepartment(department) });
    }
  );

  app.patch(
    "/organizations/:organizationId/residences/:residenceId/departments/:departmentId",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );

      if (!session.authenticated || !session.user) {
        return sendDepartmentDenied(reply);
      }

      const body = asRecord(request.body);
      const department = await departmentService.updateDepartment({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId"),
        residenceId: readRouteParam(request.params, "residenceId"),
        departmentId: readRouteParam(request.params, "departmentId"),
        expectedVersion: readRequiredString(body, "expectedVersion") ?? "",
        name: readOptionalString(body, "name")
      });

      return reply.code(200).send({ department: serializeDepartment(department) });
    }
  );

  app.post(
    "/organizations/:organizationId/residences/:residenceId/departments/:departmentId/status",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );

      if (!session.authenticated || !session.user) {
        return sendDepartmentDenied(reply);
      }

      const body = asRecord(request.body);
      const status = readDepartmentLifecycleStatus(readRequiredString(body, "status"));
      const reason = readRequiredString(body, "reason");

      if (!status || !reason) {
        return reply.code(400).send({
          error: "RWOS_INVALID_DEPARTMENT_REQUEST",
          message: "Invalid department request."
        });
      }

      const department = await departmentService.updateDepartmentStatus({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId"),
        residenceId: readRouteParam(request.params, "residenceId"),
        departmentId: readRouteParam(request.params, "departmentId"),
        expectedVersion: readRequiredString(body, "expectedVersion") ?? "",
        status,
        reason
      });

      return reply.code(200).send({ department: serializeDepartment(department) });
    }
  );

  app.post("/organizations/:organizationId/job-requests", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendJobRequestDenied(reply);
    }

    const body = asRecord(request.body);
    const urgency = readJobRequestUrgency(readRequiredString(body, "urgency"));
    const requestType = readJobRequestType(readRequiredString(body, "requestType"));
    const startAt = readRequiredDate(body, "startAt");
    const endAt = readRequiredDate(body, "endAt");

    if (!urgency || !requestType || !startAt || !endAt) {
      return reply.code(400).send({
        error: "RWOS_INVALID_JOB_REQUEST",
        message: "Invalid job request."
      });
    }

    const jobRequest = await jobRequestService.createDraft({
      actorUserId: session.user.id,
      organizationId: readRouteParam(request.params, "organizationId"),
      residenceId: readRequiredString(body, "residenceId") ?? "",
      departmentId: readRequiredString(body, "departmentId") ?? "",
      workGroupSlug: readRequiredString(body, "workGroup") ?? "",
      roleDefinitionIdentifier: readRequiredString(body, "roleDefinition") ?? "",
      title: readRequiredString(body, "title") ?? "",
      description: readOptionalString(body, "description"),
      numberOfWorkers: readOptionalNumber(body, "numberOfWorkers") ?? 0,
      urgency,
      requestType,
      timezone: readRequiredString(body, "timezone") ?? "",
      startAt,
      endAt
    });

    // Optional worksite distance (km) — input for the distance (gas/travel) surcharge captured at
    // approval. Set directly (the governed draft service doesn't own pricing inputs).
    const worksiteDistanceKm = readOptionalNumber(body, "worksiteDistanceKm");
    if (worksiteDistanceKm != null && Number.isFinite(worksiteDistanceKm) && worksiteDistanceKm >= 0) {
      await prisma!.jobRequest.update({ where: { id: jobRequest.id }, data: { worksiteDistanceKm } });
    }

    return reply.code(201).send({ jobRequest: serializeJobRequest(jobRequest) });
  });

  // Create a multi-role order: one submission grouping several role lines (role + quantity +
  // conditions), each becoming a governed child job request. Shared worksite + time window live on
  // the order. No pricing is set here — each child is priced by admin at approval, as today.
  app.post("/organizations/:organizationId/orders", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);
    const organizationId = readRouteParam(request.params, "organizationId");
    const body = asRecord(request.body);
    const urgency = readJobRequestUrgency(readRequiredString(body, "urgency"));
    const requestType = readJobRequestType(readRequiredString(body, "requestType"));
    const startAt = readRequiredDate(body, "startAt");
    const endAt = readRequiredDate(body, "endAt");
    const residenceId = readRequiredString(body, "residenceId") ?? "";
    const departmentId = readRequiredString(body, "departmentId") ?? "";
    const title = readRequiredString(body, "title") ?? "";
    const timezone = readRequiredString(body, "timezone") ?? "";
    if (!urgency || !requestType || !startAt || !endAt || !residenceId || !departmentId || !title || !timezone) {
      return reply.code(400).send({ error: "RWOS_INVALID_ORDER", message: "Invalid order." });
    }
    const result = await createEmployerOrderWithChildren(prisma!, jobRequestService, {
      actorUserId: session.user.id,
      organizationId,
      residenceId,
      departmentId,
      title,
      note: readOptionalString(body, "note") ?? null,
      perks: readOptionalString(body, "perks") ?? null,
      urgency,
      requestType,
      timezone,
      startAt,
      endAt,
      lines: body.lines
    });
    if (!result.ok) {
      const code = result.reason === "child_create_failed" ? 422 : 400;
      return reply.code(code).send({ error: `RWOS_ORDER_${result.reason.toUpperCase()}`, message: "The order could not be created." });
    }
    return reply.code(201).send({ order: result.order });
  });

  // The organization's orders (most recent first).
  app.get("/organizations/:organizationId/orders", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);
    const organizationId = readRouteParam(request.params, "organizationId");
    if (!(await userHasOrganizationAccess(session.user.id, organizationId))) return sendJobRequestDenied(reply);
    const orders = await listEmployerOrders(prisma!, organizationId);
    return reply.code(200).send({ orders });
  });

  // One order with its child role lines.
  app.get("/organizations/:organizationId/orders/:orderId", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);
    const organizationId = readRouteParam(request.params, "organizationId");
    if (!(await userHasOrganizationAccess(session.user.id, organizationId))) return sendJobRequestDenied(reply);
    const order = await getEmployerOrder(prisma!, organizationId, readRouteParam(request.params, "orderId"));
    if (!order) return reply.code(404).send({ error: "RWOS_ORDER_NOT_FOUND", message: "Order not found." });
    return reply.code(200).send({ order });
  });

  // Submit the whole order: every still-draft child role line is submitted for admin review.
  app.post("/organizations/:organizationId/orders/:orderId/submit", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);
    const organizationId = readRouteParam(request.params, "organizationId");
    if (!(await userHasOrganizationAccess(session.user.id, organizationId))) return sendJobRequestDenied(reply);
    const result = await submitEmployerOrder(prisma!, jobRequestService, {
      actorUserId: session.user.id,
      organizationId,
      orderId: readRouteParam(request.params, "orderId"),
      now: new Date()
    });
    if (!result.ok) {
      const code = result.reason === "not_found" ? 404 : 422;
      return reply.code(code).send({ error: `RWOS_ORDER_${result.reason.toUpperCase()}`, message: "The order could not be submitted." });
    }
    return reply.code(200).send({ order: result.order });
  });

  // Cancel the whole order (every still-cancellable child role line). A reason is required.
  app.post("/organizations/:organizationId/orders/:orderId/cancel", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);
    const organizationId = readRouteParam(request.params, "organizationId");
    if (!(await userHasOrganizationAccess(session.user.id, organizationId))) return sendJobRequestDenied(reply);
    const reason = readRequiredString(asRecord(request.body), "reason");
    if (!reason) return reply.code(400).send({ error: "RWOS_ORDER_REASON_REQUIRED", message: "A cancellation reason is required." });
    const result = await cancelEmployerOrder(prisma!, jobRequestService, {
      actorUserId: session.user.id,
      organizationId,
      orderId: readRouteParam(request.params, "orderId"),
      reason,
      now: new Date()
    });
    if (!result.ok) {
      const code = result.reason === "not_found" ? 404 : 422;
      return reply.code(code).send({ error: `RWOS_ORDER_${result.reason.toUpperCase()}`, message: "The order could not be cancelled." });
    }
    return reply.code(200).send({ order: result.order });
  });

  // Admin-maintained market-wage references for the roles at a residence's province — advisory only,
  // shown to the employer beside their own contract rate. Never used to price, pay, or bill.
  app.get("/organizations/:organizationId/market-wages", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);
    const organizationId = readRouteParam(request.params, "organizationId");
    if (!(await userHasOrganizationAccess(session.user.id, organizationId))) return sendJobRequestDenied(reply);
    const residenceId = readOptionalString(asRecord(request.query), "residenceId");
    if (!residenceId) return reply.code(200).send({ marketWages: [] });
    const marketWages = await listMarketWagesForResidence(prisma!, organizationId, residenceId);
    return reply.code(200).send({ marketWages });
  });

  // Duplicate a request into a NEW DRAFT only. Copies governed fields + duties/
  // qualifications/notes from the source; NEVER copies status, assignments, offers,
  // attendance, cancellations, or old rate/estimate. createDraft revalidates the
  // active site/role + current contract and enforces the 6-hour minimum; pricing is
  // never stored, so the duplicate is inherently repriced from the current contract.
  app.post(
    "/organizations/:organizationId/job-requests/:jobRequestId/duplicate",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );
      if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);
      const actorUserId = session.user.id;
      const organizationId = readRouteParam(request.params, "organizationId");
      const jobRequestIdOrNumber = readRouteParam(request.params, "jobRequestId");
      try {
        const source = await jobRequestService.getForOrganization({
          actorUserId,
          organizationId,
          jobRequestIdOrNumber
        });
        const [workGroup, roleDefinition, sourceProfile] = await Promise.all([
          createPrismaWorkGroupRepository(prisma!).findWorkGroupById(source.workGroupId),
          createPrismaRoleDefinitionRepository(prisma!).findRoleDefinitionById(source.roleDefinitionId),
          calendarRequestService.getClientCalendarRequest({
            actorUserId,
            organizationId,
            jobRequestIdOrNumber
          })
        ]);
        if (!workGroup || !roleDefinition) {
          return reply.code(409).send({
            error: "RWOS_DUPLICATE_SOURCE_UNAVAILABLE",
            message: "The work group or role for this request is no longer available."
          });
        }
        const draft = await jobRequestService.createDraft({
          actorUserId,
          organizationId,
          residenceId: source.residenceId,
          departmentId: source.departmentId,
          workGroupSlug: workGroup.key,
          roleDefinitionIdentifier: roleDefinition.key,
          title: source.title,
          description: source.description ?? null,
          numberOfWorkers: source.numberOfWorkers,
          urgency: source.urgency,
          requestType: source.requestType,
          timezone: source.timezone,
          startAt: source.startAt,
          endAt: source.endAt
        });
        // Copy the duties / qualifications / arrival notes (best-effort).
        try {
          await calendarRequestService.upsertClientProfile({
            actorUserId,
            organizationId,
            jobRequestId: draft.id,
            dutiesSummary: sourceProfile.dutiesSummary,
            qualifications: sourceProfile.qualifications,
            addressSummary: sourceProfile.addressSummary,
            specialInstructions: sourceProfile.specialInstructions,
            expectedVersion: null
          });
        } catch {
          // The draft still exists; the employer can fill duties/qualifications.
        }
        return reply.code(201).send({
          jobRequest: serializeJobRequest(draft),
          duplicatedFromRequestNumber: source.jobRequestNumber,
          repricedFrom: "current_active_contract"
        });
      } catch (error) {
        if (error instanceof JobRequestError) {
          return reply
            .code(409)
            .send({ error: "RWOS_DUPLICATE_DENIED", message: "This request could not be duplicated." });
        }
        throw error;
      }
    }
  );

  // Add Workers — live capacity increase. Body carries the desired addition +
  // expected version only; never an authoritative rate/amount. Existing assignments
  // are untouched.
  app.post(
    "/organizations/:organizationId/job-requests/:jobRequestId/add-workers",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );
      if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);
      const body = asRecord(request.body);
      const additionalWorkers = readOptionalNumber(body, "additionalWorkers") ?? 0;
      const expectedVersion = readOptionalNumber(body, "expectedVersion");
      if (expectedVersion === null || expectedVersion === undefined) {
        return reply
          .code(400)
          .send({ error: "RWOS_INVALID_JOB_REQUEST", message: "A current request version is required." });
      }
      try {
        const result = await jobRequestService.increaseRequestedCapacity({
          actorUserId: session.user.id,
          organizationId: readRouteParam(request.params, "organizationId"),
          jobRequestId: readRouteParam(request.params, "jobRequestId"),
          additionalWorkers,
          expectedVersion
        });
        return reply.code(200).send(result);
      } catch (error) {
        return sendCapacityError(reply, error);
      }
    }
  );

  // Employer worksite geocoding. Resolves a Canadian postal code/address via the
  // configured provider, validates Canada + confidence, and persists the normalized
  // authoritative location on the residence. Browser-supplied lat/lng is never trusted.
  app.post("/organizations/:organizationId/residences/:residenceId/geocode", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) return sendResidenceDenied(reply);
    const organizationId = readRouteParam(request.params, "organizationId");
    const residenceId = readRouteParam(request.params, "residenceId");
    const body = asRecord(request.body);
    const postalCode = readOptionalString(body, "postalCode");
    const address = readOptionalString(body, "address");
    // Authorize + confirm the residence belongs to this org.
    let residence: Awaited<ReturnType<typeof residenceService.getResidence>>;
    try {
      residence = await residenceService.getResidence({ actorUserId: session.user.id, organizationId, residenceId });
    } catch {
      return sendResidenceDenied(reply);
    }
    const countryAddress = options.countryAddress;
    if (!countryAddress) {
      return reply.code(400).send({ error: "RWOS_COUNTRY_ADDRESS_UNAVAILABLE", message: "Address resolution is not configured for the selected country." });
    }
    const normalizedPostal = postalCode ? countryAddress.normalizePostalCode(postalCode) : null;
    if (!normalizedPostal && !address) {
      return reply.code(400).send({ error: "RWOS_INVALID_POSTAL", message: "A valid Canadian postal code or address is required." });
    }
    const result = await geocodingProvider.geocode({
      countryRestriction: countryAddress.geocodeCountryRestriction,
      ...(normalizedPostal ? { postalCode: normalizedPostal } : {}),
      ...(address ? { address } : {})
    });
    if (result.status !== "ok") {
      const code =
        result.status === "ambiguous" ? "RWOS_AMBIGUOUS_LOCATION" :
        result.status === "outside_canada" ? "RWOS_LOCATION_OUTSIDE_CANADA" :
        result.status === "provider_unavailable" ? "RWOS_GEOCODER_UNAVAILABLE" :
        result.status === "low_confidence" ? "RWOS_LOCATION_LOW_CONFIDENCE" : "RWOS_LOCATION_NOT_FOUND";
      const http = result.status === "provider_unavailable" ? 503 : result.status === "ambiguous" ? 409 : 422;
      return reply.code(http).send({ error: code, status: result.status, message: "The worksite location could not be confidently resolved." });
    }
    const loc = result.location;
    if (!isValidCoordinate(loc.latitude, loc.longitude) || !countryAddress.isWithinCountryBounds(loc.latitude, loc.longitude)) {
      return reply.code(422).send({ error: "RWOS_LOCATION_OUTSIDE_CANADA", message: "The resolved location is not within Canada." });
    }
    await prisma!.residence.updateMany({
      where: { id: residence.id, organizationId },
      data: {
        province: loc.province,
        postalCode: loc.postalCode,
        addressLine1: address ?? null,
        city: loc.city,
        country: "CA",
        latitude: loc.latitude,
        longitude: loc.longitude,
        geocodePrecision: loc.precision,
        geocodeProvider: loc.provider,
        geocodeProviderRef: loc.providerReference,
        geocodeResolvedAt: new Date()
      }
    });
    return reply.code(200).send({
      location: { province: loc.province, city: loc.city, postalCode: loc.postalCode, precision: loc.precision, provider: loc.provider },
      // Employer worksite preview may show the exact point to the owner.
      mapPreview: { latitude: loc.latitude, longitude: loc.longitude }
    });
  });

  // Worker marketplace job search. Cross-org, privacy-safe. Worker origin is a Canadian
  // postal code; the server geocodes it, does a bounding-box pre-filter, computes exact
  // geodesic distance, applies the radius, and returns area-level results (no exact
  // address/coords). Distance is authoritative server-side; the browser supplies none.
  app.post("/marketplace/jobs/search", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_MARKETPLACE_DENIED", message: "Authentication is required." });
    }
    const body = asRecord(request.body);
    const postalCode = readOptionalString(body, "postalCode");
    const countryAddress = options.countryAddress;
    if (!countryAddress) {
      return reply.code(400).send({ error: "RWOS_COUNTRY_ADDRESS_UNAVAILABLE", message: "Address resolution is not configured for the selected country." });
    }
    // Stage 2b.3b-1: the (display-only, decorative) result currency is driven by the selected country's
    // currency, never a hard-coded "CAD". Absent → fail closed, never silently substitute CAD. Byte-
    // identical for Canada (countryCurrency === "CAD"). workerRateMinor stays null (policy-gated).
    const countryCurrency = options.countryCurrency;
    if (!countryCurrency) {
      return reply.code(400).send({ error: "RWOS_COUNTRY_CURRENCY_UNAVAILABLE", message: "Currency is not configured for the selected country." });
    }
    const normalizedPostal = postalCode ? countryAddress.normalizePostalCode(postalCode) : null;
    if (!normalizedPostal) {
      return reply.code(400).send({ error: "RWOS_INVALID_POSTAL", message: "A valid Canadian postal code is required." });
    }
    const radiusRaw = readOptionalNumber(body, "radiusKm");
    const radiusKm = radiusRaw && radiusRaw > 0 ? radiusRaw : undefined; // omit → any distance
    const roleFilter = readOptionalString(body, "role");
    // Additional server-authoritative filters. All optional; the browser can only NARROW.
    const dateFrom = parseIsoDate(readOptionalString(body, "dateFrom"));
    const dateTo = parseIsoDate(readOptionalString(body, "dateTo"));
    const minOpeningsRaw = readOptionalNumber(body, "minOpenings");
    const minOpenings = minOpeningsRaw && minOpeningsRaw > 0 ? Math.floor(minOpeningsRaw) : undefined;
    const verifiedOnly = body.verifiedOnly === true;
    const sort = readOptionalString(body, "sort"); // "nearest" | "soonest" | "highest_rate"
    // Pagination (bounded — we never return "all of Canada"). Cursor is a simple opaque
    // offset; limit is clamped so map pins + list stay bounded to a page.
    const limitRaw = readOptionalNumber(body, "limit");
    const limit = Math.min(Math.max(limitRaw ? Math.floor(limitRaw) : 20, 1), MARKETPLACE_PAGE_MAX);
    const cursorRaw = readOptionalNumber(body, "cursor");
    const offset = cursorRaw && cursorRaw > 0 ? Math.floor(cursorRaw) : 0;

    const origin = await geocodingProvider.geocode({ countryRestriction: countryAddress.geocodeCountryRestriction, postalCode: normalizedPostal });
    if (origin.status !== "ok") {
      return reply.code(422).send({ error: "RWOS_ORIGIN_UNRESOLVED", status: origin.status, message: "Your search location could not be resolved." });
    }
    const box = boundingBoxKm({ latitude: origin.location.latitude, longitude: origin.location.longitude }, radiusKm ?? 500);
    const rows = await prisma!.jobRequest.findMany({
      where: {
        status: { in: ["submitted", "approved_for_dispatch"] },
        ...(roleFilter ? { roleDefinition: { key: roleFilter } } : {}),
        ...(minOpenings ? { numberOfWorkers: { gte: minOpenings } } : {}),
        ...(dateFrom || dateTo ? { startAt: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } } : {}),
        residence: {
          status: "active",
          latitude: { gte: box.minLat, lte: box.maxLat },
          longitude: { gte: box.minLng, lte: box.maxLng }
        }
      },
      select: {
        id: true,
        numberOfWorkers: true,
        startAt: true,
        endAt: true,
        roleDefinition: { select: { displayLabel: true } },
        organization: { select: { id: true, displayName: true } },
        residence: { select: { city: true, province: true, latitude: true, longitude: true } },
        pricingSnapshot: { select: { workerHourlyRateMinor: true } }
      },
      take: MARKETPLACE_CANDIDATE_CAP
    });
    if (rows.length === MARKETPLACE_CANDIDATE_CAP) {
      logger.warn("marketplace.search.candidate_cap_hit", { cap: MARKETPLACE_CANDIDATE_CAP, postalCode: normalizedPostal });
    }
    // Authoritative Verified-Employer state for the orgs on this result set. Read from the
    // employer_verifications record only (business_verified + not expired). Never inferred.
    const orgIds = [...new Set(rows.map((r) => r.organization.id))];
    const verifiedOrgIds = new Set<string>();
    if (orgIds.length > 0) {
      const verifiedRows = await prisma!.employerVerification.findMany({
        where: { organizationId: { in: orgIds }, status: "business_verified", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        select: { organizationId: true }
      });
      for (const v of verifiedRows) verifiedOrgIds.add(v.organizationId);
    }
    const candidates: MarketplaceJobCandidate[] = [];
    for (const r of rows) {
      const province = r.residence.province;
      if (!isProvinceCode(province) || r.residence.latitude === null || r.residence.longitude === null) continue;
      const isVerifiedEmployer = verifiedOrgIds.has(r.organization.id);
      if (verifiedOnly && !isVerifiedEmployer) continue; // verified-only narrows to real verified orgs
      candidates.push({
        jobRequestId: r.id,
        role: r.roleDefinition.displayLabel,
        employerName: r.organization.displayName,
        verifiedEmployer: isVerifiedEmployer,
        city: r.residence.city,
        province: province as ProvinceCode,
        latitude: r.residence.latitude,
        longitude: r.residence.longitude,
        startAt: r.startAt.toISOString(),
        endAt: r.endAt.toISOString(),
        openings: r.numberOfWorkers,
        workerRateMinor: r.pricingSnapshot?.workerHourlyRateMinor ?? null, // W from the immutable approval snapshot (null until approved); the employer rate E is never exposed here
        currency: countryCurrency // display-only; driven by the selected country (CAD for Canada)
      });
    }
    // Distance ranking is authoritative + always computed first (radius applied here).
    const ranked = searchNearbyJobs({
      origin: { latitude: origin.location.latitude, longitude: origin.location.longitude },
      ...(radiusKm !== undefined ? { radiusKm } : {}),
      candidates,
      regionNames: countryAddress // display-name capability from the selected country (already guarded above)
    });
    // Server-authoritative sort (never trusts browser-supplied distances/rates).
    const sorted = [...ranked];
    if (sort === "soonest") sorted.sort((a, b) => a.startAt.localeCompare(b.startAt));
    else if (sort === "highest_rate") sorted.sort((a, b) => (b.workerRateMinor ?? -1) - (a.workerRateMinor ?? -1));
    // else "nearest" — already distance-ordered.

    const total = sorted.length;
    const page = sorted.slice(offset, offset + limit);
    const nextCursor = offset + limit < total ? offset + limit : null;

    // Hydrate saved-state for THIS page (best-effort; non-workers get no flags).
    let savedIds: readonly string[];
    try {
      savedIds = await workerSavedJobsService.savedIdsAmong({
        userId: session.user.id,
        jobRequestIds: page.map((r) => r.jobRequestId)
      });
    } catch {
      savedIds = []; // not a worker → no saved flags; never fail the search
    }
    const savedSet = new Set(savedIds);
    const jobs = page.map((r) => ({ ...r, saved: savedSet.has(r.jobRequestId) }));
    return reply.code(200).send({
      origin: { province: origin.location.province, city: origin.location.city, postalCode: normalizedPostal },
      count: jobs.length,
      total,
      nextCursor,
      jobs
    });
  });

  // Worker Saved Jobs — bookmark/unbookmark open marketplace jobs, and list them. All
  // user(worker)-scoped and idempotent. No money; saving is free.
  const sendSavedJobError = (reply: FastifyReply, error: unknown) => {
    if (error instanceof WorkerSavedJobError) {
      const code = error.code === "denied" ? 403 : error.code === "not_found" ? 404 : 400;
      return reply.code(code).send({ error: `RWOS_SAVED_JOB_${error.code.toUpperCase()}`, message: error.message });
    }
    throw error;
  };

  app.post("/marketplace/saved-jobs", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_MARKETPLACE_DENIED", message: "Authentication is required." });
    }
    const body = asRecord(request.body);
    const jobRequestId = readOptionalString(body, "jobRequestId");
    if (!jobRequestId) {
      return reply.code(400).send({ error: "RWOS_SAVED_JOB_INVALID", message: "A jobRequestId is required." });
    }
    try {
      const result = await workerSavedJobsService.save({ userId: session.user.id, jobRequestId });
      return reply.code(200).send(result);
    } catch (error) {
      return sendSavedJobError(reply, error);
    }
  });

  app.delete("/marketplace/saved-jobs/:jobRequestId", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_MARKETPLACE_DENIED", message: "Authentication is required." });
    }
    const jobRequestId = readRouteParam(request.params, "jobRequestId");
    try {
      const result = await workerSavedJobsService.unsave({ userId: session.user.id, jobRequestId });
      return reply.code(200).send(result);
    } catch (error) {
      return sendSavedJobError(reply, error);
    }
  });

  app.get("/marketplace/saved-jobs", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_MARKETPLACE_DENIED", message: "Authentication is required." });
    }
    try {
      const savedRecords = await workerSavedJobsService.list({ userId: session.user.id });
      // Enrich with privacy-safe summaries + an availability flag. A saved job that is no
      // longer marketplace-visible (hidden/cancelled/expired, or its residence deactivated)
      // is returned as unavailable rather than dropped, so the worker understands why.
      const ids = savedRecords.map((s) => s.jobRequestId);
      const rows = ids.length
        ? await prisma!.jobRequest.findMany({
            where: { id: { in: ids } },
            select: {
              id: true,
              title: true,
              status: true,
              numberOfWorkers: true,
              startAt: true,
              endAt: true,
              roleDefinition: { select: { displayLabel: true } },
              organization: { select: { id: true, displayName: true } },
              residence: { select: { city: true, province: true, status: true } }
            }
          })
        : [];
      const byId = new Map(rows.map((r) => [r.id, r]));
      const saved = savedRecords.map((rec) => {
        const r = byId.get(rec.jobRequestId);
        const available =
          !!r &&
          (r.status === "submitted" || r.status === "approved_for_dispatch") &&
          r.residence.status === "active";
        return {
          jobRequestId: rec.jobRequestId,
          savedAt: rec.savedAt,
          available,
          summary: r
            ? {
                role: r.roleDefinition.displayLabel,
                title: r.title,
                employer: { id: r.organization.id, name: r.organization.displayName, verified: false },
                areaLabel:
                  r.residence.city && isProvinceCode(r.residence.province)
                    ? `${r.residence.city}, ${r.residence.province}`
                    : null,
                startAt: r.startAt.toISOString(),
                endAt: r.endAt.toISOString(),
                openings: r.numberOfWorkers
              }
            : null
        };
      });
      return reply.code(200).send({ count: saved.length, saved });
    } catch (error) {
      return sendSavedJobError(reply, error);
    }
  });

  // ── Worker Job Interest (governed marketplace intent) ──
  // Express interest records intent ONLY. It never creates a worker offer or an assignment;
  // platform dispatch reviews interest and issues a governed offer via the worker-offer
  // service. Eligibility is server-authoritative; the browser cannot declare itself eligible.
  const sendInterestError = (reply: FastifyReply, error: unknown) => {
    if (error instanceof WorkerJobInterestError) {
      const code =
        error.code === "denied" ? 403 : error.code === "not_found" ? 404 : error.code === "conflict" ? 409 : error.code === "ineligible" ? 422 : 400;
      return reply.code(code).send({ error: `RWOS_INTEREST_${error.code.toUpperCase()}`, message: error.message, reasons: error.reasons });
    }
    throw error;
  };

  // Server-authoritative distance-at-interest (audit datum). Never trusts a browser value.
  async function computeInterestDistanceKm(jobRequestId: string, postalCode: string | null): Promise<number | null> {
    if (!postalCode) return null;
    const countryAddress = options.countryAddress;
    if (!countryAddress) return null;
    const normalized = countryAddress.normalizePostalCode(postalCode);
    if (!normalized) return null;
    const [geo, job] = await Promise.all([
      geocodingProvider.geocode({ countryRestriction: countryAddress.geocodeCountryRestriction, postalCode: normalized }),
      prisma!.jobRequest.findUnique({ where: { id: jobRequestId }, select: { residence: { select: { latitude: true, longitude: true } } } })
    ]);
    if (geo.status !== "ok" || !job || job.residence.latitude === null || job.residence.longitude === null) return null;
    return Math.round(
      geodesicDistanceKm(
        { latitude: geo.location.latitude, longitude: geo.location.longitude },
        { latitude: job.residence.latitude, longitude: job.residence.longitude }
      ) * 10
    ) / 10;
  }

  // Express interest in a job (idempotent). Optional postalCode → server-computed distance.
  app.post("/marketplace/jobs/:jobRequestId/interest", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_MARKETPLACE_DENIED", message: "Authentication is required." });
    }
    const jobRequestId = readRouteParam(request.params, "jobRequestId");
    if (!isCanonicalUuid(jobRequestId)) {
      return reply.code(404).send({ error: "RWOS_INTEREST_NOT_FOUND", message: "That job is not available." });
    }
    // Privacy parity with the detail endpoint: a non-visible (hidden/cancelled/expired or
    // inactive-residence) job must 404, never reveal itself via an eligibility reason.
    const visible = await prisma!.jobRequest.findFirst({
      where: { id: jobRequestId, status: { in: ["submitted", "approved_for_dispatch"] }, residence: { status: "active" } },
      select: { id: true }
    });
    if (!visible) {
      return reply.code(404).send({ error: "RWOS_INTEREST_NOT_FOUND", message: "That job is not available." });
    }
    const postalCode = readOptionalString(asRecord(request.body), "postalCode");
    try {
      const distanceKmAtInterest = await computeInterestDistanceKm(jobRequestId, postalCode);
      const result = await workerJobInterestService.expressInterest({ userId: session.user.id, jobRequestId, distanceKmAtInterest });
      return reply.code(200).send({
        interest: { status: result.interest.status, jobRequestId, createdAt: result.interest.createdAt },
        alreadyInterested: result.alreadyInterested
      });
    } catch (error) {
      return sendInterestError(reply, error);
    }
  });

  // Withdraw active interest (idempotent; never undoes a governed offer/assignment).
  app.delete("/marketplace/jobs/:jobRequestId/interest", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_MARKETPLACE_DENIED", message: "Authentication is required." });
    }
    const jobRequestId = readRouteParam(request.params, "jobRequestId");
    try {
      const result = await workerJobInterestService.withdraw({ userId: session.user.id, jobRequestId });
      return reply.code(200).send(result);
    } catch (error) {
      return sendInterestError(reply, error);
    }
  });

  // Current interest + eligibility state for the details-page CTA.
  app.get("/marketplace/jobs/:jobRequestId/interest", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_MARKETPLACE_DENIED", message: "Authentication is required." });
    }
    const jobRequestId = readRouteParam(request.params, "jobRequestId");
    if (!isCanonicalUuid(jobRequestId)) {
      return reply.code(404).send({ error: "RWOS_INTEREST_NOT_FOUND", message: "That job is not available." });
    }
    try {
      const [active, eligibility] = await Promise.all([
        workerJobInterestService.getActive({ userId: session.user.id, jobRequestId }),
        workerJobInterestService.checkEligibility({ userId: session.user.id, jobRequestId })
      ]);
      return reply.code(200).send({
        interest: active ? { status: active.status } : null,
        eligibility
      });
    } catch (error) {
      return sendInterestError(reply, error);
    }
  });

  // The worker's applications ("My Interests"), enriched with a privacy-safe job summary +
  // the linked governed-offer status when one exists.
  app.get("/marketplace/my-interests", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_MARKETPLACE_DENIED", message: "Authentication is required." });
    }
    try {
      const interests = await workerJobInterestService.listForWorker({ userId: session.user.id });
      const jobIds = [...new Set(interests.map((i) => i.jobRequestId))];
      const offerIds = interests.map((i) => i.workerOfferId).filter((v): v is string => !!v);
      const [jobRows, offerRows] = await Promise.all([
        jobIds.length
          ? prisma!.jobRequest.findMany({
              where: { id: { in: jobIds } },
              select: {
                id: true,
                title: true,
                startAt: true,
                endAt: true,
                roleDefinition: { select: { displayLabel: true } },
                organization: { select: { id: true, displayName: true } },
                residence: { select: { city: true, province: true } }
              }
            })
          : Promise.resolve([]),
        offerIds.length
          ? prisma!.workerOffer.findMany({ where: { id: { in: offerIds } }, select: { id: true, status: true } })
          : Promise.resolve([])
      ]);
      const jobById = new Map(jobRows.map((j) => [j.id, j]));
      const offerById = new Map(offerRows.map((o) => [o.id, o]));
      const items = interests.map((i) => {
        const j = jobById.get(i.jobRequestId);
        return {
          jobRequestId: i.jobRequestId,
          status: i.status,
          createdAt: i.createdAt,
          offerStatus: i.workerOfferId ? offerById.get(i.workerOfferId)?.status ?? null : null,
          summary: j
            ? {
                role: j.roleDefinition.displayLabel,
                title: j.title,
                employer: { id: j.organization.id, name: j.organization.displayName },
                areaLabel: j.residence.city && isProvinceCode(j.residence.province) ? `${j.residence.city}, ${j.residence.province}` : null,
                startAt: j.startAt.toISOString(),
                endAt: j.endAt.toISOString()
              }
            : null
        };
      });
      return reply.code(200).send({ count: items.length, interests: items });
    } catch (error) {
      return sendInterestError(reply, error);
    }
  });

  // ── Platform / dispatch view of marketplace interest ──
  // These are PLATFORM_ADMINISTRATOR-only. Interest is a dispatch SIGNAL — it never forces
  // selection, and none of these endpoints create an offer or assignment. Governed offers
  // are still created through the existing worker-offer service; link-offer only records the
  // link after such an offer exists and is validated to belong to this worker + job.
  const requirePlatformInterest = async (request: FastifyRequest, reply: FastifyReply): Promise<string | null> => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      reply.code(401).send({ error: "RWOS_MARKETPLACE_DENIED", message: "Authentication is required." });
      return null;
    }
    const roles = await resolveAuthorizationRoles(session.user.id);
    if (!roles.includes("PLATFORM_ADMINISTRATOR")) {
      reply.code(403).send({ error: "RWOS_INTEREST_DENIED", message: "Platform authority is required." });
      return null;
    }
    return session.user.id;
  };

  // Interested workers for a job request — a review signal for dispatch (approved display
  // name + interest status + distance-at-interest). Never auto-selects anyone.
  app.get("/platform/job-requests/:jobRequestId/interested-workers", async (request, reply) => {
    const actor = await requirePlatformInterest(request, reply);
    if (!actor) return;
    const jobRequestId = readRouteParam(request.params, "jobRequestId");
    if (!isCanonicalUuid(jobRequestId)) {
      return reply.code(404).send({ error: "RWOS_INTEREST_NOT_FOUND", message: "That job is not available." });
    }
    const interests = await workerJobInterestService.listInterestedForJob(jobRequestId);
    const workerIds = [...new Set(interests.map((i) => i.workerIdentityId))];
    const workers = workerIds.length
      ? await prisma!.workerIdentity.findMany({ where: { id: { in: workerIds } }, select: { id: true, displayName: true } })
      : [];
    const nameById = new Map(workers.map((w) => [w.id, w.displayName]));
    return reply.code(200).send({
      count: interests.length,
      interested: interests.map((i) => ({
        interestId: i.id,
        workerIdentityId: i.workerIdentityId,
        displayName: nameById.get(i.workerIdentityId) ?? null,
        status: i.status,
        distanceKmAtInterest: i.distanceKmAtInterest,
        workerOfferId: i.workerOfferId,
        createdAt: i.createdAt
      }))
    });
  });

  // Dispatch status transitions (marketplace intent only — never the offer/assignment SM).
  const interestTransition = (
    path: string,
    apply: (interestId: string) => Promise<unknown>
  ) =>
    app.post(path, async (request, reply) => {
      const actor = await requirePlatformInterest(request, reply);
      if (!actor) return;
      const interestId = readRouteParam(request.params, "interestId");
      if (!isCanonicalUuid(interestId)) {
        return reply.code(404).send({ error: "RWOS_INTEREST_NOT_FOUND", message: "That interest was not found." });
      }
      try {
        const interest = await apply(interestId);
        return reply.code(200).send({ interest });
      } catch (error) {
        return sendInterestError(reply, error);
      }
    });

  interestTransition("/platform/job-interests/:interestId/review", (id) => workerJobInterestService.markUnderReview(id));
  interestTransition("/platform/job-interests/:interestId/shortlist", (id) => workerJobInterestService.shortlist(id));
  interestTransition("/platform/job-interests/:interestId/not-selected", (id) => workerJobInterestService.markNotSelected(id));
  interestTransition("/platform/job-interests/:interestId/offer-accepted", (id) => workerJobInterestService.markOfferAccepted(id));

  // Link a governed offer (created via the worker-offer service) to an interest. Validates
  // the offer genuinely belongs to this interest's worker + job before linking. Does NOT
  // create the offer.
  app.post("/platform/job-interests/:interestId/link-offer", async (request, reply) => {
    const actor = await requirePlatformInterest(request, reply);
    if (!actor) return;
    const interestId = readRouteParam(request.params, "interestId");
    const workerOfferId = readOptionalString(asRecord(request.body), "workerOfferId");
    if (!isCanonicalUuid(interestId) || !workerOfferId || !isCanonicalUuid(workerOfferId)) {
      return reply.code(400).send({ error: "RWOS_INTEREST_INVALID", message: "A valid interestId and workerOfferId are required." });
    }
    const interest = await workerJobInterestService.getById(interestId);
    if (!interest) {
      return reply.code(404).send({ error: "RWOS_INTEREST_NOT_FOUND", message: "That interest was not found." });
    }
    const offer = await prisma!.workerOffer.findUnique({
      where: { id: workerOfferId },
      select: { id: true, jobRequestId: true, workerIdentityId: true }
    });
    if (!offer || offer.jobRequestId !== interest.jobRequestId || offer.workerIdentityId !== interest.workerIdentityId) {
      return reply.code(409).send({ error: "RWOS_INTEREST_OFFER_MISMATCH", message: "That offer does not match this worker and job." });
    }
    try {
      const linked = await workerJobInterestService.linkOffer({ interestId, workerOfferId });
      return reply.code(200).send({ interest: linked });
    } catch (error) {
      return sendInterestError(reply, error);
    }
  });

  // Admin worksite + day-by-day schedule for a dispatch review's job. PLATFORM_ADMINISTRATOR
  // only — this is the AUTHORITATIVE internal view, so it may include the exact worksite. The
  // day-by-day map shows, per day, the worksite where each assigned worker is scheduled — it
  // NEVER exposes worker home/personal locations (worker pin = the contract worksite for that
  // day). Data comes from governed assignments + the job's residence.
  app.get("/platform/dispatches/:dispatchReviewId/worksite-schedule", async (request, reply) => {
    const actor = await requirePlatformInterest(request, reply);
    if (!actor) return;
    const dispatchReviewId = readRouteParam(request.params, "dispatchReviewId");
    if (!isCanonicalUuid(dispatchReviewId)) {
      return reply.code(404).send({ error: "RWOS_INTEREST_NOT_FOUND", message: "That dispatch review was not found." });
    }
    const review = await prisma!.dispatchReview.findUnique({ where: { id: dispatchReviewId }, select: { jobRequestId: true } });
    if (!review) {
      return reply.code(404).send({ error: "RWOS_INTEREST_NOT_FOUND", message: "That dispatch review was not found." });
    }
    const job = await prisma!.jobRequest.findUnique({
      where: { id: review.jobRequestId },
      select: {
        title: true,
        startAt: true,
        endAt: true,
        timezone: true,
        residence: { select: { name: true, city: true, province: true, addressLine1: true, latitude: true, longitude: true } }
      }
    });
    if (!job) {
      return reply.code(404).send({ error: "RWOS_INTEREST_NOT_FOUND", message: "That job was not found." });
    }
    const worksite = {
      label: job.residence.name,
      city: job.residence.city,
      province: isProvinceCode(job.residence.province) ? job.residence.province : null,
      addressLine1: job.residence.addressLine1, // exact — admin-authoritative view only
      latitude: job.residence.latitude,
      longitude: job.residence.longitude
    };
    const assignments = await prisma!.assignment.findMany({
      where: { jobRequestId: review.jobRequestId },
      select: {
        status: true,
        confirmedStartAt: true,
        confirmedEndAt: true,
        workerIdentity: { select: { displayName: true } }
      },
      orderBy: { confirmedStartAt: "asc" }
    });
    // Group the assigned workers by the DAY they are scheduled at this worksite.
    const byDay = new Map<string, Array<{ displayName: string | null; status: string; startAt: string; endAt: string }>>();
    for (const a of assignments) {
      const date = a.confirmedStartAt.toISOString().slice(0, 10);
      const list = byDay.get(date) ?? [];
      list.push({ displayName: a.workerIdentity.displayName, status: a.status, startAt: a.confirmedStartAt.toISOString(), endAt: a.confirmedEndAt.toISOString() });
      byDay.set(date, list);
    }
    const days = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, workers]) => ({ date, worksite: { label: worksite.label, latitude: worksite.latitude, longitude: worksite.longitude }, workers }));
    return reply.code(200).send({
      contract: { jobTitle: job.title, timezone: job.timezone, startAt: job.startAt.toISOString(), endAt: job.endAt.toISOString(), worksite },
      days
    });
  });

  // ── Verification (provider-neutral trust states) ──
  const sendVerificationError = (reply: FastifyReply, error: unknown) => {
    if (error instanceof VerificationError) {
      const code = error.code === "denied" ? 403 : error.code === "not_found" ? 404 : error.code === "conflict" ? 409 : 400;
      return reply.code(code).send({ error: `RWOS_VERIFICATION_${error.code.toUpperCase()}`, message: error.message });
    }
    throw error;
  };
  const readWorkerVerificationType = (value: unknown): "identity" | "background_check" | null =>
    value === "identity" || value === "background_check" ? value : null;

  // Active org membership (optionally role-gated) for employer verification endpoints.
  async function requireActiveOrgMembership(userId: string, organizationId: string, roles?: readonly string[]) {
    const memberships = await membershipService.listMemberships(userId);
    const membership = memberships.find((m) => m.organizationId === organizationId && m.status === "active");
    if (!membership) return null;
    if (roles && !membership.roleKeys.some((key) => roles.includes(key))) return null;
    return membership;
  }

  // Worker: view my verification state.
  app.get("/verification/worker", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_VERIFICATION_DENIED", message: "Authentication is required." });
    }
    try {
      const state = await verificationService.getWorkerVerification({ userId: session.user.id });
      return reply.code(200).send({
        identity: { status: state.identityStatus, requestedAt: state.identity?.requestedAt ?? null, completedAt: state.identity?.completedAt ?? null, expiresAt: state.identity?.expiresAt ?? null, provider: state.identity?.provider ?? null },
        backgroundCheck: { status: state.backgroundCheckStatus, requestedAt: state.backgroundCheck?.requestedAt ?? null, completedAt: state.backgroundCheck?.completedAt ?? null, expiresAt: state.backgroundCheck?.expiresAt ?? null, provider: state.backgroundCheck?.provider ?? null }
      });
    } catch (error) {
      return sendVerificationError(reply, error);
    }
  });

  // Worker: request a verification (identity | background_check). Server starts the provider
  // flow → pending. The worker can NEVER mark themselves verified.
  app.post("/verification/worker/request", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_VERIFICATION_DENIED", message: "Authentication is required." });
    }
    const verificationType = readWorkerVerificationType(asRecord(request.body).verificationType);
    if (!verificationType) {
      return reply.code(400).send({ error: "RWOS_VERIFICATION_INVALID", message: "A valid verificationType is required." });
    }
    try {
      const record = await verificationService.requestWorkerVerification({ userId: session.user.id, verificationType });
      return reply.code(200).send({ verificationType, status: record.status });
    } catch (error) {
      return sendVerificationError(reply, error);
    }
  });

  // Employer: view my organization's verification state (any active member).
  app.get("/organizations/:organizationId/verification", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_VERIFICATION_DENIED", message: "Authentication is required." });
    }
    const organizationId = readRouteParam(request.params, "organizationId");
    if (!isCanonicalUuid(organizationId) || !(await requireActiveOrgMembership(session.user.id, organizationId))) {
      return reply.code(403).send({ error: "RWOS_VERIFICATION_DENIED", message: "Organization membership is required." });
    }
    const { record, status } = await verificationService.getEmployerVerification(organizationId);
    return reply.code(200).send({ status, requestedAt: record?.requestedAt ?? null, completedAt: record?.completedAt ?? null, expiresAt: record?.expiresAt ?? null, provider: record?.provider ?? null });
  });

  // Employer: request organization verification (owner/administrator only).
  app.post("/organizations/:organizationId/verification/request", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_VERIFICATION_DENIED", message: "Authentication is required." });
    }
    const organizationId = readRouteParam(request.params, "organizationId");
    if (!isCanonicalUuid(organizationId) || !(await requireActiveOrgMembership(session.user.id, organizationId, ["ORGANIZATION_OWNER", "ORGANIZATION_ADMINISTRATOR"]))) {
      return reply.code(403).send({ error: "RWOS_VERIFICATION_DENIED", message: "Organization owner or administrator authority is required." });
    }
    const record = await verificationService.requestEmployerVerification({ organizationId });
    return reply.code(200).send({ status: record.status });
  });

  // Provider callback / webhook — HMAC-verified, idempotent, normalized. Never trusts an
  // unsigned/unverifiable callback. Routes to worker or employer by provider reference.
  app.post("/verification/callback", async (request, reply) => {
    if (!runtimeConfig.verificationCallbackSecret) {
      return reply.code(503).send({ error: "RWOS_VERIFICATION_CALLBACK_DISABLED", message: "Verification callbacks are not enabled." });
    }
    const signatureHeader = request.headers["x-verification-signature"];
    const signature = typeof signatureHeader === "string" ? signatureHeader : null;
    const rawBody = JSON.stringify(request.body ?? {});
    if (!verificationCallbackVerifier.verify({ rawBody, signature })) {
      return reply.code(401).send({ error: "RWOS_VERIFICATION_CALLBACK_UNAUTHENTICATED", message: "Invalid callback signature." });
    }
    const normalized = normalizeFixtureCallback(request.body);
    if (!normalized) {
      return reply.code(400).send({ error: "RWOS_VERIFICATION_CALLBACK_INVALID", message: "Invalid callback body." });
    }
    const workerResult = await verificationService.ingestWorkerResult(normalized);
    if (workerResult.record) return reply.code(200).send({ subject: "worker", applied: workerResult.applied });
    const employerResult = await verificationService.ingestEmployerResult(normalized);
    if (employerResult.record) return reply.code(200).send({ subject: "employer", applied: employerResult.applied });
    return reply.code(202).send({ applied: false, message: "No matching verification for that reference." });
  });

  // Admin: verification operations queue + governed review decisions (PLATFORM_ADMINISTRATOR).
  app.get("/platform/verification/queue", async (request, reply) => {
    const actor = await requirePlatformInterest(request, reply);
    if (!actor) return;
    const statusFilter = readOptionalString(asRecord(request.query), "status");
    const statuses = statusFilter && statusFilter !== "all" ? statusFilter.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
    const queue = await verificationService.listQueue(statuses ? { statuses } : {});
    return reply.code(200).send({ count: queue.length, queue });
  });

  app.post("/platform/verification/workers/:verificationId/review", async (request, reply) => {
    const actor = await requirePlatformInterest(request, reply);
    if (!actor) return;
    const verificationId = readRouteParam(request.params, "verificationId");
    const decision = asRecord(request.body).decision;
    if (!isCanonicalUuid(verificationId) || (decision !== "verified" && decision !== "rejected" && decision !== "review")) {
      return reply.code(400).send({ error: "RWOS_VERIFICATION_INVALID", message: "A valid decision is required." });
    }
    try {
      const record = await verificationService.adminReviewWorker({ reviewerUserId: actor, workerVerificationId: verificationId, decision });
      return reply.code(200).send({ status: record.status });
    } catch (error) {
      return sendVerificationError(reply, error);
    }
  });

  app.post("/platform/verification/employers/:verificationId/review", async (request, reply) => {
    const actor = await requirePlatformInterest(request, reply);
    if (!actor) return;
    const verificationId = readRouteParam(request.params, "verificationId");
    const decision = asRecord(request.body).decision;
    if (!isCanonicalUuid(verificationId) || (decision !== "business_verified" && decision !== "review_required" && decision !== "suspended")) {
      return reply.code(400).send({ error: "RWOS_VERIFICATION_INVALID", message: "A valid decision is required." });
    }
    try {
      const record = await verificationService.adminReviewEmployer({ reviewerUserId: actor, employerVerificationId: verificationId, decision });
      return reply.code(200).send({ status: record.status });
    } catch (error) {
      return sendVerificationError(reply, error);
    }
  });

  // ── HR domain (HR-1) ──
  const sendHrError = (reply: FastifyReply, error: unknown) => {
    if (error instanceof HrError) {
      const code = error.code === "denied" ? 403 : error.code === "not_found" ? 404 : error.code === "conflict" ? 409 : 400;
      return reply.code(code).send({ error: `RWOS_HR_${error.code.toUpperCase()}`, message: error.message });
    }
    throw error;
  };
  // HR governed decisions require the distinct HR authority (or platform admin). A worker or
  // employer can NEVER make HR decisions.
  const requireHrAuthority = async (request: FastifyRequest, reply: FastifyReply): Promise<string | null> => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      reply.code(401).send({ error: "RWOS_HR_DENIED", message: "Authentication is required." });
      return null;
    }
    const roles = await resolveAuthorizationRoles(session.user.id);
    if (!roles.includes("HR_ADMINISTRATOR") && !roles.includes("PLATFORM_ADMINISTRATOR")) {
      reply.code(403).send({ error: "RWOS_HR_DENIED", message: "HR authority is required." });
      return null;
    }
    return session.user.id;
  };

  // HR-5: payroll governed decisions require the distinct PAYROLL authority (or platform admin).
  // Payroll authority is NOT implied by generic platform admin alone in spirit, but PLATFORM_ADMIN
  // remains a superuser; a worker or employer can never make payroll decisions here.
  const requirePayrollAuthority = async (request: FastifyRequest, reply: FastifyReply): Promise<string | null> => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      reply.code(401).send({ error: "RWOS_PAYROLL_DENIED", message: "Authentication is required." });
      return null;
    }
    const roles = await resolveAuthorizationRoles(session.user.id);
    if (!roles.includes("PAYROLL_ADMINISTRATOR") && !roles.includes("PLATFORM_ADMINISTRATOR")) {
      reply.code(403).send({ error: "RWOS_PAYROLL_DENIED", message: "Payroll authority is required." });
      return null;
    }
    return session.user.id;
  };

  // Worker: my own HR profile (standing + credentials only — never HR case notes).
  app.get("/hr/worker", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_HR_DENIED", message: "Authentication is required." });
    }
    try {
      const view = await hrService.getWorkerSelfView({ userId: session.user.id });
      return reply.code(200).send(view);
    } catch (error) {
      return sendHrError(reply, error);
    }
  });

  // HR authority: full worker HR record (profile + credentials + cases).
  app.get("/platform/hr/workers/:workerIdentityId", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const workerIdentityId = readRouteParam(request.params, "workerIdentityId");
    if (!isCanonicalUuid(workerIdentityId)) return reply.code(404).send({ error: "RWOS_HR_NOT_FOUND", message: "That worker was not found." });
    const record = await hrService.getWorkerHrRecord(workerIdentityId);
    // HR CONSUMES verification (read-only) to show trust indicators + the current eligibility
    // impact. HR never mutates verification, marketplace, or dispatch. Eligibility stays in
    // the centralized policy (default permissive) — shown here for visibility only.
    const trust = await verificationService.workerTrust(workerIdentityId);
    const hrStanding = record.profile.standing as HrStanding;
    const eligibility = {
      expressInterest: canWorkerExpressInterest({ trust, hrStanding, policy: DEFAULT_VERIFICATION_POLICY }),
      receiveOffer: canWorkerReceiveOffer({ trust, hrStanding, policy: DEFAULT_VERIFICATION_POLICY })
    };
    return reply.code(200).send({ ...record, verification: trust, eligibility });
  });

  // HR authority: worker HR event timeline (bounded, paginated).
  app.get("/platform/hr/workers/:workerIdentityId/events", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const workerIdentityId = readRouteParam(request.params, "workerIdentityId");
    if (!isCanonicalUuid(workerIdentityId)) return reply.code(404).send({ error: "RWOS_HR_NOT_FOUND", message: "That worker was not found." });
    const query = asRecord(request.query);
    const limit = parseQueryInt(readOptionalString(query, "limit"));
    const page = await hrService.listWorkerEvents({ workerIdentityId, cursor: readOptionalString(query, "cursor"), ...(limit !== null ? { limit } : {}) });
    return reply.code(200).send(page);
  });

  // HR authority: standing queue (e.g. restricted/suspended) — bounded, paginated.
  app.get("/platform/hr/queues/standing", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const query = asRecord(request.query);
    const requested = (readOptionalString(query, "standings") ?? "restricted,suspended").split(",").map((s) => s.trim());
    const valid: readonly HrStanding[] = ["active", "review_required", "restricted", "suspended", "inactive"];
    const standings = requested.filter((s): s is HrStanding => (valid as readonly string[]).includes(s));
    if (standings.length === 0) return reply.code(400).send({ error: "RWOS_HR_INVALID", message: "A valid standings filter is required." });
    const limit = parseQueryInt(readOptionalString(query, "limit"));
    const page = await hrService.pageByStanding({ standings, cursor: readOptionalString(query, "cursor"), ...(limit !== null ? { limit } : {}) });
    return reply.code(200).send(page);
  });

  // HR authority: indexed, bounded HR search (never full-table scan).
  app.get("/platform/hr/search", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const query = asRecord(request.query);
    const validStanding = ["active", "review_required", "restricted", "suspended", "inactive"];
    const validCredStatus = ["valid", "expiring", "expired", "renewed", "replaced", "revoked"];
    const validCaseStatus = ["opened", "under_review", "action_required", "resolved", "closed"];
    const standing = readOptionalString(query, "standing");
    const credentialStatus = readOptionalString(query, "credentialStatus");
    const caseStatus = readOptionalString(query, "caseStatus");
    const limit = parseQueryInt(readOptionalString(query, "limit"));
    const page = await hrService.searchWorkers({
      filters: {
        query: readOptionalString(query, "q"),
        standing: standing && validStanding.includes(standing) ? (standing as HrStanding) : null,
        credentialType: readOptionalString(query, "credentialType"),
        credentialStatus: credentialStatus && validCredStatus.includes(credentialStatus) ? (credentialStatus as never) : null,
        caseStatus: caseStatus && validCaseStatus.includes(caseStatus) ? (caseStatus as never) : null
      },
      cursor: readOptionalString(query, "cursor"),
      ...(limit !== null ? { limit } : {})
    });
    return reply.code(200).send(page);
  });

  // ── HR-3 Documents & Compliance ──
  const sendHrDocError = (reply: FastifyReply, error: unknown) => {
    if (error instanceof HrDocumentError) {
      const code = error.code === "denied" ? 403 : error.code === "not_found" ? 404 : error.code === "conflict" ? 409 : 400;
      return reply.code(code).send({ error: `RWOS_HR_DOC_${error.code.toUpperCase()}`, message: error.message });
    }
    throw error;
  };
  const requireWorkerSession = async (request: FastifyRequest, reply: FastifyReply): Promise<string | null> => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      reply.code(401).send({ error: "RWOS_HR_DOC_DENIED", message: "Authentication is required." });
      return null;
    }
    return session.user.id;
  };

  // Worker: request a storage upload reference (they upload to the provider, not to JobLop).
  app.post("/hr/documents/upload-reference", async (request, reply) => {
    const userId = await requireWorkerSession(request, reply);
    if (!userId) return;
    const documentType = readOptionalString(asRecord(request.body), "documentType");
    if (!documentType) return reply.code(400).send({ error: "RWOS_HR_DOC_INVALID", message: "A documentType is required." });
    try {
      return reply.code(200).send(await hrDocumentService.requestUploadReference({ userId, documentType }));
    } catch (error) {
      return sendHrDocError(reply, error);
    }
  });

  // Worker: submit / replace a document (verified reference; never self-accept).
  app.post("/hr/documents", async (request, reply) => {
    const userId = await requireWorkerSession(request, reply);
    if (!userId) return;
    const body = asRecord(request.body);
    const documentType = readOptionalString(body, "documentType");
    const storageReference = readOptionalString(body, "storageReference");
    if (!documentType || !storageReference) return reply.code(400).send({ error: "RWOS_HR_DOC_INVALID", message: "documentType and storageReference are required." });
    try {
      const view = await hrDocumentService.submitDocument({
        userId, documentType, storageReference,
        checksum: readOptionalString(body, "checksum"), issuingAuthority: readOptionalString(body, "issuingAuthority"),
        jurisdiction: readOptionalString(body, "jurisdiction"), issuedAt: readOptionalString(body, "issuedAt"), expiresAt: readOptionalString(body, "expiresAt")
      });
      return reply.code(201).send({ document: view });
    } catch (error) {
      return sendHrDocError(reply, error);
    }
  });

  app.post("/hr/documents/replace", async (request, reply) => {
    const userId = await requireWorkerSession(request, reply);
    if (!userId) return;
    const body = asRecord(request.body);
    const documentType = readOptionalString(body, "documentType");
    const storageReference = readOptionalString(body, "storageReference");
    if (!documentType || !storageReference) return reply.code(400).send({ error: "RWOS_HR_DOC_INVALID", message: "documentType and storageReference are required." });
    try {
      const view = await hrDocumentService.replaceDocument({ userId, documentType, storageReference, expiresAt: readOptionalString(body, "expiresAt") });
      return reply.code(201).send({ document: view });
    } catch (error) {
      return sendHrDocError(reply, error);
    }
  });

  // Worker: my documents (no internal review notes / storage references).
  app.get("/hr/documents", async (request, reply) => {
    const userId = await requireWorkerSession(request, reply);
    if (!userId) return;
    try {
      const documents = await hrDocumentService.listMyDocuments({ userId });
      return reply.code(200).send({ documents });
    } catch (error) {
      return sendHrDocError(reply, error);
    }
  });

  // HR authority: document review queues + a worker's documents + governed decisions.
  app.get("/platform/hr/documents/queue", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const query = asRecord(request.query);
    const kind = readOptionalString(query, "kind") ?? "review";
    const limit = parseQueryInt(readOptionalString(query, "limit"));
    const cursor = readOptionalString(query, "cursor");
    const page =
      kind === "expiring" ? await hrDocumentService.pageExpiring({ cursor, ...(limit !== null ? { limit } : {}) })
      : kind === "rejected" ? await hrDocumentService.pageRejected({ cursor, ...(limit !== null ? { limit } : {}) })
      : await hrDocumentService.pageReviewQueue({ cursor, ...(limit !== null ? { limit } : {}) });
    // Strip internal storage references from the queue payload (HR reviews via a signed URL).
    return reply.code(200).send({ items: page.items.map((d) => ({ id: d.id, workerIdentityId: d.workerIdentityId, documentType: d.documentType, jurisdiction: d.jurisdiction, expiresAt: d.expiresAt, effectiveStatus: d.effectiveStatus, reviewReason: d.reviewReason })), nextCursor: page.nextCursor });
  });

  app.get("/platform/hr/workers/:workerIdentityId/documents", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const workerIdentityId = readRouteParam(request.params, "workerIdentityId");
    if (!isCanonicalUuid(workerIdentityId)) return reply.code(404).send({ error: "RWOS_HR_DOC_NOT_FOUND", message: "That worker was not found." });
    const documents = await hrDocumentService.listWorkerDocuments(workerIdentityId);
    return reply.code(200).send({ documents: documents.map((d) => ({ id: d.id, documentType: d.documentType, jurisdiction: d.jurisdiction, expiresAt: d.expiresAt, effectiveStatus: d.effectiveStatus, reviewReason: d.reviewReason, supersededById: d.supersededById })) });
  });

  // HR authority: resolve a short-lived download URL (delegated to the storage provider).
  app.get("/platform/hr/documents/:documentId/download", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const documentId = readRouteParam(request.params, "documentId");
    if (!isCanonicalUuid(documentId)) return reply.code(404).send({ error: "RWOS_HR_DOC_NOT_FOUND", message: "That document was not found." });
    const url = await hrDocumentService.resolveDownloadUrl(documentId);
    if (!url) return reply.code(404).send({ error: "RWOS_HR_DOC_NOT_FOUND", message: "That document has no downloadable reference." });
    return reply.code(200).send(url);
  });

  const hrDocDecision = (path: string, apply: (actor: string, id: string, body: Record<string, unknown>) => Promise<{ status: HrDocumentStatus }>) =>
    app.post(path, async (request, reply) => {
      const actor = await requireHrAuthority(request, reply);
      if (!actor) return;
      const documentId = readRouteParam(request.params, "documentId");
      if (!isCanonicalUuid(documentId)) return reply.code(404).send({ error: "RWOS_HR_DOC_NOT_FOUND", message: "That document was not found." });
      try {
        const updated = await apply(actor, documentId, asRecord(request.body));
        return reply.code(200).send({ status: updated.status });
      } catch (error) {
        return sendHrDocError(reply, error);
      }
    });

  hrDocDecision("/platform/hr/documents/:documentId/accept", (actor, id) => hrDocumentService.accept({ actorUserId: actor, documentId: id }));
  hrDocDecision("/platform/hr/documents/:documentId/reject", (actor, id, body) => hrDocumentService.reject({ actorUserId: actor, documentId: id, reason: readOptionalString(body, "reason") ?? "" }));
  hrDocDecision("/platform/hr/documents/:documentId/revoke", (actor, id, body) => hrDocumentService.revoke({ actorUserId: actor, documentId: id, reason: readOptionalString(body, "reason") }));

  // HR authority: centralized, explainable compliance evaluation for a worker.
  app.get("/platform/hr/workers/:workerIdentityId/compliance", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const workerIdentityId = readRouteParam(request.params, "workerIdentityId");
    if (!isCanonicalUuid(workerIdentityId)) return reply.code(404).send({ error: "RWOS_HR_DOC_NOT_FOUND", message: "That worker was not found." });
    const query = asRecord(request.query);
    const jurisdiction = readOptionalString(query, "jurisdiction");
    if (!jurisdiction) return reply.code(400).send({ error: "RWOS_HR_DOC_INVALID", message: "A jurisdiction is required." });
    const evaluation = await complianceEvaluator.evaluateWorkerCompliance({
      workerIdentityId, jurisdiction,
      roleCategory: readOptionalString(query, "roleCategory"), worksiteRef: readOptionalString(query, "worksiteRef")
    });
    return reply.code(200).send({ compliance: evaluation });
  });

  // HR authority: governed standing decision (independent of verification, audited).
  app.post("/platform/hr/workers/:workerIdentityId/standing", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const workerIdentityId = readRouteParam(request.params, "workerIdentityId");
    const body = asRecord(request.body);
    const standing = readOptionalString(body, "standing");
    if (!isCanonicalUuid(workerIdentityId) || !standing) return reply.code(400).send({ error: "RWOS_HR_INVALID", message: "workerIdentityId and standing are required." });
    try {
      const profile = await hrService.setStanding({ actorUserId: actor, workerIdentityId, standing, reason: readOptionalString(body, "reason") });
      return reply.code(200).send({ standing: profile.standing });
    } catch (error) {
      return sendHrError(reply, error);
    }
  });

  // HR authority: governed re-classification of a worker's pay channel (employee <-> contractor).
  // This is the ONLY way the channel changes after onboarding — it supersedes the active election and
  // appends a new signed one, with a reason, under HR authority. See
  // docs/finance/TWO_CHANNEL_PAYROLL_DESIGN.md.
  app.post("/platform/hr/workers/:workerIdentityId/reclassify", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const workerIdentityId = readRouteParam(request.params, "workerIdentityId");
    const body = asRecord(request.body);
    const classification = readOptionalString(body, "classification") as WorkerClassification | null;
    const agreementVersion = readOptionalString(body, "agreementVersion");
    const reason = readOptionalString(body, "reason");
    if (!isCanonicalUuid(workerIdentityId) || (classification !== "employee" && classification !== "contractor") || !agreementVersion || !reason) {
      return reply.code(400).send({ error: "RWOS_HR_INVALID", message: "workerIdentityId, classification, agreementVersion and reason are required." });
    }
    const result = await electClassification(prisma!, {
      workerIdentityId,
      classification,
      electedByUserId: actor,
      approvedByUserId: actor,
      agreementVersion,
      determinationRef: readOptionalString(body, "determinationRef") ?? null,
      reason
    });
    if (!result.ok) {
      if (result.reason === "stale_agreement_version") {
        return reply.code(409).send({ error: "RWOS_AGREEMENT_VERSION_STALE", message: "Use the current agreement version.", agreementVersions: WORKER_AGREEMENT_VERSIONS });
      }
      if (result.reason === "unchanged") {
        return reply.code(200).send({ election: await getActiveElection(prisma!, workerIdentityId), unchanged: true });
      }
      return reply.code(400).send({ error: "RWOS_HR_INVALID", message: "Invalid classification." });
    }
    return reply.code(201).send({ election: result.election });
  });

  // HR authority: add / renew / revoke credentials.
  app.post("/platform/hr/workers/:workerIdentityId/credentials", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const workerIdentityId = readRouteParam(request.params, "workerIdentityId");
    const body = asRecord(request.body);
    const credentialType = readOptionalString(body, "credentialType");
    if (!isCanonicalUuid(workerIdentityId) || !credentialType) return reply.code(400).send({ error: "RWOS_HR_INVALID", message: "workerIdentityId and credentialType are required." });
    try {
      const cred = await hrService.addCredential({
        actorUserId: actor, workerIdentityId, credentialType,
        issuer: readOptionalString(body, "issuer"), issuedAt: readOptionalString(body, "issuedAt"), expiresAt: readOptionalString(body, "expiresAt"),
        verificationReference: readOptionalString(body, "verificationReference")
      });
      return reply.code(201).send({ id: cred.id, effectiveStatus: cred.effectiveStatus });
    } catch (error) {
      return sendHrError(reply, error);
    }
  });

  app.post("/platform/hr/credentials/:credentialId/renew", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const credentialId = readRouteParam(request.params, "credentialId");
    if (!isCanonicalUuid(credentialId)) return reply.code(404).send({ error: "RWOS_HR_NOT_FOUND", message: "That credential was not found." });
    try {
      const result = await hrService.renewCredential({ actorUserId: actor, credentialId, expiresAt: readOptionalString(asRecord(request.body), "expiresAt") });
      return reply.code(200).send({ oldStatus: result.old.status, renewedId: result.renewed.id });
    } catch (error) {
      return sendHrError(reply, error);
    }
  });

  app.post("/platform/hr/credentials/:credentialId/revoke", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const credentialId = readRouteParam(request.params, "credentialId");
    if (!isCanonicalUuid(credentialId)) return reply.code(404).send({ error: "RWOS_HR_NOT_FOUND", message: "That credential was not found." });
    try {
      const cred = await hrService.revokeCredential({ actorUserId: actor, credentialId, reason: readOptionalString(asRecord(request.body), "reason") });
      return reply.code(200).send({ status: cred.status });
    } catch (error) {
      return sendHrError(reply, error);
    }
  });

  // HR authority: cases (governed lifecycle, audited).
  app.post("/platform/hr/workers/:workerIdentityId/cases", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const workerIdentityId = readRouteParam(request.params, "workerIdentityId");
    const body = asRecord(request.body);
    const caseType = readOptionalString(body, "caseType");
    if (!isCanonicalUuid(workerIdentityId) || !caseType) return reply.code(400).send({ error: "RWOS_HR_INVALID", message: "workerIdentityId and caseType are required." });
    try {
      const created = await hrService.openCase({ actorUserId: actor, workerIdentityId, caseType, reason: readOptionalString(body, "reason") });
      return reply.code(201).send({ id: created.id, status: created.status });
    } catch (error) {
      return sendHrError(reply, error);
    }
  });

  app.post("/platform/hr/cases/:caseId/transition", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const caseId = readRouteParam(request.params, "caseId");
    const to = readOptionalString(asRecord(request.body), "to");
    const valid = ["opened", "under_review", "action_required", "resolved", "closed"];
    if (!isCanonicalUuid(caseId) || !to || !valid.includes(to)) return reply.code(400).send({ error: "RWOS_HR_INVALID", message: "A valid target status is required." });
    try {
      const updated = await hrService.transitionCase({ actorUserId: actor, caseId, to: to as never, reason: readOptionalString(asRecord(request.body), "reason") });
      return reply.code(200).send({ status: updated.status });
    } catch (error) {
      return sendHrError(reply, error);
    }
  });

  // HR authority: bounded, paginated operational queues (never list-all).
  app.get("/platform/hr/queues/expiring", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const query = asRecord(request.query);
    const limit = parseQueryInt(readOptionalString(query, "limit"));
    const withinDays = parseQueryInt(readOptionalString(query, "withinDays"));
    const page = await hrService.pageExpiringCredentials({
      cursor: readOptionalString(query, "cursor"),
      ...(limit !== null ? { limit } : {}),
      ...(withinDays !== null ? { withinDays } : {})
    });
    return reply.code(200).send(page);
  });

  app.get("/platform/hr/queues/review", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const query = asRecord(request.query);
    const limit = parseQueryInt(readOptionalString(query, "limit"));
    const page = await hrService.pageReviewCases({ cursor: readOptionalString(query, "cursor"), ...(limit !== null ? { limit } : {}) });
    return reply.code(200).send(page);
  });

  // Job DETAIL — the worker-facing job page. Privacy-safe: approximate location + map
  // point only; NEVER exact coords, street address, residence internal name, or rates
  // beyond the policy-gated worker rate. 404 for any job that is not marketplace-visible
  // (hidden/cancelled/expired, or residence inactive) so hidden jobs can't be probed.
  app.get("/marketplace/jobs/:jobRequestId", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_MARKETPLACE_DENIED", message: "Authentication is required." });
    }
    const jobRequestId = readRouteParam(request.params, "jobRequestId");
    if (!isCanonicalUuid(jobRequestId)) {
      return reply.code(404).send({ error: "RWOS_MARKETPLACE_JOB_NOT_FOUND", message: "That job is not available." });
    }
    const postalCode = readOptionalString(asRecord(request.query), "postalCode");
    const countryAddress = options.countryAddress;
    const countryCurrency = options.countryCurrency; // Stage 2b.3b-1: display-only result currency
    const normalizedPostal = postalCode && countryAddress ? countryAddress.normalizePostalCode(postalCode) : null;

    const row = await prisma!.jobRequest.findFirst({
      where: {
        id: jobRequestId,
        status: { in: ["submitted", "approved_for_dispatch"] },
        residence: { status: "active" }
      },
      select: {
        id: true,
        title: true,
        description: true,
        numberOfWorkers: true,
        startAt: true,
        endAt: true,
        roleDefinition: { select: { displayLabel: true } },
        organization: { select: { id: true, displayName: true } },
        residence: { select: { city: true, province: true, latitude: true, longitude: true } },
        calendarProfile: {
          select: {
            dutiesSummary: true,
            qualifications: true,
            transportProvision: true,
            transportAmountMinor: true,
            transportNote: true,
            mealProvision: true,
            mealAmountMinor: true,
            mealNote: true,
            lodgingProvision: true,
            lodgingAmountMinor: true,
            lodgingNote: true
          }
        },
        pricingSnapshot: {
          select: {
            workerHourlyRateMinor: true,
            transportWorkerMinor: true,
            mealWorkerMinor: true,
            lodgingWorkerMinor: true
          }
        }
      }
    });
    if (
      !row ||
      !isProvinceCode(row.residence.province) ||
      row.residence.latitude === null ||
      row.residence.longitude === null
    ) {
      return reply.code(404).send({ error: "RWOS_MARKETPLACE_JOB_NOT_FOUND", message: "That job is not available." });
    }

    let origin: { latitude: number; longitude: number } | null = null;
    if (normalizedPostal && countryAddress) {
      const geo = await geocodingProvider.geocode({ countryRestriction: countryAddress.geocodeCountryRestriction, postalCode: normalizedPostal });
      if (geo.status === "ok") origin = { latitude: geo.location.latitude, longitude: geo.location.longitude };
    }

    // Fail closed on an unavailable country currency — never silently substitute CAD. Byte-identical
    // for Canada (countryCurrency === "CAD"). Placed before candidate construction so the decorative
    // display currency is the selected country's, and before the address guard's own 400 below.
    if (!countryCurrency) {
      return reply.code(400).send({ error: "RWOS_COUNTRY_CURRENCY_UNAVAILABLE", message: "Currency is not configured for the selected country." });
    }

    const candidate: MarketplaceJobDetailCandidate = {
      jobRequestId: row.id,
      role: row.roleDefinition.displayLabel,
      title: row.title,
      employerId: row.organization.id,
      employerName: row.organization.displayName,
      verifiedEmployer: await verificationService.isEmployerVerified(row.organization.id), // authoritative
      city: row.residence.city,
      province: row.residence.province as ProvinceCode,
      latitude: row.residence.latitude,
      longitude: row.residence.longitude,
      startAt: row.startAt.toISOString(),
      endAt: row.endAt.toISOString(),
      openings: row.numberOfWorkers,
      workerRateMinor: row.pricingSnapshot?.workerHourlyRateMinor ?? null, // W from the approval snapshot; employer rate E never exposed
      currency: countryCurrency, // display-only; driven by the selected country (CAD for Canada)
      description: row.description,
      duties: row.calendarProfile?.dutiesSummary ?? null,
      qualifications: coerceQualifications(row.calendarProfile?.qualifications)
    };
    if (!countryAddress) {
      return reply.code(400).send({ error: "RWOS_COUNTRY_ADDRESS_UNAVAILABLE", message: "Address resolution is not configured for the selected country." });
    }
    let detail = toMarketplaceJobDetail({ candidate, origin, regionNames: countryAddress });
    // Road ETA enrichment (fail-closed): needs a routing provider + a resolved worker origin.
    if (travelTimeProvider && origin) {
      const acceptLang = String(request.headers["accept-language"] ?? "").toLowerCase();
      const etaLang = acceptLang.startsWith("fr") ? "fr" : "en";
      try {
        const eta = await travelTimeProvider.estimate({
          origin,
          destination: { latitude: candidate.latitude, longitude: candidate.longitude },
          mode: "driving",
          language: etaLang
        });
        if (eta.status === "ok") detail = { ...detail, travelTime: toPublicTravelEstimate(eta.estimate, etaLang) };
      } catch {
        // leave travelTime null — the worker still sees the straight-line distance label
      }
    }

    let saved: boolean;
    try {
      const savedIds = await workerSavedJobsService.savedIdsAmong({ userId: session.user.id, jobRequestIds: [row.id] });
      saved = savedIds.includes(row.id);
    } catch {
      saved = false; // not a worker → not saved
    }
    return reply.code(200).send({ job: { ...detail, saved, allowances: workerAllowances(row.calendarProfile, row.pricingSnapshot) } });
  });

  // Employer PUBLIC PROFILE — only approved public info: public display name, real
  // verification state, general areas + active opportunities. NEVER legal name, owner/
  // internal users, contract rates, billing, or internal residence addresses.
  app.get("/marketplace/employers/:organizationId", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_MARKETPLACE_DENIED", message: "Authentication is required." });
    }
    const organizationId = readRouteParam(request.params, "organizationId");
    if (!isCanonicalUuid(organizationId)) {
      return reply.code(404).send({ error: "RWOS_MARKETPLACE_EMPLOYER_NOT_FOUND", message: "That employer is not available." });
    }
    const org = await prisma!.employerOrganization.findFirst({
      where: { id: organizationId, status: "active" },
      select: { id: true, displayName: true }
    });
    if (!org) {
      return reply.code(404).send({ error: "RWOS_MARKETPLACE_EMPLOYER_NOT_FOUND", message: "That employer is not available." });
    }
    const jobRows = await prisma!.jobRequest.findMany({
      where: {
        organizationId: org.id,
        status: { in: ["submitted", "approved_for_dispatch"] },
        residence: { status: "active" }
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        numberOfWorkers: true,
        roleDefinition: { select: { displayLabel: true } },
        residence: { select: { city: true, province: true } }
      },
      orderBy: { startAt: "asc" },
      take: MARKETPLACE_PAGE_MAX
    });
    const candidate: MarketplaceEmployerProfileCandidate = {
      id: org.id,
      name: org.displayName,
      verified: await verificationService.isEmployerVerified(org.id), // authoritative
      opportunities: jobRows.flatMap((j) =>
        isProvinceCode(j.residence.province)
          ? [
              {
                jobRequestId: j.id,
                role: j.roleDefinition.displayLabel,
                city: j.residence.city,
                province: j.residence.province as ProvinceCode,
                startAt: j.startAt.toISOString(),
                endAt: j.endAt.toISOString(),
                openings: j.numberOfWorkers
              }
            ]
          : []
      )
    };
    const countryAddress = options.countryAddress;
    if (!countryAddress) {
      return reply.code(400).send({ error: "RWOS_COUNTRY_ADDRESS_UNAVAILABLE", message: "Address resolution is not configured for the selected country." });
    }
    return reply.code(200).send({ employer: toMarketplaceEmployerProfile(candidate, countryAddress) });
  });

  // Material Edit / Reconfirmation. The employer submits PROPOSED values only. The
  // server reads the current request (before), classifies the change (@rwos/shared,
  // server-authoritative), then: NON_MATERIAL → apply directly; MATERIAL → record a
  // governed proposal WITHOUT mutating accepted worker terms.
  app.post("/organizations/:organizationId/job-requests/:jobRequestId/edit", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) return sendCancellationDenied(reply);
    const actorUserId = session.user.id;
    const organizationId = readRouteParam(request.params, "organizationId");
    const jobRequestIdOrNumber = readRouteParam(request.params, "jobRequestId");
    const body = asRecord(request.body);
    const proposed = asRecord(body.proposed);
    const expectedVersion = readOptionalNumber(body, "expectedVersion");
    try {
      const [source, profile, confirmed] = await Promise.all([
        jobRequestService.getForOrganization({ actorUserId, organizationId, jobRequestIdOrNumber }),
        calendarRequestService.getClientCalendarRequest({ actorUserId, organizationId, jobRequestIdOrNumber }),
        createPrismaConfirmedAssignmentLister(prisma!).listConfirmedAssignments(organizationId, jobRequestIdOrNumber)
      ]);
      if (expectedVersion !== null && expectedVersion !== undefined && expectedVersion !== source.versionToken) {
        return reply.code(409).send({ error: "RWOS_EDIT_STALE", message: "This request changed. Refresh and try again." });
      }
      if (source.status === "cancelled" || source.status === "archived" || source.status === "expired") {
        return reply.code(409).send({ error: "RWOS_EDIT_NOT_EDITABLE", message: "This request can no longer be edited." });
      }
      const before: RequestEditState = {
        roleDefinitionId: source.roleDefinitionId,
        workGroupId: source.workGroupId,
        residenceId: source.residenceId,
        departmentId: source.departmentId,
        startAt: source.startAt.toISOString(),
        endAt: source.endAt.toISOString(),
        timezone: source.timezone,
        numberOfWorkers: source.numberOfWorkers,
        qualifications: profile.qualifications
      };
      const after: RequestEditState = {
        roleDefinitionId: readOptionalString(proposed, "roleDefinitionId") ?? before.roleDefinitionId,
        workGroupId: readOptionalString(proposed, "workGroupId") ?? before.workGroupId,
        residenceId: readOptionalString(proposed, "residenceId") ?? before.residenceId,
        departmentId: readOptionalString(proposed, "departmentId") ?? before.departmentId,
        startAt: readOptionalString(proposed, "startAt") ?? before.startAt,
        endAt: readOptionalString(proposed, "endAt") ?? before.endAt,
        timezone: readOptionalString(proposed, "timezone") ?? before.timezone,
        numberOfWorkers: readOptionalNumber(proposed, "numberOfWorkers") ?? before.numberOfWorkers,
        qualifications: Array.isArray(proposed.qualifications)
          ? proposed.qualifications.filter((v): v is string => typeof v === "string")
          : before.qualifications
      };
      const classification = classifyRequestEdit(before, after, { confirmedWorkers: confirmed.length });

      if (classification.classification === "NON_MATERIAL") {
        const duties = readOptionalString(proposed, "dutiesSummary");
        const instructions = readOptionalString(proposed, "specialInstructions");
        const address = readOptionalString(proposed, "addressSummary");
        await employerRequestEditService.applyNonMaterialEdit({
          actorUserId,
          organizationId,
          jobRequestId: source.id,
          fields: {
            ...("dutiesSummary" in proposed ? { dutiesSummary: duties } : {}),
            ...("specialInstructions" in proposed ? { specialInstructions: instructions } : {}),
            ...("addressSummary" in proposed ? { addressSummary: address } : {})
          }
        });
        return reply.code(200).send({ classification: "NON_MATERIAL", applied: true, materialFields: [] });
      }

      // Material — re-read the current governed rate if the role changed.
      let governedRateMinor: number | null = null;
      let currency: string | null = null;
      if (classification.materialFields.includes("role")) {
        const rate = await createPrismaReduceContractRateReader(prisma!).getGovernedRate(organizationId, after.roleDefinitionId);
        governedRateMinor = rate?.rateMinor ?? null;
        currency = rate?.currency ?? null;
      }
      const { proposal } = await employerRequestEditService.proposeMaterialChange({
        actorUserId,
        organizationId,
        jobRequestId: source.id,
        baseRequestVersion: source.versionToken,
        materialFields: classification.materialFields,
        proposedValues: proposed,
        affectedAssignmentIds: confirmed.map((a) => a.id),
        governedRateMinor,
        currency,
        reason: readOptionalString(body, "reason")
      });
      return reply.code(200).send({
        classification: "MATERIAL",
        materialFields: classification.materialFields,
        requiresReconfirmation: classification.requiresReconfirmation,
        proposal
      });
    } catch (error) {
      if (error instanceof EmployerRequestEditError) return sendEditError(reply, error);
      if (error instanceof JobRequestError) return reply.code(404).send({ error: "RWOS_EDIT_NOT_FOUND", message: "The request was not found." });
      throw error;
    }
  });

  // Reduce Workers — authoritative preview (server derives requested/confirmed/
  // unfilled/eligible assignments + obligation). Browser supplies only newTarget.
  app.post(
    "/organizations/:organizationId/job-requests/:jobRequestId/reduce/preview",
    async (request, reply) => {
      const session = await authService.validateSession(readBearerToken(request.headers.authorization));
      if (!session.authenticated || !session.user) return sendCancellationDenied(reply);
      const body = asRecord(request.body);
      const newTarget = readOptionalNumber(body, "newTarget");
      if (newTarget === null || newTarget === undefined) {
        return reply.code(400).send({ error: "RWOS_INVALID_REDUCE", message: "A new target is required." });
      }
      try {
        const preview = await employerReduceService.reducePreview({
          actorUserId: session.user.id,
          organizationId: readRouteParam(request.params, "organizationId"),
          jobRequestId: readRouteParam(request.params, "jobRequestId"),
          newTarget
        });
        return reply.code(200).send({ preview });
      } catch (error) {
        return sendReduceError(reply, error);
      }
    }
  );

  // Reduce Workers — confirm. Body: newTarget + selectedAssignmentIds + expectedVersion
  // + idempotencyKey. Never an authoritative rate/amount/count/cutoff.
  app.post(
    "/organizations/:organizationId/job-requests/:jobRequestId/reduce/confirm",
    async (request, reply) => {
      const session = await authService.validateSession(readBearerToken(request.headers.authorization));
      if (!session.authenticated || !session.user) return sendCancellationDenied(reply);
      const body = asRecord(request.body);
      const newTarget = readOptionalNumber(body, "newTarget");
      const expectedVersion = readOptionalNumber(body, "expectedVersion");
      const idempotencyKey = readRequiredString(body, "idempotencyKey") ?? "";
      const selectedAssignmentIds = Array.isArray(body.selectedAssignmentIds)
        ? body.selectedAssignmentIds.filter((v): v is string => typeof v === "string")
        : [];
      if (newTarget === null || newTarget === undefined || expectedVersion === null || expectedVersion === undefined) {
        return reply.code(400).send({ error: "RWOS_INVALID_REDUCE", message: "A new target and current version are required." });
      }
      try {
        const result = await employerReduceService.reduceConfirm({
          actorUserId: session.user.id,
          organizationId: readRouteParam(request.params, "organizationId"),
          jobRequestId: readRouteParam(request.params, "jobRequestId"),
          newTarget,
          selectedAssignmentIds,
          expectedVersion,
          idempotencyKey
        });
        return reply.code(200).send(result);
      } catch (error) {
        return sendReduceError(reply, error);
      }
    }
  );

  // Platform-only: complete a reduction's selected-assignment handoff — cancels ONLY
  // the specific selected assignments, then the reduce service sets the new target.
  app.post("/platform/capacity-reductions/:reductionId/complete", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) return sendCancellationDenied(reply);
    const roles = await resolveAuthorizationRoles(session.user.id);
    if (!roles.includes("PLATFORM_ADMINISTRATOR")) {
      return reply.code(403).send({ error: "RWOS_REDUCE_DENIED", message: "Platform authority is required." });
    }
    const port: SelectedAssignmentCancelPort = {
      async cancelSelectedAssignments({ organizationId, jobRequestId, assignmentIds, reason }) {
        const active = await assignmentService.listAssignments({
          session,
          roles,
          organizationId,
          jobRequestId,
          statuses: [...CONFIRMED_ASSIGNMENT_STATUSES] as AssignmentStatus[]
        });
        const selectable = new Map(active.map((a) => [a.id, a.versionToken] as const));
        let cancelled = 0;
        let failed = 0;
        for (const id of assignmentIds) {
          const version = selectable.get(id);
          if (version === undefined) {
            failed += 1; // no longer an eligible confirmed assignment of this request
            continue;
          }
          try {
            await assignmentService.cancel({ session, roles, assignmentId: id, expectedVersion: version, reason, status: "employer_cancelled" });
            cancelled += 1;
          } catch {
            failed += 1;
          }
        }
        return { attempted: assignmentIds.length, cancelled, failed };
      }
    };
    try {
      const result = await employerReduceService.completeReduction({
        reductionId: readRouteParam(request.params, "reductionId"),
        assignmentCancelPort: port
      });
      return reply.code(200).send(result);
    } catch (error) {
      return sendReduceError(reply, error);
    }
  });

  // Platform-only: record a change proposal's reconfirmation outcome. The worker-offer
  // reconfirmation flow (revised offers + accept/decline) drives `outcome`; accepted →
  // completed, declined → rejected (original accepted terms preserved).
  app.post("/platform/change-proposals/:proposalId/reconfirmation", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) return sendCancellationDenied(reply);
    const roles = await resolveAuthorizationRoles(session.user.id);
    if (!roles.includes("PLATFORM_ADMINISTRATOR")) {
      return reply.code(403).send({ error: "RWOS_EDIT_DENIED", message: "Platform authority is required." });
    }
    const body = asRecord(request.body);
    const outcome = readOptionalString(body, "outcome");
    if (outcome !== "accepted" && outcome !== "declined") {
      return reply.code(400).send({ error: "RWOS_EDIT_INVALID", message: "outcome must be accepted or declined." });
    }
    try {
      const result = await employerRequestEditService.completeReconfirmation({
        proposalId: readRouteParam(request.params, "proposalId"),
        outcome
      });
      return reply.code(200).send(result);
    } catch (error) {
      return sendEditError(reply, error);
    }
  });

  // Platform-only change-proposal reconciliation queue.
  app.get("/platform/change-proposals", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) return sendCancellationDenied(reply);
    const roles = await resolveAuthorizationRoles(session.user.id);
    if (!roles.includes("PLATFORM_ADMINISTRATOR")) {
      return reply.code(403).send({ error: "RWOS_EDIT_DENIED", message: "Platform authority is required." });
    }
    const proposals = await employerRequestEditService.listReconciliation();
    return reply.code(200).send({ proposals });
  });

  // Platform-only reconciliation queue for reductions.
  app.get("/platform/capacity-reductions", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) return sendCancellationDenied(reply);
    const roles = await resolveAuthorizationRoles(session.user.id);
    if (!roles.includes("PLATFORM_ADMINISTRATOR")) {
      return reply.code(403).send({ error: "RWOS_REDUCE_DENIED", message: "Platform authority is required." });
    }
    const reductions = await employerReduceService.listReconciliation();
    return reply.code(200).send({ reductions });
  });

  app.get("/organizations/:organizationId/job-requests", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendJobRequestDenied(reply);
    }

    const query = asRecord(request.query);
    const jobRequests = await jobRequestService.listForOrganization({
      actorUserId: session.user.id,
      organizationId: readRouteParam(request.params, "organizationId"),
      residenceId: readOptionalString(query, "residenceId"),
      departmentId: readOptionalString(query, "departmentId")
    });

    return reply.code(200).send({ jobRequests: jobRequests.map(serializeJobRequest) });
  });

  app.get(
    "/organizations/:organizationId/job-requests/:jobRequestIdOrNumber",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );

      if (!session.authenticated || !session.user) {
        return sendJobRequestDenied(reply);
      }

      const jobRequest = await jobRequestService.getForOrganization({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId"),
        jobRequestIdOrNumber: readRouteParam(request.params, "jobRequestIdOrNumber")
      });

      return reply.code(200).send({ jobRequest: serializeJobRequest(jobRequest) });
    }
  );

  app.patch("/organizations/:organizationId/job-requests/:jobRequestId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendJobRequestDenied(reply);
    }

    const body = asRecord(request.body);
    const urgency =
      body.urgency === undefined
        ? null
        : readJobRequestUrgency(readRequiredString(body, "urgency"));
    const requestType =
      body.requestType === undefined
        ? null
        : readJobRequestType(readRequiredString(body, "requestType"));

    if (body.urgency !== undefined && !urgency) {
      return reply
        .code(400)
        .send({ error: "RWOS_INVALID_JOB_REQUEST", message: "Invalid job request." });
    }

    if (body.requestType !== undefined && !requestType) {
      return reply
        .code(400)
        .send({ error: "RWOS_INVALID_JOB_REQUEST", message: "Invalid job request." });
    }

    const jobRequest = await jobRequestService.updateDraft({
      actorUserId: session.user.id,
      organizationId: readRouteParam(request.params, "organizationId"),
      jobRequestId: readRouteParam(request.params, "jobRequestId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      residenceId: readOptionalString(body, "residenceId"),
      departmentId: readOptionalString(body, "departmentId"),
      workGroupSlug: readOptionalString(body, "workGroup"),
      roleDefinitionIdentifier: readOptionalString(body, "roleDefinition"),
      title: readOptionalString(body, "title"),
      description: body.description === null ? null : readOptionalString(body, "description"),
      numberOfWorkers: readOptionalNumber(body, "numberOfWorkers"),
      urgency,
      requestType,
      timezone: readOptionalString(body, "timezone"),
      startAt: readOptionalDate(body, "startAt"),
      endAt: readOptionalDate(body, "endAt")
    });

    return reply.code(200).send({ jobRequest: serializeJobRequest(jobRequest) });
  });

  app.post(
    "/organizations/:organizationId/job-requests/:jobRequestId/submit",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );

      if (!session.authenticated || !session.user) {
        return sendJobRequestDenied(reply);
      }

      const body = asRecord(request.body);
      const jobRequest = await jobRequestService.submit({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId"),
        jobRequestId: readRouteParam(request.params, "jobRequestId"),
        expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
      });

      return reply.code(200).send({ jobRequest: serializeJobRequest(jobRequest) });
    }
  );

  app.post(
    "/organizations/:organizationId/job-requests/:jobRequestId/cancel",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );

      if (!session.authenticated || !session.user) {
        return sendJobRequestDenied(reply);
      }

      const body = asRecord(request.body);
      const reason = readRequiredString(body, "reason");

      if (!reason) {
        return reply
          .code(400)
          .send({ error: "RWOS_INVALID_JOB_REQUEST", message: "Invalid job request." });
      }

      const jobRequest = await jobRequestService.cancel({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId"),
        jobRequestId: readRouteParam(request.params, "jobRequestId"),
        expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
        reason
      });

      return reply.code(200).send({ jobRequest: serializeJobRequest(jobRequest) });
    }
  );

  app.get("/platform/job-requests/intake", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendJobRequestDenied(reply);
    }

    const jobRequests = await jobRequestService.listAdminIntake({
      session,
      roles: await resolveAuthorizationRoles(session.user.id)
    });

    return reply.code(200).send({ jobRequests: jobRequests.map(serializeJobRequest) });
  });

  app.get("/platform/job-requests/intake/:jobRequestIdOrNumber", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendJobRequestDenied(reply);
    }

    const jobRequest = await jobRequestService.getForAdmin({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      jobRequestIdOrNumber: readRouteParam(request.params, "jobRequestIdOrNumber")
    });

    return reply.code(200).send({ jobRequest: serializeJobRequest(jobRequest) });
  });

  app.post("/platform/job-requests/intake/:jobRequestId/admin-review", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendJobRequestDenied(reply);
    }

    const body = asRecord(request.body);
    const jobRequest = await jobRequestService.startAdminReview({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      jobRequestId: readRouteParam(request.params, "jobRequestId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ jobRequest: serializeJobRequest(jobRequest) });
  });

  app.post(
    "/platform/job-requests/intake/:jobRequestId/request-information",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );

      if (!session.authenticated || !session.user) {
        return sendJobRequestDenied(reply);
      }

      const body = asRecord(request.body);
      const reason = readRequiredString(body, "reason");

      if (!reason) {
        return reply
          .code(400)
          .send({ error: "RWOS_INVALID_JOB_REQUEST", message: "Invalid job request." });
      }

      const jobRequest = await jobRequestService.requestInformation({
        session,
        roles: await resolveAuthorizationRoles(session.user.id),
        jobRequestId: readRouteParam(request.params, "jobRequestId"),
        expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
        reason
      });

      return reply.code(200).send({ jobRequest: serializeJobRequest(jobRequest) });
    }
  );

  app.post(
    "/platform/job-requests/intake/:jobRequestId/approve-for-dispatch",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );

      if (!session.authenticated || !session.user) {
        return sendJobRequestDenied(reply);
      }

      const body = asRecord(request.body);
      const jobRequest = await jobRequestService.approveForDispatch({
        session,
        roles: await resolveAuthorizationRoles(session.user.id),
        jobRequestId: readRouteParam(request.params, "jobRequestId"),
        expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
        marginPpm: readOptionalNumber(body, "marginPpm") ?? null
      });

      // Notify the client their request is approved, with the job code (best-effort, never blocks).
      if (prisma) {
        await notifyClient(prisma, emailSender, { jobRequestId: jobRequest.id, kind: "job_code" });
      }

      return reply.code(200).send({ jobRequest: serializeJobRequest(jobRequest) });
    }
  );

  // Raise an owner escalation for one role line (admin or AI-manager-driven). At most one open at a time.
  app.post("/platform/orders/:orderId/roles/:jobRequestId/escalate", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);
    await jobRequestService.listAdminIntake({ session, roles: await resolveAuthorizationRoles(session.user.id) });
    const reason = normalizeEscalationReason(asRecord(request.body).reason);
    if (!reason) return reply.code(400).send({ error: "RWOS_INVALID_ESCALATION", message: "A reason of at least four characters is required." });
    const jobRequestId = readRouteParam(request.params, "jobRequestId");
    const jr = await prisma!.jobRequest.findUnique({ where: { id: jobRequestId }, select: { organizationId: true, orderId: true } });
    if (!jr) return reply.code(404).send({ error: "RWOS_JOB_REQUEST_NOT_FOUND", message: "Role not found." });
    const result = await raiseEscalation(prisma!, { jobRequestId, orderId: jr.orderId, organizationId: jr.organizationId, reason, raisedByUserId: session.user.id });
    if (!result.ok) return reply.code(409).send({ error: "RWOS_ESCALATION_ALREADY_OPEN", message: "This role already has an open escalation." });
    return reply.code(201).send({ escalationId: result.escalationId });
  });

  // The open owner-escalation queue.
  app.get("/platform/escalations", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);
    await jobRequestService.listAdminIntake({ session, roles: await resolveAuthorizationRoles(session.user.id) });
    const escalations = await listOpenEscalations(prisma!);
    return reply.code(200).send({ escalations });
  });

  // Owner closes an escalation: resolve (handled) or dismiss (no action needed).
  app.post("/platform/escalations/:escalationId/resolve", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);
    await jobRequestService.listAdminIntake({ session, roles: await resolveAuthorizationRoles(session.user.id) });
    const body = asRecord(request.body);
    const result = await closeEscalation(prisma!, {
      escalationId: readRouteParam(request.params, "escalationId"),
      resolvedByUserId: session.user.id,
      resolution: readOptionalString(body, "resolution") ?? null,
      dismiss: body.dismiss === true,
      now: new Date()
    });
    if (!result.ok) {
      const code = result.reason === "not_found" ? 404 : 409;
      return reply.code(code).send({ error: `RWOS_ESCALATION_${result.reason.toUpperCase()}`, message: "This escalation cannot be closed." });
    }
    return reply.code(200).send({ ok: true });
  });

  // Admin-maintained market-wage references. List every reference, and upsert one per (role, province).
  // Reference data only — never used to price, pay, or bill. Admin-gated.
  app.get("/platform/market-wages", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);
    await jobRequestService.listAdminIntake({ session, roles: await resolveAuthorizationRoles(session.user.id) });
    const marketWages = await listAllMarketWages(prisma!);
    return reply.code(200).send({ marketWages });
  });

  app.post("/platform/market-wages", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);
    await jobRequestService.listAdminIntake({ session, roles: await resolveAuthorizationRoles(session.user.id) });
    const body = asRecord(request.body);
    const roleDefinitionId = readRequiredString(body, "roleDefinitionId");
    const province = readRequiredString(body, "province");
    const medianHourlyRateMinor = readOptionalNumber(body, "medianHourlyRateMinor");
    const currency = readRequiredString(body, "currency") ?? "CAD";
    if (!roleDefinitionId || !province || province.length > 8 || medianHourlyRateMinor === null || !Number.isInteger(medianHourlyRateMinor) || medianHourlyRateMinor < 0) {
      return reply.code(400).send({ error: "RWOS_INVALID_MARKET_WAGE", message: "A role, province and non-negative rate are required." });
    }
    const marketWage = await upsertMarketWage(prisma!, {
      roleDefinitionId,
      province: province.toUpperCase(),
      medianHourlyRateMinor,
      currency,
      source: readOptionalString(body, "source") ?? null,
      updatedByUserId: session.user.id
    });
    return reply.code(200).send({ marketWage });
  });

  // Admin review queue, grouped by order: every order with at least one role line still awaiting
  // review. Authorized through the same governed admin gate as the per-request intake queue; the
  // per-role review actions remain the existing intake endpoints.
  app.get("/platform/orders", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);
    await jobRequestService.listAdminIntake({ session, roles: await resolveAuthorizationRoles(session.user.id) });
    const orders = await listPlatformOrdersInReview(prisma!);
    return reply.code(200).send({ orders });
  });

  app.get("/platform/orders/:orderId", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);
    await jobRequestService.listAdminIntake({ session, roles: await resolveAuthorizationRoles(session.user.id) });
    const order = await getPlatformOrder(prisma!, readRouteParam(request.params, "orderId"));
    if (!order) return reply.code(404).send({ error: "RWOS_ORDER_NOT_FOUND", message: "Order not found." });
    return reply.code(200).send({ order });
  });

  // Approve every AI-recommended role line in one order (the AI manager's "approve" recommendations),
  // running the governed begin-review -> approve-for-dispatch per role at its suggested margin.
  // Roles the AI manager escalates are left untouched for individual (owner) handling.
  app.post("/platform/orders/:orderId/approve-standard", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);
    const roles = await resolveAuthorizationRoles(session.user.id);
    await jobRequestService.listAdminIntake({ session, roles });
    const order = await getPlatformOrder(prisma!, readRouteParam(request.params, "orderId"));
    if (!order) return reply.code(404).send({ error: "RWOS_ORDER_NOT_FOUND", message: "Order not found." });

    let approved = 0;
    let escalated = 0;
    let skipped = 0;
    for (const child of order.children) {
      if (child.recommendation === "escalate") { escalated += 1; continue; }
      let version = child.version;
      let status = child.status;
      try {
        if (status === "submitted") {
          const reviewed = await jobRequestService.startAdminReview({ session, roles, jobRequestId: child.jobRequestId, expectedVersion: version });
          version = reviewed.version;
          status = "admin_review";
        }
        if (status === "admin_review") {
          await jobRequestService.approveForDispatch({ session, roles, jobRequestId: child.jobRequestId, expectedVersion: version, marginPpm: child.suggestedMarginPpm });
          approved += 1;
        } else {
          skipped += 1;
        }
      } catch {
        skipped += 1;
      }
    }
    const updated = await getPlatformOrder(prisma!, readRouteParam(request.params, "orderId"));
    return reply.code(200).send({ order: updated, summary: { approved, escalated, skipped } });
  });

  app.put(
    "/organizations/:organizationId/calendar/requests/:jobRequestId/profile",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );
      if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);

      const body = asRecord(request.body);
      const qualifications = readStringArray(body, "qualifications");

      if (!qualifications) {
        return reply.code(400).send({
          error: "RWOS_INVALID_CALENDAR_REQUEST",
          message: "Invalid calendar request."
        });
      }

      const profile = await calendarRequestService.upsertClientProfile({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId"),
        jobRequestId: readRouteParam(request.params, "jobRequestId"),
        dutiesSummary: readOptionalString(body, "dutiesSummary"),
        qualifications,
        addressSummary: readOptionalString(body, "addressSummary"),
        specialInstructions: readOptionalString(body, "specialInstructions"),
        allowances: readAllowancesInput(body),
        expectedVersion: readOptionalNumber(body, "expectedVersion")
      });

      return reply.code(200).send({ profile: serializeCalendarProfile(profile) });
    }
  );

  app.get("/organizations/:organizationId/calendar/requests", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);

    const query = asRecord(request.query);
    const requests = await calendarRequestService.listClientCalendar({
      actorUserId: session.user.id,
      organizationId: readRouteParam(request.params, "organizationId"),
      residenceId: readOptionalString(query, "residenceId"),
      departmentId: readOptionalString(query, "departmentId")
    });

    return reply.code(200).send({ requests: requests.map(serializeCalendarRequest) });
  });

  app.get(
    "/organizations/:organizationId/calendar/requests/:jobRequestIdOrNumber",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );
      if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);

      const calendarRequest = await calendarRequestService.getClientCalendarRequest({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId"),
        jobRequestIdOrNumber: readRouteParam(request.params, "jobRequestIdOrNumber")
      });

      return reply.code(200).send({ request: serializeCalendarRequest(calendarRequest) });
    }
  );

  app.get("/platform/calendar/requests", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);

    const requests = await calendarRequestService.listAdminCalendar({
      session,
      roles: await resolveAuthorizationRoles(session.user.id)
    });

    return reply.code(200).send({ requests: requests.map(serializeCalendarRequest) });
  });

  // Admin order overview — one job request as an "order": its code, the CLIENT it belongs to, the
  // worker(s) who accepted, and the derived lifecycle state (pending → accepted → processing →
  // finished, with disputed/cancelled). Read-only; admin-gated. Money signals (invoice/payment/
  // payout) feed the lifecycle but no money moves here.
  app.get("/platform/job-requests/:jobRequestId/order-overview", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);
    // Admin gate (same pattern the other /platform admin reads use).
    await jobRequestService.listAdminIntake({ session, roles: await resolveAuthorizationRoles(session.user.id) });
    if (!prisma) return reply.code(503).send({ error: "RWOS_UNAVAILABLE", message: "Not available." });

    // Accept either the UUID id or the human job code (JR-YYYY-NNNNNN) the admin UI links by.
    const idOrNumber = readRouteParam(request.params, "jobRequestId");
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrNumber);
    const job = await prisma.jobRequest.findUnique({
      where: isUuid ? { id: idOrNumber } : { jobRequestNumber: idOrNumber },
      select: { id: true, jobRequestNumber: true, title: true, status: true, organizationId: true, numberOfWorkers: true }
    });
    if (!job) return reply.code(404).send({ error: "RWOS_JOB_REQUEST_NOT_FOUND", message: "Order not found." });
    const jobRequestId = job.id;

    const ACTIVE = ["confirmed", "worker_acknowledged", "ready_for_attendance", "in_attendance_window", "attendance_handoff"];
    const IN_PROGRESS = new Set(["in_attendance_window", "attendance_handoff"]);
    const [org, assignments, timesheets] = await Promise.all([
      prisma.employerOrganization.findUnique({
        where: { id: job.organizationId },
        select: { displayName: true, legalName: true }
      }),
      prisma.assignment.findMany({
        where: { jobRequestId, status: { in: ACTIVE as AssignmentStatus[] } },
        select: { status: true, workerIdentity: { select: { displayName: true, user: { select: { displayName: true } } } } }
      }),
      prisma.timesheet.findMany({ where: { jobRequestId }, select: { id: true, status: true } })
    ]);
    const timesheetIds = timesheets.map((t) => t.id);
    const invoices = timesheetIds.length
      ? await prisma.invoice.findMany({
          where: { timesheetId: { in: timesheetIds } },
          select: { status: true, subtotalMinor: true, taxMinor: true, totalMinor: true, updatedAt: true },
          orderBy: { updatedAt: "desc" }
        })
      : [];
    // The authoritative invoice (newest) — the real billed amount, not a recompute.
    const authoritativeInvoice = invoices[0]
      ? {
          status: invoices[0].status,
          subtotalMinor: Number(invoices[0].subtotalMinor),
          taxMinor: Number(invoices[0].taxMinor),
          totalMinor: Number(invoices[0].totalMinor)
        }
      : null;

    const acceptedWorkers = assignments.map(
      (a) => a.workerIdentity?.displayName ?? a.workerIdentity?.user?.displayName ?? "Worker"
    );
    const attendanceUnderway = assignments.some((a) => IN_PROGRESS.has(a.status));
    const timesheetLocked = timesheets.some((t) => t.status === "locked");
    const hasOpenDispute =
      timesheets.some((t) => t.status === "rejected" || t.status === "correction_required") ||
      invoices.some((inv) => inv.status === "disputed");
    const invoiceIssued = invoices.some((inv) =>
      ["issued", "sent", "viewed", "partially_paid", "paid"].includes(inv.status)
    );
    const paymentCaptured = invoices.some((inv) => ["partially_paid", "paid"].includes(inv.status));

    const lifecycle = deriveOrderLifecycle({
      jobStatus: job.status,
      activeWorkerCount: assignments.length,
      requestedWorkerCount: job.numberOfWorkers,
      attendanceUnderway,
      timesheetLocked,
      invoiceIssued,
      paymentCaptured,
      payoutTransferred: false, // wired when the payout capsule lands
      hasOpenDispute
    });

    return reply.code(200).send({
      order: {
        jobRequestId: job.id,
        jobCode: job.jobRequestNumber,
        title: job.title,
        jobStatus: job.status,
        client: { name: org?.displayName ?? org?.legalName ?? "Client" },
        requestedWorkerCount: job.numberOfWorkers,
        acceptedWorkers,
        lifecycle,
        authoritativeInvoice,
        signals: { attendanceUnderway, timesheetLocked, invoiceIssued, paymentCaptured, hasOpenDispute }
      }
    });
  });

  // Mark a RELEASED worker payout as paid — the "money transferred to the worker" step — and inform
  // the worker by email. HARD finance-gated: with FINANCE_LIVE_ENABLED off (the default, requires a
  // recorded CPA sign-off) this returns 423 and nothing moves. No external send happens here; this
  // records the governed transition + notifies. Admin-gated.
  app.post("/platform/worker-payouts/:payoutId/mark-paid", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);
    await jobRequestService.listAdminIntake({ session, roles: await resolveAuthorizationRoles(session.user.id) });
    if (!prisma) return reply.code(503).send({ error: "RWOS_UNAVAILABLE", message: "Not available." });
    if (!financeLive) {
      return reply
        .code(423)
        .send({ error: "RWOS_FINANCE_LOCKED", message: "Worker payouts are not live yet (finance gate closed)." });
    }

    const payoutId = readRouteParam(request.params, "payoutId");
    const payout = await prisma.workerPayout.findUnique({
      where: { id: payoutId },
      select: { id: true, status: true, workerIdentityId: true, amountMinor: true, currency: true }
    });
    if (!payout) return reply.code(404).send({ error: "RWOS_PAYOUT_NOT_FOUND", message: "Payout not found." });
    if (payout.status !== "released") {
      return reply
        .code(409)
        .send({ error: "RWOS_PAYOUT_NOT_RELEASED", message: "Only a released payout can be marked paid." });
    }

    const updated = await prisma.workerPayout.updateMany({
      where: { id: payout.id, status: "released" },
      data: { status: "paid", paidAt: new Date() }
    });
    if (updated.count === 0) {
      return reply.code(409).send({ error: "RWOS_PAYOUT_CONFLICT", message: "Payout changed; retry." });
    }

    const notified = await notifyWorkerPayoutPaid(prisma, emailSender, {
      workerIdentityId: payout.workerIdentityId,
      amountMinor: payout.amountMinor,
      currency: payout.currency
    });
    return reply.code(200).send({ payout: { id: payout.id, status: "paid" }, workerNotification: notified.status });
  });

  app.get("/platform/calendar/requests/:jobRequestIdOrNumber", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);

    const calendarRequest = await calendarRequestService.getAdminCalendarRequest({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      jobRequestIdOrNumber: readRouteParam(request.params, "jobRequestIdOrNumber")
    });

    return reply.code(200).send({ request: serializeCalendarRequest(calendarRequest) });
  });

  // Control Room enrichment: the immutable pricing snapshot for one job (finance authority only).
  // Additive + read-only. Lets the admin Transaction Control Room show the real settlement ledger
  // without exposing pricing through the shared (client-facing) calendar DTO.
  app.get("/platform/job-requests/:jobRequestId/pricing-snapshot", async (request, reply) => {
    const actor = await requirePayrollAuthority(request, reply);
    if (!actor) return;
    // Accept the UUID id or the human job code (JR-YYYY-NNNNNN) — the admin Control Room opens by
    // code, and a 404 here silently dropped the snapshot and billed a $30 reference rate instead.
    const idOrNumber = readRouteParam(request.params, "jobRequestId");
    let jobRequestId = idOrNumber;
    if (!isCanonicalUuid(idOrNumber)) {
      const byNumber = await prisma!.jobRequest.findUnique({
        where: { jobRequestNumber: idOrNumber },
        select: { id: true }
      });
      if (!byNumber) return reply.code(404).send({ error: "RWOS_PRICING_NOT_FOUND", message: "Not found." });
      jobRequestId = byNumber.id;
    }
    const snap = await prisma!.requestPricingSnapshot.findUnique({
      where: { jobRequestId },
      select: {
        employerHourlyRateMinor: true,
        workerHourlyRateMinor: true,
        platformHourlyMarginMinor: true,
        marginPpm: true,
        currency: true,
        emergencySurchargePerHourMinor: true,
        distanceSurchargeMinor: true,
        distanceWorkerMinor: true,
        distancePlatformMinor: true
      }
    });
    if (!snap) return reply.code(200).send({ pricingSnapshot: null });
    // Full per-job money with the variable extras (Gap A). Per-hour amounts × billable hours land in
    // the invoice/payroll; distance is a flat per-shift surcharge. "variableBreakdown" shows who keeps what.
    return reply.code(200).send({
      pricingSnapshot: snap,
      variableBreakdown: {
        emergencySurchargePerHourMinor: snap.emergencySurchargePerHourMinor, // billed to client per hour, platform keeps
        distanceSurchargeMinor: snap.distanceSurchargeMinor, // flat per shift, billed to client
        distanceWorkerMinor: snap.distanceWorkerMinor, // worker's travel half
        distancePlatformMinor: snap.distancePlatformMinor, // platform's half
        employerPerHourAllIn: snap.employerHourlyRateMinor + snap.emergencySurchargePerHourMinor,
        platformKeptPerHour: snap.platformHourlyMarginMinor + snap.emergencySurchargePerHourMinor
      }
    });
  });

  app.put(
    "/platform/calendar/requests/:jobRequestIdOrNumber/verification",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );
      if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);

      const body = asRecord(request.body);
      const contractVerificationState = readCalendarVerificationState(
        readRequiredString(body, "contractVerificationState")
      );
      const paymentMethodReadinessState = readCalendarVerificationState(
        readRequiredString(body, "paymentMethodReadinessState")
      );
      const locationVerificationState = readCalendarVerificationState(
        readRequiredString(body, "locationVerificationState")
      );
      const expectedVersion = readOptionalNumber(body, "expectedVersion");
      if (
        !contractVerificationState ||
        !paymentMethodReadinessState ||
        !locationVerificationState ||
        expectedVersion === null
      ) {
        return reply.code(400).send({
          error: "RWOS_INVALID_CALENDAR_REQUEST",
          message: "Invalid calendar request."
        });
      }

      const profile = await calendarRequestService.updateAdminVerification({
        session,
        roles: await resolveAuthorizationRoles(session.user.id),
        jobRequestIdOrNumber: readRouteParam(request.params, "jobRequestIdOrNumber"),
        contractVerificationState,
        paymentMethodReadinessState,
        locationVerificationState,
        expectedVersion
      });

      return reply.code(200).send({ profile: serializeCalendarProfile(profile) });
    }
  );

  app.get("/worker/calendar/offers/:workerOfferId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendWorkerOfferDenied(reply);

    const reference = await calendarRequestService.getWorkerOfferCalendarReference({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      workerOfferId: readRouteParam(request.params, "workerOfferId")
    });

    return reply.code(200).send({ offer: serializeWorkerCalendarReference(reference) });
  });

  app.post("/platform/dispatches", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const body = asRecord(request.body);
    const priority = readDispatchPriority(readRequiredString(body, "priority"));
    const dispatchReview = await dispatchService.createDispatch({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      jobRequestIdOrNumber: readRequiredString(body, "jobRequestIdOrNumber") ?? "",
      operationalOwnerUserId: readOptionalString(body, "operationalOwnerUserId"),
      ...(priority ? { priority } : {})
    });

    return reply.code(201).send({ dispatchReview: serializeDispatchReview(dispatchReview) });
  });

  app.get("/platform/dispatches", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const query = asRecord(request.query);
    const dispatches = await dispatchService.listDispatches({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      organizationId: readOptionalString(query, "organizationId")
    });

    const dispatchSourceNumbers = await Promise.all(
      dispatches.map((item) => reduceJobRequestRepository.findJobRequestById(item.jobRequestId))
    );
    return reply.code(200).send({
      dispatches: dispatches.map((item, index) => ({
        ...serializeDispatchReview(item),
        jobRequestNumber: dispatchSourceNumbers[index]?.jobRequestNumber ?? null
      }))
    });
  });

  app.get("/platform/dispatches/:dispatchReviewId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const result = await dispatchService.getDispatch({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId")
    });
    // Surface the human-readable source request number (e.g. JR-2026-000001) so the operator
    // console can label the dispatch by it instead of a raw UUID. Audit ids remain available.
    const sourceJobRequest = await reduceJobRequestRepository.findJobRequestById(
      result.dispatchReview.jobRequestId
    );

    return reply.code(200).send({
      dispatchReview: {
        ...serializeDispatchReview(result.dispatchReview),
        jobRequestNumber: sourceJobRequest?.jobRequestNumber ?? null
      },
      candidates: result.candidates.map(serializeDispatchCandidate)
    });
  });

  app.post("/platform/dispatches/:dispatchReviewId/owner", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const body = asRecord(request.body);
    const dispatchReview = await dispatchService.assignOperationalOwner({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId"),
      operationalOwnerUserId: readOptionalString(body, "operationalOwnerUserId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ dispatchReview: serializeDispatchReview(dispatchReview) });
  });

  app.post("/platform/dispatches/:dispatchReviewId/candidate-review", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const body = asRecord(request.body);
    const dispatchReview = await dispatchService.startCandidateReview({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ dispatchReview: serializeDispatchReview(dispatchReview) });
  });

  app.get("/platform/dispatches/:dispatchReviewId/candidates/search", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const result = await dispatchService.searchCandidates({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId")
    });

    return reply.code(200).send({
      status: result.status,
      candidates: result.candidates.map(serializeDispatchCandidate)
    });
  });

  app.get(
    "/platform/dispatches/:dispatchReviewId/candidate-source-status",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );
      if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

      const result = await dispatchService.getCandidateSourceStatus({
        session,
        roles: await resolveAuthorizationRoles(session.user.id),
        dispatchReviewId: readRouteParam(request.params, "dispatchReviewId")
      });

      return reply.code(200).send(result);
    }
  );

  app.post("/platform/dispatches/:dispatchReviewId/candidates/evaluate", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const body = asRecord(request.body);
    const result = await dispatchService.evaluateCandidate({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId"),
      candidateSourceReference: readRequiredString(body, "candidateSourceReference") ?? ""
    });

    return reply.code(200).send({
      status: result.status,
      candidate: result.candidate ? serializeDispatchCandidate(result.candidate) : null
    });
  });

  app.post("/platform/dispatches/:dispatchReviewId/shortlist", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const body = asRecord(request.body);
    const candidate = await dispatchService.addCandidateToShortlist({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId"),
      candidateSourceReference: readRequiredString(body, "candidateSourceReference") ?? "",
      shortlistOrder: readOptionalNumber(body, "shortlistOrder")
    });

    return reply.code(200).send({ candidate: serializeDispatchCandidate(candidate) });
  });

  app.delete(
    "/platform/dispatches/:dispatchReviewId/shortlist/:candidateSourceReference",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );
      if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

      const candidate = await dispatchService.removeCandidateFromShortlist({
        session,
        roles: await resolveAuthorizationRoles(session.user.id),
        dispatchReviewId: readRouteParam(request.params, "dispatchReviewId"),
        candidateSourceReference: readRouteParam(request.params, "candidateSourceReference")
      });

      return reply.code(200).send({ candidate: serializeDispatchCandidate(candidate) });
    }
  );

  app.post("/platform/dispatches/:dispatchReviewId/shortlist/reorder", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const body = asRecord(request.body);
    const references = Array.isArray(body.candidateSourceReferences)
      ? body.candidateSourceReferences.filter((value): value is string => typeof value === "string")
      : [];
    const candidates = await dispatchService.reorderShortlist({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId"),
      candidateSourceReferences: references
    });

    return reply.code(200).send({ candidates: candidates.map(serializeDispatchCandidate) });
  });

  app.post("/platform/dispatches/:dispatchReviewId/shortlist-ready", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const body = asRecord(request.body);
    const dispatchReview = await dispatchService.markShortlistReady({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ dispatchReview: serializeDispatchReview(dispatchReview) });
  });

  app.post("/platform/dispatches/:dispatchReviewId/offer-preparation", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const body = asRecord(request.body);
    const dispatchReview = await dispatchService.moveToOfferPreparation({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ dispatchReview: serializeDispatchReview(dispatchReview) });
  });

  app.post("/platform/dispatches/:dispatchReviewId/pause", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const body = asRecord(request.body);
    const dispatchReview = await dispatchService.pause({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? ""
    });

    return reply.code(200).send({ dispatchReview: serializeDispatchReview(dispatchReview) });
  });

  app.post("/platform/dispatches/:dispatchReviewId/resume", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const body = asRecord(request.body);
    const dispatchReview = await dispatchService.resume({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ dispatchReview: serializeDispatchReview(dispatchReview) });
  });

  app.post("/platform/dispatches/:dispatchReviewId/cancel", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const body = asRecord(request.body);
    const dispatchReview = await dispatchService.cancel({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? ""
    });

    return reply.code(200).send({ dispatchReview: serializeDispatchReview(dispatchReview) });
  });

  app.post("/platform/dispatches/:dispatchReviewId/close", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const body = asRecord(request.body);
    const dispatchReview = await dispatchService.close({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? ""
    });

    return reply.code(200).send({ dispatchReview: serializeDispatchReview(dispatchReview) });
  });

  app.get("/platform/dispatches/:dispatchReviewId/audit", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const audit = await dispatchService.readAuditSummary({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId")
    });

    return reply.code(200).send({ audit });
  });

  app.get(
    "/organizations/:organizationId/job-requests/:jobRequestIdOrNumber/dispatch-status",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );
      if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);

      const status = await dispatchService.getEmployerDispatchStatus({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId"),
        jobRequestIdOrNumber: readRouteParam(request.params, "jobRequestIdOrNumber")
      });

      return reply.code(200).send({ dispatchStatus: serializeEmployerDispatchStatus(status) });
    }
  );

  app.post("/platform/worker-offers", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendWorkerOfferDenied(reply);

    const body = asRecord(request.body);
    const expiresAt = readRequiredDate(body, "expiresAt");
    if (!expiresAt) return sendWorkerOfferDenied(reply);

    const workerOffer = await workerOfferService.createOffer({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRequiredString(body, "dispatchReviewId") ?? "",
      workerIdentityId: readRequiredString(body, "workerIdentityId") ?? "",
      expiresAt,
      workerVisibleTitle: readOptionalString(body, "workerVisibleTitle"),
      workerVisibleSummary: readOptionalString(body, "workerVisibleSummary"),
      compensationSummary: readOptionalString(body, "compensationSummary"),
      policySummary: readOptionalString(body, "policySummary")
    });

    return reply.code(201).send({ workerOffer: serializeWorkerOffer(workerOffer) });
  });

  app.get("/platform/worker-offers", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendWorkerOfferDenied(reply);

    const query = asRecord(request.query);
    const status = readWorkerOfferStatus(readOptionalString(query, "status"));
    const workerOffers = await workerOfferService.listOffers({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readOptionalString(query, "dispatchReviewId"),
      organizationId: readOptionalString(query, "organizationId"),
      ...(status ? { statuses: [status] } : {})
    });

    return reply
      .code(200)
      .send({ workerOffers: workerOffers.map((item) => serializeWorkerOffer(item)) });
  });

  app.get("/platform/worker-offers/:workerOfferId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendWorkerOfferDenied(reply);

    const workerOffer = await workerOfferService.readOffer({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      workerOfferId: readRouteParam(request.params, "workerOfferId")
    });

    return reply.code(200).send({ workerOffer: serializeWorkerOffer(workerOffer) });
  });

  app.post("/platform/worker-offers/:workerOfferId/approve", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendWorkerOfferDenied(reply);

    const body = asRecord(request.body);
    const workerOffer = await workerOfferService.approve({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      workerOfferId: readRouteParam(request.params, "workerOfferId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ workerOffer: serializeWorkerOffer(workerOffer) });
  });

  app.post("/platform/worker-offers/:workerOfferId/send", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendWorkerOfferDenied(reply);

    const body = asRecord(request.body);
    const workerOffer = await workerOfferService.send({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      workerOfferId: readRouteParam(request.params, "workerOfferId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ workerOffer: serializeWorkerOffer(workerOffer) });
  });

  app.post("/platform/worker-offers/:workerOfferId/delivery/retry", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendWorkerOfferDenied(reply);

    const body = asRecord(request.body);
    const workerOffer = await workerOfferService.retryDelivery({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      workerOfferId: readRouteParam(request.params, "workerOfferId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ workerOffer: serializeWorkerOffer(workerOffer) });
  });

  app.post("/platform/worker-offers/:workerOfferId/withdraw", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendWorkerOfferDenied(reply);

    const body = asRecord(request.body);
    const workerOffer = await workerOfferService.withdraw({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      workerOfferId: readRouteParam(request.params, "workerOfferId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? ""
    });

    return reply.code(200).send({ workerOffer: serializeWorkerOffer(workerOffer) });
  });

  app.post("/platform/worker-offers/:workerOfferId/cancel", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendWorkerOfferDenied(reply);

    const body = asRecord(request.body);
    const workerOffer = await workerOfferService.cancel({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      workerOfferId: readRouteParam(request.params, "workerOfferId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? ""
    });

    return reply.code(200).send({ workerOffer: serializeWorkerOffer(workerOffer) });
  });

  app.get("/platform/worker-offers/:workerOfferId/audit", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendWorkerOfferDenied(reply);

    const audit = await workerOfferService.readAuditSummary({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      workerOfferId: readRouteParam(request.params, "workerOfferId")
    });

    return reply.code(200).send({ audit });
  });

  app.get("/worker/offers/:workerOfferId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendWorkerOfferDenied(reply);

    const workerOffer = await workerOfferService.workerRead({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      workerOfferId: readRouteParam(request.params, "workerOfferId")
    });

    return reply.code(200).send({ workerOffer: serializeWorkerOfferReference(workerOffer) });
  });

  app.get("/worker/offers", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendWorkerOfferDenied(reply);

    const query = asRecord(request.query);
    const status = readWorkerOfferStatus(readOptionalString(query, "status"));
    const workerOffers = await workerOfferService.listWorkerOffers({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      ...(status ? { statuses: [status] } : {})
    });

    return reply.code(200).send({
      workerOffers: workerOffers.map((workerOffer) => serializeWorkerOfferReference(workerOffer))
    });
  });

  app.post("/worker/offers/:workerOfferId/accept", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendWorkerOfferDenied(reply);

    // A worker cannot accept work until they have signed a pay-channel election (employee or
    // independent). This fixes the channel before any money is earned. The check needs the database;
    // the no-DB test harness (mock services, prisma undefined) skips it. See
    // docs/finance/TWO_CHANNEL_PAYROLL_DESIGN.md.
    if (prisma) {
      const electIdentity = await prisma.workerIdentity.findFirst({ where: { userId: session.user.id }, select: { id: true } });
      const activeElection = electIdentity ? await getActiveElection(prisma, electIdentity.id) : null;
      if (!activeElection) {
        return reply.code(409).send({
          error: "RWOS_CLASSIFICATION_ELECTION_REQUIRED",
          message: "Choose and sign your pay channel (employee or independent) before accepting work.",
          agreementVersions: WORKER_AGREEMENT_VERSIONS
        });
      }
    }

    const body = asRecord(request.body);
    const workerOffer = await workerOfferService.accept({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      workerOfferId: readRouteParam(request.params, "workerOfferId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      expectedTermsVersionId: readRequiredString(body, "expectedTermsVersionId") ?? "",
      reason: readOptionalString(body, "reason")
    });

    // Notify the client that a worker accepted (best-effort, never blocks the accept).
    if (prisma) {
      const offer = await prisma.workerOffer.findUnique({
        where: { id: readRouteParam(request.params, "workerOfferId") },
        select: { jobRequestId: true }
      });
      if (offer) {
        await notifyClient(prisma, emailSender, { jobRequestId: offer.jobRequestId, kind: "worker_accepted" });
      }
    }

    return reply.code(200).send({ workerOffer: serializeWorkerOfferReference(workerOffer) });
  });

  app.post("/worker/offers/:workerOfferId/decline", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendWorkerOfferDenied(reply);

    const body = asRecord(request.body);
    const workerOffer = await workerOfferService.decline({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      workerOfferId: readRouteParam(request.params, "workerOfferId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      expectedTermsVersionId: readRequiredString(body, "expectedTermsVersionId") ?? "",
      reason: readOptionalString(body, "reason")
    });

    return reply.code(200).send({ workerOffer: serializeWorkerOfferReference(workerOffer) });
  });

  app.post("/platform/assignments", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const body = asRecord(request.body);
    const workerOfferId = readRequiredString(body, "workerOfferId");
    const dispatchReviewId = readRequiredString(body, "dispatchReviewId");
    const expectedOfferVersion = readOptionalNumber(body, "expectedOfferVersion");
    if (
      !workerOfferId ||
      !isCanonicalUuid(workerOfferId) ||
      !dispatchReviewId ||
      !isCanonicalUuid(dispatchReviewId) ||
      !Number.isInteger(expectedOfferVersion) ||
      (expectedOfferVersion ?? 0) < 1
    ) {
      return reply.code(400).send({
        error: "RWOS_INVALID_ASSIGNMENT_REQUEST",
        message: "Invalid assignment request."
      });
    }
    const assignment = await assignmentService.createFromAcceptedOffer({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      workerOfferId,
      expectedDispatchReviewId: dispatchReviewId,
      expectedOfferVersion: expectedOfferVersion as number
    });

    // Mirror the authoritative assignment onto any linked marketplace interest (best-effort;
    // never affects the assignment result). This is the ONLY place interest reaches
    // offer_accepted — driven by the governed assignment, never by a marketplace action.
    try {
      await workerJobInterestService.markOfferAcceptedByOffer(workerOfferId);
    } catch {
      /* interest mirror is best-effort; the governed assignment already succeeded */
    }

    return reply.code(201).send({ assignment: serializeAssignment(assignment) });
  });

  app.get("/platform/assignments", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const query = asRecord(request.query);
    const status = readAssignmentStatus(readOptionalString(query, "status"));
    const dispatchReviewId = readOptionalString(query, "dispatchReviewId");
    let organizationId: string | null = readOptionalString(query, "organizationId") ?? null;
    // assignment.read is an organization-context permission. A platform reviewer lists assignments
    // for a dispatch without supplying an org, which would fail the context check. Resolve the
    // dispatch's organization so the governed read has the organization context it requires.
    if (!organizationId && dispatchReviewId && prisma) {
      const review = await prisma.dispatchReview.findUnique({
        where: { id: dispatchReviewId },
        select: { organizationId: true }
      });
      organizationId = review?.organizationId ?? null;
    }
    const assignments = await assignmentService.listAssignments({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId,
      organizationId,
      jobRequestId: readOptionalString(query, "jobRequestId"),
      ...(status ? { statuses: [status] } : {})
    });

    return reply
      .code(200)
      .send({ assignments: assignments.map((item) => serializeAssignment(item)) });
  });

  app.get("/platform/assignments/:assignmentId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const assignment = await assignmentService.readAssignment({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      assignmentId: readRouteParam(request.params, "assignmentId")
    });

    return reply.code(200).send({ assignment: serializeAssignment(assignment) });
  });

  app.post("/platform/assignments/:assignmentId/ready-for-attendance", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const body = asRecord(request.body);
    const assignment = await assignmentService.markReadyForAttendance({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      assignmentId: readRouteParam(request.params, "assignmentId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ assignment: serializeAssignment(assignment) });
  });

  app.post("/platform/assignments/:assignmentId/attendance-window", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const body = asRecord(request.body);
    const assignment = await assignmentService.startAttendanceWindow({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      assignmentId: readRouteParam(request.params, "assignmentId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ assignment: serializeAssignment(assignment) });
  });

  app.post("/platform/assignments/:assignmentId/attendance-handoff", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const body = asRecord(request.body);
    const assignment = await assignmentService.attendanceHandoff({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      assignmentId: readRouteParam(request.params, "assignmentId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ assignment: serializeAssignment(assignment) });
  });

  app.post("/platform/assignments/:assignmentId/cancel", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const body = asRecord(request.body);
    const assignment = await assignmentService.cancel({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      assignmentId: readRouteParam(request.params, "assignmentId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? "",
      status: readAssignmentStatus(readOptionalString(body, "status")) ?? "platform_cancelled"
    });

    return reply.code(200).send({ assignment: serializeAssignment(assignment) });
  });

  app.post("/platform/assignments/:assignmentId/replacement-required", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const body = asRecord(request.body);
    const assignment = await assignmentService.markReplacementRequired({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      assignmentId: readRouteParam(request.params, "assignmentId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? ""
    });

    return reply.code(200).send({ assignment: serializeAssignment(assignment) });
  });

  app.get("/platform/assignments/:assignmentId/audit", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const audit = await assignmentService.readAuditSummary({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      assignmentId: readRouteParam(request.params, "assignmentId")
    });

    return reply.code(200).send({ audit });
  });

  app.get("/organizations/:organizationId/assignments", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const query = asRecord(request.query);
    const status = readAssignmentStatus(readOptionalString(query, "status"));
    const organizationId = readRouteParam(request.params, "organizationId");
    // Stage: tenant-isolation fix — bind the caller to an ACTIVE membership of THIS org before listing
    // (global roles alone let one org read another org's assignments by changing the URL id).
    if (!(await userHasOrganizationAccess(session.user.id, organizationId))) {
      return sendAssignmentDenied(reply);
    }
    const assignments = await assignmentService.listAssignments({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      organizationId,
      ...(status ? { statuses: [status] } : {})
    });
    if (!allBelongToOrganization(assignments, organizationId)) {
      return sendAssignmentDenied(reply);
    }

    return reply
      .code(200)
      .send({ assignments: assignments.map((item) => serializeEmployerAssignment(item)) });
  });

  app.get("/worker/assignments/:assignmentId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const assignment = await assignmentService.workerRead({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      assignmentId: readRouteParam(request.params, "assignmentId")
    });

    const job = await reduceJobRequestRepository.findJobRequestById(assignment.jobRequestId);
    return reply
      .code(200)
      .send({ assignment: serializeWorkerAssignment(assignment, job?.jobRequestNumber ?? null) });
  });

  // Worker's own-calendar export: raw RFC-5545 .ics the worker imports into Google/Apple/Outlook.
  // The accepted shift carries its job code; no account linking, no money, worker-scoped read only.
  app.get("/worker/assignments/:assignmentId/calendar.ics", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const assignment = await assignmentService.workerRead({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      assignmentId: readRouteParam(request.params, "assignmentId")
    });
    const job = await reduceJobRequestRepository.findJobRequestById(assignment.jobRequestId);
    const exported = buildCalendarExport({
      title: assignment.confirmedTitle,
      startAt: assignment.confirmedStartAt.toISOString(),
      endAt: assignment.confirmedEndAt.toISOString(),
      jobCode: job?.jobRequestNumber ?? null,
      location: assignment.confirmedWorksiteSummary,
      uid: assignment.id,
      stampedAt: new Date().toISOString()
    });
    return reply
      .code(200)
      .header("content-type", "text/calendar; charset=utf-8")
      .header("content-disposition", `attachment; filename="${exported.filename}"`)
      .send(exported.ics);
  });

  app.get("/worker/assignments", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const query = asRecord(request.query);
    const status = readAssignmentStatus(readOptionalString(query, "status"));
    const assignments = await assignmentService.listWorkerAssignments({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      ...(status ? { statuses: [status] } : {})
    });

    return reply.code(200).send({
      assignments: assignments.map((assignment) => serializeWorkerAssignment(assignment))
    });
  });

  app.post("/worker/assignments/:assignmentId/acknowledge", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const body = asRecord(request.body);
    const assignment = await assignmentService.acknowledge({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      assignmentId: readRouteParam(request.params, "assignmentId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ assignment: serializeWorkerAssignment(assignment) });
  });

  app.post("/worker/assignments/:assignmentId/withdraw", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const body = asRecord(request.body);
    const assignmentId = readRouteParam(request.params, "assignmentId");
    const assignment = await assignmentService.workerWithdraw({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      assignmentId,
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? ""
    });

    // Owner policy: a worker who cancels a confirmed job within 24h faces a 7-day suspension (first
    // offence) or permanent close (repeat). We only COMPUTE the recommendation here and surface it —
    // actually suspending/closing the account is a governed admin action (closure is irreversible).
    let cancellationPenalty: ReturnType<typeof deriveWorkerCancellationPenalty> | null = null;
    if (prisma && assignment.confirmedStartAt) {
      try {
        const identity = await prisma.workerIdentity.findFirst({
          where: { userId: session.user.id },
          select: { id: true }
        });
        let priorLate = 0;
        if (identity) {
          const priors = await prisma.assignment.findMany({
            where: { workerIdentityId: identity.id, status: "worker_withdrawn", id: { not: assignmentId } },
            select: { confirmedStartAt: true, workerWithdrawnAt: true }
          });
          priorLate = priors.filter(
            (a) =>
              a.workerWithdrawnAt &&
              (a.confirmedStartAt.getTime() - a.workerWithdrawnAt.getTime()) / 3_600_000 < 24
          ).length;
        }
        cancellationPenalty = deriveWorkerCancellationPenalty({
          shiftStartIso: assignment.confirmedStartAt.toISOString(),
          nowIso: new Date().toISOString(),
          priorLateCancellations: priorLate
        });
      } catch {
        cancellationPenalty = null;
      }
    }

    return reply.code(200).send({ assignment: serializeWorkerAssignment(assignment), cancellationPenalty });
  });

  app.post("/platform/attendance", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAttendanceUnauthenticated(reply);

    const body = asRecord(request.body);
    const attendanceRecord = await attendanceService.createFromAssignment({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      assignmentId: readRequiredString(body, "assignmentId") ?? "",
      verificationMethod: readOptionalString(body, "verificationMethod")
    });

    return reply.code(201).send({ attendanceRecord: serializeAttendanceRecord(attendanceRecord) });
  });

  app.get("/platform/attendance", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAttendanceUnauthenticated(reply);

    const query = asRecord(request.query);
    const status = readAttendanceStatus(readOptionalString(query, "status"));
    const attendanceRecords = await attendanceService.listAttendance({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      organizationId: readOptionalString(query, "organizationId"),
      assignmentId: readOptionalString(query, "assignmentId"),
      ...(status ? { statuses: [status] } : {})
    });

    return reply.code(200).send({
      attendanceRecords: attendanceRecords.map((item) => serializeAttendanceRecord(item))
    });
  });

  app.get("/platform/attendance/:attendanceRecordId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAttendanceUnauthenticated(reply);

    const attendanceRecord = await attendanceService.readAttendance({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      attendanceRecordId: readRouteParam(request.params, "attendanceRecordId")
    });

    return reply.code(200).send({ attendanceRecord: serializeAttendanceRecord(attendanceRecord) });
  });

  app.post("/platform/attendance/:attendanceRecordId/complete", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAttendanceUnauthenticated(reply);

    const body = asRecord(request.body);
    const attendanceRecord = await attendanceService.markCompleted({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      attendanceRecordId: readRouteParam(request.params, "attendanceRecordId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ attendanceRecord: serializeAttendanceRecord(attendanceRecord) });
  });

  app.post("/platform/attendance/:attendanceRecordId/missed", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAttendanceUnauthenticated(reply);

    const body = asRecord(request.body);
    const attendanceRecord = await attendanceService.markMissed({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      attendanceRecordId: readRouteParam(request.params, "attendanceRecordId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? ""
    });

    return reply.code(200).send({ attendanceRecord: serializeAttendanceRecord(attendanceRecord) });
  });

  app.post("/platform/attendance/:attendanceRecordId/exception", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAttendanceUnauthenticated(reply);

    const body = asRecord(request.body);
    const attendanceRecord = await attendanceService.markException({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      attendanceRecordId: readRouteParam(request.params, "attendanceRecordId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? "",
      note: readOptionalString(body, "note")
    });

    return reply.code(200).send({ attendanceRecord: serializeAttendanceRecord(attendanceRecord) });
  });

  app.post("/platform/attendance/:attendanceRecordId/cancel", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAttendanceUnauthenticated(reply);

    const body = asRecord(request.body);
    const attendanceRecord = await attendanceService.cancel({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      attendanceRecordId: readRouteParam(request.params, "attendanceRecordId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? ""
    });

    return reply.code(200).send({ attendanceRecord: serializeAttendanceRecord(attendanceRecord) });
  });

  app.get("/platform/attendance/:attendanceRecordId/audit", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAttendanceUnauthenticated(reply);

    const audit = await attendanceService.readAuditSummary({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      attendanceRecordId: readRouteParam(request.params, "attendanceRecordId")
    });

    return reply.code(200).send({ audit });
  });

  app.get("/organizations/:organizationId/attendance", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAttendanceUnauthenticated(reply);

    const query = asRecord(request.query);
    const status = readAttendanceStatus(readOptionalString(query, "status"));
    const organizationId = readRouteParam(request.params, "organizationId");
    // Stage: tenant-isolation fix — require active membership of THIS org before listing attendance.
    if (!(await userHasOrganizationAccess(session.user.id, organizationId))) {
      return sendAttendanceDenied(reply);
    }
    const attendanceRecords = await attendanceService.listAttendance({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      organizationId,
      ...(status ? { statuses: [status] } : {})
    });
    if (!allBelongToOrganization(attendanceRecords, organizationId)) {
      return sendAttendanceDenied(reply);
    }

    return reply.code(200).send({
      attendanceRecords: attendanceRecords.map((item) => serializeAttendanceRecord(item))
    });
  });

  app.get("/worker/attendance/:attendanceRecordId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAttendanceUnauthenticated(reply);

    const attendanceRecord = await attendanceService.workerRead({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      attendanceRecordId: readRouteParam(request.params, "attendanceRecordId")
    });

    return reply.code(200).send({ attendanceRecord: serializeAttendanceRecord(attendanceRecord) });
  });

  app.post("/worker/attendance/:attendanceRecordId/check-in", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAttendanceUnauthenticated(reply);

    const body = asRecord(request.body);
    const attendanceRecord = await attendanceService.workerCheckIn({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      attendanceRecordId: readRouteParam(request.params, "attendanceRecordId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      method: readOptionalString(body, "method"),
      evidenceSummary: readOptionalString(body, "evidenceSummary"),
      locationPolicyResult: readOptionalString(body, "locationPolicyResult")
    });

    return reply.code(200).send({ attendanceRecord: serializeAttendanceRecord(attendanceRecord) });
  });

  app.post("/worker/attendance/:attendanceRecordId/check-out", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAttendanceUnauthenticated(reply);

    const body = asRecord(request.body);
    const attendanceRecord = await attendanceService.workerCheckOut({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      attendanceRecordId: readRouteParam(request.params, "attendanceRecordId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      method: readOptionalString(body, "method"),
      evidenceSummary: readOptionalString(body, "evidenceSummary"),
      locationPolicyResult: readOptionalString(body, "locationPolicyResult")
    });

    return reply.code(200).send({ attendanceRecord: serializeAttendanceRecord(attendanceRecord) });
  });

  // ── HR-4: worker schedule + attendance (worker-scoped read over the EXISTING attendance
  // authority — never a parallel schedule). The worker sees only their OWN records; no other
  // worker data, no home location. ──
  app.get("/worker/attendance", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) return sendAttendanceUnauthenticated(reply);
    const identity = await prisma!.workerIdentity.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (!identity) return reply.code(403).send({ error: "RWOS_ATTENDANCE_DENIED", message: "Only a worker can view their schedule." });
    const query = asRecord(request.query);
    const limit = Math.min(Math.max(parseQueryInt(readOptionalString(query, "limit")) ?? 25, 1), 100);
    const cursor = readOptionalString(query, "cursor");
    const rows = await prisma!.attendanceRecord.findMany({
      where: { workerIdentityId: identity.id },
      orderBy: [{ scheduledStartAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor && isCanonicalUuid(cursor) ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true, assignmentId: true, status: true, scheduledStartAt: true, scheduledEndAt: true, timezone: true,
        checkInAt: true, checkOutAt: true, exceptionCategory: true, version: true,
        organization: { select: { displayName: true } },
        residence: { select: { city: true, province: true } }
      }
    });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((r) => ({
      attendanceRecordId: r.id, assignmentId: r.assignmentId, status: r.status,
      scheduledStartAt: r.scheduledStartAt.toISOString(), scheduledEndAt: r.scheduledEndAt.toISOString(), timezone: r.timezone,
      checkInAt: r.checkInAt?.toISOString() ?? null, checkOutAt: r.checkOutAt?.toISOString() ?? null,
      exceptionCategory: r.exceptionCategory, version: r.version,
      employerName: r.organization.displayName,
      areaLabel: r.residence.city && isProvinceCode(r.residence.province) ? `${r.residence.city}, ${r.residence.province}` : null
    }));
    return reply.code(200).send({ items, nextCursor: hasMore ? (rows[limit - 1]?.id ?? null) : null });
  });

  // ── HR-4 payroll boundary: ApprovedWorkedTime. The ONLY authoritative HR input the future
  // payroll domain should consume — approved/locked timesheets only. Read-only, bounded,
  // index-backed. HR-4 computes NO tax/deductions/gross/net/vacation/premiums/remittances. ──
  app.get("/platform/hr/approved-worked-time", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const query = asRecord(request.query);
    const organizationId = readOptionalString(query, "organizationId");
    const limit = Math.min(Math.max(parseQueryInt(readOptionalString(query, "limit")) ?? 25, 1), 100);
    const cursor = readOptionalString(query, "cursor");
    const rows = await prisma!.timesheet.findMany({
      where: { status: { in: ["approved", "locked"] }, ...(organizationId && isCanonicalUuid(organizationId) ? { organizationId } : {}) },
      orderBy: [{ scheduledStartAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor && isCanonicalUuid(cursor) ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, assignmentId: true, workerIdentityId: true, organizationId: true, status: true, scheduledStartAt: true, scheduledEndAt: true, payableMinutes: true, billableMinutes: true, breakMinutes: true, approvedAt: true, lockedAt: true }
    });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((t) => ({
      timesheetId: t.id, assignmentId: t.assignmentId, workerIdentityId: t.workerIdentityId, organizationId: t.organizationId,
      status: t.status, scheduledStartAt: t.scheduledStartAt.toISOString(), scheduledEndAt: t.scheduledEndAt.toISOString(),
      payableMinutes: t.payableMinutes, billableMinutes: t.billableMinutes, breakMinutes: t.breakMinutes,
      approvedAt: t.approvedAt?.toISOString() ?? null, lockedAt: t.lockedAt?.toISOString() ?? null
    }));
    // NOTE: minutes only — no money. Payroll (HR-5) consumes this seam and is jurisdiction-aware.
    return reply.code(200).send({ items, nextCursor: hasMore ? (rows[limit - 1]?.id ?? null) : null, seam: "ApprovedWorkedTime" });
  });

  // ── HR-5 Payroll / Finance FOUNDATION (TEST / SYNTHETIC — no money execution). Payroll turns
  // approved/locked worked time into a governed calculation snapshot. No `paid` state, no banking,
  // no remittance. Every response is explicitly labelled synthetic. ──
  const PAYROLL_SYNTHETIC_NOTICE = "SYNTHETIC / TEST PAYROLL — a governed calculation only. No money moves; this is not a real pay statement.";

  // Payroll authority: create a governed pay period for an org + jurisdiction.
  // Phase 3: the remittance ledger. Accrued liabilities owed to CRA (federal) and Revenu Québec
  // (provincial + QPP/QPIP + employer contributions) from LOCKED payroll, derived from the persisted
  // deduction + employer-cost lines so it always reconciles to source. Read-only; nothing is filed or
  // paid (gated). See docs/finance/TWO_CHANNEL_PAYROLL_DESIGN.md.
  app.get("/platform/finance/remittances", async (request, reply) => {
    const actor = await requirePayrollAuthority(request, reply);
    if (!actor) return;
    const query = asRecord(request.query);
    const organizationId = readOptionalString(query, "organizationId");
    const payrollPeriodId = readOptionalString(query, "payrollPeriodId");
    const where: Record<string, unknown> = { status: "locked" };
    if (organizationId) where.organizationId = organizationId;
    if (payrollPeriodId) where.payrollPeriodId = payrollPeriodId;
    const calcs = await prisma!.payrollCalculation.findMany({ where, select: { id: true, currency: true } });
    const ids = calcs.map((c) => c.id);
    const currency = calcs[0]?.currency ?? "CAD";
    const [deductions, employerCosts] = await Promise.all([
      prisma!.payrollDeductionLine.findMany({ where: { payrollCalculationId: { in: ids } }, select: { code: true, amountMinor: true } }),
      prisma!.payrollEmployerCostLine.findMany({ where: { payrollCalculationId: { in: ids } }, select: { code: true, amountMinor: true } })
    ]);
    const summary = buildRemittanceSummary([...deductions, ...employerCosts], currency);
    return reply.code(200).send({
      remittances: summary,
      lockedCalculations: ids.length,
      note: "Accrued liabilities from locked payroll. Nothing is filed or paid while the go-live gate is closed."
    });
  });

  // Dynamic offer engine P2: run the optimizer for a job over candidate workers and LOG each proposal
  // to the offer-decision training set. Returns the ranked, explainable offers. No offer is sent and
  // no money moves here. See docs/matching/DYNAMIC_OFFER_ENGINE_DESIGN.md.
  app.post("/platform/matching/propose", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const body = asRecord(request.body);
    const hours = readOptionalNumber(body, "hours");
    const distanceKm = readOptionalNumber(body, "distanceKm") ?? 0;
    const hoursUntilShift = readOptionalNumber(body, "hoursUntilShift") ?? 72;
    const billPerHourMinor = readOptionalNumber(body, "billPerHourMinor");
    const extrasMinor = readOptionalNumber(body, "extrasMinor") ?? 0;
    let willingnessToPayPerHourMinor = readOptionalNumber(body, "willingnessToPayPerHourMinor");
    const baseRatePerHourMinor = readOptionalNumber(body, "baseRatePerHourMinor");
    const marginFloorMinor = readOptionalNumber(body, "marginFloorMinor") ?? 0;
    const jobRequestId = readOptionalString(body, "jobRequestId");
    // If the caller didn't pass a WTP, use the client's captured intake signal for the job.
    if (willingnessToPayPerHourMinor == null && jobRequestId && isCanonicalUuid(jobRequestId)) {
      const sig = await prisma!.clientIntakeSignal.findUnique({ where: { jobRequestId }, select: { willingnessToPayPerHourMinor: true } });
      willingnessToPayPerHourMinor = sig?.willingnessToPayPerHourMinor ?? null;
    }
    const workerIdentityIds = Array.isArray(body.workerIdentityIds)
      ? body.workerIdentityIds.filter((x): x is string => typeof x === "string" && isCanonicalUuid(x))
      : [];
    if (hours == null || billPerHourMinor == null || willingnessToPayPerHourMinor == null || baseRatePerHourMinor == null || workerIdentityIds.length === 0) {
      return reply.code(400).send({ error: "RWOS_MATCHING_INVALID", message: "hours, billPerHourMinor, willingnessToPayPerHourMinor, baseRatePerHourMinor and at least one worker are required." });
    }
    const decisions = await proposeAndLogOffers(prisma!, {
      jobRequestId: jobRequestId ?? null,
      job: { hours, distanceKm, hoursUntilShift },
      client: { billPerHourMinor, extrasMinor, willingnessToPayPerHourMinor },
      workerIdentityIds,
      baseRatePerHourMinor,
      marginFloorMinor,
      ...(body.proPriority === false ? { proPriority: false } : {})
    });
    return reply.code(200).send({ decisions, note: "Proposals logged to the offer-decision training set. No offer is sent and no money moves here." });
  });

  // Variable client pricing: compute the full CLIENT-side quote (pre-tax) for a job — base labour +
  // funded allowances + emergency surcharge + distance (gas/time) surcharge + demand uplift toward the
  // client's willingness-to-pay ceiling. Shows what the client is quoted and the part the platform
  // keeps on top of the base margin. Pure computation — gated like every other number; no money moves.
  app.post("/platform/pricing/quote", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const body = asRecord(request.body);
    const labourClientMinor = readOptionalNumber(body, "labourClientMinor");
    const employerHourlyRateMinor = readOptionalNumber(body, "employerHourlyRateMinor");
    const hours = readOptionalNumber(body, "hours");
    // Labour can be given directly, or derived from an hourly rate × hours.
    const labour =
      labourClientMinor ?? (employerHourlyRateMinor != null && hours != null ? employerHourlyRateMinor * hours : null);
    if (labour == null) {
      return reply.code(400).send({ error: "RWOS_PRICING_INVALID", message: "Provide labourClientMinor, or employerHourlyRateMinor and hours." });
    }
    const willingnessCeilingMinor = readOptionalNumber(body, "willingnessCeilingMinor");
    const demandSignal = readOptionalNumber(body, "demandSignal");
    const quote = buildVariableClientQuote({
      labourClientMinor: labour,
      allowancesClientMinor: readOptionalNumber(body, "allowancesClientMinor") ?? 0,
      urgency: readOptionalString(body, "urgency"),
      distanceKm: readOptionalNumber(body, "distanceKm") ?? 0,
      ...(typeof body.roundTrip === "boolean" ? { roundTrip: body.roundTrip } : {}),
      ...(willingnessCeilingMinor != null ? { willingnessCeilingMinor } : {}),
      ...(demandSignal != null ? { demandSignal } : {})
    });
    return reply.code(200).send({ quote, note: "Quote only — no invoice is issued and no money moves (FINANCE_LIVE gated)." });
  });

  // JobScanner: scan external partner feeds (Adzuna now; Talent.com later) for Québec jobs, normalize
  // and dedupe them into external leads, and optionally rank them for a worker (role keywords +
  // location). These are EXTERNAL leads — a hand-off to the source, not JobLop governed jobs; no money
  // moves. Uses the live Adzuna API when ADZUNA_APP_ID/ADZUNA_APP_KEY are set, else a mock QC feed so
  // the pipeline runs before the account is approved. Results are not yet persisted (next slice).
  app.post("/platform/jobscanner/scan", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const body = asRecord(request.body);
    const client = createAdzunaClient({
      appId: process.env.ADZUNA_APP_ID ?? null,
      appKey: process.env.ADZUNA_APP_KEY ?? null,
      country: process.env.ADZUNA_COUNTRY ?? "ca"
    });
    const what = readOptionalString(body, "what") ?? undefined;
    const where = readOptionalString(body, "where") ?? undefined;
    const resultsPerPage = readOptionalNumber(body, "resultsPerPage") ?? 20;
    // Recency filter — the best available proxy for "needed now / urgent" (the feed has no urgency flag).
    const maxDaysOld = readOptionalNumber(body, "maxDaysOld") ?? undefined;
    let raws;
    try {
      raws = await client.search({
        ...(what !== undefined ? { what } : {}),
        ...(where !== undefined ? { where } : {}),
        ...(maxDaysOld !== undefined ? { maxDaysOld } : {}),
        resultsPerPage
      });
    } catch (err) {
      return reply.code(502).send({ error: "RWOS_JOBSCANNER_SOURCE_ERROR", message: (err as Error).message, mode: client.mode });
    }
    const leads = dedupeLeads(normalizeAdzunaJobs(raws));
    // Persist (upsert by source+sourceId) so a re-scan refreshes rather than duplicates.
    const persisted = await upsertLeads(prisma!, leads);
    // Optional per-worker ranking when a worker profile is supplied.
    const wp = asRecord(body.worker);
    const roleKeywords = Array.isArray(wp.roleKeywords)
      ? wp.roleKeywords.filter((x): x is string => typeof x === "string")
      : [];
    let ranked = null;
    if (roleKeywords.length > 0) {
      const profile: WorkerMatchProfile = {
        roleKeywords,
        latitude: readOptionalNumber(wp, "latitude"),
        longitude: readOptionalNumber(wp, "longitude"),
        maxDistanceKm: readOptionalNumber(wp, "maxDistanceKm"),
        minSalaryMinorPerYear: readOptionalNumber(wp, "minSalaryMinorPerYear")
      };
      ranked = rankLeadsForWorker(leads, profile);
    }
    return reply.code(200).send({
      source: client.source,
      mode: client.mode,
      scanned: raws.length,
      leadCount: leads.length,
      persisted,
      leads: ranked ?? leads,
      ranked: ranked !== null,
      note:
        client.mode === "mock"
          ? "MOCK feed (Adzuna account not yet approved). External leads only — hand-off to the source, not JobLop jobs."
          : "Live Adzuna feed. External leads only — hand-off to the source, not JobLop jobs."
    });
  });

  // JobScanner: read stored leads (from prior scans), optionally filtered by province/city and ranked
  // for a worker. This is the funnel's data source — external hand-off leads, not JobLop jobs.
  app.get("/platform/jobscanner/leads", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const q = asRecord((request as unknown as { query?: unknown }).query);
    const province = readOptionalString(q, "province") ?? undefined;
    const city = readOptionalString(q, "city") ?? undefined;
    const limit = readOptionalNumber(q, "limit") ?? 100;
    const stored = await queryStoredLeads(prisma!, {
      ...(province !== undefined ? { province } : {}),
      ...(city !== undefined ? { city } : {}),
      limit
    });
    const roleKeywordsRaw = readOptionalString(q, "roleKeywords");
    const roleKeywords = roleKeywordsRaw ? roleKeywordsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];
    let leads: unknown = stored;
    let ranked = false;
    if (roleKeywords.length > 0) {
      const profile: WorkerMatchProfile = {
        roleKeywords,
        latitude: readOptionalNumber(q, "latitude"),
        longitude: readOptionalNumber(q, "longitude"),
        maxDistanceKm: readOptionalNumber(q, "maxDistanceKm")
      };
      leads = rankLeadsForWorker(stored, profile);
      ranked = true;
    }
    return reply.code(200).send({ leadCount: stored.length, ranked, leads, note: "External leads only — hand-off to the source, not JobLop jobs." });
  });

  // AI CV Builder: generate a tailored CV + cover letter for a worker, optionally targeted at a stored
  // external lead (leadId) or an inline job. Uses the synthetic offline provider (a real Claude-backed
  // provider plugs in behind a key later). ADVISORY — the worker reviews/edits before use; nothing is
  // sent anywhere. This is also a revenue surface (premium generation) later.
  app.post("/platform/jobscanner/cv", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const body = asRecord(request.body);
    const profileRaw = asRecord(body.profile);
    if (!readOptionalString(profileRaw, "fullName")) {
      return reply.code(400).send({ error: "RWOS_CV_INVALID", message: "profile.fullName is required." });
    }
    const profile = buildCvProfile(profileRaw);
    // Target job: a stored lead by id, or an inline job object, or none (general CV).
    let job: TargetJob | null = null;
    const leadId = readOptionalString(body, "leadId");
    if (leadId && isCanonicalUuid(leadId)) {
      const lead = await prisma!.externalJobLead.findUnique({ where: { id: leadId } });
      if (lead) job = { title: lead.title, employer: lead.employer, description: lead.description, city: lead.city };
    } else if (body.job) {
      const j = asRecord(body.job);
      const title = readOptionalString(j, "title");
      if (title) job = { title, employer: readOptionalString(j, "employer"), description: readOptionalString(j, "description"), city: readOptionalString(j, "city") };
    }
    const provider = getCvProvider();
    let result;
    try {
      result = await provider.generate({ profile, job });
    } catch (err) {
      return reply.code(502).send({ error: "RWOS_CV_PROVIDER_ERROR", message: (err as Error).message, provider: provider.kind });
    }
    return reply.code(200).send({
      cv: result,
      providerKind: provider.kind,
      note: "Advisory draft — the worker reviews and edits before use. Nothing is sent. Apply is a separate, worker-confirmed step."
    });
  });

  // JobScanner CV attachments: worker uploads certificates (MAPAQ/RCR/cariste/licence) + optional photo.
  // Worker-owned, referenced on the CV. PDF/PNG/JPEG, <=5MB, type sniffed. Not the HR compliance store.
  app.post("/platform/jobscanner/cv-assets", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const body = asRecord(request.body);
    const workerRef = readOptionalString(body, "workerRef");
    const kind = readOptionalString(body, "kind");
    const filename = readOptionalString(body, "filename");
    const declaredContentType = readOptionalString(body, "contentType");
    const dataBase64 = readOptionalString(body, "dataBase64");
    if (!workerRef || !kind || !filename || !declaredContentType || !dataBase64) {
      return reply.code(400).send({ error: "RWOS_CV_ASSET_INVALID", message: "workerRef, kind, filename, contentType and dataBase64 are required." });
    }
    const result = await createCvAsset(prisma!, {
      workerRef,
      kind,
      label: readOptionalString(body, "label"),
      filename,
      declaredContentType,
      dataBase64
    });
    if (!result.ok) {
      return reply.code(400).send({ error: "RWOS_CV_ASSET_REJECTED", reason: result.reason });
    }
    return reply.code(201).send({ asset: result.asset });
  });

  app.get("/platform/jobscanner/cv-assets", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const q = asRecord((request as unknown as { query?: unknown }).query);
    const workerRef = readOptionalString(q, "workerRef");
    if (!workerRef) return reply.code(400).send({ error: "RWOS_CV_ASSET_INVALID", message: "workerRef is required." });
    const assets = await listCvAssets(prisma!, workerRef);
    return reply.code(200).send({ assets });
  });

  app.delete("/platform/jobscanner/cv-assets/:id", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const id = readRouteParam(request.params, "id");
    const q = asRecord((request as unknown as { query?: unknown }).query);
    const workerRef = readOptionalString(q, "workerRef");
    if (!id || !isCanonicalUuid(id) || !workerRef) {
      return reply.code(400).send({ error: "RWOS_CV_ASSET_INVALID", message: "A valid id and workerRef are required." });
    }
    const ok = await deleteCvAsset(prisma!, workerRef, id);
    if (!ok) return reply.code(404).send({ error: "RWOS_CV_ASSET_NOT_FOUND" });
    return reply.code(200).send({ deleted: true });
  });

  // Worker Pro entitlements — admin grant/revoke (real admin mechanism; payments FROZEN, so no charge).
  // workerRef is the worker's user id. This is how a worker gets Pro until a gated purchase flow opens.
  app.post("/platform/cv-entitlements/grant", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const body = asRecord(request.body);
    const workerRef = readOptionalString(body, "workerRef");
    if (!workerRef) return reply.code(400).send({ error: "RWOS_ENTITLEMENT_INVALID", message: "workerRef is required." });
    const entitlement = await grantEntitlement(prisma!, { workerRef, plan: PRO_PLAN, source: "admin_grant", grantedByUserId: actor });
    return reply.code(200).send({ entitlement });
  });

  app.post("/platform/cv-entitlements/revoke", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const body = asRecord(request.body);
    const workerRef = readOptionalString(body, "workerRef");
    if (!workerRef) return reply.code(400).send({ error: "RWOS_ENTITLEMENT_INVALID", message: "workerRef is required." });
    const revoked = await revokeEntitlement(prisma!, workerRef);
    return reply.code(200).send({ revoked });
  });

  // Dynamic offer engine P2: record what actually happened to a proposed offer (accepted / declined /
  // ignored / expired / offered). This is the label the learned models train on.
  app.post("/platform/matching/offers/:eventId/outcome", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const eventId = readRouteParam(request.params, "eventId");
    const body = asRecord(request.body);
    const outcome = readOptionalString(body, "outcome") as OfferOutcome | null;
    if (!eventId || !isCanonicalUuid(eventId) || !outcome || !OFFER_OUTCOMES.includes(outcome)) {
      return reply.code(400).send({ error: "RWOS_MATCHING_INVALID", message: "A valid eventId and outcome are required." });
    }
    const ok = await recordOfferOutcome(prisma!, eventId, outcome);
    if (!ok) return reply.code(404).send({ error: "RWOS_MATCHING_EVENT_NOT_FOUND", message: "That offer event was not found." });
    return reply.code(200).send({ eventId, outcome });
  });

  // Dynamic offer engine P3: the learning loop. Retrain the acceptance model on the WHOLE offer/outcome
  // history and activate it. Call on a schedule (or after a batch of outcomes) — the optimizer then
  // uses the smarter model. See docs/matching/DYNAMIC_OFFER_ENGINE_DESIGN.md.
  app.post("/platform/matching/retrain", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const result = await retrainAcceptanceModel(prisma!);
    return reply.code(200).send({
      ...result,
      minSamples: MIN_SAMPLES_FOR_LEARNED_MODEL,
      note: result.trained
        ? "Acceptance model retrained on the full offer history and activated."
        : `Not enough labelled history yet (need ${MIN_SAMPLES_FOR_LEARNED_MODEL}); the optimizer keeps using the cold-start prior.`
    });
  });

  // Dynamic offer engine: the active learned model's status (what the loop has produced).
  app.get("/platform/matching/model", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const active = await prisma!.matchingModelVersion.findFirst({
      where: { modelType: "acceptance", isActive: true },
      select: { sampleSize: true, logLoss: true, trainedAt: true, featureDim: true }
    });
    const totalLabelled = await prisma!.offerDecisionEvent.count({ where: { outcome: { in: ["accepted", "declined", "ignored", "expired"] } } });
    return reply.code(200).send({
      active: active
        ? { modelKind: "learned-logistic", sampleSize: active.sampleSize, logLoss: active.logLoss, trainedAt: active.trainedAt, featureDim: active.featureDim }
        : null,
      usingModel: active && active.sampleSize >= MIN_SAMPLES_FOR_LEARNED_MODEL ? "learned-logistic" : "cold-start-prior",
      labelledHistory: totalLabelled,
      minSamples: MIN_SAMPLES_FOR_LEARNED_MODEL
    });
  });

  // Dynamic offer engine P5: the operator dashboard — fill rate, realized margin, the outcome funnel,
  // the active model, and recent offers. Read-only. See docs/matching/DYNAMIC_OFFER_ENGINE_DESIGN.md.
  app.get("/platform/matching/dashboard", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const byOutcome = await prisma!.offerDecisionEvent.groupBy({ by: ["outcome"], _count: { _all: true } });
    const counts: Record<string, number> = {};
    for (const g of byOutcome) counts[g.outcome] = g._count._all;
    const decided = (counts.accepted ?? 0) + (counts.declined ?? 0) + (counts.ignored ?? 0) + (counts.expired ?? 0);
    const realized = await prisma!.offerDecisionEvent.aggregate({ _sum: { marginMinor: true }, where: { outcome: "accepted" } });
    const avgPred = await prisma!.offerDecisionEvent.aggregate({ _avg: { acceptanceProbability: true } });
    const model = await prisma!.matchingModelVersion.findFirst({ where: { modelType: "acceptance", isActive: true }, select: { sampleSize: true, logLoss: true, trainedAt: true } });
    const recent = await prisma!.offerDecisionEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { workerIdentityId: true, transportAllowanceMinor: true, bonusMinor: true, acceptanceProbability: true, marginMinor: true, outcome: true, modelKind: true, createdAt: true }
    });
    return reply.code(200).send({
      totalOffers: Object.values(counts).reduce((s, n) => s + n, 0),
      outcomes: counts,
      fillRate: decided > 0 ? Number(((counts.accepted ?? 0) / decided).toFixed(4)) : null,
      realizedMarginMinor: realized._sum.marginMinor ?? 0,
      avgPredictedAcceptance: avgPred._avg.acceptanceProbability != null ? Number(avgPred._avg.acceptanceProbability.toFixed(4)) : null,
      model: model ? { kind: "learned-logistic", sampleSize: model.sampleSize, logLoss: model.logLoss, trainedAt: model.trainedAt } : { kind: "cold-start-prior" },
      recent
    });
  });

  // Dynamic offer engine P4b: capture what the client needs (from the client page) — the WTP ceiling
  // and context the optimizer uses. One signal per job. See docs/matching/DYNAMIC_OFFER_ENGINE_DESIGN.md.
  app.put("/platform/matching/client-signals/:jobRequestId", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const jobRequestId = readRouteParam(request.params, "jobRequestId");
    if (!jobRequestId || !isCanonicalUuid(jobRequestId)) {
      return reply.code(400).send({ error: "RWOS_MATCHING_INVALID", message: "A valid jobRequestId is required." });
    }
    const body = asRecord(request.body);
    const urgency = readOptionalString(body, "urgency") ?? "normal";
    const budgetFlexibility = readOptionalString(body, "budgetFlexibility") ?? "normal";
    const willingnessToPayPerHourMinor = readOptionalNumber(body, "willingnessToPayPerHourMinor");
    if (willingnessToPayPerHourMinor == null || willingnessToPayPerHourMinor < 0 || !["low", "normal", "high", "urgent"].includes(urgency) || !["tight", "normal", "flexible"].includes(budgetFlexibility)) {
      return reply.code(400).send({ error: "RWOS_MATCHING_INVALID", message: "willingnessToPayPerHourMinor and a valid urgency / budgetFlexibility are required." });
    }
    const data = {
      organizationId: readOptionalString(body, "organizationId") ?? null,
      urgency, budgetFlexibility, willingnessToPayPerHourMinor,
      notes: readOptionalString(body, "notes") ?? null,
      updatedByUserId: actor
    };
    const sig = await prisma!.clientIntakeSignal.upsert({ where: { jobRequestId }, create: { jobRequestId, ...data }, update: data });
    return reply.code(200).send({ signal: { jobRequestId, urgency: sig.urgency, budgetFlexibility: sig.budgetFlexibility, willingnessToPayPerHourMinor: sig.willingnessToPayPerHourMinor } });
  });

  app.get("/platform/matching/client-signals/:jobRequestId", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const jobRequestId = readRouteParam(request.params, "jobRequestId");
    const sig = jobRequestId && isCanonicalUuid(jobRequestId) ? await prisma!.clientIntakeSignal.findUnique({ where: { jobRequestId } }) : null;
    return reply.code(200).send({
      signal: sig ? { jobRequestId, urgency: sig.urgency, budgetFlexibility: sig.budgetFlexibility, willingnessToPayPerHourMinor: sig.willingnessToPayPerHourMinor, notes: sig.notes } : null
    });
  });

  // Phase 5: the go-live gate's state. Shows whether live finance is on and exactly what stays
  // blocked while it is off. See docs/finance/TWO_CHANNEL_PAYROLL_DESIGN.md.
  app.get("/platform/finance/status", async (request, reply) => {
    const actor = await requirePayrollAuthority(request, reply);
    if (!actor) return;
    return reply.code(200).send({
      financeLive,
      cpaSignoffRecorded: Boolean((environment.FINANCE_LIVE_CPA_SIGNOFF ?? "").trim()),
      environment: runtimeConfig.rwosEnv,
      blockedWhileGated: ["remittance_filing", "slip_filing", "worker_payout_execution"],
      note: financeLive
        ? "Live finance is ON. Execution paths are active."
        : "Live finance is OFF. Everything is computed and accounted for, but no money moves and nothing is filed."
    });
  });

  // Phase 5: execute a remittance filing to CRA / Revenu Québec. Hard-gated: refused while the
  // go-live gate is closed. (The filing/payment provider integration itself is future work — this
  // endpoint makes the gate explicit and enforced now.)
  app.post("/platform/finance/remittances/file", async (request, reply) => {
    const actor = await requirePayrollAuthority(request, reply);
    if (!actor) return;
    if (!financeLive) {
      return reply.code(423).send({
        error: "RWOS_FINANCE_GATED",
        message: "Live finance is off. Remittances are accrued only; nothing is filed until the go-live gate opens (CPA sign-off required)."
      });
    }
    return reply.code(501).send({
      error: "RWOS_FINANCE_FILING_NOT_IMPLEMENTED",
      message: "The remittance filing provider integration is not implemented yet."
    });
  });

  // Phase 4: the accountant's view. One strict, simple summary of the whole money flow over LOCKED
  // payroll, per channel. The double-entry identity holds by construction: employer billed == worker
  // net + deductions + employer cost + platform net. Surfaces the TRUE platform margin after the
  // employer-side payroll burden. Derived; nothing filed or paid (gated).
  app.get("/platform/finance/accounting", async (request, reply) => {
    const actor = await requirePayrollAuthority(request, reply);
    if (!actor) return;
    const query = asRecord(request.query);
    const organizationId = readOptionalString(query, "organizationId");
    // Parameterize the optional org filter (defense-in-depth; the value is also UUID-validated).
    const params: unknown[] = [];
    let orgFilter = "";
    if (organizationId && isCanonicalUuid(organizationId)) {
      params.push(organizationId);
      orgFilter = `AND c.organization_id = $${params.length}::uuid`;
    }
    const rows = (await prisma!.$queryRawUnsafe(
      `SELECT c.worker_classification AS channel,
              c.gross_pay_minor AS worker_gross,
              c.total_deductions_minor AS deductions,
              c.total_employer_cost_minor AS employer_cost,
              c.net_pay_minor AS worker_net,
              COALESCE((
                SELECT SUM(wtr.billable_minutes * s.employer_hourly_rate_minor)
                FROM payroll_worked_time_references wtr
                JOIN timesheets t ON t.id = wtr.timesheet_id
                JOIN request_pricing_snapshots s ON s.job_request_id = t.job_request_id
                WHERE wtr.payroll_calculation_id = c.id
              ), 0) / 60 AS employer_billed,
              c.currency AS currency
       FROM payroll_calculations c
       WHERE c.status = 'locked' ${orgFilter}`,
      ...params
    )) as Array<Record<string, unknown>>;
    const calcRows: AccountingCalcRow[] = rows.map((r) => ({
      channel: String(r.channel ?? "employee"),
      employerBilledMinor: Number(r.employer_billed ?? 0),
      workerGrossMinor: Number(r.worker_gross ?? 0),
      deductionsMinor: Number(r.deductions ?? 0),
      employerCostMinor: Number(r.employer_cost ?? 0),
      workerNetMinor: Number(r.worker_net ?? 0)
    }));
    const currency = rows.length ? String(rows[0]!.currency ?? "CAD") : "CAD";
    return reply.code(200).send({
      accounting: buildAccounting(calcRows, currency),
      lockedCalculations: calcRows.length,
      note: "Derived from locked payroll; the double-entry identity holds by construction. Nothing filed or paid (gated)."
    });
  });

  app.post("/platform/payroll/periods", async (request, reply) => {
    const actor = await requirePayrollAuthority(request, reply);
    if (!actor) return;
    const body = asRecord(request.body);
    const organizationId = readOptionalString(body, "organizationId");
    const country = readOptionalString(body, "jurisdictionCountry");
    const region = readOptionalString(body, "jurisdictionRegion");
    const periodStart = readOptionalString(body, "periodStart");
    const periodEnd = readOptionalString(body, "periodEnd");
    const timezone = resolvePayrollPeriodTimezone(readOptionalString(body, "timezone"), options.countryTimezone);
    // Stage 2b.3b-3: single active currency per country. Omitted → active countryCurrency; an explicit
    // currency must equal it, else reject BEFORE persistence (zero writes). Absent country currency →
    // fail closed. Never silently substitute CAD; never allow USD merely because the Money Engine
    // technically supports it.
    const requestedCurrency = readOptionalString(body, "currency");
    const countryCurrency = options.countryCurrency;
    if (!countryCurrency) {
      return reply.code(400).send({ error: "RWOS_COUNTRY_CURRENCY_UNAVAILABLE", message: "Currency is not configured for the selected country." });
    }
    if (requestedCurrency !== null && requestedCurrency !== countryCurrency) {
      return reply.code(400).send({ error: "RWOS_PAYROLL_CURRENCY_MISMATCH", message: `Payroll currency must match the active country currency (${countryCurrency}).` });
    }
    const currency = countryCurrency;
    if (!organizationId || !isCanonicalUuid(organizationId) || !country || !region || !periodStart || !periodEnd || !timezone) {
      return reply.code(400).send({ error: "RWOS_PAYROLL_INVALID_INPUT", message: "organizationId, jurisdiction, period window, and timezone are required." });
    }
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return reply.code(400).send({ error: "RWOS_PAYROLL_INVALID_INPUT", message: "period_end must be after period_start." });
    }
    let provider;
    try {
      provider = payrollService.resolveProvider({ country, region });
    } catch (error) {
      return sendPayrollFailure(reply, error);
    }
    try {
      const created = await prisma!.payrollPeriod.create({
        data: {
          organizationId, jurisdictionCountry: country, jurisdictionRegion: region,
          periodStart: start, periodEnd: end, timezone, currency,
          ruleProviderKey: provider.key, ruleProviderVersion: provider.version, createdByUserId: actor
        }
      });
      return reply.code(201).send({ period: serializePayrollPeriod(created), synthetic: true, notice: PAYROLL_SYNTHETIC_NOTICE });
    } catch {
      return reply.code(409).send({ error: "RWOS_PAYROLL_PERIOD_CONFLICT", message: "A pay period for this org, jurisdiction, and window already exists." });
    }
  });

  // Bounded list of governed pay periods for the admin console (payroll authority).
  app.get("/platform/payroll/periods", async (request, reply) => {
    const actor = await requirePayrollAuthority(request, reply);
    if (!actor) return;
    const query = asRecord(request.query);
    const organizationId = readOptionalString(query, "organizationId");
    const limit = Math.min(Math.max(parseQueryInt(readOptionalString(query, "limit")) ?? 25, 1), 100);
    const cursor = readOptionalString(query, "cursor");
    const rows = await prisma!.payrollPeriod.findMany({
      where: { ...(organizationId && isCanonicalUuid(organizationId) ? { organizationId } : {}) },
      orderBy: [{ periodStart: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor && isCanonicalUuid(cursor) ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { _count: { select: { calculations: true } } }
    });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((p) => ({ ...serializePayrollPeriod(p), calculationCount: p._count.calculations }));
    return reply.code(200).send({ items, nextCursor: hasMore ? (rows[limit - 1]?.id ?? null) : null, synthetic: true });
  });

  app.post("/platform/payroll/periods/:periodId/transition", async (request, reply) => {
    const actor = await requirePayrollAuthority(request, reply);
    if (!actor) return;
    const body = asRecord(request.body);
    const nextStatus = readOptionalString(body, "nextStatus");
    const allowed = ["open", "calculating", "review", "approved", "locked"];
    if (!nextStatus || !allowed.includes(nextStatus)) {
      return reply.code(400).send({ error: "RWOS_PAYROLL_INVALID_INPUT", message: "A valid nextStatus is required." });
    }
    try {
      const period = await payrollService.transitionPeriod({
        actorUserId: actor, payrollPeriodId: readRouteParam(request.params, "periodId"),
        expectedVersion: readOptionalNumber(body, "expectedVersion") ?? -1,
        nextStatus: nextStatus as "open" | "calculating" | "review" | "approved" | "locked",
        correlationId: request.id
      });
      return reply.code(200).send({ period: serializePayrollPeriod(period), synthetic: true });
    } catch (error) {
      return sendPayrollFailure(reply, error);
    }
  });

  // Calculate (or recalculate) a worker's payroll for a period — creates a NEW governed revision.
  app.post("/platform/payroll/calculations", async (request, reply) => {
    const actor = await requirePayrollAuthority(request, reply);
    if (!actor) return;
    const body = asRecord(request.body);
    const payrollPeriodId = readOptionalString(body, "payrollPeriodId");
    const workerIdentityId = readOptionalString(body, "workerIdentityId");
    if (!payrollPeriodId || !isCanonicalUuid(payrollPeriodId) || !workerIdentityId || !isCanonicalUuid(workerIdentityId)) {
      return reply.code(400).send({ error: "RWOS_PAYROLL_INVALID_INPUT", message: "payrollPeriodId and workerIdentityId are required." });
    }
    // Gap C guard: if this worker's payroll for the period is already LOCKED, a recalculation would
    // silently miss any newer timesheets. Refuse clearly — those timesheets belong to a supplementary
    // run or the next period, not a stale/empty recompute.
    const lockedCalc = await prisma!.payrollCalculation.findFirst({
      where: { payrollPeriodId, workerIdentityId, status: "locked" },
      select: { id: true }
    });
    if (lockedCalc) {
      return reply.code(409).send({
        error: "RWOS_PAYROLL_PERIOD_LOCKED",
        message: "This worker's payroll for the period is already locked. Newer timesheets must go to a supplementary run or the next period — they are not added to a locked run.",
        lockedCalculationId: lockedCalc.id
      });
    }
    try {
      const calc = await payrollService.calculate({ actorUserId: actor, payrollPeriodId, workerIdentityId, correlationId: request.id });
      return reply.code(201).send({ calculation: serializePayrollCalculation(calc), synthetic: true, notice: PAYROLL_SYNTHETIC_NOTICE });
    } catch (error) {
      return sendPayrollFailure(reply, error);
    }
  });

  // Bounded BULK calculation for a period (payroll authority). Calculation-only — no approve/lock/
  // pay. Returns a bounded per-worker summary + a keyset cursor for the next page.
  app.post("/platform/payroll/periods/:periodId/bulk-calculate", async (request, reply) => {
    const actor = await requirePayrollAuthority(request, reply);
    if (!actor) return;
    const body = asRecord(request.body);
    try {
      const result = await payrollService.calculatePeriodBulk({
        actorUserId: actor, payrollPeriodId: readRouteParam(request.params, "periodId"),
        limit: readOptionalNumber(body, "limit") ?? 100, cursor: readOptionalString(body, "cursor") ?? null, correlationId: request.id
      });
      return reply.code(200).send({ ...result, synthetic: true, notice: PAYROLL_SYNTHETIC_NOTICE });
    } catch (error) {
      return sendPayrollFailure(reply, error);
    }
  });

  app.post("/platform/payroll/calculations/:calculationId/transition", async (request, reply) => {
    const actor = await requirePayrollAuthority(request, reply);
    if (!actor) return;
    const body = asRecord(request.body);
    const action = readOptionalString(body, "action");
    if (!action || !["review", "approve", "reject", "lock"].includes(action)) {
      return reply.code(400).send({ error: "RWOS_PAYROLL_INVALID_INPUT", message: "action must be review|approve|reject|lock." });
    }
    try {
      const calc = await payrollService.transitionCalculation({
        actorUserId: actor, calculationId: readRouteParam(request.params, "calculationId"),
        expectedVersion: readOptionalNumber(body, "expectedVersion") ?? -1,
        action: action as "review" | "approve" | "reject" | "lock",
        note: readOptionalString(body, "note"), correlationId: request.id
      });
      return reply.code(200).send({ calculation: serializePayrollCalculation(calc), synthetic: true });
    } catch (error) {
      return sendPayrollFailure(reply, error);
    }
  });

  app.get("/platform/payroll/periods/:periodId/calculations", async (request, reply) => {
    const actor = await requirePayrollAuthority(request, reply);
    if (!actor) return;
    const query = asRecord(request.query);
    const limit = Math.min(Math.max(parseQueryInt(readOptionalString(query, "limit")) ?? 25, 1), 100);
    const cursor = readOptionalString(query, "cursor");
    const rows = await prisma!.payrollCalculation.findMany({
      where: { payrollPeriodId: readRouteParam(request.params, "periodId") },
      orderBy: [{ workerIdentityId: "asc" }, { revision: "desc" }, { id: "asc" }],
      take: limit + 1,
      ...(cursor && isCanonicalUuid(cursor) ? { cursor: { id: cursor }, skip: 1 } : {})
    });
    const hasMore = rows.length > limit;
    return reply.code(200).send({ items: rows.slice(0, limit).map((c) => serializePayrollCalculation(c)), nextCursor: hasMore ? (rows[limit - 1]?.id ?? null) : null, synthetic: true });
  });

  app.get("/platform/payroll/calculations/:calculationId", async (request, reply) => {
    const actor = await requirePayrollAuthority(request, reply);
    if (!actor) return;
    const detail = await loadPayrollCalculationDetail(readRouteParam(request.params, "calculationId"));
    if (!detail) return reply.code(404).send({ error: "RWOS_PAYROLL_DENIED", message: "Payroll calculation unavailable." });
    return reply.code(200).send({ calculation: detail, synthetic: true, notice: PAYROLL_SYNTHETIC_NOTICE });
  });

  // Deterministic replay/verify: recompute from the stored immutable snapshot + exact historical
  // provider version and confirm it reproduces byte-for-byte. Creates NO revision.
  app.post("/platform/payroll/calculations/:calculationId/verify", async (request, reply) => {
    const actor = await requirePayrollAuthority(request, reply);
    if (!actor) return;
    try {
      const result = await payrollService.verifyCalculation({ calculationId: readRouteParam(request.params, "calculationId") });
      return reply.code(200).send({ ...result, synthetic: true });
    } catch (error) {
      return sendPayrollFailure(reply, error);
    }
  });

  // Governed correction against an EXACT calculation revision. Never accepts financial amounts — it
  // recomputes from authoritative inputs. Pre-lock => new revision; post-lock => linked adjustment.
  app.post("/platform/payroll/calculations/:calculationId/correct", async (request, reply) => {
    const actor = await requirePayrollAuthority(request, reply);
    if (!actor) return;
    const body = asRecord(request.body);
    const reason = readOptionalString(body, "reason");
    if (!reason) return reply.code(400).send({ error: "RWOS_PAYROLL_INVALID_INPUT", message: "A correction reason is required." });
    try {
      const result = await payrollService.requestCorrection({
        actorUserId: actor, calculationId: readRouteParam(request.params, "calculationId"),
        expectedVersion: readOptionalNumber(body, "expectedVersion") ?? -1,
        reason, correlationKey: readOptionalString(body, "correlationKey"), correlationId: request.id
      });
      return reply.code(result.outcome === "created" ? 201 : 200).send({ outcome: result.outcome, calculation: serializePayrollCalculation(result.calculation), synthetic: true, notice: PAYROLL_SYNTHETIC_NOTICE });
    } catch (error) {
      return sendPayrollFailure(reply, error);
    }
  });

  // Revision + correction history for a calculation's family (bounded).
  app.get("/platform/payroll/calculations/:calculationId/family", async (request, reply) => {
    const actor = await requirePayrollAuthority(request, reply);
    if (!actor) return;
    const target = await prisma!.payrollCalculation.findUnique({ where: { id: readRouteParam(request.params, "calculationId") }, select: { familyRootId: true } });
    if (!target) return reply.code(404).send({ error: "RWOS_PAYROLL_DENIED", message: "Payroll calculation unavailable." });
    const rows = await prisma!.payrollCalculation.findMany({ where: { familyRootId: target.familyRootId }, orderBy: [{ revision: "asc" }], take: 200 });
    return reply.code(200).send({ familyRootId: target.familyRootId, items: rows.map((c) => serializePayrollCalculation(c)), synthetic: true });
  });

  // HR-6 Chunk 1 — deterministic, READ-ONLY AI review context. Builds a sanitized, minimized,
  // bounded context + deterministic review flags for a governed calculation. NO model call, NO
  // write, NO persistence. This is the trust-model input a FUTURE advisory provider will explain.
  app.get("/platform/payroll/calculations/:calculationId/review-context", async (request, reply) => {
    const startedAt = Date.now();
    const actor = await requirePayrollAuthority(request, reply);
    if (!actor) return;
    const calculationId = readRouteParam(request.params, "calculationId");
    const detail = await loadPayrollCalculationDetail(calculationId);
    if (!detail) return reply.code(404).send({ error: "RWOS_PAYROLL_DENIED", message: "Payroll calculation unavailable." });
    // Read-only supporting facts (all within the calculation's own family/period — no cross-tenant fetch).
    const period = await prisma!.payrollPeriod.findUnique({ where: { id: detail.payrollPeriodId }, select: { periodStart: true, periodEnd: true, timezone: true } });
    if (!period) return reply.code(404).send({ error: "RWOS_PAYROLL_DENIED", message: "Payroll period unavailable." });
    const familyRows = await prisma!.payrollCalculation.findMany({ where: { familyRootId: detail.familyRootId }, orderBy: [{ revision: "asc" }], take: 200, select: { id: true, revision: true, grossPayMinor: true, netPayMinor: true, status: true } });
    // Deterministic replay verification (creates no revision).
    let verification: { ok: boolean; totalsMatch: boolean };
    try { const v = await payrollService.verifyCalculation({ calculationId }); verification = { ok: v.ok, totalsMatch: v.totalsMatch }; } catch { verification = { ok: false, totalsMatch: false }; }

    const context = assemblePayrollReviewContext({
      calculation: {
        id: detail.id, organizationId: detail.organizationId, workerIdentityId: detail.workerIdentityId, revision: detail.revision, status: detail.status,
        jurisdiction: detail.jurisdiction, currency: detail.currency,
        grossPayMinor: detail.grossPayMinor, totalDeductionsMinor: detail.totalDeductionsMinor, netPayMinor: detail.netPayMinor, totalEmployerCostMinor: detail.totalEmployerCostMinor,
        ruleProvider: detail.ruleProvider, calculationFingerprint: detail.calculationFingerprint,
        previousCalculationId: detail.previousCalculationId, correctionType: detail.correctionType, correctionReason: detail.correctionReason,
        adjustsCalculationId: detail.adjustsCalculationId, adjustment: detail.adjustment,
        earningLines: detail.earningLines.map((e) => ({ classification: e.classification, amountMinor: e.amountMinor, contractVersion: null })),
        deductionLines: detail.deductionLines.map((d) => ({ category: d.category, code: d.code, amountMinor: d.amountMinor })),
        workedTimeRefs: detail.workedTimeRefs.map((w) => ({ timesheetId: w.timesheetId, payableMinutes: w.payableMinutes, contractVersion: w.contractVersion, appliedHourlyRateMinor: w.appliedHourlyRateMinor, scheduledStartAt: w.scheduledStartAt }))
      },
      period: { periodStart: period.periodStart.toISOString(), periodEnd: period.periodEnd.toISOString(), timezone: period.timezone },
      family: familyRows.map((f) => ({ id: f.id, revision: f.revision, grossPayMinor: f.grossPayMinor, netPayMinor: f.netPayMinor, status: f.status })),
      verification
    });
    emitPayrollReviewTelemetry(payrollTelemetrySink, { operation: "payroll_review_context", status: "success", flagCount: context.flags.length, evidenceCount: Object.keys(context.evidence).length, truncated: context.bounds.workedTimeTruncated, durationMs: Date.now() - startedAt, correlationId: request.id });
    return reply.code(200).send({ context, synthetic: true, advisory: true, notice: "Deterministic review context + flags. No AI model was called; no payroll data was modified." });
  });

  // HR-6: ADVISORY AI review. Builds the same sanitized, read-only context (after authz + exact
  // lookup) and runs the injected review provider (synthetic by default). The provider output is
  // validated, evidence-bound, containment-checked and fails closed to `review_unavailable`. This
  // endpoint performs NO write and records NO audit row — it returns advisory assistance only and
  // can never approve/lock/correct/pay or alter any payroll state.
  app.get("/platform/payroll/calculations/:calculationId/ai-review", async (request, reply) => {
    const startedAt = Date.now();
    const actor = await requirePayrollAuthority(request, reply);
    if (!actor) return;
    const calculationId = readRouteParam(request.params, "calculationId");
    const detail = await loadPayrollCalculationDetail(calculationId);
    if (!detail) return reply.code(404).send({ error: "RWOS_PAYROLL_DENIED", message: "Payroll calculation unavailable." });
    const period = await prisma!.payrollPeriod.findUnique({ where: { id: detail.payrollPeriodId }, select: { periodStart: true, periodEnd: true, timezone: true } });
    if (!period) return reply.code(404).send({ error: "RWOS_PAYROLL_DENIED", message: "Payroll period unavailable." });
    const familyRows = await prisma!.payrollCalculation.findMany({ where: { familyRootId: detail.familyRootId }, orderBy: [{ revision: "asc" }], take: 200, select: { id: true, revision: true, grossPayMinor: true, netPayMinor: true, status: true } });
    let verification: { ok: boolean; totalsMatch: boolean };
    try { const v = await payrollService.verifyCalculation({ calculationId }); verification = { ok: v.ok, totalsMatch: v.totalsMatch }; } catch { verification = { ok: false, totalsMatch: false }; }

    const context = assemblePayrollReviewContext({
      calculation: {
        id: detail.id, organizationId: detail.organizationId, workerIdentityId: detail.workerIdentityId, revision: detail.revision, status: detail.status,
        jurisdiction: detail.jurisdiction, currency: detail.currency,
        grossPayMinor: detail.grossPayMinor, totalDeductionsMinor: detail.totalDeductionsMinor, netPayMinor: detail.netPayMinor, totalEmployerCostMinor: detail.totalEmployerCostMinor,
        ruleProvider: detail.ruleProvider, calculationFingerprint: detail.calculationFingerprint,
        previousCalculationId: detail.previousCalculationId, correctionType: detail.correctionType, correctionReason: detail.correctionReason,
        adjustsCalculationId: detail.adjustsCalculationId, adjustment: detail.adjustment,
        earningLines: detail.earningLines.map((e) => ({ classification: e.classification, amountMinor: e.amountMinor, contractVersion: null })),
        deductionLines: detail.deductionLines.map((d) => ({ category: d.category, code: d.code, amountMinor: d.amountMinor })),
        workedTimeRefs: detail.workedTimeRefs.map((w) => ({ timesheetId: w.timesheetId, payableMinutes: w.payableMinutes, contractVersion: w.contractVersion, appliedHourlyRateMinor: w.appliedHourlyRateMinor, scheduledStartAt: w.scheduledStartAt }))
      },
      period: { periodStart: period.periodStart.toISOString(), periodEnd: period.periodEnd.toISOString(), timezone: period.timezone },
      family: familyRows.map((f) => ({ id: f.id, revision: f.revision, grossPayMinor: f.grossPayMinor, netPayMinor: f.netPayMinor, status: f.status })),
      verification
    });
    const review = await runPayrollReview({ context, provider: payrollReviewProvider });
    emitPayrollReviewTelemetry(payrollTelemetrySink, {
      operation: "payroll_ai_review",
      status: review.status === "ready" ? "success" : "review_unavailable",
      providerMode: payrollReviewEgressMode === "external" ? "external" : "synthetic",
      providerKey: review.versioning.providerKey, providerVersion: review.versioning.providerVersion, promptVersion: review.versioning.promptVersion,
      flagCount: review.deterministicFlags.length,
      timeout: review.unavailableReason === "payroll_review_timeout",
      failureReason: mapTelemetryFailureReason(review.unavailableReason),
      durationMs: Date.now() - startedAt, correlationId: request.id
    });
    return reply.code(200).send({ review, advisory: true, notice: "Advisory AI review assistance only. AI cannot approve, lock, correct, or pay. No payroll data was modified." });
  });

  // HR-6.1 Chunk 2: PROVENANCE / EXPLAINABILITY (READ-ONLY, DESCRIPTIVE). Explains WHY an existing
  // governed calculation is what it is, using only its immutable stored evidence. It recomputes
  // nothing, invents no value, calls no model, and performs no write. Descriptive only — never
  // authoritative.
  app.get("/platform/payroll/calculations/:calculationId/provenance", async (request, reply) => {
    const startedAt = Date.now();
    const actor = await requirePayrollAuthority(request, reply);
    if (!actor) return;
    const calculationId = readRouteParam(request.params, "calculationId");
    const detail = await loadPayrollCalculationDetail(calculationId);
    if (!detail) return reply.code(404).send({ error: "RWOS_PAYROLL_DENIED", message: "Payroll calculation unavailable." });
    const period = await prisma!.payrollPeriod.findUnique({ where: { id: detail.payrollPeriodId }, select: { periodStart: true, periodEnd: true, timezone: true } });
    if (!period) return reply.code(404).send({ error: "RWOS_PAYROLL_DENIED", message: "Payroll period unavailable." });
    const familyRows = await prisma!.payrollCalculation.findMany({ where: { familyRootId: detail.familyRootId }, orderBy: [{ revision: "asc" }], take: 200, select: { id: true, revision: true, grossPayMinor: true, netPayMinor: true, status: true } });
    let verification: { ok: boolean; totalsMatch: boolean } | null;
    try { const v = await payrollService.verifyCalculation({ calculationId }); verification = { ok: v.ok, totalsMatch: v.totalsMatch }; } catch { verification = null; }

    // Deterministic advisory flags relevant to the explanation (same engine as review-context).
    const priorRows = familyRows.filter((f) => f.revision < detail.revision).sort((a, b) => b.revision - a.revision);
    const priorRevision = priorRows[0] ? { revision: priorRows[0].revision, gross: priorRows[0].grossPayMinor, net: priorRows[0].netPayMinor } : null;
    const flags = computePayrollReviewFlags({
      workedTime: detail.workedTimeRefs.map((w) => ({ ref: `ts-${w.timesheetId.slice(0, 8)}`, payableMinutes: w.payableMinutes, contractVersion: w.contractVersion, appliedHourlyRateMinor: w.appliedHourlyRateMinor, scheduledStartAt: w.scheduledStartAt })),
      netPayMinor: detail.netPayMinor,
      correctionType: detail.correctionType,
      verification: verification ?? { ok: false, totalsMatch: false },
      priorRevision,
      thresholds: DEFAULT_PAYROLL_REVIEW_THRESHOLDS
    });

    const provenance = assemblePayrollProvenance({
      calculation: {
        id: detail.id, organizationId: detail.organizationId, workerIdentityId: detail.workerIdentityId, revision: detail.revision, status: detail.status,
        jurisdiction: detail.jurisdiction, currency: detail.currency, calculationFingerprint: detail.calculationFingerprint,
        ruleProvider: detail.ruleProvider, previousCalculationId: detail.previousCalculationId, correctionType: detail.correctionType, correctionReason: detail.correctionReason,
        adjustsCalculationId: detail.adjustsCalculationId,
        workedTimeRefs: detail.workedTimeRefs.map((w) => ({ timesheetId: w.timesheetId, payableMinutes: w.payableMinutes, contractId: w.contractId, contractVersion: w.contractVersion, contractEffectiveFrom: w.contractEffectiveFrom, appliedHourlyRateMinor: w.appliedHourlyRateMinor, scheduledStartAt: w.scheduledStartAt })),
        earningLines: detail.earningLines.map((e) => ({ classification: e.classification, amountMinor: e.amountMinor }))
      },
      period: { periodStart: period.periodStart.toISOString(), periodEnd: period.periodEnd.toISOString(), timezone: period.timezone },
      revisions: familyRows.map((f) => ({ id: f.id, revision: f.revision, status: f.status })),
      verification,
      flags
    });
    emitPayrollReviewTelemetry(payrollTelemetrySink, {
      operation: "payroll_provenance",
      status: provenance.status === "ready" ? "success" : "review_unavailable",
      provenanceFactCount: provenance.rateSegments.length, evidenceCount: Object.keys(provenance.evidence).length,
      truncated: provenance.bounds.workedTimeTruncated || provenance.bounds.earningLinesTruncated,
      failureReason: provenance.status === "ready" ? undefined : "explanation_unavailable",
      durationMs: Date.now() - startedAt, correlationId: request.id
    });
    return reply.code(200).send({ provenance, descriptive: true, advisory: true, notice: "Deterministic provenance from immutable stored evidence. Descriptive only, never authoritative. No AI model was called; no payroll data was modified." });
  });

  // HR-6.1: PERIOD-LEVEL review (READ-ONLY, ADVISORY). Explains why a governed PayrollCalculation
  // does NOT yet exist for eligible workers — missing worked time / rate, ambiguous or unsupported
  // jurisdiction, unsupported provider, intra-shift rate boundary. It calls only the SAME read-only
  // resolvers the calculation engine consults (never the write path), invents no financial value,
  // and performs no write.
  app.get("/platform/payroll/periods/:periodId/review-context", async (request, reply) => {
    const startedAt = Date.now();
    const actor = await requirePayrollAuthority(request, reply);
    if (!actor) return;
    const periodId = readRouteParam(request.params, "periodId");
    const period = await payrollRepositoryRead.findPeriodById(periodId);
    if (!period) return reply.code(404).send({ error: "RWOS_PAYROLL_DENIED", message: "Payroll period unavailable." });

    // Provider / jurisdiction support — resolveProvider throws when the jurisdiction is unsupported.
    let providerSupported = false;
    let jurisdictionSupportedByProvider = false;
    try {
      const prov = payrollService.resolveProvider({ country: period.jurisdictionCountry, region: period.jurisdictionRegion });
      jurisdictionSupportedByProvider = true;
      providerSupported = prov.key === period.ruleProviderKey && prov.version === period.ruleProviderVersion;
    } catch { /* unsupported jurisdiction → both remain false */ }

    const ids = await payrollRepositoryRead.listEligibleWorkerIds({ organizationId: period.organizationId, from: period.periodStart, to: period.periodEnd, limit: PAYROLL_PERIOD_REVIEW_MAX_WORKERS + 1, cursor: null });
    const workers: RawPeriodReviewWorker[] = [];
    for (const workerIdentityId of ids.slice(0, PAYROLL_PERIOD_REVIEW_MAX_WORKERS)) {
      const [existing, workedTime] = await Promise.all([
        payrollRepositoryRead.findActiveCalculation(period.id, workerIdentityId),
        payrollRepositoryRead.listApprovedWorkedTime({ organizationId: period.organizationId, workerIdentityId, from: period.periodStart, to: period.periodEnd })
      ]);
      const approvedWorkedMinutes = workedTime.reduce((sum, w) => sum + w.payableMinutes, 0);
      // Jurisdiction candidates from the distinct worksites (Residences) — same authority the engine uses.
      const residenceIds = [...new Set(workedTime.map((w) => w.residenceId))];
      const provinces = new Set<string>();
      let residenceProvinceResolved = residenceIds.length > 0;
      for (const residenceId of residenceIds) {
        const j = await payrollJurisdictionResolver.resolve({ residenceId });
        if (!j) { residenceProvinceResolved = false; continue; }
        provinces.add(j.region);
      }
      let workerJurisdictionSupported = false;
      if (residenceProvinceResolved && provinces.size === 1) {
        try { payrollService.resolveProvider({ country: period.jurisdictionCountry, region: [...provinces][0]! }); workerJurisdictionSupported = true; } catch { workerJurisdictionSupported = false; }
      }
      // Rate effectivity + intra-shift boundary — the EXACT resolver calls calculate() makes.
      let hasEffectiveContractRate = workedTime.length > 0;
      let intraShiftRateBoundary = false;
      for (const w of workedTime) {
        const scope = { organizationId: period.organizationId, workGroupId: w.workGroupId, roleDefinitionId: w.roleDefinitionId, assignmentId: w.assignmentId };
        const startRate = await payrollRateResolver.resolveAt({ ...scope, instant: w.scheduledStartAt });
        if (!startRate) { hasEffectiveContractRate = false; continue; }
        const endRate = await payrollRateResolver.resolveAt({ ...scope, instant: w.scheduledEndAt });
        if (endRate && endRate.contractId !== startRate.contractId) intraShiftRateBoundary = true;
      }
      workers.push({ workerIdentityId, existingCalculationId: existing?.id ?? null, hasApprovedWorkedTime: workedTime.length > 0, approvedWorkedMinutes, residenceProvinceResolved, residenceProvinceCandidates: [...provinces], workerJurisdictionSupported, hasEffectiveContractRate, intraShiftRateBoundary });
    }

    const context = assemblePayrollPeriodReviewContext({
      period: { id: period.id, organizationId: period.organizationId, jurisdiction: { country: period.jurisdictionCountry, region: period.jurisdictionRegion }, provider: { key: period.ruleProviderKey, version: period.ruleProviderVersion }, status: period.status },
      providerSupported, jurisdictionSupportedByProvider, workers
    });
    emitPayrollReviewTelemetry(payrollTelemetrySink, {
      operation: "payroll_period_review", status: "success",
      flagCount: context.periodFlags.length, evidenceCount: context.workers.length,
      truncated: context.bounds.workersTruncated, durationMs: Date.now() - startedAt, correlationId: request.id
    });
    return reply.code(200).send({ context, synthetic: true, advisory: true, notice: "Deterministic period review — explains why a governed calculation does not yet exist. No AI model was called; no payroll data was modified." });
  });

  // Employer review: an employer sees payroll for THEIR org only, and may FLAG a discrepancy.
  // Employers can never rewrite financial lines or approve/reject here.
  app.get("/organizations/:organizationId/payroll/calculations", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) return reply.code(401).send({ error: "RWOS_PAYROLL_DENIED", message: "Authentication is required." });
    const organizationId = readRouteParam(request.params, "organizationId");
    if (!(await userHasOrganizationAccess(session.user.id, organizationId))) {
      return reply.code(403).send({ error: "RWOS_PAYROLL_DENIED", message: "Payroll access for this organization is denied." });
    }
    const query = asRecord(request.query);
    const limit = Math.min(Math.max(parseQueryInt(readOptionalString(query, "limit")) ?? 25, 1), 100);
    const cursor = readOptionalString(query, "cursor");
    const rows = await prisma!.payrollCalculation.findMany({
      where: { organizationId },
      orderBy: [{ calculatedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor && isCanonicalUuid(cursor) ? { cursor: { id: cursor }, skip: 1 } : {})
    });
    const hasMore = rows.length > limit;
    return reply.code(200).send({ items: rows.slice(0, limit).map((c) => serializePayrollCalculation(c)), nextCursor: hasMore ? (rows[limit - 1]?.id ?? null) : null, synthetic: true });
  });

  app.post("/organizations/:organizationId/payroll/calculations/:calculationId/flag", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) return reply.code(401).send({ error: "RWOS_PAYROLL_DENIED", message: "Authentication is required." });
    const organizationId = readRouteParam(request.params, "organizationId");
    const calculationId = readRouteParam(request.params, "calculationId");
    if (!(await userHasOrganizationAccess(session.user.id, organizationId))) {
      return reply.code(403).send({ error: "RWOS_PAYROLL_DENIED", message: "Payroll access for this organization is denied." });
    }
    const calc = await prisma!.payrollCalculation.findUnique({ where: { id: calculationId } });
    if (!calc || calc.organizationId !== organizationId) {
      return reply.code(404).send({ error: "RWOS_PAYROLL_DENIED", message: "Payroll calculation unavailable." });
    }
    const note = readOptionalString(asRecord(request.body), "note") ?? "discrepancy_flagged";
    // A flag is an append-only audit signal only — it does NOT mutate any financial line.
    const audit = createPrismaPayrollRepository(prisma!);
    await audit.recordAudit({ entityType: "payroll_calculation", entityId: calc.id, entityPublicReference: calc.payrollPeriodId, organizationId, action: "payroll.employer_flagged", priorState: null, newState: "flagged", reason: note.slice(0, 240), actorUserId: session.user.id, correlationId: request.id, now: new Date() });
    return reply.code(202).send({ status: "flagged", synthetic: true });
  });

  // Worker: my own synthetic pay statement (safe fields only — no employer-cost internals).
  app.get("/worker/payroll/statement", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) return reply.code(401).send({ error: "RWOS_PAYROLL_DENIED", message: "Authentication is required." });
    const identity = await prisma!.workerIdentity.findFirst({ where: { userId: session.user.id }, select: { id: true, classification: true } });
    if (!identity) return reply.code(200).send({ items: [], summary: null, workerClassification: "employee", synthetic: true, notice: PAYROLL_SYNTHETIC_NOTICE });
    const query = asRecord(request.query);
    const limit = Math.min(Math.max(parseQueryInt(readOptionalString(query, "limit")) ?? 25, 1), 100);
    const cursor = readOptionalString(query, "cursor");
    const rows = await prisma!.payrollCalculation.findMany({
      where: { workerIdentityId: identity.id, status: { in: ["approved", "locked"] } },
      include: { deductionLines: true, earningLines: true, payrollPeriod: { select: { periodStart: true, periodEnd: true, timezone: true } } },
      orderBy: [{ calculatedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor && isCanonicalUuid(cursor) ? { cursor: { id: cursor }, skip: 1 } : {})
    });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((c) => ({
      calculationId: c.id, revision: c.revision, status: c.status,
      periodStart: c.payrollPeriod.periodStart.toISOString(), periodEnd: c.payrollPeriod.periodEnd.toISOString(), timezone: c.payrollPeriod.timezone,
      jurisdiction: { country: c.jurisdictionCountry, region: c.jurisdictionRegion },
      currency: c.currency, grossPayMinor: c.grossPayMinor, totalDeductionsMinor: c.totalDeductionsMinor, netPayMinor: c.netPayMinor,
      // Earning lines are the worker's own W-based breakdown (rate × minutes). rateMinor is the WORKER
      // rate paid for this work; no employer rate is ever exposed to the worker.
      earningLines: c.earningLines.map((e) => ({ classification: e.classification, description: e.description, quantityMinutes: e.quantityMinutes, rateMinor: e.rateMinor, amountMinor: e.amountMinor, currency: e.currency })),
      deductions: c.deductionLines.map((d) => ({ category: d.category, code: d.code, description: d.description, amountMinor: d.amountMinor, currency: d.currency }))
    }));
    // Accurate to-date totals across ALL the worker's approved/locked statements (not just this page).
    const totals = await prisma!.payrollCalculation.aggregate({
      where: { workerIdentityId: identity.id, status: { in: ["approved", "locked"] } },
      _sum: { grossPayMinor: true, totalDeductionsMinor: true, netPayMinor: true },
      _count: true
    });
    const summary = {
      statementCount: totals._count,
      totalGrossMinor: totals._sum.grossPayMinor ?? 0,
      totalDeductionsMinor: totals._sum.totalDeductionsMinor ?? 0,
      totalNetMinor: totals._sum.netPayMinor ?? 0,
      currency: items[0]?.currency ?? "CAD"
    };
    return reply.code(200).send({ items, summary, workerClassification: identity.classification, nextCursor: hasMore ? (rows[limit - 1]?.id ?? null) : null, synthetic: true, notice: PAYROLL_SYNTHETIC_NOTICE });
  });

  // The worker declares their tax type (employee or travailleur autonome = contractor). This drives
  // payroll: employee -> source deductions + T4; contractor -> paid gross, no deductions, T4A.
  // Read the worker's current signed classification election plus the agreement versions in force.
  app.get("/worker/profile/classification", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_WORKER_DENIED", message: "Authentication is required." });
    }
    const identity = await prisma!.workerIdentity.findFirst({ where: { userId: session.user.id }, select: { id: true } });
    const election = identity ? await getActiveElection(prisma!, identity.id) : null;
    return reply.code(200).send({ election, agreementVersions: WORKER_AGREEMENT_VERSIONS });
  });

  // Worker elects a pay channel at onboarding and SIGNS the matching agreement. Employee -> payroll
  // (T4, source deductions); contractor -> independent (T4A, paid gross). Recorded as a signed,
  // append-only election; this is the source of truth payroll reads. See
  // docs/finance/TWO_CHANNEL_PAYROLL_DESIGN.md.
  app.post("/worker/profile/classification-election", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_WORKER_DENIED", message: "Authentication is required." });
    }
    const body = asRecord(request.body);
    const classification = readOptionalString(body, "classification") as WorkerClassification | null;
    const agreementVersion = readOptionalString(body, "agreementVersion");
    const agreementAccepted = body.agreementAccepted === true;
    const determination = readOptionalString(body, "determinationRef");
    if (classification !== "employee" && classification !== "contractor") {
      return reply.code(400).send({ error: "RWOS_INVALID_CLASSIFICATION", message: "Classification must be employee or contractor." });
    }
    if (!agreementAccepted || !agreementVersion) {
      return reply.code(400).send({ error: "RWOS_AGREEMENT_NOT_SIGNED", message: "You must accept the agreement for the chosen channel to continue." });
    }
    // Ensure the worker identity exists, then record the signed election (worker self-signs).
    const identity = await workerOfferService.ensureWorkerIdentity({ userId: session.user.id, displayName: null, preferredLanguage: null });
    const result = await electClassification(prisma!, {
      workerIdentityId: identity.id,
      classification,
      electedByUserId: session.user.id,
      approvedByUserId: null,
      agreementVersion,
      determinationRef: determination ?? null,
      reason: "Worker self-election at onboarding"
    });
    if (!result.ok) {
      if (result.reason === "stale_agreement_version") {
        return reply.code(409).send({ error: "RWOS_AGREEMENT_VERSION_STALE", message: "The agreement has been updated. Reload and accept the current version.", agreementVersions: WORKER_AGREEMENT_VERSIONS });
      }
      if (result.reason === "unchanged") {
        const current = await getActiveElection(prisma!, identity.id);
        return reply.code(200).send({ election: current, unchanged: true });
      }
      return reply.code(400).send({ error: "RWOS_INVALID_CLASSIFICATION", message: "Classification must be employee or contractor." });
    }
    return reply.code(201).send({ election: result.election });
  });

  // Phase 2b: a contractor declares (or clears) their GST/QST registration. Mutable and independent
  // of the signed classification election. When registered, GST (5%) + QST (9.975%) are added to the
  // contractor's fee on their statement. See docs/finance/TWO_CHANNEL_PAYROLL_DESIGN.md.
  app.put("/worker/profile/tax-registration", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_WORKER_DENIED", message: "Authentication is required." });
    }
    const body = asRecord(request.body);
    const registered = body.gstQstRegistered === true;
    const gstNumber = readOptionalString(body, "gstNumber");
    const qstNumber = readOptionalString(body, "qstNumber");
    if (registered && (!gstNumber || !qstNumber)) {
      return reply.code(400).send({ error: "RWOS_TAX_REGISTRATION_INCOMPLETE", message: "Provide both your GST and QST numbers to register." });
    }
    const identity = await workerOfferService.ensureWorkerIdentity({ userId: session.user.id, displayName: null, preferredLanguage: null });
    const data = {
      gstQstRegistered: registered,
      gstNumber: registered ? gstNumber : null,
      qstNumber: registered ? qstNumber : null,
      updatedByUserId: session.user.id
    };
    const profile = await prisma!.workerTaxProfile.upsert({
      where: { workerIdentityId: identity.id },
      create: { workerIdentityId: identity.id, ...data },
      update: data
    });
    return reply.code(200).send({
      taxProfile: { gstQstRegistered: profile.gstQstRegistered, gstNumber: profile.gstNumber, qstNumber: profile.qstNumber }
    });
  });

  // Dynamic offer engine P2: the worker's offer preferences — what they need to accept work. Fed to
  // the acceptance model. See docs/matching/DYNAMIC_OFFER_ENGINE_DESIGN.md.
  app.get("/worker/profile/offer-preferences", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_WORKER_DENIED", message: "Authentication is required." });
    }
    const identity = await prisma!.workerIdentity.findFirst({ where: { userId: session.user.id }, select: { id: true } });
    const pref = identity ? await prisma!.workerOfferPreference.findUnique({ where: { workerIdentityId: identity.id } }) : null;
    return reply.code(200).send({
      preferences: pref
        ? { minRatePerHourMinor: pref.minRatePerHourMinor, requiresTransport: pref.requiresTransport, maxDistanceKm: pref.maxDistanceKm }
        : null
    });
  });

  app.put("/worker/profile/offer-preferences", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_WORKER_DENIED", message: "Authentication is required." });
    }
    const body = asRecord(request.body);
    const minRatePerHourMinor = readOptionalNumber(body, "minRatePerHourMinor") ?? 0;
    const requiresTransport = body.requiresTransport === true;
    const maxDistanceKm = readOptionalNumber(body, "maxDistanceKm") ?? 100;
    if (minRatePerHourMinor < 0 || maxDistanceKm < 0 || !Number.isFinite(minRatePerHourMinor) || !Number.isFinite(maxDistanceKm)) {
      return reply.code(400).send({ error: "RWOS_INVALID_PREFERENCES", message: "Invalid offer preferences." });
    }
    const identity = await workerOfferService.ensureWorkerIdentity({ userId: session.user.id, displayName: null, preferredLanguage: null });
    const data = { minRatePerHourMinor, requiresTransport, maxDistanceKm, updatedByUserId: session.user.id };
    const pref = await prisma!.workerOfferPreference.upsert({
      where: { workerIdentityId: identity.id },
      create: { workerIdentityId: identity.id, ...data },
      update: data
    });
    return reply.code(200).send({
      preferences: { minRatePerHourMinor: pref.minRatePerHourMinor, requiresTransport: pref.requiresTransport, maxDistanceKm: pref.maxDistanceKm }
    });
  });

  // ── Worker-facing JobScanner + CV builder (the funnel, where workers actually are) ──────────────
  // Read-only over the stored external leads, ranked for the signed-in worker. No live scan here
  // (that spends the platform's Adzuna budget and stays admin/scheduled). External leads only.
  app.get("/worker/jobscanner/leads", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_WORKER_DENIED", message: "Authentication is required." });
    }
    const q = asRecord((request as unknown as { query?: unknown }).query);
    const province = readOptionalString(q, "province") ?? "QC";
    const city = readOptionalString(q, "city") ?? undefined;
    const limit = readOptionalNumber(q, "limit") ?? 50;
    const stored = await queryStoredLeads(prisma!, { province, ...(city !== undefined ? { city } : {}), limit });
    const roleKeywordsRaw = readOptionalString(q, "roleKeywords");
    const roleKeywords = roleKeywordsRaw ? roleKeywordsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];
    let leads: ExternalJobLead[] = stored;
    let ranked = false;
    if (roleKeywords.length > 0) {
      const identity = await prisma!.workerIdentity.findFirst({ where: { userId: session.user.id }, select: { id: true } });
      const pref = identity ? await prisma!.workerOfferPreference.findUnique({ where: { workerIdentityId: identity.id } }) : null;
      leads = rankLeadsForWorker(stored, { roleKeywords, maxDistanceKm: pref?.maxDistanceKm ?? null });
      ranked = true;
    }
    // Worker Pro benefit: best-paying and freshest jobs surface first.
    const pro = await isPro(prisma!, session.user.id);
    if (pro) leads = prioritizeProLeads(leads);
    return reply.code(200).send({
      leadCount: stored.length,
      ranked,
      pro,
      leads,
      note: pro
        ? "Worker Pro priority: best-paying and freshest jobs first. External leads — apply on the source."
        : "External leads — apply on the source. Upgrade to Worker Pro to see the best jobs first."
    });
  });

  // Generate the signed-in worker's own CV + cover letter (synthetic now, Claude when keyed). Advisory.
  app.post("/worker/cv", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_WORKER_DENIED", message: "Authentication is required." });
    }
    const body = asRecord(request.body);
    const profileRaw = asRecord(body.profile);
    if (!readOptionalString(profileRaw, "fullName")) {
      return reply.code(400).send({ error: "RWOS_CV_INVALID", message: "profile.fullName is required." });
    }
    const profile = buildCvProfile(profileRaw);
    let job: TargetJob | null = null;
    const leadId = readOptionalString(body, "leadId");
    if (leadId && isCanonicalUuid(leadId)) {
      const lead = await prisma!.externalJobLead.findUnique({ where: { id: leadId } });
      if (lead) job = { title: lead.title, employer: lead.employer, description: lead.description, city: lead.city };
    } else if (body.job) {
      const j = asRecord(body.job);
      const title = readOptionalString(j, "title");
      if (title) job = { title, employer: readOptionalString(j, "employer"), description: readOptionalString(j, "description"), city: readOptionalString(j, "city") };
    }
    // Worker Pro gating: Pro workers get the AI-written CV (Claude when keyed); free workers get the
    // basic synthetic draft. Enforced server-side — the free path never reaches the paid provider.
    const pro = await isPro(prisma!, session.user.id);
    const provider = pro ? getCvProvider() : createSyntheticCvProvider();
    try {
      const result = await provider.generate({ profile, job });
      return reply.code(200).send({
        cv: result,
        providerKind: provider.kind,
        pro,
        upgradeAvailable: !pro,
        note: pro
          ? "Advisory draft — review and edit before applying. Nothing is sent."
          : "Free basic draft. Upgrade to Worker Pro for an AI-written CV, premium designs, and best-jobs-first."
      });
    } catch (err) {
      return reply.code(502).send({ error: "RWOS_CV_PROVIDER_ERROR", message: (err as Error).message, provider: provider.kind });
    }
  });

  // Worker Pro plan status for the signed-in worker.
  app.get("/worker/cv/plan", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_WORKER_DENIED", message: "Authentication is required." });
    }
    const entitlement = await getActiveEntitlement(prisma!, session.user.id);
    return reply.code(200).send({
      plan: entitlement?.plan ?? "free",
      pro: entitlement?.plan === PRO_PLAN,
      entitlement,
      benefits: ["AI-written CV + premium designs", "Best-paying and emergency jobs first", "Priority job access"],
      price: PRO_PRICE,
      purchaseEnabled: isPurchaseEnabled(),
      billing: isPurchaseEnabled()
        ? "You can subscribe to Worker Pro."
        : "Payments are not yet enabled — subscribing records your interest; Worker Pro is granted by the platform for now."
    });
  });

  // Worker Pro purchase (design-for-real). subscribe records a PENDING order and shows how to pay:
  //  - e_transfer: Interac e-transfer to billing@joblop.com with the order reference (worker then claims
  //    it sent; an admin confirms receipt). No card routes through the platform.
  //  - stripe: card checkout — TEST-ONLY and GATED OFF while payments are frozen.
  app.post("/worker/cv/subscribe", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_WORKER_DENIED", message: "Authentication is required." });
    }
    const body = asRecord(request.body);
    const methodRaw = readOptionalString(body, "method") ?? "e_transfer";
    const method: ProMethod = PRO_METHODS.includes(methodRaw as ProMethod) ? (methodRaw as ProMethod) : "e_transfer";
    const order = await createPendingOrder(prisma!, session.user.id, method);
    return reply.code(201).send({
      order,
      ...(method === "e_transfer" ? { eTransfer: eTransferInstructions(order) } : {}),
      stripeEnabled: method === "stripe" ? isPurchaseEnabled() : undefined,
      note:
        method === "e_transfer"
          ? "Send the Interac e-transfer to billing@joblop.com with the reference, then tap “I've sent it”. Worker Pro activates once we confirm receipt."
          : isPurchaseEnabled()
            ? "Card checkout (test mode) — complete payment to activate."
            : "Card payments are not enabled yet. Use Interac e-transfer, or we'll notify you when card checkout opens."
    });
  });

  app.get("/worker/cv/orders", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_WORKER_DENIED", message: "Authentication is required." });
    }
    return reply.code(200).send({ orders: await listOrders(prisma!, session.user.id) });
  });

  // Worker marks the e-transfer sent → payment_claimed (awaiting admin confirmation). No money verified.
  app.post("/worker/cv/orders/:id/claim-etransfer", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_WORKER_DENIED", message: "Authentication is required." });
    }
    const id = readRouteParam(request.params, "id");
    if (!id || !isCanonicalUuid(id)) return reply.code(400).send({ error: "RWOS_ORDER_INVALID", message: "A valid order id is required." });
    const result = await claimETransfer(prisma!, session.user.id, id);
    if (!result.ok) return reply.code(result.reason === "order_not_found" ? 404 : 409).send({ error: "RWOS_ORDER_" + result.reason.toUpperCase() });
    return reply.code(200).send({ order: result.order, note: "Thanks — we'll confirm your e-transfer and activate Worker Pro." });
  });

  // Self-serve card (Stripe) completion — GATED; refuses (423) while payments are frozen.
  app.post("/worker/cv/orders/:id/complete", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_WORKER_DENIED", message: "Authentication is required." });
    }
    const id = readRouteParam(request.params, "id");
    if (!id || !isCanonicalUuid(id)) return reply.code(400).send({ error: "RWOS_ORDER_INVALID", message: "A valid order id is required." });
    const result = await completeStripeOrder(prisma!, session.user.id, id);
    if (!result.ok) {
      if (result.reason === "payments_disabled") {
        return reply.code(423).send({ error: "RWOS_PAYMENTS_FROZEN", message: "Card payments are not enabled yet — use Interac e-transfer." });
      }
      return reply.code(result.reason === "order_not_found" ? 404 : 409).send({ error: "RWOS_ORDER_" + result.reason.toUpperCase() });
    }
    return reply.code(200).send({ order: result.order, note: "Worker Pro activated." });
  });

  // Admin review queue for Pro orders, and confirm/reject an e-transfer (real admin mechanism — manual
  // verification of off-platform money receipt; confirming grants the entitlement).
  app.get("/platform/cv-pro-orders", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    return reply.code(200).send({ orders: await listOrdersForReview(prisma!) });
  });

  app.post("/platform/cv-pro-orders/:id/confirm", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const id = readRouteParam(request.params, "id");
    if (!id || !isCanonicalUuid(id)) return reply.code(400).send({ error: "RWOS_ORDER_INVALID", message: "A valid order id is required." });
    const result = await adminConfirmOrder(prisma!, id, actor);
    if (!result.ok) return reply.code(result.reason === "order_not_found" ? 404 : 409).send({ error: "RWOS_ORDER_" + result.reason.toUpperCase() });
    return reply.code(200).send({ order: result.order, note: "E-transfer confirmed; Worker Pro granted." });
  });

  app.post("/platform/cv-pro-orders/:id/reject", async (request, reply) => {
    const actor = await requireHrAuthority(request, reply);
    if (!actor) return;
    const id = readRouteParam(request.params, "id");
    if (!id || !isCanonicalUuid(id)) return reply.code(400).send({ error: "RWOS_ORDER_INVALID", message: "A valid order id is required." });
    const ok = await adminRejectOrder(prisma!, id);
    if (!ok) return reply.code(404).send({ error: "RWOS_ORDER_NOT_FOUND" });
    return reply.code(200).send({ canceled: true });
  });

  // Worker's own CV attachments — workerRef is the user id from the session, never client-supplied.
  app.post("/worker/cv-assets", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_WORKER_DENIED", message: "Authentication is required." });
    }
    const body = asRecord(request.body);
    const kind = readOptionalString(body, "kind");
    const filename = readOptionalString(body, "filename");
    const declaredContentType = readOptionalString(body, "contentType");
    const dataBase64 = readOptionalString(body, "dataBase64");
    if (!kind || !filename || !declaredContentType || !dataBase64) {
      return reply.code(400).send({ error: "RWOS_CV_ASSET_INVALID", message: "kind, filename, contentType and dataBase64 are required." });
    }
    const result = await createCvAsset(prisma!, { workerRef: session.user.id, kind, label: readOptionalString(body, "label"), filename, declaredContentType, dataBase64 });
    if (!result.ok) return reply.code(400).send({ error: "RWOS_CV_ASSET_REJECTED", reason: result.reason });
    return reply.code(201).send({ asset: result.asset });
  });

  app.get("/worker/cv-assets", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_WORKER_DENIED", message: "Authentication is required." });
    }
    const assets = await listCvAssets(prisma!, session.user.id);
    return reply.code(200).send({ assets });
  });

  app.delete("/worker/cv-assets/:id", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_WORKER_DENIED", message: "Authentication is required." });
    }
    const id = readRouteParam(request.params, "id");
    if (!id || !isCanonicalUuid(id)) return reply.code(400).send({ error: "RWOS_CV_ASSET_INVALID", message: "A valid id is required." });
    const ok = await deleteCvAsset(prisma!, session.user.id, id);
    if (!ok) return reply.code(404).send({ error: "RWOS_CV_ASSET_NOT_FOUND" });
    return reply.code(200).send({ deleted: true });
  });

  // The old free toggle is removed: classification can no longer be flipped without a signed election.
  app.put("/worker/profile/classification", async (_request, reply) =>
    reply.code(410).send({
      error: "RWOS_CLASSIFICATION_TOGGLE_REMOVED",
      message: "Classification is now a signed election. Use POST /worker/profile/classification-election."
    })
  );

  // The worker's payout ledger: what they are owed (To pay) and what has been sent (Paid). Reading it
  // materializes a pending payout per locked payroll calculation and auto-releases any whose two-week
  // hold has elapsed. Worker-scoped; no money is moved here.
  app.get("/worker/payouts", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_WORKER_DENIED", message: "Authentication is required." });
    }
    const identity = await prisma!.workerIdentity.findFirst({ where: { userId: session.user.id }, select: { id: true } });
    if (!identity) {
      return reply.code(200).send({ toPay: [], paid: [], summary: { currency: "CAD", toPayMinor: 0, paidMinor: 0 }, synthetic: true });
    }
    const payouts = await materializeAndListWorkerPayouts(prisma!, identity.id, new Date());
    const toPay = payouts.filter((p) => p.status === "pending" || p.status === "held" || p.status === "released");
    const paid = payouts.filter((p) => p.status === "paid");
    const currency = payouts[0]?.currency ?? "CAD";
    const toPayMinor = toPay.reduce((sum, p) => sum + p.workerReceivesMinor, 0);
    const paidMinor = paid.reduce((sum, p) => sum + p.workerReceivesMinor, 0);
    return reply.code(200).send({ toPay, paid, summary: { currency, toPayMinor, paidMinor }, synthetic: true });
  });

  // Phase 3b: the worker's year-end tax slip(s) — a T4 for employee pay, a T4A for contractor fees,
  // derived from their LOCKED payroll for the year. Synthetic boxes; nothing is filed (gated). See
  // docs/finance/TWO_CHANNEL_PAYROLL_DESIGN.md.
  app.get("/worker/tax-slips", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_WORKER_DENIED", message: "Authentication is required." });
    }
    const identity = await prisma!.workerIdentity.findFirst({ where: { userId: session.user.id }, select: { id: true } });
    if (!identity) return reply.code(200).send({ slips: [], taxYear: null, synthetic: true });
    const query = asRecord(request.query);
    const taxYear = readOptionalNumber(query, "year") ?? new Date().getUTCFullYear();
    const yearStart = new Date(Date.UTC(taxYear, 0, 1));
    const yearEnd = new Date(Date.UTC(taxYear + 1, 0, 1));
    const calcs = await prisma!.payrollCalculation.findMany({
      where: { workerIdentityId: identity.id, status: "locked", payrollPeriod: { periodStart: { gte: yearStart, lt: yearEnd } } },
      select: { id: true, workerClassification: true, grossPayMinor: true, totalEmployerCostMinor: true, currency: true }
    });
    if (calcs.length === 0) return reply.code(200).send({ slips: [], taxYear, synthetic: true });
    const deductions = await prisma!.payrollDeductionLine.findMany({
      where: { payrollCalculationId: { in: calcs.map((c) => c.id) } },
      select: { payrollCalculationId: true, code: true, amountMinor: true }
    });
    const dedByCalc = new Map<string, Record<string, number>>();
    for (const d of deductions) {
      const m = dedByCalc.get(d.payrollCalculationId) ?? {};
      m[d.code] = (m[d.code] ?? 0) + d.amountMinor;
      dedByCalc.set(d.payrollCalculationId, m);
    }
    const taxProfile = await prisma!.workerTaxProfile.findUnique({ where: { workerIdentityId: identity.id }, select: { gstQstRegistered: true } });
    const registered = taxProfile?.gstQstRegistered === true;
    const inputs: SlipCalcInput[] = calcs.map((c) => {
      const gross = c.grossPayMinor;
      const gstQst = c.workerClassification === "contractor" && registered
        ? Math.floor((gross * GST_RATE_PPM) / 1_000_000) + Math.floor((gross * QST_RATE_PPM) / 1_000_000)
        : 0;
      return {
        classification: c.workerClassification,
        grossPayMinor: gross,
        deductionsByCode: dedByCalc.get(c.id) ?? {},
        employerCostMinor: c.totalEmployerCostMinor,
        gstQstCollectedMinor: gstQst
      };
    });
    const slips = buildTaxSlips(taxYear, calcs[0]!.currency, inputs);
    return reply.code(200).send({ slips, taxYear, synthetic: true, note: "Synthetic year-end slip; not filed with CRA/Revenu Québec." });
  });

  // The worker raises a dispute on what they are owed for a finished shift (its payout, by payroll
  // calculation). An open dispute PAUSES that payout (held) until it is resolved or withdrawn.
  app.post("/worker/disputes", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_WORKER_DENIED", message: "Authentication is required." });
    }
    const identity = await prisma!.workerIdentity.findFirst({ where: { userId: session.user.id }, select: { id: true } });
    if (!identity) {
      return reply.code(404).send({ error: "RWOS_WORKER_NOT_FOUND", message: "No worker profile." });
    }
    const body = asRecord(request.body);
    const payrollCalculationId = readOptionalString(body, "payrollCalculationId");
    const category = readOptionalString(body, "category");
    const reason = normalizeWorkerDisputeReason(body.reason);
    if (!payrollCalculationId || !isWorkerDisputeCategory(category) || !reason) {
      return reply.code(400).send({ error: "RWOS_INVALID_DISPUTE", message: "A payout, a category and a reason are required." });
    }
    const result = await raiseWorkerDispute(prisma!, { workerIdentityId: identity.id, payrollCalculationId, category, reason, now: new Date() });
    if (!result.ok) {
      const code = result.reason === "not_found" ? 404 : 409;
      return reply.code(code).send({ error: `RWOS_DISPUTE_${result.reason.toUpperCase()}`, message: "This payout cannot be disputed." });
    }
    return reply.code(201).send({ dispute: result.dispute, synthetic: true });
  });

  // The worker's own disputes (most recent first).
  app.get("/worker/disputes", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_WORKER_DENIED", message: "Authentication is required." });
    }
    const identity = await prisma!.workerIdentity.findFirst({ where: { userId: session.user.id }, select: { id: true } });
    if (!identity) {
      return reply.code(200).send({ items: [], synthetic: true });
    }
    const items = await listWorkerDisputes(prisma!, identity.id);
    return reply.code(200).send({ items, synthetic: true });
  });

  // The worker withdraws their own still-open dispute; its paused payout returns to the normal flow.
  app.post("/worker/disputes/:disputeId/withdraw", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));
    if (!session.authenticated || !session.user) {
      return reply.code(401).send({ error: "RWOS_WORKER_DENIED", message: "Authentication is required." });
    }
    const identity = await prisma!.workerIdentity.findFirst({ where: { userId: session.user.id }, select: { id: true } });
    if (!identity) {
      return reply.code(404).send({ error: "RWOS_WORKER_NOT_FOUND", message: "No worker profile." });
    }
    const disputeId = (request.params as { disputeId?: string }).disputeId ?? "";
    const result = await withdrawWorkerDispute(prisma!, { workerIdentityId: identity.id, disputeId, now: new Date() });
    if (!result.ok) {
      const code = result.reason === "not_found" ? 404 : 409;
      return reply.code(code).send({ error: `RWOS_DISPUTE_${result.reason.toUpperCase()}`, message: "This dispute cannot be withdrawn." });
    }
    return reply.code(200).send({ dispute: result.dispute, synthetic: true });
  });

  async function userHasOrganizationAccess(userId: string, organizationId: string): Promise<boolean> {
    const memberships = await membershipService.listMemberships(userId);
    return memberships.some((m) => m.organizationId === organizationId && m.status === "active");
  }

  async function loadPayrollCalculationDetail(calculationId: string) {
    const c = await prisma!.payrollCalculation.findUnique({
      where: { id: calculationId },
      include: { earningLines: { orderBy: { sortOrder: "asc" } }, deductionLines: { orderBy: { sortOrder: "asc" } }, employerCostLines: { orderBy: { sortOrder: "asc" } }, workedTimeRefs: true }
    });
    if (!c) return null;
    return {
      ...serializePayrollCalculation(c),
      earningLines: c.earningLines.map((e) => ({ classification: e.classification, description: e.description, quantityMinutes: e.quantityMinutes, rateMinor: e.rateMinor, amountMinor: e.amountMinor, currency: e.currency })),
      deductionLines: c.deductionLines.map((d) => ({ category: d.category, code: d.code, description: d.description, amountMinor: d.amountMinor, currency: d.currency })),
      employerCostLines: c.employerCostLines.map((x) => ({ category: x.category, code: x.code, description: x.description, amountMinor: x.amountMinor, currency: x.currency })),
      workedTimeRefs: c.workedTimeRefs.map((w) => ({ timesheetId: w.timesheetId, timesheetVersion: w.timesheetVersion, timesheetStatus: w.timesheetStatus, payableMinutes: w.payableMinutes, billableMinutes: w.billableMinutes, scheduledStartAt: w.scheduledStartAt.toISOString(), scheduledEndAt: w.scheduledEndAt.toISOString(), contractId: w.contractId, contractVersion: w.contractVersion, contractEffectiveFrom: w.contractEffectiveFrom.toISOString(), appliedHourlyRateMinor: w.appliedHourlyRateMinor, currency: w.currency }))
    };
  }

  app.post("/platform/timesheets", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetUnauthenticated(reply);

    const body = asRecord(request.body);
    const timesheet = await timesheetService.createFromAttendance({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      attendanceRecordId: readRequiredString(body, "attendanceRecordId") ?? ""
    });

    return reply.code(201).send({ timesheet: serializeTimesheet(timesheet) });
  });

  app.get("/platform/timesheets", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetUnauthenticated(reply);

    const query = asRecord(request.query);
    const status = readTimesheetStatus(readOptionalString(query, "status"));
    const timesheets = await timesheetService.listTimesheets({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      organizationId: readOptionalString(query, "organizationId"),
      assignmentId: readOptionalString(query, "assignmentId"),
      ...(status ? { statuses: [status] } : {})
    });

    return reply.code(200).send({ timesheets: timesheets.map((item) => serializeTimesheet(item)) });
  });

  app.get("/platform/timesheets/:timesheetId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetUnauthenticated(reply);

    const timesheet = await timesheetService.readTimesheet({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      timesheetId: readRouteParam(request.params, "timesheetId")
    });

    return reply.code(200).send({ timesheet: serializeTimesheet(timesheet) });
  });

  app.post("/platform/timesheets/:timesheetId/calculate", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetUnauthenticated(reply);

    const body = asRecord(request.body);
    const timesheet = await timesheetService.calculate({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      timesheetId: readRouteParam(request.params, "timesheetId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ timesheet: serializeTimesheet(timesheet) });
  });

  app.post("/platform/timesheets/:timesheetId/request-correction", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetUnauthenticated(reply);

    const body = asRecord(request.body);
    const timesheet = await timesheetService.requestCorrection({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      timesheetId: readRouteParam(request.params, "timesheetId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? ""
    });

    return reply.code(200).send({ timesheet: serializeTimesheet(timesheet) });
  });

  app.post("/platform/timesheets/:timesheetId/override-exceptions", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetUnauthenticated(reply);

    const body = asRecord(request.body);
    const timesheet = await timesheetService.overrideExceptions({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      timesheetId: readRouteParam(request.params, "timesheetId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? ""
    });

    return reply.code(200).send({ timesheet: serializeTimesheet(timesheet) });
  });

  app.post("/platform/timesheets/:timesheetId/approve", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetUnauthenticated(reply);

    const body = asRecord(request.body);
    const timesheet = await timesheetService.approve({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      timesheetId: readRouteParam(request.params, "timesheetId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ timesheet: serializeTimesheet(timesheet) });
  });

  app.post("/platform/timesheets/:timesheetId/reject", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetUnauthenticated(reply);

    const body = asRecord(request.body);
    const timesheet = await timesheetService.reject({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      timesheetId: readRouteParam(request.params, "timesheetId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? ""
    });

    return reply.code(200).send({ timesheet: serializeTimesheet(timesheet) });
  });

  app.post("/platform/timesheets/:timesheetId/lock", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetUnauthenticated(reply);

    const body = asRecord(request.body);
    const timesheet = await timesheetService.lock({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      timesheetId: readRouteParam(request.params, "timesheetId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    // Gap B: auto-generate the client invoice from the locked timesheet (labour + urgent + the Gap-A
    // variable extras, with GST/QST). Never breaks the lock — a failure is reported, not thrown.
    let invoice: Awaited<ReturnType<typeof autoGenerateInvoiceForLockedTimesheet>> | null = null;
    if (invoiceRepository && prisma) {
      invoice = await autoGenerateInvoiceForLockedTimesheet(prisma, invoiceRepository, timesheet.id, session.user.id);
    }

    return reply.code(200).send({ timesheet: serializeTimesheet(timesheet), invoice });
  });

  app.get("/platform/timesheets/:timesheetId/audit", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetUnauthenticated(reply);

    const audit = await timesheetService.readAuditSummary({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      timesheetId: readRouteParam(request.params, "timesheetId")
    });

    return reply.code(200).send({ audit });
  });

  app.get("/organizations/:organizationId/timesheets", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetUnauthenticated(reply);

    const query = asRecord(request.query);
    const status = readTimesheetStatus(readOptionalString(query, "status"));
    const organizationId = readRouteParam(request.params, "organizationId");
    // Stage: tenant-isolation fix — require active membership of THIS org before listing timesheets.
    if (!(await userHasOrganizationAccess(session.user.id, organizationId))) {
      return sendTimesheetDenied(reply);
    }
    const timesheets = await timesheetService.listTimesheets({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      organizationId,
      ...(status ? { statuses: [status] } : {})
    });
    if (!allBelongToOrganization(timesheets, organizationId)) {
      return sendTimesheetDenied(reply);
    }

    return reply.code(200).send({ timesheets: timesheets.map((item) => serializeTimesheet(item)) });
  });

  app.post(
    "/organizations/:organizationId/timesheets/:timesheetId/confirm",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );
      if (!session.authenticated || !session.user) return sendTimesheetUnauthenticated(reply);

      const organizationId = readRouteParam(request.params, "organizationId");
      const timesheetId = readRouteParam(request.params, "timesheetId");
      // Stage: tenant-isolation fix — require active membership of THIS org before any cross-org
      // timesheet write (the visibleTimesheets ownership check below leaks cross-org rows on its own).
      if (!(await userHasOrganizationAccess(session.user.id, organizationId))) {
        return sendTimesheetDenied(reply);
      }
      const roles = await resolveAuthorizationRoles(session.user.id);
      const visibleTimesheets = await timesheetService.listTimesheets({
        session,
        roles,
        organizationId
      });
      if (
        !allBelongToOrganization(visibleTimesheets, organizationId) ||
        !visibleTimesheets.some((timesheet) => timesheet.id === timesheetId)
      ) {
        return sendTimesheetDenied(reply);
      }

      const body = asRecord(request.body);
      const timesheet = await timesheetService.employerConfirm({
        session,
        roles,
        timesheetId,
        expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
      });
      if (timesheet.id !== timesheetId || timesheet.organizationId !== organizationId) {
        return sendTimesheetDenied(reply);
      }

      return reply.code(200).send({ timesheet: serializeTimesheet(timesheet) });
    }
  );

  app.post(
    "/organizations/:organizationId/timesheets/:timesheetId/dispute",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );
      if (!session.authenticated || !session.user) return sendTimesheetUnauthenticated(reply);

      const organizationId = readRouteParam(request.params, "organizationId");
      const timesheetId = readRouteParam(request.params, "timesheetId");
      // Stage: tenant-isolation fix — require active membership of THIS org before any cross-org
      // timesheet write (the visibleTimesheets ownership check below leaks cross-org rows on its own).
      if (!(await userHasOrganizationAccess(session.user.id, organizationId))) {
        return sendTimesheetDenied(reply);
      }
      const roles = await resolveAuthorizationRoles(session.user.id);
      const visibleTimesheets = await timesheetService.listTimesheets({
        session,
        roles,
        organizationId
      });
      if (
        !allBelongToOrganization(visibleTimesheets, organizationId) ||
        !visibleTimesheets.some((timesheet) => timesheet.id === timesheetId)
      ) {
        return sendTimesheetDenied(reply);
      }

      const body = asRecord(request.body);
      const timesheet = await timesheetService.employerDispute({
        session,
        roles,
        timesheetId,
        expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
        reason: readRequiredString(body, "reason") ?? ""
      });
      if (timesheet.id !== timesheetId || timesheet.organizationId !== organizationId) {
        return sendTimesheetDenied(reply);
      }

      return reply.code(200).send({ timesheet: serializeTimesheet(timesheet) });
    }
  );

  app.get("/worker/timesheets/:timesheetId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetUnauthenticated(reply);

    const timesheet = await timesheetService.workerRead({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      timesheetId: readRouteParam(request.params, "timesheetId")
    });

    return reply.code(200).send({ timesheet: serializeTimesheet(timesheet) });
  });

  app.post("/worker/timesheets/:timesheetId/confirm", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetUnauthenticated(reply);

    const body = asRecord(request.body);
    const timesheet = await timesheetService.workerConfirm({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      timesheetId: readRouteParam(request.params, "timesheetId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ timesheet: serializeTimesheet(timesheet) });
  });

  app.post("/worker/timesheets/:timesheetId/dispute", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetUnauthenticated(reply);

    const body = asRecord(request.body);
    const timesheet = await timesheetService.workerDispute({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      timesheetId: readRouteParam(request.params, "timesheetId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? ""
    });

    return reply.code(200).send({ timesheet: serializeTimesheet(timesheet) });
  });

  // JobScanner scheduled re-scan — OFF by default. Turn on with JOBSCANNER_SCAN_INTERVAL_MIN plus
  // JOBSCANNER_SCAN_QUERIES (a JSON array of {what,where,maxDaysOld}). ⚠️ Each query spends one Adzuna
  // call; the free test plan is 25 calls total, so only enable live scheduling on a paid Adzuna plan.
  if (prisma && process.env.JOBSCANNER_SCAN_INTERVAL_MIN && process.env.JOBSCANNER_SCAN_QUERIES) {
    const intervalMinutes = Number(process.env.JOBSCANNER_SCAN_INTERVAL_MIN);
    let queries: ScanQuery[] = [];
    try {
      const parsed = JSON.parse(process.env.JOBSCANNER_SCAN_QUERIES) as unknown;
      if (Array.isArray(parsed)) queries = parsed as ScanQuery[];
    } catch {
      queries = [];
    }
    if (Number.isFinite(intervalMinutes) && intervalMinutes > 0 && queries.length > 0) {
      const client = createAdzunaClient({
        appId: process.env.ADZUNA_APP_ID ?? null,
        appKey: process.env.ADZUNA_APP_KEY ?? null,
        country: process.env.ADZUNA_COUNTRY ?? "ca"
      });
      const stop = startJobScannerSchedule({ prisma, client, queries, intervalMinutes, logger });
      app.addHook("onClose", async () => stop());
    }
  }

  async function resolveCatalogueReadRoles(userId: string, organizationId: string | null) {
    if (organizationId) {
      const decision = await membershipService.selectOrganizationContext({
        userId,
        organizationId
      });

      return decision.allow ? decision.roles : [];
    }

    return resolveAuthorizationRoles(userId);
  }

  return app;
}

export function isPublicWorkerIngressPath(rawUrl: string) {
  const path = rawUrl.split("?", 1)[0] ?? "";
  return (
    path === "/health" ||
    path === "/ready" ||
    path === "/auth/sign-in" ||
    path === "/auth/session" ||
    path === "/auth/sign-out" ||
    path === "/auth/email/send-code" ||
    path === "/auth/email/verify-code" ||
    path === "/auth/password-reset/request" ||
    path === "/auth/password-reset/complete" ||
    path.startsWith("/worker/")
  );
}

function trustedWorkerWebOrigin(value: string | undefined) {
  if (!value) throw new Error("RWOS_PUBLIC_WORKER_WEB_ORIGIN_REQUIRED");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.origin !== value || url.pathname !== "/") {
    throw new Error("RWOS_PUBLIC_WORKER_WEB_ORIGIN_INVALID");
  }
  return url.origin;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readRequiredString(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" ? value : null;
}

function readOptionalString(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function isCanonicalUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function readOptionalNumber(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "number" ? value : null;
}

// Parse a positive integer from a string query param (query values arrive as strings).
function parseQueryInt(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Build a WorkerCvProfile from a request body's `profile` object. Shared by the platform and worker
// CV endpoints. fullName falls back to "" so callers validate it.
function buildCvProfile(profileRaw: Record<string, unknown>): WorkerCvProfile {
  const strArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  return {
    fullName: readOptionalString(profileRaw, "fullName") ?? "",
    headline: readOptionalString(profileRaw, "headline"),
    location: readOptionalString(profileRaw, "location"),
    email: readOptionalString(profileRaw, "email"),
    phone: readOptionalString(profileRaw, "phone"),
    summary: readOptionalString(profileRaw, "summary"),
    skills: strArray(profileRaw.skills),
    languages: strArray(profileRaw.languages),
    certifications: strArray(profileRaw.certifications),
    experience: Array.isArray(profileRaw.experience)
      ? (profileRaw.experience as unknown[]).map((e) => {
          const r = asRecord(e);
          return { role: readOptionalString(r, "role") ?? "", employer: readOptionalString(r, "employer") ?? "", start: readOptionalString(r, "start") ?? "", end: readOptionalString(r, "end"), highlights: strArray(r.highlights) };
        })
      : [],
    education: Array.isArray(profileRaw.education)
      ? (profileRaw.education as unknown[]).map((e) => {
          const r = asRecord(e);
          return { credential: readOptionalString(r, "credential") ?? "", institution: readOptionalString(r, "institution") ?? "", year: readOptionalString(r, "year") };
        })
      : [],
    language: readOptionalString(profileRaw, "language") === "fr" ? "fr" : "en"
  };
}

// Coerce a stored qualifications JSON value into a clean string[] for the marketplace
// detail (drops anything non-string; never throws).
function coerceQualifications(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

// --- Structured per-shift allowances (transport / meal / lodging) ---
function readAllowanceEntryInput(source: Record<string, unknown>, key: string) {
  const entry = asRecord(source[key]);
  return {
    provision: readOptionalString(entry, "provision"),
    amountMinor: readOptionalNumber(entry, "amountMinor"),
    note: readOptionalString(entry, "note")
  };
}
function readAllowancesInput(body: Record<string, unknown>) {
  const allowances = asRecord(body.allowances);
  return {
    transport: readAllowanceEntryInput(allowances, "transport"),
    meal: readAllowanceEntryInput(allowances, "meal"),
    lodging: readAllowanceEntryInput(allowances, "lodging")
  };
}

// Parse an ISO date/datetime string into a Date, or null if absent/invalid. Used for
// marketplace date-range filters (server-authoritative).
function parseIsoDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function readStringArray(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : null;
}

function readRequiredDate(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (typeof value !== "string") return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function readOptionalDate(body: Record<string, unknown>, key: string) {
  if (body[key] === undefined || body[key] === null) return null;

  return readRequiredDate(body, key);
}

function readBearerToken(authorization: string | undefined) {
  if (!authorization?.startsWith("Bearer ")) return null;

  return authorization.slice("Bearer ".length).trim() || null;
}

function readRouteParam(params: unknown, key: string) {
  const record = asRecord(params);
  const value = record[key];

  return typeof value === "string" ? value : "";
}

export function createMemoryAuthenticationRateLimiter(
  options = {
    accountMaxAttempts: 5,
    networkMaxAttempts: 30,
    windowMs: 60_000,
    maxBuckets: 20_000,
    keySecret: "rwos-local-auth-rate-limit-key-secret"
  }
): AuthenticationRateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return {
    async consume(input) {
      const now = Date.now();
      for (const [bucketKey, candidate] of buckets) {
        if (candidate.resetAt <= now) buckets.delete(bucketKey);
      }
      const keys = deriveAuthenticationRateLimitKeys(input, options.keySecret);
      const decisions = [
        consumeMemoryBucket(keys.accountKey, options.accountMaxAttempts),
        consumeMemoryBucket(keys.networkKey, options.networkMaxAttempts)
      ];
      const denied = decisions.filter((decision) => !decision.allowed);
      return {
        allowed: denied.length === 0,
        retryAfterSeconds: Math.max(...decisions.map((decision) => decision.retryAfterSeconds))
      };

      function consumeMemoryBucket(key: string, maxAttempts: number) {
        while (!buckets.has(key) && buckets.size >= options.maxBuckets) {
          const oldestKey = buckets.keys().next().value as string | undefined;
          if (!oldestKey) break;
          buckets.delete(oldestKey);
        }
        const current = buckets.get(key);
        const bucket =
          current && current.resetAt > now
            ? current
            : { count: 0, resetAt: now + options.windowMs };
        bucket.count += 1;
        buckets.set(key, bucket);
        return {
          allowed: bucket.count <= maxAttempts,
          retryAfterSeconds: clampRetryAfter((bucket.resetAt - now) / 1000)
        };
      }
    }
  };
}

export function createRemoteAuthenticationRateLimiter(options: {
  origin: string;
  token: string;
  keySecret: string;
  keyId: string;
  namespace: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
  trustedIdentityHeaders?: () => Promise<Readonly<Record<string, string>>>;
}): AuthenticationRateLimiter {
  const parsedOrigin = new URL(options.origin);
  if (
    parsedOrigin.protocol !== "https:" ||
    options.token.length < 32 ||
    options.keySecret.length < 32 ||
    options.token === options.keySecret ||
    !/^[a-z0-9][a-z0-9_-]{0,31}$/.test(options.keyId) ||
    !/^rwos:authrl:(?:local|test|staging|production):v1$/.test(options.namespace)
  ) {
    throw new Error("RWOS_AUTH_RATE_LIMITER_CONFIGURATION_INVALID");
  }
  const origin = parsedOrigin.origin;
  const remoteFetch = options.fetch ?? fetch;
  const timeoutMs = Math.min(5_000, Math.max(100, options.timeoutMs ?? 300));
  return {
    async check() {
      try {
        const trustedHeaders = options.trustedIdentityHeaders
          ? await options.trustedIdentityHeaders()
          : {};
        const response = await remoteFetch(`${origin}/ready`, {
          method: "GET",
          headers: {
            accept: "application/json",
            ...(options.trustedIdentityHeaders
              ? { "x-rwos-app-authorization": `Bearer ${options.token}` }
              : { authorization: `Bearer ${options.token}` }),
            ...trustedHeaders
          },
          signal: AbortSignal.timeout(timeoutMs)
        });
        return response.ok;
      } catch {
        return false;
      }
    },
    async consume(input) {
      const trustedHeaders = options.trustedIdentityHeaders
        ? await options.trustedIdentityHeaders()
        : {};
      const keys = deriveAuthenticationRateLimitKeys(
        input,
        options.keySecret,
        options.namespace,
        options.keyId
      );
      const response = await remoteFetch(`${origin}/v1/auth-rate-limit/consume`, {
        method: "POST",
        headers: {
          accept: "application/json",
          ...(options.trustedIdentityHeaders
            ? { "x-rwos-app-authorization": `Bearer ${options.token}` }
            : { authorization: `Bearer ${options.token}` }),
          ...(options.trustedIdentityHeaders
            ? { "x-rwos-operation": "auth-rate-limit:consume" }
            : {}),
          "content-type": "application/json",
          ...trustedHeaders
        },
        body: JSON.stringify({
          action: input.action,
          keyId: options.keyId,
          accountKey: keys.accountKey,
          networkKey: keys.networkKey,
          policy: {
            accountMaxAttempts: 5,
            networkMaxAttempts: 30,
            windowSeconds: 60
          }
        }),
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (!response.ok) throw new Error("RWOS_AUTH_RATE_LIMITER_UNAVAILABLE");
      const payload = (await response.json()) as unknown;
      if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
        throw new Error("RWOS_AUTH_RATE_LIMITER_INVALID_RESPONSE");
      }
      const record = payload as Record<string, unknown>;
      if (
        typeof record.allowed !== "boolean" ||
        typeof record.retryAfterSeconds !== "number" ||
        !Number.isFinite(record.retryAfterSeconds)
      ) {
        throw new Error("RWOS_AUTH_RATE_LIMITER_INVALID_RESPONSE");
      }
      return {
        allowed: record.allowed,
        retryAfterSeconds: clampRetryAfter(record.retryAfterSeconds)
      };
    }
  };
}

function trustedIdentityHeaders(
  identity: Readonly<{
    provider: IdentityTokenProvider;
    registry: TrustedAudienceRegistry;
    environment: "staging";
    releaseSha: string;
  }>,
  receiver: TrustedService
) {
  return () =>
    createTrustedServiceIdentityHeaders({
      provider: identity.provider,
      registry: identity.registry,
      receiver
    }).then((headers) => ({
      ...headers,
      "x-rwos-service-id": "api",
      "x-rwos-environment": identity.environment,
      "x-rwos-release-sha": identity.releaseSha
    }));
}

function deriveAuthenticationRateLimitKeys(
  input: Readonly<{
    action: "register" | "sign_in" | "email_verify_send" | "password_reset_request";
    ip: string;
    email: string;
  }>,
  secret: string,
  namespace = "rwos:authrl:test:v1",
  keyId = "memory"
) {
  const digest = (kind: "account" | "network", value: string) =>
    createHmac("sha256", secret)
      .update(`rwos:auth-rate-limit:v1:${input.action}:${kind}:${value}`)
      .digest("hex");
  return {
    accountKey: `${namespace}:${keyId}:${input.action}:account:${digest("account", input.email.trim().toLowerCase())}`,
    networkKey: `${namespace}:${keyId}:${input.action}:network:${digest("network", input.ip.trim().toLowerCase())}`
  };
}

function hasEmailVerificationDelegate(prisma: unknown): boolean {
  return Boolean(
    prisma &&
    typeof prisma === "object" &&
    "emailVerificationCode" in prisma &&
    (prisma as { emailVerificationCode?: unknown }).emailVerificationCode
  );
}

async function workerHasOrganizationScope(prisma: unknown, userId: string, organizationId: string) {
  if (!prisma || typeof prisma !== "object" || !("workerOffer" in prisma)) return false;
  const delegate = (
    prisma as {
      workerOffer?: {
        findFirst(input: unknown): Promise<unknown>;
      };
    }
  ).workerOffer;
  if (!delegate) return false;
  return Boolean(
    await delegate.findFirst({
      where: {
        organizationId,
        workerIdentity: { userId, status: "active" }
      },
      select: { id: true }
    })
  );
}

async function consumeAuthenticationRateLimit(
  limiter: AuthenticationRateLimiter,
  input: Parameters<AuthenticationRateLimiter["consume"]>[0]
) {
  try {
    return await limiter.consume(input);
  } catch {
    return null;
  }
}

function clampRetryAfter(value: number) {
  return Math.max(1, Math.min(3600, Math.ceil(value)));
}

function serializeSessionUser(
  user: {
    id: string;
    publicId: string;
    emailNormalized: string;
    displayName: string | null;
    status: string;
    emailVerified?: boolean;
  } | null
) {
  if (!user) return null;
  return {
    id: user.id,
    publicId: user.publicId,
    emailNormalized: user.emailNormalized,
    displayName: user.displayName,
    status: user.status,
    emailVerified: user.emailVerified === true
  };
}

function serializeSessionRecord(
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
  } | null
) {
  return session
    ? {
        id: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt.toISOString()
      }
    : null;
}

function applySecurityHeaders(reply: FastifyReply, production: boolean) {
  reply
    .header("x-content-type-options", "nosniff")
    .header("x-frame-options", "DENY")
    .header("content-security-policy", "frame-ancestors 'none'")
    .header("referrer-policy", "strict-origin-when-cross-origin")
    .header("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  if (production) {
    reply.header("strict-transport-security", "max-age=31536000; includeSubDomains");
  }
}

function isProductionDisabledOperation(method: string, url: string) {
  const path = url.split("?")[0] ?? url;
  if (method === "GET" && /\/platform\/dispatches\/[^/]+\/candidates\/search$/.test(path)) {
    return true;
  }
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return false;
  return (
    path.startsWith("/platform/dispatches") ||
    path.startsWith("/platform/worker-offers") ||
    path.startsWith("/worker/offers") ||
    path.startsWith("/platform/assignments") ||
    path.startsWith("/worker/assignments") ||
    path.startsWith("/platform/attendance") ||
    path.startsWith("/worker/attendance") ||
    path.startsWith("/platform/timesheets") ||
    path.startsWith("/worker/timesheets")
  );
}

function sendAuthenticationRateLimited(reply: FastifyReply, retryAfterSeconds: number) {
  return reply
    .code(429)
    .header("cache-control", "no-store")
    .header("retry-after", String(retryAfterSeconds))
    .send({
      error: "RWOS_AUTH_RATE_LIMITED",
      message: "Too many authentication attempts. Try again later."
    });
}

function sendAuthenticationUnavailable(reply: FastifyReply) {
  return reply.code(503).header("cache-control", "no-store").header("retry-after", "5").send({
    error: "RWOS_AUTH_UNAVAILABLE",
    message: "Authentication is temporarily unavailable. Try again later."
  });
}

function serializeAuthenticationResult(result: {
  user: Awaited<ReturnType<AuthenticationService["signIn"]>>["user"];
  session: Awaited<ReturnType<AuthenticationService["signIn"]>>["session"];
  token: string;
}) {
  return {
    user: result.user,
    session: {
      ...result.session,
      expiresAt: result.session.expiresAt.toISOString()
    },
    token: result.token
  };
}

function sendAuthenticationError(reply: FastifyReply, error: unknown) {
  if (error instanceof PasswordPolicyError) {
    return reply.code(400).send({
      error: passwordPolicyErrorCode,
      message: "Password requirements not met."
    });
  }

  if (error instanceof RegistrationUnavailableError) {
    return reply.code(409).send({
      error: registrationUnavailableCode,
      message: "Registration unavailable."
    });
  }

  if (error instanceof AuthenticationError) {
    return reply.code(401).send({
      error: authenticationErrorCode,
      message: authenticationErrorMessage
    });
  }

  if (error instanceof AuthenticationRequiredError) {
    return reply.code(401).send({
      error: authenticationRequiredCode,
      message: "Authentication required."
    });
  }

  throw error;
}

function sendMembershipDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

function sendOrganizationDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

function sendResidenceDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

function sendContractDenied(reply: FastifyReply) {
  return reply.code(401).send({
    error: "RWOS_CONTRACT_DENIED",
    message: "Authentication is required to manage the contract."
  });
}

function sendContractError(reply: FastifyReply, error: unknown) {
  if (error instanceof EmployerContractError) {
    const httpStatus = error.code === "denied" ? 403 : error.code === "conflict" ? 409 : 400;
    return reply.code(httpStatus).send({
      error: `RWOS_CONTRACT_${error.code.toUpperCase()}`,
      message: error.message
    });
  }
  return reply.code(500).send({
    error: "RWOS_CONTRACT_ERROR",
    message: "The contract could not be processed."
  });
}

function sendCancellationDenied(reply: FastifyReply) {
  return reply.code(401).send({
    error: "RWOS_CANCELLATION_DENIED",
    message: "Authentication is required to manage a cancellation."
  });
}

function sendCancellationError(reply: FastifyReply, error: unknown) {
  if (error instanceof EmployerCancellationError) {
    const httpStatus =
      error.code === "denied"
        ? 403
        : error.code === "not_found"
          ? 404
          : error.code === "conflict"
            ? 409
            : 400;
    return reply.code(httpStatus).send({
      error: `RWOS_CANCELLATION_${error.code.toUpperCase()}`,
      message: error.message
    });
  }
  return reply.code(500).send({
    error: "RWOS_CANCELLATION_ERROR",
    message: "The cancellation could not be processed."
  });
}

function sendCapacityError(reply: FastifyReply, error: unknown) {
  if (error instanceof JobRequestError) {
    const status = error.decision.status;
    const httpStatus =
      status === "version_conflict"
        ? 409
        : status === "invalid_input"
          ? 400
          : status === "not_found"
            ? 404
            : 403;
    return reply.code(httpStatus).send({
      error: "RWOS_CAPACITY_DENIED",
      message: "The staffing capacity change could not be completed."
    });
  }
  throw error;
}

function sendEditError(reply: FastifyReply, error: unknown) {
  if (error instanceof EmployerRequestEditError) {
    const httpStatus =
      error.code === "denied" ? 403 : error.code === "not_found" ? 404 : error.code === "conflict" ? 409 : 400;
    return reply.code(httpStatus).send({ error: `RWOS_EDIT_${error.code.toUpperCase()}`, message: error.message });
  }
  return reply.code(500).send({ error: "RWOS_EDIT_ERROR", message: "The edit could not be processed." });
}

function sendReduceError(reply: FastifyReply, error: unknown) {
  if (error instanceof EmployerReduceError) {
    const httpStatus =
      error.code === "denied" ? 403 : error.code === "not_found" ? 404 : error.code === "conflict" ? 409 : 400;
    return reply.code(httpStatus).send({ error: `RWOS_REDUCE_${error.code.toUpperCase()}`, message: error.message });
  }
  return reply.code(500).send({ error: "RWOS_REDUCE_ERROR", message: "The reduction could not be processed." });
}

function readContractRoleRates(body: Record<string, unknown>): ContractRoleRateInput[] {
  const raw = body.roleRates;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const record = asRecord(item);
    const workGroupId = readRequiredString(record, "workGroupId");
    const roleDefinitionId = readRequiredString(record, "roleDefinitionId");
    const hourlyRateMinor = readOptionalNumber(record, "hourlyRateMinor");
    if (!workGroupId || !roleDefinitionId || hourlyRateMinor === null) {
      return [];
    }
    return [{ workGroupId, roleDefinitionId, hourlyRateMinor }];
  });
}

function sendDepartmentDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

function sendWorkGroupDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

function sendRoleDefinitionDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

function sendJobRequestDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

function sendJobRequestFailure(reply: FastifyReply, error: JobRequestError) {
  if (error.decision.status === "version_conflict") {
    return reply.code(409).send({
      error: "RWOS_JOB_REQUEST_CHANGED",
      message: "Job request changed. Refresh before trying again."
    });
  }
  if (error.decision.status === "invalid_transition") {
    return reply.code(409).send({
      error: "RWOS_JOB_REQUEST_STATE_CHANGED",
      message: "Job request is not editable in its current state."
    });
  }
  if (error.decision.status === "invalid_input") {
    return reply.code(400).send({
      error: "RWOS_INVALID_JOB_REQUEST",
      message: "Invalid job request."
    });
  }
  return sendJobRequestDenied(reply);
}

function sendDispatchDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

function sendDispatchFailure(reply: FastifyReply, error: DispatchError) {
  if (
    error.decision.status === "version_conflict" ||
    error.decision.status === "invalid_transition" ||
    error.decision.status === "job_request_not_ready"
  ) {
    return reply.code(409).send({
      error: "RWOS_DISPATCH_CHANGED",
      message: "Dispatch state changed. Refresh before trying again."
    });
  }
  if (error.decision.status === "invalid_input") {
    return reply.code(400).send({
      error: "RWOS_INVALID_DISPATCH_REQUEST",
      message: "Invalid dispatch request."
    });
  }
  return sendDispatchDenied(reply);
}

function sendWorkerOfferDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

function sendWorkerOfferFailure(reply: FastifyReply, error: WorkerOfferError) {
  if (
    error.decision.status === "version_conflict" ||
    error.decision.status === "invalid_transition" ||
    error.decision.status === "expired" ||
    error.decision.status === "duplicate_response" ||
    error.decision.status === "stale_terms" ||
    error.decision.status === "capacity_exceeded"
  ) {
    return reply.code(409).send({
      error: "RWOS_WORKER_OFFER_CHANGED",
      message: "Worker offer state changed. Refresh before trying again."
    });
  }
  if (error.decision.status === "invalid_input") {
    return reply.code(400).send({
      error: "RWOS_INVALID_WORKER_OFFER_REQUEST",
      message: "Invalid worker offer request."
    });
  }
  return sendWorkerOfferDenied(reply);
}

function sendAssignmentDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

function sendAssignmentFailure(reply: FastifyReply, error: AssignmentError) {
  if (error.decision.status === "not_found") {
    return reply.code(404).send({
      error: "RWOS_ASSIGNMENT_SOURCE_UNAVAILABLE",
      message: "Assignment source is unavailable."
    });
  }
  if (
    error.decision.status === "version_conflict" ||
    error.decision.status === "invalid_transition" ||
    error.decision.status === "capacity_exceeded" ||
    error.decision.status === "worker_offer_not_accepted" ||
    error.decision.status === "terms_unavailable" ||
    error.decision.status === "assignment_exists" ||
    error.decision.status === "conflict_detected"
  ) {
    return reply.code(409).send({
      error: "RWOS_ASSIGNMENT_CONFLICT",
      message: "Assignment could not be created from the current offer state."
    });
  }
  if (error.decision.status === "invalid_input") {
    return reply.code(400).send({
      error: "RWOS_INVALID_ASSIGNMENT_REQUEST",
      message: "Invalid assignment request."
    });
  }
  return sendAssignmentDenied(reply);
}

function sendAttendanceDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

// An unauthenticated request is an AUTHENTICATION failure (401), distinct from an
// authorized-but-forbidden request (403). Keeps the status table honest for attendance.
function sendAttendanceUnauthenticated(reply: FastifyReply) {
  return reply.code(401).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

// Map an AttendanceError to the correct HTTP status by its decision.status. A stale
// expectedVersion is a concurrency conflict (409), NOT an authentication failure. This
// preserves the exactly-once/version-guard semantics unchanged — it only fixes how the
// outcome is reported. Denials stay opaque (generic code/message) so we never leak whether
// another worker's record exists; conflicts get an actionable code so the client can reload.
function sendAttendanceFailure(reply: FastifyReply, error: AttendanceError) {
  switch (error.decision.status) {
    case "invalid_input":
      return reply.code(400).send({
        error: "RWOS_ATTENDANCE_INVALID_INPUT",
        message: "Attendance request was invalid."
      });
    case "not_found":
      return reply.code(404).send({
        error: authorizationDeniedCode,
        message: authorizationDeniedMessage
      });
    case "permission_denied":
      return sendAttendanceDenied(reply);
    case "version_conflict":
      return reply.code(409).send({
        error: "RWOS_ATTENDANCE_VERSION_CONFLICT",
        message: "Attendance changed since it was loaded. Reload and try again."
      });
    case "invalid_transition":
    case "assignment_not_ready":
    case "attendance_exists":
    case "duplicate_check_in":
    case "duplicate_check_out":
    case "check_out_before_check_in":
      return reply.code(409).send({
        error: "RWOS_ATTENDANCE_STATE_CONFLICT",
        message: "Attendance state does not allow this action."
      });
    default:
      return sendAttendanceDenied(reply);
  }
}

function sendTimesheetDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

// An unauthenticated request is an AUTHENTICATION failure (401), distinct from an
// authorized-but-forbidden request (403). Mirrors the attendance mapping (HR-4.1).
function sendTimesheetUnauthenticated(reply: FastifyReply) {
  return reply.code(401).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

// Map a TimesheetError to the correct HTTP status by its decision.status. A stale
// expectedVersion (or a record that has moved past the requested transition) is a CONCURRENCY
// conflict (409), never an authentication failure. Preserves the underlying version-guard /
// lifecycle semantics — only fixes how the outcome is reported (HR-5.0, mirrors HR-4.1).
function sendTimesheetFailure(reply: FastifyReply, error: TimesheetError) {
  switch (error.decision.status) {
    case "invalid_input":
      return reply.code(400).send({
        error: "RWOS_TIMESHEET_INVALID_INPUT",
        message: "Timesheet request was invalid."
      });
    case "not_found":
      return reply.code(404).send({
        error: authorizationDeniedCode,
        message: authorizationDeniedMessage
      });
    case "permission_denied":
      return sendTimesheetDenied(reply);
    case "version_conflict":
      return reply.code(409).send({
        error: "RWOS_TIMESHEET_VERSION_CONFLICT",
        message: "Timesheet changed since it was loaded. Reload and try again."
      });
    case "invalid_transition":
    case "attendance_not_ready":
    case "timesheet_exists":
    case "attendance_changed":
    case "assignment_changed":
    case "worker_review_required":
    case "employer_review_required":
    case "locked_record":
      return reply.code(409).send({
        error: "RWOS_TIMESHEET_STATE_CONFLICT",
        message: "Timesheet state does not allow this action."
      });
    default:
      return sendTimesheetDenied(reply);
  }
}

// Map a PayrollError to HTTP by its code (mirrors the attendance/timesheet mapping). A concurrency
// conflict is 409, never a blanket 403.
function sendPayrollFailure(reply: FastifyReply, error: unknown) {
  if (error instanceof PayrollError) {
    const status = error.code === "not_found" ? 404 : error.code === "invalid" ? 400 : error.code === "conflict" ? 409 : 403;
    const code = error.code === "not_found" ? "RWOS_PAYROLL_DENIED" : error.code === "invalid" ? "RWOS_PAYROLL_INVALID_INPUT" : error.code === "conflict" ? "RWOS_PAYROLL_CONFLICT" : "RWOS_PAYROLL_DENIED";
    return reply.code(status).send({ error: code, message: "Payroll request could not be completed.", reason: error.reason });
  }
  return reply.code(500).send({ error: "RWOS_INTERNAL_ERROR", message: "Request could not be completed." });
}

type PayrollPeriodRow = {
  id: string; organizationId: string; jurisdictionCountry: string; jurisdictionRegion: string;
  periodStart: Date; periodEnd: Date; timezone: string; status: string; currency: string;
  ruleProviderKey: string; ruleProviderVersion: string; synthetic?: boolean; version: number;
};
function serializePayrollPeriod(row: PayrollPeriodRow) {
  return {
    id: row.id, organizationId: row.organizationId,
    jurisdiction: { country: row.jurisdictionCountry, region: row.jurisdictionRegion },
    periodStart: row.periodStart.toISOString(), periodEnd: row.periodEnd.toISOString(), timezone: row.timezone,
    status: row.status, currency: row.currency, ruleProvider: { key: row.ruleProviderKey, version: row.ruleProviderVersion },
    synthetic: row.synthetic ?? true, version: row.version
  };
}

type PayrollCalculationRow = {
  id: string; payrollPeriodId: string; organizationId: string; workerIdentityId: string; revision: number;
  status: string; jurisdictionCountry: string; jurisdictionRegion: string; ruleProviderKey: string;
  ruleProviderVersion: string; calculationPolicyVersion: string; workerClassification?: string; currency: string; grossPayMinor: number;
  totalDeductionsMinor: number; netPayMinor: number; totalEmployerCostMinor: number; calculationFingerprint?: string; synthetic: boolean;
  calculatedAt: Date; supersededById: string | null; version: number;
  familyRootId?: string; previousCalculationId?: string | null; previousFingerprint?: string | null;
  correctionType?: string | null; correctionReason?: string | null;
  adjustsCalculationId?: string | null; adjustmentNetDirection?: string | null; adjustmentNetDeltaMinor?: number | null;
};
function serializePayrollCalculation(row: PayrollCalculationRow) {
  return {
    id: row.id, payrollPeriodId: row.payrollPeriodId, organizationId: row.organizationId, workerIdentityId: row.workerIdentityId,
    revision: row.revision, status: row.status, jurisdiction: { country: row.jurisdictionCountry, region: row.jurisdictionRegion },
    ruleProvider: { key: row.ruleProviderKey, version: row.ruleProviderVersion }, calculationPolicyVersion: row.calculationPolicyVersion,
    workerClassification: row.workerClassification ?? "employee", currency: row.currency, grossPayMinor: row.grossPayMinor, totalDeductionsMinor: row.totalDeductionsMinor,
    netPayMinor: row.netPayMinor, totalEmployerCostMinor: row.totalEmployerCostMinor, calculationFingerprint: row.calculationFingerprint ?? "", synthetic: row.synthetic,
    calculatedAt: row.calculatedAt.toISOString(), supersededById: row.supersededById, version: row.version,
    familyRootId: row.familyRootId ?? row.id, previousCalculationId: row.previousCalculationId ?? null, previousFingerprint: row.previousFingerprint ?? null,
    correctionType: row.correctionType ?? null, correctionReason: row.correctionReason ?? null,
    adjustsCalculationId: row.adjustsCalculationId ?? null,
    adjustment: row.adjustmentNetDirection ? { netDirection: row.adjustmentNetDirection, netDeltaMinor: row.adjustmentNetDeltaMinor ?? 0 } : null
  };
}

function allBelongToOrganization(
  records: readonly { organizationId: string }[],
  organizationId: string
) {
  return records.every((record) => record.organizationId === organizationId);
}

function serializeMemberships(
  memberships: Awaited<ReturnType<OrganizationMembershipService["listMemberships"]>>
) {
  return memberships.map(serializeMembership);
}

function serializeMembership(
  membership: Awaited<ReturnType<OrganizationMembershipService["listMemberships"]>>[number]
) {
  return {
    ...membership,
    invitedAt: membership.invitedAt.toISOString(),
    activatedAt: membership.activatedAt?.toISOString() ?? null,
    suspendedAt: membership.suspendedAt?.toISOString() ?? null,
    revokedAt: membership.revokedAt?.toISOString() ?? null,
    expiresAt: membership.expiresAt?.toISOString() ?? null,
    updatedAt: membership.updatedAt.toISOString()
  };
}

function serializeOrganization(
  organization: Awaited<ReturnType<EmployerOrganizationService["getOrganization"]>>
) {
  return {
    ...organization,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
    restrictedAt: organization.restrictedAt?.toISOString() ?? null,
    suspendedAt: organization.suspendedAt?.toISOString() ?? null,
    closedAt: organization.closedAt?.toISOString() ?? null
  };
}

function serializeResidence(residence: Awaited<ReturnType<ResidenceService["getResidence"]>>) {
  return {
    ...residence,
    createdAt: residence.createdAt.toISOString(),
    updatedAt: residence.updatedAt.toISOString(),
    archivedAt: residence.archivedAt?.toISOString() ?? null
  };
}

function serializeDepartment(department: Awaited<ReturnType<DepartmentService["getDepartment"]>>) {
  return {
    ...department,
    createdAt: department.createdAt.toISOString(),
    updatedAt: department.updatedAt.toISOString(),
    archivedAt: department.archivedAt?.toISOString() ?? null
  };
}

function serializeWorkGroup(
  workGroup: Awaited<ReturnType<WorkGroupService["getActiveWorkGroup"]>>
) {
  return {
    ...workGroup,
    createdAt: workGroup.createdAt.toISOString(),
    updatedAt: workGroup.updatedAt.toISOString()
  };
}

function serializeRoleDefinition(
  roleDefinition: Awaited<ReturnType<RoleDefinitionService["getActiveRoleDefinition"]>>
) {
  return {
    ...roleDefinition,
    createdAt: roleDefinition.createdAt.toISOString(),
    updatedAt: roleDefinition.updatedAt.toISOString()
  };
}

function serializeJobRequest(jobRequest: Awaited<ReturnType<JobRequestService["createDraft"]>>) {
  return {
    ...jobRequest,
    startAt: jobRequest.startAt.toISOString(),
    endAt: jobRequest.endAt.toISOString(),
    createdAt: jobRequest.createdAt.toISOString(),
    updatedAt: jobRequest.updatedAt.toISOString(),
    submittedAt: jobRequest.submittedAt?.toISOString() ?? null,
    cancelledAt: jobRequest.cancelledAt?.toISOString() ?? null,
    expiredAt: jobRequest.expiredAt?.toISOString() ?? null,
    archivedAt: jobRequest.archivedAt?.toISOString() ?? null
  };
}

function serializeDispatchReview(
  dispatchReview: Awaited<ReturnType<DispatchService["createDispatch"]>>
) {
  return {
    ...dispatchReview,
    startedAt: dispatchReview.startedAt?.toISOString() ?? null,
    pausedAt: dispatchReview.pausedAt?.toISOString() ?? null,
    cancelledAt: dispatchReview.cancelledAt?.toISOString() ?? null,
    closedAt: dispatchReview.closedAt?.toISOString() ?? null,
    createdAt: dispatchReview.createdAt.toISOString(),
    updatedAt: dispatchReview.updatedAt.toISOString()
  };
}

function serializeDispatchCandidate(
  candidate: Awaited<ReturnType<DispatchService["addCandidateToShortlist"]>>
) {
  return {
    ...candidate,
    sourceFreshnessAt: candidate.sourceFreshnessAt?.toISOString() ?? null,
    lastEvaluatedAt: candidate.lastEvaluatedAt?.toISOString() ?? null,
    createdAt: candidate.createdAt.toISOString(),
    updatedAt: candidate.updatedAt.toISOString()
  };
}

function serializeEmployerDispatchStatus(
  status: Awaited<ReturnType<DispatchService["getEmployerDispatchStatus"]>>
) {
  return {
    ...status,
    updatedAt: status.updatedAt?.toISOString() ?? null
  };
}

function serializeWorkerOffer(workerOffer: Awaited<ReturnType<WorkerOfferService["createOffer"]>>) {
  return {
    ...workerOffer,
    expiresAt: workerOffer.expiresAt.toISOString(),
    approvedAt: workerOffer.approvedAt?.toISOString() ?? null,
    sentAt: workerOffer.sentAt?.toISOString() ?? null,
    deliveredAt: workerOffer.deliveredAt?.toISOString() ?? null,
    viewedAt: workerOffer.viewedAt?.toISOString() ?? null,
    respondedAt: workerOffer.respondedAt?.toISOString() ?? null,
    withdrawnAt: workerOffer.withdrawnAt?.toISOString() ?? null,
    cancelledAt: workerOffer.cancelledAt?.toISOString() ?? null,
    createdAt: workerOffer.createdAt.toISOString(),
    updatedAt: workerOffer.updatedAt.toISOString(),
    currentTermsVersion: workerOffer.currentTermsVersion
      ? {
          ...workerOffer.currentTermsVersion,
          startAt: workerOffer.currentTermsVersion.startAt.toISOString(),
          endAt: workerOffer.currentTermsVersion.endAt.toISOString(),
          createdAt: workerOffer.currentTermsVersion.createdAt.toISOString()
        }
      : null
  };
}

function serializeWorkerOfferReference(
  workerOffer: Awaited<ReturnType<WorkerOfferService["workerRead"]>>
) {
  const terms = workerOffer.currentTermsVersion;
  return {
    audience: "worker",
    workerOfferId: workerOffer.id,
    jobRequestId: workerOffer.jobRequestId,
    status: workerOffer.status,
    expiresAt: workerOffer.expiresAt.toISOString(),
    title: terms?.workerVisibleTitle ?? null,
    summary: terms?.workerVisibleSummary ?? null,
    startAt: terms?.startAt.toISOString() ?? null,
    endAt: terms?.endAt.toISOString() ?? null,
    timezone: terms?.timezone ?? null,
    compensationSummary: terms?.compensationSummary ?? null,
    policySummary: terms?.policySummary ?? null,
    termsVersionId: terms?.id ?? null,
    versionToken: workerOffer.versionToken,
    visibility: "worker_authorized_offer_reference"
  };
}

function serializeCalendarProfile(
  profile: Awaited<ReturnType<CalendarRequestService["upsertClientProfile"]>>
) {
  return {
    ...profile,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString()
  };
}

function serializeCalendarRequest(
  request: Awaited<ReturnType<CalendarRequestService["getClientCalendarRequest"]>>
) {
  return {
    ...request,
    startAt: request.startAt.toISOString(),
    endAt: request.endAt.toISOString(),
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString()
  };
}

function serializeWorkerCalendarReference(
  reference: Awaited<ReturnType<CalendarRequestService["getWorkerOfferCalendarReference"]>>
) {
  return {
    ...reference,
    expiresAt: reference.expiresAt.toISOString(),
    startAt: reference.startAt?.toISOString() ?? null,
    endAt: reference.endAt?.toISOString() ?? null
  };
}

function serializeAssignment(
  assignment: Awaited<ReturnType<AssignmentService["createFromAcceptedOffer"]>>
) {
  return {
    ...assignment,
    confirmedStartAt: assignment.confirmedStartAt.toISOString(),
    confirmedEndAt: assignment.confirmedEndAt.toISOString(),
    capacityCheckedAt: assignment.capacityCheckedAt.toISOString(),
    conflictCheckedAt: assignment.conflictCheckedAt.toISOString(),
    confirmedAt: assignment.confirmedAt.toISOString(),
    workerAcknowledgedAt: assignment.workerAcknowledgedAt?.toISOString() ?? null,
    readyForAttendanceAt: assignment.readyForAttendanceAt?.toISOString() ?? null,
    attendanceWindowStartedAt: assignment.attendanceWindowStartedAt?.toISOString() ?? null,
    attendanceHandoffAt: assignment.attendanceHandoffAt?.toISOString() ?? null,
    workerWithdrawnAt: assignment.workerWithdrawnAt?.toISOString() ?? null,
    cancelledAt: assignment.cancelledAt?.toISOString() ?? null,
    replacementRequiredAt: assignment.replacementRequiredAt?.toISOString() ?? null,
    closedAt: assignment.closedAt?.toISOString() ?? null,
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString()
  };
}

function serializeWorkerAssignment(
  assignment: Awaited<ReturnType<AssignmentService["workerRead"]>>,
  jobCode?: string | null
) {
  const startAt = assignment.confirmedStartAt.toISOString();
  const endAt = assignment.confirmedEndAt.toISOString();
  // "Open in Google" + .ics for the worker's own calendar — no account linking, no OAuth.
  const calendar = buildCalendarExport({
    title: assignment.confirmedTitle,
    startAt,
    endAt,
    jobCode: jobCode ?? null,
    location: assignment.confirmedWorksiteSummary,
    uid: assignment.id,
    stampedAt: new Date().toISOString()
  });
  return {
    audience: "worker",
    assignmentId: assignment.id,
    workerOfferId: assignment.workerOfferId,
    status: assignment.status,
    title: assignment.confirmedTitle,
    roleSummary: assignment.confirmedRoleSummary,
    worksiteSummary: assignment.confirmedWorksiteSummary,
    departmentSummary: assignment.confirmedDepartmentSummary,
    responsibilitySummary: assignment.confirmedResponsibilitySummary,
    policySummary: assignment.confirmedPolicySummary,
    compensationSummary: assignment.confirmedCompensationSummary,
    startAt,
    endAt,
    timezone: assignment.timezone,
    attendanceBoundary: assignment.attendanceBoundary,
    calendar: { googleCalendarUrl: calendar.googleCalendarUrl, icsFilename: calendar.filename },
    versionToken: assignment.versionToken,
    updatedAt: assignment.updatedAt.toISOString(),
    visibility: "worker_authorized_assignment"
  };
}

function serializeEmployerAssignment(
  assignment: Awaited<ReturnType<AssignmentService["workerRead"]>>
) {
  return {
    audience: "employer",
    assignmentId: assignment.id,
    status: assignment.status,
    title: assignment.confirmedTitle,
    roleSummary: assignment.confirmedRoleSummary,
    worksiteSummary: assignment.confirmedWorksiteSummary,
    departmentSummary: assignment.confirmedDepartmentSummary,
    startAt: assignment.confirmedStartAt.toISOString(),
    endAt: assignment.confirmedEndAt.toISOString(),
    timezone: assignment.timezone,
    attendanceBoundary: assignment.attendanceBoundary,
    versionToken: assignment.versionToken,
    updatedAt: assignment.updatedAt.toISOString(),
    visibility: "employer_authorized_assignment"
  };
}

function serializeAttendanceRecord(
  attendanceRecord: Awaited<ReturnType<AttendanceService["createFromAssignment"]>>
) {
  return {
    ...attendanceRecord,
    scheduledStartAt: attendanceRecord.scheduledStartAt.toISOString(),
    scheduledEndAt: attendanceRecord.scheduledEndAt.toISOString(),
    checkInAt: attendanceRecord.checkInAt?.toISOString() ?? null,
    checkOutAt: attendanceRecord.checkOutAt?.toISOString() ?? null,
    createdAt: attendanceRecord.createdAt.toISOString(),
    updatedAt: attendanceRecord.updatedAt.toISOString(),
    completedAt: attendanceRecord.completedAt?.toISOString() ?? null,
    cancelledAt: attendanceRecord.cancelledAt?.toISOString() ?? null
  };
}

function serializeTimesheet(
  timesheet: Awaited<ReturnType<TimesheetService["createFromAttendance"]>>
) {
  return {
    ...timesheet,
    scheduledStartAt: timesheet.scheduledStartAt.toISOString(),
    scheduledEndAt: timesheet.scheduledEndAt.toISOString(),
    actualCheckInAt: timesheet.actualCheckInAt?.toISOString() ?? null,
    actualCheckOutAt: timesheet.actualCheckOutAt?.toISOString() ?? null,
    workerReviewedAt: timesheet.workerReviewedAt?.toISOString() ?? null,
    employerReviewedAt: timesheet.employerReviewedAt?.toISOString() ?? null,
    platformReviewedAt: timesheet.platformReviewedAt?.toISOString() ?? null,
    approvedAt: timesheet.approvedAt?.toISOString() ?? null,
    lockedAt: timesheet.lockedAt?.toISOString() ?? null,
    rejectedAt: timesheet.rejectedAt?.toISOString() ?? null,
    cancelledAt: timesheet.cancelledAt?.toISOString() ?? null,
    createdAt: timesheet.createdAt.toISOString(),
    updatedAt: timesheet.updatedAt.toISOString()
  };
}

function readResidenceStatus(value: string | null): ResidenceStatus | null {
  return value === "draft" ||
    value === "active" ||
    value === "restricted" ||
    value === "inactive" ||
    value === "closed"
    ? value
    : null;
}

function readResidenceLifecycleStatus(value: string | null) {
  return value === "active" || value === "inactive" || value === "closed" ? value : null;
}

function readDepartmentStatus(value: string | null): DepartmentStatus | null {
  return value === "draft" ||
    value === "active" ||
    value === "restricted" ||
    value === "inactive" ||
    value === "closed"
    ? value
    : null;
}

function readDepartmentLifecycleStatus(value: string | null) {
  return value === "active" || value === "inactive" || value === "closed" ? value : null;
}

function readWorkGroupLifecycleStatus(value: string | null) {
  return value === "active" || value === "inactive" ? value : null;
}

function readRoleDefinitionLifecycleStatus(value: string | null) {
  return value === "active" || value === "inactive" ? value : null;
}

function readJobRequestUrgency(value: string | null): JobRequestUrgency | null {
  return value === "normal" || value === "urgent" || value === "immediate" ? value : null;
}

function readJobRequestType(value: string | null): JobRequestType | null {
  return value === "single_day" || value === "multi_day" || value === "recurring_intent"
    ? value
    : null;
}

function readCalendarVerificationState(value: string | null): CalendarVerificationState | null {
  return value === "pending" ||
    value === "verified" ||
    value === "failed" ||
    value === "unavailable"
    ? value
    : null;
}

function readDispatchPriority(value: string | null): DispatchPriority | null {
  return value === "normal" || value === "urgent" || value === "emergency" ? value : null;
}

function readWorkerOfferStatus(value: string | null): WorkerOfferStatus | null {
  return value === "draft" ||
    value === "approved" ||
    value === "sent" ||
    value === "delivered" ||
    value === "viewed" ||
    value === "accepted" ||
    value === "declined" ||
    value === "expired" ||
    value === "withdrawn" ||
    value === "cancelled"
    ? value
    : null;
}

function readAssignmentStatus(value: string | null): AssignmentStatus | null {
  return value === "pending_validation" ||
    value === "confirmed" ||
    value === "worker_acknowledged" ||
    value === "ready_for_attendance" ||
    value === "in_attendance_window" ||
    value === "attendance_handoff" ||
    value === "worker_withdrawn" ||
    value === "employer_cancelled" ||
    value === "platform_cancelled" ||
    value === "replacement_required" ||
    value === "expired_before_start" ||
    value === "closed"
    ? value
    : null;
}

function readAttendanceStatus(value: string | null): AttendanceStatus | null {
  return value === "pending_start" ||
    value === "checked_in" ||
    value === "checked_out" ||
    value === "completed" ||
    value === "missed" ||
    value === "cancelled" ||
    value === "exception"
    ? value
    : null;
}

function readTimesheetStatus(value: string | null): TimesheetStatus | null {
  return value === "draft" ||
    value === "calculation_pending" ||
    value === "review_required" ||
    value === "worker_review" ||
    value === "employer_review" ||
    value === "platform_review" ||
    value === "approved" ||
    value === "locked" ||
    value === "rejected" ||
    value === "correction_required" ||
    value === "cancelled"
    ? value
    : null;
}

function createUnavailableDispatchService(): DispatchService {
  const denied = async () => {
    throw new DispatchError({
      status: "permission_denied",
      allow: false,
      dispatchReview: null,
      roles: [],
      internalReason: "dispatch_service_unavailable",
      externalCode: authorizationDeniedCode,
      externalMessage: authorizationDeniedMessage
    });
  };

  return {
    createDispatch: denied,
    listDispatches: denied,
    getDispatch: denied,
    assignOperationalOwner: denied,
    startCandidateReview: denied,
    getCandidateSourceStatus: denied,
    searchCandidates: denied,
    evaluateCandidate: denied,
    addCandidateToShortlist: denied,
    removeCandidateFromShortlist: denied,
    reorderShortlist: denied,
    markShortlistReady: denied,
    moveToOfferPreparation: denied,
    pause: denied,
    resume: denied,
    cancel: denied,
    close: denied,
    readAuditSummary: denied,
    getEmployerDispatchStatus: denied
  } as DispatchService;
}

function createUnavailableWorkerOfferService(): WorkerOfferService {
  const denied = async () => {
    throw new WorkerOfferError({
      status: "permission_denied",
      allow: false,
      workerOffer: null,
      roles: [],
      internalReason: "worker_offer_service_unavailable",
      externalCode: authorizationDeniedCode,
      externalMessage: authorizationDeniedMessage
    });
  };

  return {
    ensureWorkerIdentity: denied,
    setClassification: denied,
    createOffer: denied,
    listOffers: denied,
    readOffer: denied,
    approve: denied,
    send: denied,
    retryDelivery: denied,
    workerRead: denied,
    listWorkerOffers: denied,
    workerCalendarReference: denied,
    accept: denied,
    decline: denied,
    withdraw: denied,
    cancel: denied,
    readAuditSummary: denied
  } as WorkerOfferService;
}

function createUnavailableAssignmentService(): AssignmentService {
  const denied = async () => {
    throw new AssignmentError({
      status: "permission_denied",
      allow: false,
      assignment: null,
      roles: [],
      internalReason: "assignment_service_unavailable",
      externalCode: authorizationDeniedCode,
      externalMessage: authorizationDeniedMessage
    });
  };

  return {
    createFromAcceptedOffer: denied,
    listAssignments: denied,
    readAssignment: denied,
    workerRead: denied,
    listWorkerAssignments: denied,
    acknowledge: denied,
    workerWithdraw: denied,
    markReadyForAttendance: denied,
    startAttendanceWindow: denied,
    attendanceHandoff: denied,
    cancel: denied,
    markReplacementRequired: denied,
    readAuditSummary: denied
  } as AssignmentService;
}

function createUnavailableAttendanceService(): AttendanceService {
  const denied = async () => {
    throw new AttendanceError({
      status: "permission_denied",
      allow: false,
      attendanceRecord: null,
      roles: [],
      internalReason: "attendance_service_unavailable",
      externalCode: authorizationDeniedCode,
      externalMessage: authorizationDeniedMessage
    });
  };

  return {
    createFromAssignment: denied,
    listAttendance: denied,
    readAttendance: denied,
    workerRead: denied,
    workerCheckIn: denied,
    workerCheckOut: denied,
    markCompleted: denied,
    markMissed: denied,
    markException: denied,
    cancel: denied,
    readAuditSummary: denied
  } as AttendanceService;
}

function createUnavailableTimesheetService(): TimesheetService {
  const denied = async () => {
    throw new TimesheetError({
      status: "permission_denied",
      allow: false,
      timesheet: null,
      roles: [],
      internalReason: "timesheet_service_unavailable",
      externalCode: authorizationDeniedCode,
      externalMessage: authorizationDeniedMessage
    });
  };

  return {
    createFromAttendance: denied,
    calculate: denied,
    listTimesheets: denied,
    readTimesheet: denied,
    workerRead: denied,
    workerConfirm: denied,
    workerDispute: denied,
    employerConfirm: denied,
    employerDispute: denied,
    requestCorrection: denied,
    overrideExceptions: denied,
    approve: denied,
    reject: denied,
    lock: denied,
    readAuditSummary: denied
  } as TimesheetService;
}

function createUnavailableCalendarRequestService(): CalendarRequestService {
  const denied = async () => {
    throw new CalendarRequestError("RWOS_INVALID_CALENDAR_REQUEST");
  };

  return {
    upsertClientProfile: denied,
    updateAdminVerification: denied,
    listClientCalendar: denied,
    getClientCalendarRequest: denied,
    listAdminCalendar: denied,
    getAdminCalendarRequest: denied,
    getWorkerOfferCalendarReference: denied
  } as CalendarRequestService;
}
