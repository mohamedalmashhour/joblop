resource "google_storage_bucket" "terraform_state" {
  name          = var.state_bucket_name
  project       = var.project_id
  location      = var.region
  storage_class = "STANDARD"

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false

  versioning {
    enabled = true
  }

  soft_delete_policy {
    retention_duration_seconds = 604800
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      days_since_noncurrent_time = 90
      num_newer_versions         = 20
    }
  }

  labels = {
    application = "resident-workforce-os"
    environment = "staging"
    purpose     = "terraform-state"
  }
}

resource "google_storage_bucket_iam_member" "terraform_operator" {
  bucket = google_storage_bucket.terraform_state.name
  role   = "roles/storage.objectAdmin"
  member = var.terraform_operator_member
}
