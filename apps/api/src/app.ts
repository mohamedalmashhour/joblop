import { createHmac } from "node:crypto";
import Fastify, { type FastifyReply } from "fastify";
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
  createHttpWorkerOfferDeliveryProvider,
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
  type EmployerReduceService,
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
import { getRuntimeConfig } from "@rwos/config";
import { createPrismaClient } from "@rwos/database";
import { createLogger } from "@rwos/observability";
import { createLocalFakePaymentProvider } from "@rwos/shared";
import {
  createTrustedServiceIdentityHeaders,
  type IdentityTokenProvider,
  type TrustedAudienceRegistry,
  type TrustedService
} from "@rwos/service-auth";
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
import { createPrismaDocumentMetadataRepository } from "./documentUploadRepository";
import { registerDocumentRoutes } from "./documentRoutes";
import { registerInvoiceRoutes } from "./invoiceRoutes";
import { createPrismaInvoiceRepository, type InvoiceRepository } from "./invoiceRepository";
import { registerPaymentRoutes } from "./paymentRoutes";
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
  publicWorkerIngressOnly?: boolean;
  publicWorkerWebOrigin?: string;
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
  const app = Fastify({
    logger: false,
    trustProxy: runtimeConfig.rwosEnv === "production" ? "loopback" : false
  });
  const logger = createLogger("api");

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
      : createMemoryAuthenticationRateLimiter());
  const prisma = options.authService ? null : createPrismaClient(runtimeConfig.databaseUrl);
  const authenticationRepository = prisma ? createPrismaAuthenticationRepository(prisma) : null;
  const emailSender =
    options.emailSender ??
    createEmailSender({
      apiKey: runtimeConfig.resendApiKey,
      from: runtimeConfig.emailFrom
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
      }
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
      authorizationService
    );
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
            : undefined
        )
      : createUnavailableDispatchService());
  const workerOfferService =
    options.workerOfferService ??
    (prisma
      ? createWorkerOfferService(
          createPrismaWorkerOfferRepository(prisma),
          createPrismaDispatchRepository(prisma),
          createPrismaJobRequestRepository(prisma),
          authorizationService,
          {
            ...(runtimeConfig.hasOfferDelivery
              ? {
                  deliveryProvider: createHttpWorkerOfferDeliveryProvider({
                    origin: runtimeConfig.offerDeliveryOrigin!,
                    token: runtimeConfig.offerDeliveryToken!,
                    ...(options.trustedServiceIdentity
                      ? {
                          trustedIdentityHeaders: trustedIdentityHeaders(
                            options.trustedServiceIdentity,
                            "offer-delivery"
                          )
                        }
                      : {})
                  })
                }
              : {})
          }
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
          workerOfferAccess: workerOfferService
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
      return sendAttendanceDenied(reply);
    }

    if (error instanceof TimesheetError) {
      return sendTimesheetDenied(reply);
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

    return reply.code(201).send({ jobRequest: serializeJobRequest(jobRequest) });
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
        expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
      });

      return reply.code(200).send({ jobRequest: serializeJobRequest(jobRequest) });
    }
  );

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

    return reply
      .code(200)
      .send({ dispatches: dispatches.map((item) => serializeDispatchReview(item)) });
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

    return reply.code(200).send({
      dispatchReview: serializeDispatchReview(result.dispatchReview),
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

    const body = asRecord(request.body);
    const workerOffer = await workerOfferService.accept({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      workerOfferId: readRouteParam(request.params, "workerOfferId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      expectedTermsVersionId: readRequiredString(body, "expectedTermsVersionId") ?? "",
      reason: readOptionalString(body, "reason")
    });

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

    return reply.code(201).send({ assignment: serializeAssignment(assignment) });
  });

  app.get("/platform/assignments", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const query = asRecord(request.query);
    const status = readAssignmentStatus(readOptionalString(query, "status"));
    const assignments = await assignmentService.listAssignments({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readOptionalString(query, "dispatchReviewId"),
      organizationId: readOptionalString(query, "organizationId"),
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

    return reply.code(200).send({ assignment: serializeWorkerAssignment(assignment) });
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
    const assignment = await assignmentService.workerWithdraw({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      assignmentId: readRouteParam(request.params, "assignmentId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? ""
    });

    return reply.code(200).send({ assignment: serializeWorkerAssignment(assignment) });
  });

  app.post("/platform/attendance", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAttendanceDenied(reply);

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
    if (!session.authenticated || !session.user) return sendAttendanceDenied(reply);

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
    if (!session.authenticated || !session.user) return sendAttendanceDenied(reply);

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
    if (!session.authenticated || !session.user) return sendAttendanceDenied(reply);

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
    if (!session.authenticated || !session.user) return sendAttendanceDenied(reply);

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
    if (!session.authenticated || !session.user) return sendAttendanceDenied(reply);

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
    if (!session.authenticated || !session.user) return sendAttendanceDenied(reply);

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
    if (!session.authenticated || !session.user) return sendAttendanceDenied(reply);

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
    if (!session.authenticated || !session.user) return sendAttendanceDenied(reply);

    const query = asRecord(request.query);
    const status = readAttendanceStatus(readOptionalString(query, "status"));
    const organizationId = readRouteParam(request.params, "organizationId");
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
    if (!session.authenticated || !session.user) return sendAttendanceDenied(reply);

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
    if (!session.authenticated || !session.user) return sendAttendanceDenied(reply);

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
    if (!session.authenticated || !session.user) return sendAttendanceDenied(reply);

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

  app.post("/platform/timesheets", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

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
    if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

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
    if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

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
    if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

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
    if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

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

  app.post("/platform/timesheets/:timesheetId/approve", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

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
    if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

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
    if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

    const body = asRecord(request.body);
    const timesheet = await timesheetService.lock({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      timesheetId: readRouteParam(request.params, "timesheetId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ timesheet: serializeTimesheet(timesheet) });
  });

  app.get("/platform/timesheets/:timesheetId/audit", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

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
    if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

    const query = asRecord(request.query);
    const status = readTimesheetStatus(readOptionalString(query, "status"));
    const organizationId = readRouteParam(request.params, "organizationId");
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
      if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

      const organizationId = readRouteParam(request.params, "organizationId");
      const timesheetId = readRouteParam(request.params, "timesheetId");
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
      if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

      const organizationId = readRouteParam(request.params, "organizationId");
      const timesheetId = readRouteParam(request.params, "timesheetId");
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
    if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

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
    if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

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
    if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

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

function sendTimesheetDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
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
  assignment: Awaited<ReturnType<AssignmentService["workerRead"]>>
) {
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
    startAt: assignment.confirmedStartAt.toISOString(),
    endAt: assignment.confirmedEndAt.toISOString(),
    timezone: assignment.timezone,
    attendanceBoundary: assignment.attendanceBoundary,
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
