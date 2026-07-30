output "project_identity" {
  value = {
    id     = var.project_id
    number = var.project_number
    region = var.region
  }
}

output "service_names" {
  value = { for name, service in google_cloud_run_v2_service.service : name => service.name }
}

output "database_instance_name" {
  value = google_sql_database_instance.postgres.name
}

output "redis_instance_name" {
  value = google_redis_instance.limiter.name
}

output "workload_identity_provider_name" {
  value = google_iam_workload_identity_pool_provider.github.name
}

output "deployer_service_account_email" {
  value = google_service_account.deployer.email
}
