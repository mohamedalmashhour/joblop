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
    error_message = "Terraform state is restricted to Toronto."
  }
}

variable "state_bucket_name" {
  type = string
  validation {
    condition     = var.state_bucket_name == "${var.project_id}-tfstate-${var.project_number}"
    error_message = "Use the deterministic dedicated staging state-bucket name."
  }
}

variable "terraform_operator_member" {
  type      = string
  sensitive = true
  validation {
    condition     = can(regex("^(user|serviceAccount):[^@[:space:]]+@[^@[:space:]]+$", var.terraform_operator_member))
    error_message = "Provide one verified Terraform operator principal through ignored local input."
  }
}

variable "approved_release_sha" {
  type = string
  validation {
    condition     = can(regex("^[0-9a-f]{40}$", var.approved_release_sha))
    error_message = "Provide the exact approved 40-character release SHA."
  }
}

variable "approval_reference" {
  type = string
  validation {
    condition     = length(trimspace(var.approval_reference)) >= 12
    error_message = "Plan 0 requires an exact owner approval reference."
  }
}
