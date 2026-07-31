output "plan_identity" {
  value = {
    plan                 = "0-state-bootstrap"
    project_id           = var.project_id
    region               = var.region
    state_bucket         = google_storage_bucket.terraform_state.name
    approved_release_sha = var.approved_release_sha
    approval_reference   = var.approval_reference
  }
}
