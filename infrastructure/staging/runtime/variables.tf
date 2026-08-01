variable "project_id" {
  type = string
  validation {
    condition     = length(trimspace(var.project_id)) >= 6 && !can(regex("(?i)prod|production", var.project_id))
    error_message = "Use the exact dedicated non-production project."
  }
}

variable "project_number" {
  type = string
  validation {
    condition     = can(regex("^[0-9]{6,20}$", var.project_number))
    error_message = "Use the immutable numeric project number."
  }
}

variable "region" {
  type    = string
  default = "northamerica-northeast2"
  validation {
    condition     = var.region == "northamerica-northeast2"
    error_message = "Runtime is restricted to Toronto."
  }
}

variable "network_cidr" {
  type    = string
  default = "10.80.0.0/24"
  validation {
    condition     = var.network_cidr == "10.80.0.0/24"
    error_message = "Use the reviewed non-overlapping staging CIDR."
  }
}

variable "private_service_prefix_length" {
  type    = number
  default = 24
}

variable "sql_private_service_address" {
  type    = string
  default = "10.85.251.0"
  validation {
    condition     = var.sql_private_service_address == "10.85.251.0"
    error_message = "Use the reviewed dedicated Cloud SQL private-service range."
  }
}

variable "deployer_service_account_email" {
  type = string
  validation {
    condition     = can(regex("^sa-rwos-stg-deployer@.+\\.iam\\.gserviceaccount\\.com$", var.deployer_service_account_email))
    error_message = "Use the Plan A staging deployer identity."
  }
}

variable "artifact_repository_id" {
  type    = string
  default = "rwos-stg-ca-tor-containers"
}

variable "deploy_runtime_services" {
  type        = bool
  default     = false
  description = "Fail-closed gate: create Cloud Run services only after secret versions and runtime inputs are ready."
}

variable "deploy_monitoring_alerts" {
  type        = bool
  default     = false
  description = "Fail-closed gate: create notification-backed alerts only after an approved channel exists."
}

variable "images_published_approval_reference" {
  type = string
  validation {
    condition     = length(trimspace(var.images_published_approval_reference)) >= 12
    error_message = "Plan B is blocked until all eight immutable images are published and reviewed."
  }
}

variable "image_digests" {
  type = map(string)
  validation {
    condition = toset(keys(var.image_digests)) == toset([
      "api", "employer", "admin", "worker", "auth-limiter",
      "candidate-source", "offer-delivery", "qa-reset"
      ]) && alltrue([
      for image in values(var.image_digests) :
      can(regex("^northamerica-northeast2-docker\\.pkg\\.dev/.+@sha256:[a-f0-9]{64}$", image))
    ])
    error_message = "Provide all eight published Toronto Artifact Registry image digests."
  }
}

variable "service_environment" {
  type = map(map(string))
  validation {
    condition = !var.deploy_runtime_services || (toset(keys(var.service_environment)) == toset([
      "api", "employer", "admin", "worker", "auth-limiter",
      "candidate-source", "offer-delivery", "qa-reset"
      ]) && alltrue([
      for service, required in {
        api              = ["RWOS_ENV", "NODE_ENV", "INTERNAL_API_ORIGIN", "PASSWORD_RESET_PUBLIC_ORIGIN", "AUTH_RATE_LIMITER_ORIGIN", "AUTH_RATE_LIMITER_KEY_ID", "AUTH_RATE_LIMITER_NAMESPACE", "CANDIDATE_SOURCE_ORIGIN", "OFFER_DELIVERY_ORIGIN", "STRIPE_TEST_MODE_ENABLED", "EMPLOYER_SELF_REGISTRATION_ENABLED"]
        employer         = ["RWOS_ENV", "NODE_ENV", "INTERNAL_API_ORIGIN"]
        admin            = ["RWOS_ENV", "NODE_ENV", "INTERNAL_API_ORIGIN"]
        worker           = ["RWOS_ENV", "NODE_ENV", "EXPO_PUBLIC_RWOS_API_ORIGIN"]
        auth-limiter     = ["RWOS_ENV", "AUTH_LIMITER_NAMESPACE", "AUTH_LIMITER_CURRENT_KEY_ID", "AUTH_LIMITER_AUTH_MODE", "AUTH_LIMITER_AUDIENCE", "AUTH_LIMITER_API_SERVICE_ACCOUNT", "AUTH_LIMITER_RELEASE_SHA"]
        candidate-source = ["RWOS_ENV", "CANDIDATE_ADAPTER_AUTH_MODE", "CANDIDATE_ADAPTER_AUDIENCE", "CANDIDATE_ADAPTER_API_SERVICE_ACCOUNT", "CANDIDATE_ADAPTER_RELEASE_SHA", "CANDIDATE_ADAPTER_TENANT_A_ID", "CANDIDATE_ADAPTER_TENANT_A_WORK_GROUP_ID", "CANDIDATE_ADAPTER_TENANT_A_ROLE_DEFINITION_ID", "CANDIDATE_ADAPTER_TENANT_B_ID", "CANDIDATE_ADAPTER_TENANT_B_WORK_GROUP_ID", "CANDIDATE_ADAPTER_TENANT_B_ROLE_DEFINITION_ID"]
        offer-delivery   = ["RWOS_ENV", "OFFER_DELIVERY_ADAPTER_AUTH_MODE", "OFFER_DELIVERY_ADAPTER_AUDIENCE", "OFFER_DELIVERY_ADAPTER_API_SERVICE_ACCOUNT", "OFFER_DELIVERY_ADAPTER_RELEASE_SHA", "OFFER_DELIVERY_ADAPTER_TENANT_A_ID", "OFFER_DELIVERY_ADAPTER_TENANT_B_ID"]
        qa-reset         = ["RWOS_ENV", "QA_RESET_PERSISTENCE_MODE", "QA_RESET_AUTH_MODE", "QA_RESET_AUDIENCE", "QA_RESET_RELEASE_SHA", "QA_RESET_PROJECT_ID", "QA_RESET_CLUSTER_ID", "QA_RESET_DATABASE_ID", "QA_RESET_AUTHORITY_ID", "QA_RESET_TENANT_A_ID", "QA_RESET_TENANT_B_ID", "QA_RESET_WORK_GROUP_ID", "QA_RESET_ROLE_DEFINITION_ID", "QA_RESET_ORGANIZATION_OWNER_ACCESS_ROLE_ID", "QA_RESET_NAMESPACE", "QA_RESET_MANIFEST_ID", "QA_RESET_MANIFEST_CHECKSUM", "QA_RESET_MANIFEST_CREATED_AT", "QA_RESET_MANIFEST_EXPIRES_AT", "QA_RESET_DRY_RUN_APPROVAL_REFERENCE", "QA_RESET_PREPARE_APPROVAL_REFERENCE", "QA_RESET_CLEANUP_APPROVAL_REFERENCE", "QA_RESET_BROWSER_E2E_SERVICE_ACCOUNT", "QA_RESET_IOS_E2E_SERVICE_ACCOUNT", "QA_RESET_ANDROID_E2E_SERVICE_ACCOUNT", "QA_RESET_MANUAL_QA_SERVICE_ACCOUNT", "QA_RESET_MONITORING_SERVICE_ACCOUNT", "QA_RESET_BROWSER_E2E_OPERATOR_IDENTITY", "QA_RESET_IOS_E2E_OPERATOR_IDENTITY", "QA_RESET_ANDROID_E2E_OPERATOR_IDENTITY", "QA_RESET_MANUAL_QA_OPERATOR_IDENTITY"]
      } : alltrue([for name in required : contains(keys(var.service_environment[service]), name)])
    ]))
    error_message = "Provide every required non-secret environment contract field for every service."
  }
}

variable "service_secret_environment" {
  type = map(map(string))
  validation {
    condition = !var.deploy_runtime_services || (toset(keys(var.service_secret_environment)) == toset([
      "api", "employer", "admin", "worker", "auth-limiter",
      "candidate-source", "offer-delivery", "qa-reset"
      ]) && alltrue([
      for service, required in {
        api              = ["DATABASE_URL", "SESSION_SECRET", "AUTH_RATE_LIMITER_TOKEN", "AUTH_RATE_LIMITER_KEY_SECRET", "CANDIDATE_SOURCE_TOKEN", "OFFER_DELIVERY_TOKEN"]
        auth-limiter     = ["AUTH_LIMITER_SERVICE_TOKEN", "AUTH_LIMITER_HMAC_SECRET"]
        candidate-source = ["CANDIDATE_ADAPTER_SERVICE_TOKEN"]
        offer-delivery   = ["OFFER_DELIVERY_ADAPTER_SERVICE_TOKEN"]
        qa-reset         = ["DATABASE_URL", "QA_RESET_BROWSER_E2E_APP_CREDENTIAL", "QA_RESET_IOS_E2E_APP_CREDENTIAL", "QA_RESET_ANDROID_E2E_APP_CREDENTIAL", "QA_RESET_MANUAL_QA_APP_CREDENTIAL", "QA_RESET_MONITORING_APP_CREDENTIAL"]
      } : alltrue([for name in required : contains(keys(var.service_secret_environment[service]), name)])
    ]))
    error_message = "Provide every required least-privilege secret contract field."
  }
}

variable "monitoring_notification_channels" {
  type = set(string)
  validation {
    condition     = !var.deploy_monitoring_alerts || length(var.monitoring_notification_channels) > 0
    error_message = "Plan B requires an approved monitoring owner and notification channel."
  }
}

variable "database_disk_size_gb" {
  type    = number
  default = 10
}

variable "database_disk_autoresize_limit_gb" {
  type    = number
  default = 20
  validation {
    condition     = var.database_disk_autoresize_limit_gb >= var.database_disk_size_gb && var.database_disk_autoresize_limit_gb <= 20
    error_message = "Cloud SQL disk growth is capped at the reviewed 20 GiB staging limit."
  }
}

variable "log_retention_days" {
  type    = number
  default = 14
  validation {
    condition     = var.log_retention_days >= 1 && var.log_retention_days <= 30
    error_message = "Staging application logs must expire within 30 days."
  }
}
