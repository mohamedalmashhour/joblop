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

variable "monthly_budget_usd" {
  type    = number
  default = 300
  validation {
    condition     = var.monthly_budget_usd > 0 && var.monthly_budget_usd <= 300
    error_message = "The staging budget may not exceed the approved USD 300 planning ceiling."
  }
}

variable "github_repository" {
  type    = string
  default = "drmmashhour-ux/resident-workforce-os"
}

variable "approval_reference" {
  type = string
  validation {
    condition     = length(trimspace(var.approval_reference)) >= 12
    error_message = "Plan A requires an exact owner approval reference."
  }
}
