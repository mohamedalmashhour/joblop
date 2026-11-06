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
  "job_request.admin_review",
  "job_request.request_information",
  "job_request.approve_for_dispatch",
  "dispatch.create",
  "dispatch.read",
  "dispatch.review_candidates",
  "dispatch.manage_shortlist",
  "dispatch.pause",
  "dispatch.resume",
  "dispatch.cancel",
  "dispatch.close",
  "dispatch.prepare_offer",
  "dispatch.audit_read",
  "dispatch.supervise",
  "worker_offer.create",
  "worker_offer.read",
  "worker_offer.approve",
  "worker_offer.send",
  "worker_offer.withdraw",
  "worker_offer.cancel",
  "worker_offer.audit_read",
  "worker_offer.respond",
  "worker_offer.supervise",
  "assignment.create",
  "assignment.read",
  "assignment.cancel",
  "assignment.withdraw",
  "assignment.mark_replacement_required",
  "assignment.attendance_handoff",
  "assignment.audit_read",
  "assignment.worker_read",
  "assignment.worker_acknowledge",
  "assignment.worker_withdraw",
  "assignment.supervise",
  "attendance.create",
  "attendance.read",
  "attendance.check_in",
  "attendance.check_out",
  "attendance.override",
  "attendance.cancel",
  "attendance.audit_read",
  "attendance.worker_read",
  "attendance.worker_check_in",
  "attendance.worker_check_out",
  "attendance.supervise",
  "timesheet.create",
  "timesheet.read",
  "timesheet.calculate",
  "timesheet.recalculate",
  "timesheet.review",
  "timesheet.approve",
  "timesheet.lock",
  "timesheet.reject",
  "timesheet.request_correction",
  "timesheet.adjust",
  "timesheet.audit_read",
  "timesheet.worker_read",
  "timesheet.worker_confirm",
  "timesheet.worker_dispute",
  "timesheet.employer_read",
  "timesheet.employer_confirm",
  "timesheet.employer_dispute",
  "timesheet.supervise",
  "audit.read",
  "platform.supervise"
] as const;

export const phase01AccessRoles = [
  {
    key: "PLATFORM_ADMINISTRATOR",
    scope: "platform",
    description: "Explicit platform administrator."
  },
  {
    key: "ORGANIZATION_OWNER",
    scope: "organization",
    description: "Future organization owner boundary."
  },
  {
    key: "ORGANIZATION_ADMINISTRATOR",
    scope: "organization",
    description: "Future organization administration boundary."
  },
  {
    key: "ORGANIZATION_STAFF",
    scope: "organization",
    description: "Future organization staff boundary."
  },
  { key: "WORKER_ACCESS", scope: "worker", description: "Worker account access boundary." },
  {
    key: "DISPATCHER",
    scope: "platform",
    description: "Reserved dispatch role with no active permissions until the dispatch phase."
  },
  {
    key: "TIMESHEET_REVIEWER",
    scope: "platform",
    description: "Narrow platform role for governed timesheet review, approval, and locking."
  }
] as const;

export const phase01RolePermissionMappings = [
  rolePermissions("PLATFORM_ADMINISTRATOR", [
    "platform.supervise",
    "role_definition.read",
    "job_request.admin_review",
    "job_request.request_information",
    "job_request.approve_for_dispatch",
    "dispatch.create",
    "dispatch.read",
    "dispatch.review_candidates",
    "dispatch.manage_shortlist",
    "dispatch.pause",
    "dispatch.resume",
    "dispatch.cancel",
    "dispatch.close",
    "dispatch.prepare_offer",
    "dispatch.audit_read",
    "worker_offer.create",
    "worker_offer.read",
    "worker_offer.approve",
    "worker_offer.send",
    "worker_offer.withdraw",
    "worker_offer.cancel",
    "worker_offer.audit_read",
    "assignment.create",
    "assignment.read",
    "assignment.cancel",
    "assignment.withdraw",
    "assignment.mark_replacement_required",
    "assignment.attendance_handoff",
    "assignment.audit_read",
    "attendance.create",
    "attendance.read",
    "attendance.check_in",
    "attendance.check_out",
    "attendance.override",
    "attendance.cancel",
    "attendance.audit_read",
    "timesheet.create",
    "timesheet.read",
    "timesheet.calculate",
    "timesheet.recalculate",
    "timesheet.review",
    "timesheet.approve",
    "timesheet.lock",
    "timesheet.reject",
    "timesheet.request_correction",
    "timesheet.adjust",
    "timesheet.audit_read",
    "audit.read"
  ]),
  rolePermissions("ORGANIZATION_OWNER", [
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
    "assignment.read",
    "attendance.read",
    "timesheet.employer_read",
    "timesheet.employer_confirm",
    "timesheet.employer_dispute"
  ]),
  rolePermissions("ORGANIZATION_ADMINISTRATOR", [
    "organization.read",
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
    "assignment.read",
    "attendance.read",
    "timesheet.employer_read",
    "timesheet.employer_confirm",
    "timesheet.employer_dispute"
  ]),
  rolePermissions("ORGANIZATION_STAFF", [
    "organization.read",
    "residence.read",
    "department.read",
    "work_group.read",
    "role_definition.read",
    "job_request.create",
    "job_request.read",
    "job_request.update_draft",
    "job_request.submit",
    "job_request.cancel",
    "assignment.read",
    "attendance.read",
    "timesheet.employer_read",
    "timesheet.employer_confirm",
    "timesheet.employer_dispute"
  ]),
  rolePermissions("WORKER_ACCESS", [
    "worker_offer.respond",
    "assignment.worker_read",
    "assignment.worker_acknowledge",
    "assignment.worker_withdraw",
    "attendance.worker_read",
    "attendance.worker_check_in",
    "attendance.worker_check_out",
    "timesheet.worker_read",
    "timesheet.worker_confirm",
    "timesheet.worker_dispute"
  ]),
  rolePermissions("DISPATCHER", [
    "dispatch.create",
    "dispatch.read",
    "dispatch.review_candidates",
    "dispatch.manage_shortlist",
    "dispatch.pause",
    "dispatch.resume",
    "dispatch.cancel",
    "dispatch.close",
    "dispatch.prepare_offer",
    "dispatch.audit_read",
    "worker_offer.create",
    "worker_offer.read",
    "worker_offer.approve",
    "worker_offer.send",
    "worker_offer.withdraw",
    "worker_offer.cancel",
    "worker_offer.audit_read",
    "assignment.create",
    "assignment.read",
    "assignment.cancel",
    "assignment.withdraw",
    "assignment.mark_replacement_required",
    "assignment.attendance_handoff",
    "assignment.audit_read",
    "attendance.create",
    "attendance.read",
    "attendance.check_in",
    "attendance.check_out",
    "attendance.override",
    "attendance.cancel",
    "attendance.audit_read",
    "timesheet.read"
  ]),
  rolePermissions("TIMESHEET_REVIEWER", [
    "timesheet.create",
    "timesheet.read",
    "timesheet.calculate",
    "timesheet.recalculate",
    "timesheet.review",
    "timesheet.approve",
    "timesheet.lock",
    "timesheet.reject",
    "timesheet.request_correction",
    "timesheet.adjust",
    "timesheet.audit_read"
  ])
] as const;

export const developmentWorkGroups = [
  {
    key: "kitchen",
    displayLabel: "Kitchen",
    displayOrder: 10,
    iconKey: "utensils",
    qualificationSummary: "Food-service experience and applicable food-safety readiness.",
    safetyRequirementSummary:
      "Non-slip shoes, uniform, gloves, and site orientation where required.",
    defaultTemplateKey: "kitchen_request",
    roles: [
      role("chef", "Chef", 10, "Food-service leadership and menu execution."),
      role("sous_chef", "Sous-chef", 20, "Kitchen supervision and service preparation support."),
      role("cook", "Cook", 30, "Meal preparation and station execution."),
      role(
        "kitchen_helper",
        "Kitchen helper",
        40,
        "Preparation, cleaning, and general kitchen support."
      ),
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
    safetyRequirementSummary:
      "Gloves, uniform, cleaning-product orientation, and equipment readiness.",
    defaultTemplateKey: "housekeeping_support_request",
    roles: [
      role("housekeeper", "Housekeeper", 10, "Resident-room and facility cleaning support."),
      role("laundry_worker", "Laundry worker", 20, "Laundry handling and linen support."),
      role(
        "dining_room_aide",
        "Dining-room aide",
        30,
        "Dining-room setup and meal-service support."
      ),
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
      role(
        "emergency_maintenance",
        "Emergency maintenance",
        40,
        "Urgent facility maintenance support."
      )
    ]
  },
  {
    key: "pharmacy",
    displayLabel: "Pharmacy",
    displayOrder: 50,
    iconKey: "pill",
    qualificationSummary: "Pharmacy experience; licences or registrations where the role requires them.",
    safetyRequirementSummary: "Confidentiality, safe medication handling, and site orientation.",
    defaultTemplateKey: "pharmacy_request",
    roles: [
      role("pharmacy_assistant", "Pharmacy assistant", 10, "Pharmacy assistant support."),
      role("pharmacy_technician", "Pharmacy technician", 20, "Pharmacy technician support."),
      role("pharmacy_stock_clerk", "Pharmacy stock clerk", 30, "Pharmacy stock clerk support.")
    ]
  },
  {
    key: "factory_production",
    displayLabel: "Factories / Production",
    displayOrder: 60,
    iconKey: "factory",
    qualificationSummary: "Production-line or manufacturing experience.",
    safetyRequirementSummary: "Safety shoes, PPE, and machine-safety orientation.",
    defaultTemplateKey: "factory_production_request",
    roles: [
      role("production_worker", "Production worker", 10, "Production worker support."),
      role("machine_operator", "Machine operator", 20, "Machine operator support."),
      role("assembler", "Assembler", 30, "Assembler support."),
      role("quality_inspector", "Quality inspector", 40, "Quality inspector support.")
    ]
  },
  {
    key: "warehouse_logistics",
    displayLabel: "Warehouse / Logistics",
    displayOrder: 70,
    iconKey: "warehouse",
    qualificationSummary: "Warehouse, picking, or shipping experience.",
    safetyRequirementSummary: "Safety shoes and lifting or equipment orientation.",
    defaultTemplateKey: "warehouse_logistics_request",
    roles: [
      role("warehouse_associate", "Warehouse associate", 10, "Warehouse associate support."),
      role("picker_packer", "Picker / packer", 20, "Picker / packer support."),
      role("forklift_operator", "Forklift operator", 30, "Forklift operator support."),
      role("inventory_clerk", "Inventory clerk", 40, "Inventory clerk support.")
    ]
  },
  {
    key: "construction_trades",
    displayLabel: "Construction / Trades",
    displayOrder: 80,
    iconKey: "hammer",
    qualificationSummary: "Site or trade experience; trade certification where required.",
    safetyRequirementSummary: "Hard hat, safety boots, PPE, and site safety orientation.",
    defaultTemplateKey: "construction_trades_request",
    roles: [
      role("general_labourer", "General labourer", 10, "General labourer support."),
      role("carpenter", "Carpenter", 20, "Carpenter support."),
      role("painter", "Painter", 30, "Painter support."),
      role("electrician", "Electrician", 40, "Electrician support."),
      role("plumber", "Plumber", 50, "Plumber support.")
    ]
  },
  {
    key: "retail_sales",
    displayLabel: "Retail / Sales",
    displayOrder: 90,
    iconKey: "store",
    qualificationSummary: "Customer-facing retail or sales experience.",
    safetyRequirementSummary: "Site orientation and safe-lifting awareness.",
    defaultTemplateKey: "retail_sales_request",
    roles: [
      role("sales_associate", "Sales associate", 10, "Sales associate support."),
      role("cashier", "Cashier", 20, "Cashier support."),
      role("shelf_stocker", "Shelf stocker", 30, "Shelf stocker support.")
    ]
  },
  {
    key: "hospitality_events",
    displayLabel: "Hotels / Events",
    displayOrder: 100,
    iconKey: "concierge-bell",
    qualificationSummary: "Hospitality, front-desk, or event experience.",
    safetyRequirementSummary: "Uniform and site orientation where required.",
    defaultTemplateKey: "hospitality_events_request",
    roles: [
      role("front_desk_agent", "Front desk agent", 10, "Front desk agent support."),
      role("event_staff", "Event staff", 20, "Event staff support."),
      role("server", "Server", 30, "Server support."),
      role("bartender", "Bartender", 40, "Bartender support.")
    ]
  },
  {
    key: "transport_delivery",
    displayLabel: "Transport / Delivery",
    displayOrder: 110,
    iconKey: "truck",
    qualificationSummary: "A valid driver's licence for the vehicle where driving is required.",
    safetyRequirementSummary: "Vehicle safety checks and safe-loading awareness.",
    defaultTemplateKey: "transport_delivery_request",
    roles: [
      role("delivery_driver", "Delivery driver", 10, "Delivery driver support."),
      role("courier", "Courier", 20, "Courier support."),
      role("truck_driver", "Truck driver", 30, "Truck driver support.")
    ]
  },
  {
    key: "security",
    displayLabel: "Security",
    displayOrder: 120,
    iconKey: "shield",
    qualificationSummary: "Security experience; licence where required.",
    safetyRequirementSummary: "Site orientation and incident-reporting procedures.",
    defaultTemplateKey: "security_request",
    roles: [
      role("security_guard", "Security guard", 10, "Security guard support."),
      role("site_patrol", "Site patrol", 20, "Site patrol support."),
      role("access_control_agent", "Access control agent", 30, "Access control agent support.")
    ]
  },
  {
    key: "office_admin",
    displayLabel: "Office / Admin",
    displayOrder: 130,
    iconKey: "briefcase",
    qualificationSummary: "Office, data-entry, or customer-service experience.",
    safetyRequirementSummary: "Confidentiality and workplace orientation.",
    defaultTemplateKey: "office_admin_request",
    roles: [
      role("receptionist", "Receptionist", 10, "Receptionist support."),
      role("data_entry_clerk", "Data entry clerk", 20, "Data entry clerk support."),
      role("administrative_assistant", "Administrative assistant", 30, "Administrative assistant support."),
      role("customer_service_agent", "Customer service agent", 40, "Customer service agent support.")
    ]
  },
  {
    key: "childcare_education",
    displayLabel: "Childcare / Education",
    displayOrder: 140,
    iconKey: "graduation-cap",
    qualificationSummary: "Childcare or education experience; background checks where required.",
    safetyRequirementSummary: "Child-safety procedures and site orientation.",
    defaultTemplateKey: "childcare_education_request",
    roles: [
      role("childcare_assistant", "Childcare assistant", 10, "Childcare assistant support."),
      role("teaching_assistant", "Teaching assistant", 20, "Teaching assistant support."),
      role("school_support", "School support", 30, "School support support.")
    ]
  },
  {
    key: "farming_agriculture",
    displayLabel: "Farming / Agriculture",
    displayOrder: 150,
    iconKey: "sprout",
    qualificationSummary: "Farm, greenhouse, or outdoor work experience.",
    safetyRequirementSummary: "Weather readiness, safety boots, and equipment orientation.",
    defaultTemplateKey: "farming_agriculture_request",
    roles: [
      role("farm_worker", "Farm worker", 10, "Farm worker support."),
      role("greenhouse_worker", "Greenhouse worker", 20, "Greenhouse worker support."),
      role("harvest_worker", "Harvest worker", 30, "Harvest worker support.")
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

function rolePermissions(
  accessRoleKey: string,
  permissionKeys: readonly (typeof phase01PermissionKeys)[number][]
) {
  return {
    accessRoleKey,
    permissionKeys
  };
}
