export type DevelopmentRoleDefinition = {
  key: string;
  displayLabel: string;
  displayOrder: number;
  localizedLabelKey: string;
  qualificationSummary: string;
  safetyRequirementSummary: string;
};

export type DevelopmentWorkGroup = {
  key: string;
  displayLabel: string;
  displayOrder: number;
  iconKey: string;
  qualificationSummary: string;
  safetyRequirementSummary: string;
  defaultTemplateKey: string;
  roles: readonly DevelopmentRoleDefinition[];
};

export const phase01PermissionKeys = [
  "organization.read",
  "organization.update",
  "residence.read",
  "residence.create",
  "residence.update",
  "department.read",
  "department.create",
  "department.update",
  "work_group.read",
  "role_definition.read",
  "job_request.create",
  "job_request.read",
  "job_request.update_draft",
  "job_request.submit",
  "job_request.cancel",
  "job_request.admin_read",
  "job_request.request_information",
  "job_request.approve_for_dispatch",
  "platform.supervise",
  "audit_actor_reference.read",
  "audit_event.read"
] as const;

export const phase01AccessRoles = [
  { key: "WORKER", scope: "worker", description: "Worker account access boundary." },
  { key: "EMPLOYER_OWNER", scope: "organization", description: "Employer organization owner." },
  { key: "EMPLOYER_SCHEDULER", scope: "organization", description: "Employer staffing scheduler." },
  { key: "DISPATCHER", scope: "platform", description: "Admin dispatch and intake operator." },
  {
    key: "COMPLIANCE_REVIEWER",
    scope: "platform",
    description: "Admin compliance review operator."
  },
  { key: "FINANCE_REVIEWER", scope: "platform", description: "Admin finance review operator." },
  { key: "SUPPORT_AGENT", scope: "platform", description: "Admin support operator." },
  { key: "PLATFORM_ADMIN", scope: "platform", description: "Platform administration role." },
  { key: "READ_ONLY_AUDITOR", scope: "platform", description: "Read-only audit visibility role." }
] as const;

export const developmentWorkGroups = [
  {
    key: "kitchen",
    displayLabel: "Kitchen",
    displayOrder: 10,
    iconKey: "utensils",
    qualificationSummary: "Food-service experience and applicable food-safety readiness.",
    safetyRequirementSummary: "Non-slip shoes, uniform, gloves, and site orientation where required.",
    defaultTemplateKey: "kitchen_request",
    roles: [
      role("chef", "Chef", 10, "Food-service leadership and menu execution."),
      role("sous_chef", "Sous-chef", 20, "Kitchen supervision and service preparation support."),
      role("cook", "Cook", 30, "Meal preparation and station execution."),
      role("kitchen_helper", "Kitchen helper", 40, "Preparation, cleaning, and general kitchen support."),
      role("dishwasher", "Dishwasher", 50, "Dishwashing, sanitation, and back-of-house support.")
    ]
  },
  {
    key: "care_nursing",
    displayLabel: "Care / Nursing",
    displayOrder: 20,
    iconKey: "heart-pulse",
    qualificationSummary: "Care experience, licence, or certification review where applicable.",
    safetyRequirementSummary: "Orientation, PPE, and lawful role-specific safety requirements.",
    defaultTemplateKey: "care_nursing_request",
    roles: [
      role("nurse", "Nurse", 10, "Regulated nursing role requiring appropriate review."),
      role(
        "licensed_practical_nurse",
        "Licensed practical nurse",
        20,
        "Regulated practical nursing role requiring appropriate review."
      ),
      role(
        "personal_support_worker",
        "Personal support worker",
        30,
        "Resident support and care assistance role."
      ),
      role("care_aide", "Care aide", 40, "Care assistance and resident support role.")
    ]
  },
  {
    key: "housekeeping_support",
    displayLabel: "Housekeeping / Support",
    displayOrder: 30,
    iconKey: "sparkles",
    qualificationSummary: "Facility support, cleaning, laundry, or dining-room experience.",
    safetyRequirementSummary: "Gloves, uniform, cleaning-product orientation, and equipment readiness.",
    defaultTemplateKey: "housekeeping_support_request",
    roles: [
      role("housekeeper", "Housekeeper", 10, "Resident-room and facility cleaning support."),
      role("laundry_worker", "Laundry worker", 20, "Laundry handling and linen support."),
      role("dining_room_aide", "Dining-room aide", 30, "Dining-room setup and meal-service support."),
      role("general_support", "General support", 40, "General facility support role.")
    ]
  },
  {
    key: "maintenance",
    displayLabel: "Maintenance",
    displayOrder: 40,
    iconKey: "wrench",
    qualificationSummary: "Facility maintenance, repair, or emergency maintenance readiness.",
    safetyRequirementSummary: "Safety shoes, tools, PPE, and site-specific safety orientation.",
    defaultTemplateKey: "maintenance_request",
    roles: [
      role("general_maintenance", "General maintenance", 10, "General maintenance support."),
      role("repair_technician", "Repair technician", 20, "Repair and troubleshooting support."),
      role("facility_support", "Facility support", 30, "Facility operations support."),
      role("emergency_maintenance", "Emergency maintenance", 40, "Urgent facility maintenance support.")
    ]
  }
] as const satisfies readonly DevelopmentWorkGroup[];

function role(
  key: string,
  displayLabel: string,
  displayOrder: number,
  qualificationSummary: string
): DevelopmentRoleDefinition {
  return {
    key,
    displayLabel,
    displayOrder,
    localizedLabelKey: `role.${key}`,
    qualificationSummary,
    safetyRequirementSummary: "Review site safety requirements before dispatch."
  };
}
