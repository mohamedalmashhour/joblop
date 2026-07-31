output "plan_identity" {
  value = {
    plan                                = "B-runtime"
    project_id                          = var.project_id
    region                              = var.region
    images_published_approval_reference = var.images_published_approval_reference
  }
}

output "service_names" {
  value = { for name, service in google_cloud_run_v2_service.service : name => service.name }
}
