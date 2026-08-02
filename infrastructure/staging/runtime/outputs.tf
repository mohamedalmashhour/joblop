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

output "staging_public_ingress" {
  value = var.deploy_staging_domains ? {
    ipv4    = google_compute_global_address.public_https[0].address
    domains = var.staging_domain_names
  } : null
}
