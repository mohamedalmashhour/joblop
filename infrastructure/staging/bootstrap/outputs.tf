output "plan_identity" {
  value = {
    plan               = "A-bootstrap"
    project_id         = var.project_id
    region             = var.region
    approval_reference = var.approval_reference
  }
}

output "artifact_repository" {
  value = google_artifact_registry_repository.containers.name
}

output "workload_identity_provider" {
  value = google_iam_workload_identity_pool_provider.github.name
}

output "publisher_service_account" {
  value = google_service_account.publisher.email
}

output "deployer_service_account" {
  value = google_service_account.deployer.email
}
