locals {
  prefix = "rwos-stg-ca-tor"
  services = {
    api              = { cpu = "1", memory = "512Mi", concurrency = 20, max = 4 }
    employer         = { cpu = "1", memory = "512Mi", concurrency = 40, max = 2 }
    admin            = { cpu = "1", memory = "512Mi", concurrency = 40, max = 2 }
    worker           = { cpu = "1", memory = "512Mi", concurrency = 40, max = 2 }
    auth-limiter     = { cpu = "0.5", memory = "256Mi", concurrency = 80, max = 2 }
    candidate-source = { cpu = "0.5", memory = "512Mi", concurrency = 1, max = 2 }
    offer-delivery   = { cpu = "0.5", memory = "512Mi", concurrency = 1, max = 2 }
    qa-reset         = { cpu = "0.5", memory = "512Mi", concurrency = 1, max = 1 }
  }
}

resource "google_compute_network" "staging" {
  name                    = "${local.prefix}-vpc"
  auto_create_subnetworks = false
}

resource "google_artifact_registry_repository" "containers" {
  location      = var.region
  repository_id = "${local.prefix}-containers"
  format        = "DOCKER"
  description   = "Immutable Resident Workforce OS staging images"
}

resource "google_compute_subnetwork" "cloud_run" {
  name          = "${local.prefix}-run-subnet"
  region        = var.region
  network       = google_compute_network.staging.id
  ip_cidr_range = var.network_cidr
}

resource "google_compute_global_address" "private_services" {
  name          = "${local.prefix}-psa-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = var.private_service_prefix_length
  network       = google_compute_network.staging.id
}

resource "google_service_networking_connection" "private_services" {
  network                 = google_compute_network.staging.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_services.name]
}

resource "google_sql_database_instance" "postgres" {
  name                = "${local.prefix}-pg"
  region              = var.region
  database_version    = "POSTGRES_16"
  deletion_protection = var.deletion_protection

  settings {
    tier              = var.database_tier
    availability_type = "ZONAL"
    disk_autoresize   = true
    disk_type         = "PD_SSD"

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.staging.id
      ssl_mode        = "ENCRYPTED_ONLY"
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "06:00"
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = var.backup_retention_count
        retention_unit   = "COUNT"
      }
    }
  }

  depends_on = [google_service_networking_connection.private_services]
}

resource "google_sql_database" "application" {
  name     = "rwos_staging"
  instance = google_sql_database_instance.postgres.name
}

resource "google_redis_instance" "limiter" {
  name                    = "${local.prefix}-redis"
  region                  = var.region
  tier                    = "BASIC"
  memory_size_gb          = var.redis_memory_size_gb
  authorized_network      = google_compute_network.staging.id
  connect_mode            = "PRIVATE_SERVICE_ACCESS"
  redis_version           = "REDIS_7_2"
  transit_encryption_mode = "SERVER_AUTHENTICATION"
}

resource "google_secret_manager_secret" "references" {
  for_each  = var.secret_names
  secret_id = each.value

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}

resource "google_service_account" "runtime" {
  for_each     = local.services
  account_id   = substr("sa-rwos-stg-${each.key}", 0, 30)
  display_name = "RWOS staging ${each.key}"
}

resource "google_cloud_run_v2_service" "service" {
  for_each = local.services
  name     = "rwos-stg-${each.key}"
  location = var.region
  ingress  = each.key == "employer" || each.key == "admin" || each.key == "worker" ? "INGRESS_TRAFFIC_ALL" : "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  deletion_protection = true

  template {
    service_account                  = google_service_account.runtime[each.key].email
    max_instance_request_concurrency = each.value.concurrency
    timeout                          = each.key == "qa-reset" ? "120s" : "60s"

    scaling {
      min_instance_count = 0
      max_instance_count = each.value.max
    }

    containers {
      image = var.image_digests[each.key]
      resources {
        limits = {
          cpu    = each.value.cpu
          memory = each.value.memory
        }
      }
      liveness_probe {
        http_get { path = "/health" }
      }
      startup_probe {
        http_get { path = "/health" }
      }
    }

    vpc_access {
      network_interfaces {
        network    = google_compute_network.staging.name
        subnetwork = google_compute_subnetwork.cloud_run.name
      }
      egress = "PRIVATE_RANGES_ONLY"
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
    "attribute.repository"       = "assertion.repository"
    "attribute.ref"              = "assertion.ref"
    "attribute.repository_owner" = "assertion.repository_owner"
  }

  attribute_condition = "assertion.repository == '${var.github_repository}' && assertion.ref == 'refs/heads/main'"
  oidc { issuer_uri = "https://token.actions.githubusercontent.com" }
}

resource "google_service_account" "deployer" {
  account_id   = "sa-rwos-stg-deployer"
  display_name = "RWOS staging deployer"
}

resource "google_service_account_iam_member" "github_deployer" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/projects/${var.project_number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github.workload_identity_pool_id}/attribute.repository/${var.github_repository}"
}
