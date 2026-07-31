locals {
  prefix           = "rwos-stg-ca-tor"
  github_principal = "principalSet://iam.googleapis.com/projects/${var.project_number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github.workload_identity_pool_id}/attribute.repository/${var.github_repository}"
}

resource "google_artifact_registry_repository" "containers" {
  location      = var.region
  repository_id = "${local.prefix}-containers"
  format        = "DOCKER"
  description   = "Immutable Resident Workforce OS staging images"

  cleanup_policies {
    id     = "delete-untagged-after-seven-days"
    action = "DELETE"
    condition {
      tag_state  = "UNTAGGED"
      older_than = "604800s"
    }
  }
}

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "rwos-staging-github"
  display_name              = "RWOS staging GitHub"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  display_name                       = "GitHub Actions"
  attribute_mapping = {
    "google.subject"             = "assertion.sub"
    "attribute.environment"      = "assertion.environment"
    "attribute.repository"       = "assertion.repository"
    "attribute.ref"              = "assertion.ref"
    "attribute.repository_owner" = "assertion.repository_owner"
    "attribute.sha"              = "assertion.sha"
  }
  attribute_condition = "assertion.repository == '${var.github_repository}' && assertion.ref == 'refs/heads/main' && assertion.environment == '${var.github_environment}' && assertion.sha == '${var.approved_release_sha}'"
  oidc { issuer_uri = "https://token.actions.githubusercontent.com" }
}

resource "google_service_account" "publisher" {
  account_id   = "sa-rwos-stg-publisher"
  display_name = "RWOS staging image publisher"
}

resource "google_service_account" "deployer" {
  account_id   = "sa-rwos-stg-deployer"
  display_name = "RWOS staging deployer"
}

resource "google_service_account_iam_member" "github_publisher" {
  service_account_id = google_service_account.publisher.name
  role               = "roles/iam.workloadIdentityUser"
  member             = local.github_principal
}

resource "google_service_account_iam_member" "github_deployer" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = local.github_principal
}

resource "google_artifact_registry_repository_iam_member" "publisher" {
  location   = google_artifact_registry_repository.containers.location
  repository = google_artifact_registry_repository.containers.name
  role       = "roles/artifactregistry.writer"
  member     = google_service_account.publisher.member
}

resource "google_artifact_registry_repository_iam_member" "deployer_reader" {
  location   = google_artifact_registry_repository.containers.location
  repository = google_artifact_registry_repository.containers.name
  role       = "roles/artifactregistry.reader"
  member     = google_service_account.deployer.member
}

resource "google_project_iam_member" "deployer_run_developer" {
  project = var.project_id
  role    = "roles/run.developer"
  member  = google_service_account.deployer.member
}

resource "google_storage_bucket_iam_member" "deployer_state" {
  bucket = var.state_bucket_name
  role   = "roles/storage.objectAdmin"
  member = google_service_account.deployer.member
}

resource "google_billing_budget" "staging" {
  billing_account = var.billing_account
  display_name    = "RWOS staging CAD ${var.monthly_budget_cad} alert"
  budget_filter {
    projects = ["projects/${var.project_number}"]
  }
  amount {
    specified_amount {
      currency_code = "CAD"
      units         = tostring(var.monthly_budget_cad)
    }
  }
  threshold_rules { threshold_percent = 0.33 }
  threshold_rules { threshold_percent = 0.67 }
  threshold_rules { threshold_percent = 0.9 }
  threshold_rules { threshold_percent = 1.0 }

  all_updates_rule {
    monitoring_notification_channels = [
      google_monitoring_notification_channel.budget_owner.name,
    ]
    disable_default_iam_recipients = false
  }
}

resource "google_monitoring_notification_channel" "budget_owner" {
  display_name = "RWOS staging project owner budget alerts"
  type         = "email"
  labels = {
    email_address = var.budget_notification_email
  }
  force_delete = false
}
