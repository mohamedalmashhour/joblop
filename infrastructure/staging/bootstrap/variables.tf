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
    error_message = "Bootstrap is restricted to Toronto."
  }
}

variable "billing_account" {
  type      = string
  sensitive = true
  validation {
    condition     = can(regex("^[A-F0-9]{6}-[A-F0-9]{6}-[A-F0-9]{6}$", var.billing_account))
    error_message = "Provide the billing account reference through the ignored local input only."
  }
}

variable "monthly_budget_cad" {
  type    = number
  default = 500
  validation {
    condition     = var.monthly_budget_cad > 0 && var.monthly_budget_cad <= 500
    error_message = "The staging budget may not exceed the proposed CAD 500 ceiling."
  }
}

variable "github_repository" {
  type    = string
  default = "drmmashhour-ux/resident-workforce-os"
  validation {
    condition     = var.github_repository == "drmmashhour-ux/resident-workforce-os"
    error_message = "Plan A is restricted to the approved private GitHub repository."
  }
}

variable "github_environment" {
  type    = string
  default = "staging"
  validation {
    condition     = var.github_environment == "staging"
    error_message = "Plan A workload identity is restricted to the staging environment."
  }
}

variable "approved_release_sha" {
  type = string
  validation {
    condition     = can(regex("^[0-9a-f]{40}$", var.approved_release_sha))
    error_message = "Provide the exact approved 40-character release SHA."
  }
}

variable "budget_notification_email" {
  type      = string
  sensitive = true
  validation {
    condition     = can(regex("^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$", var.budget_notification_email))
    error_message = "Provide the verified project-owner email through ignored local input only."
  }
}

variable "state_bucket_name" {
  type = string
  validation {
    condition     = var.state_bucket_name == "${var.project_id}-tfstate-${var.project_number}"
    error_message = "Use the dedicated Plan 0 staging state bucket."
  }
}

variable "approval_reference" {
  type = string
  validation {
    condition     = length(trimspace(var.approval_reference)) >= 12
    error_message = "Plan A requires an exact owner approval reference."
  }
}
