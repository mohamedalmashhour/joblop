variable "environment" {
  type    = string
  default = "staging"
  validation {
    condition     = var.environment == "staging"
    error_message = "This package is staging-only."
  }
}

variable "region" {
  type    = string
  default = "northamerica-northeast2"
  validation {
    condition     = var.region == "northamerica-northeast2"
    error_message = "Staging is restricted to the approved Toronto region."
  }
}

variable "project_id" {
  type = string
  validation {
    condition     = length(trimspace(var.project_id)) >= 6 && !can(regex("(?i)prod|production", var.project_id))
    error_message = "Provide the exact dedicated non-production GCP project ID."
  }
}

variable "project_number" {
  type = string
  validation {
    condition     = can(regex("^[0-9]{6,20}$", var.project_number))
    error_message = "Provide the immutable numeric GCP project number."
  }
}

variable "deployment_authorization_reference" {
  type        = string
  description = "Non-secret owner approval record for this exact staging plan."
  validation {
    condition     = length(trimspace(var.deployment_authorization_reference)) >= 8
    error_message = "Explicit staging deployment authorization is required."
  }
}

variable "maximum_monthly_budget_amount" {
  type = number
  validation {
    condition     = var.maximum_monthly_budget_amount > 0
    error_message = "An explicit positive monthly staging ceiling is required."
  }
}

variable "budget_currency" {
  type = string
  validation {
    condition     = contains(["CAD", "USD"], var.budget_currency)
    error_message = "Budget currency must be explicitly CAD or USD."
  }
}

variable "network_cidr" {
  type = string
  validation {
    condition     = can(cidrhost(var.network_cidr, 1))
    error_message = "Provide an approved Cloud Run subnet CIDR."
  }
}

variable "private_service_prefix_length" {
  type    = number
  default = 24
  validation {
    condition     = var.private_service_prefix_length >= 16 && var.private_service_prefix_length <= 24
    error_message = "Private service prefix must be between /16 and /24."
  }
}

variable "github_repository" {
  type = string
  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", var.github_repository))
    error_message = "Use the exact owner/repository WIF subject."
  }
}

variable "image_digests" {
  type = map(string)
  validation {
    condition = setequals(
      toset(keys(var.image_digests)),
      toset(["api", "employer", "admin", "worker", "auth-limiter", "candidate-source", "offer-delivery", "qa-reset"])
      ) && alltrue([
        for image in values(var.image_digests) : can(regex("@sha256:[a-f0-9]{64}$", image))
    ])
    error_message = "Provide all eight immutable image references by sha256 digest."
  }
}

variable "secret_names" {
  type = set(string)
  validation {
    condition = length(var.secret_names) > 0 && alltrue([
      for name in var.secret_names : can(regex("^rwos-staging-[a-z0-9-]+$", name))
    ])
    error_message = "Provide approved staging Secret Manager names only."
  }
}

variable "database_tier" {
  type    = string
  default = "db-custom-1-3840"
}

variable "redis_memory_size_gb" {
  type    = number
  default = 1
}

variable "backup_retention_count" {
  type = number
  validation {
    condition     = var.backup_retention_count >= 7 && var.backup_retention_count <= 365
    error_message = "An approved backup retention count from 7 to 365 is required."
  }
}

variable "deletion_protection" {
  type    = bool
  default = true
  validation {
    condition     = var.deletion_protection
    error_message = "Staging database deletion protection must remain enabled."
  }
}
