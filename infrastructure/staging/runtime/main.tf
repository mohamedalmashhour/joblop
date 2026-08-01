locals {
  prefix = "rwos-stg-ca-tor"
  services = {
    api              = { cpu = "1", memory = "512Mi", concurrency = 20, image = "api", config = "api" }
    worker-api       = { cpu = "1", memory = "512Mi", concurrency = 20, image = "api", config = "api" }
    employer         = { cpu = "1", memory = "512Mi", concurrency = 40, image = "employer", config = "employer" }
    admin            = { cpu = "1", memory = "512Mi", concurrency = 40, image = "admin", config = "admin" }
    worker           = { cpu = "1", memory = "512Mi", concurrency = 40, image = "worker", config = "worker" }
    auth-limiter     = { cpu = "1", memory = "512Mi", concurrency = 40, image = "auth-limiter", config = "auth-limiter" }
    candidate-source = { cpu = "1", memory = "512Mi", concurrency = 1, image = "candidate-source", config = "candidate-source" }
    offer-delivery   = { cpu = "1", memory = "512Mi", concurrency = 1, image = "offer-delivery", config = "offer-delivery" }
    qa-reset         = { cpu = "1", memory = "512Mi", concurrency = 1, image = "qa-reset", config = "qa-reset" }
  }
  deployed_services = var.deploy_runtime_services ? local.services : {}
  effective_secret_environment = merge(var.service_secret_environment, {
    worker-api = {
      DATABASE_URL                 = var.service_secret_environment.api.DATABASE_URL
      SESSION_SECRET               = var.service_secret_environment.api.SESSION_SECRET
      AUTH_RATE_LIMITER_TOKEN      = var.service_secret_environment.api.AUTH_RATE_LIMITER_TOKEN
      AUTH_RATE_LIMITER_KEY_SECRET = var.service_secret_environment.api.AUTH_RATE_LIMITER_KEY_SECRET
      CANDIDATE_SOURCE_TOKEN       = var.service_secret_environment.api.CANDIDATE_SOURCE_TOKEN
      OFFER_DELIVERY_TOKEN         = var.service_secret_environment.api.OFFER_DELIVERY_TOKEN
    }
  })
  secret_names = toset(flatten([
    for environment_map in values(local.effective_secret_environment) : values(environment_map)
  ]))
  service_secret_pairs = {
    for pair in flatten([
      for service, values in local.effective_secret_environment : [
        for environment_name, secret_name in values : {
          key              = "${service}:${environment_name}"
          service          = service
          environment_name = environment_name
          secret_name      = secret_name
        }
      ]
    ]) : pair.key => pair
  }
  derived_environment = {
    api              = {}
    worker-api       = { RWOS_PUBLIC_WORKER_INGRESS_ONLY = "enabled" }
    employer         = {}
    admin            = {}
    worker           = {}
    auth-limiter     = { AUTH_LIMITER_REDIS_URL = "rediss://${google_redis_instance.limiter.host}:${google_redis_instance.limiter.port}" }
    candidate-source = {}
    offer-delivery   = {}
    qa-reset         = {}
  }
}

resource "google_compute_network" "staging" {
  name                    = "${local.prefix}-vpc"
  auto_create_subnetworks = false
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

resource "google_compute_global_address" "sql_private_services" {
  name          = "${local.prefix}-sql-psa-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  address       = var.sql_private_service_address
  prefix_length = var.private_service_prefix_length
  network       = google_compute_network.staging.id
}

resource "google_service_networking_connection" "private_services" {
  network = google_compute_network.staging.id
  service = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [
    google_compute_global_address.private_services.name,
    google_compute_global_address.sql_private_services.name,
  ]
}

resource "google_sql_database_instance" "postgres" {
  name                = "${local.prefix}-pg"
  region              = var.region
  database_version    = "POSTGRES_16"
  deletion_protection = true
  settings {
    edition               = "ENTERPRISE"
    tier                  = "db-custom-1-3840"
    availability_type     = "ZONAL"
    disk_size             = var.database_disk_size_gb
    disk_autoresize       = true
    disk_autoresize_limit = var.database_disk_autoresize_limit_gb
    disk_type             = "PD_SSD"
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.staging.id
      ssl_mode        = "ENCRYPTED_ONLY"
    }
    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      location                       = var.region
      start_time                     = "06:00"
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 7
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
  memory_size_gb          = 1
  authorized_network      = google_compute_network.staging.id
  connect_mode            = "PRIVATE_SERVICE_ACCESS"
  redis_version           = "REDIS_7_2"
  transit_encryption_mode = "SERVER_AUTHENTICATION"
  depends_on              = [google_service_networking_connection.private_services]
}

resource "google_secret_manager_secret" "runtime" {
  for_each  = local.secret_names
  secret_id = each.value
  replication {
    user_managed {
      replicas { location = var.region }
    }
  }
}

resource "google_secret_manager_secret" "migration_database" {
  secret_id = var.migration_database_secret_name
  replication {
    user_managed {
      replicas { location = var.region }
    }
  }
}

resource "google_service_account" "runtime" {
  for_each     = local.services
  account_id   = substr("sa-rwos-stg-${each.key}", 0, 30)
  display_name = "RWOS staging ${each.key}"
}

resource "google_service_account" "migration" {
  account_id   = "sa-rwos-stg-migration"
  display_name = "RWOS staging singleton migration"
}

resource "google_secret_manager_secret_iam_member" "migration_database" {
  secret_id = google_secret_manager_secret.migration_database.id
  role      = "roles/secretmanager.secretAccessor"
  member    = google_service_account.migration.member
}

resource "google_service_account_iam_member" "deployer_act_as_migration" {
  service_account_id = google_service_account.migration.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.deployer_service_account_email}"
}

resource "google_cloud_run_v2_job" "migration" {
  count               = var.deploy_migration_job ? 1 : 0
  name                = "rwos-stg-migration"
  location            = var.region
  deletion_protection = true

  template {
    task_count  = 1
    parallelism = 1
    template {
      service_account = google_service_account.migration.email
      max_retries     = 0
      timeout         = "600s"
      containers {
        image       = var.image_digests["api"]
        command     = ["pnpm"]
        args        = ["--filter", "@rwos/database", "prisma:migrate:deploy"]
        working_dir = "/workspace"
        env {
          name = "DATABASE_URL"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.migration_database.secret_id
              version = "latest"
            }
          }
        }
        resources {
          limits = { cpu = "1", memory = "512Mi" }
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

  depends_on = [
    google_secret_manager_secret_iam_member.migration_database,
    google_service_account_iam_member.deployer_act_as_migration,
    google_sql_database.application,
  ]
}

resource "google_secret_manager_secret_iam_member" "runtime" {
  for_each  = local.service_secret_pairs
  secret_id = google_secret_manager_secret.runtime[each.value.secret_name].id
  role      = "roles/secretmanager.secretAccessor"
  member    = google_service_account.runtime[each.value.service].member
}

resource "google_service_account_iam_member" "deployer_act_as" {
  for_each           = google_service_account.runtime
  service_account_id = each.value.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.deployer_service_account_email}"
}

resource "google_cloud_run_v2_service" "service" {
  for_each = local.deployed_services
  name     = "rwos-stg-${each.key}"
  location = var.region
  # Service-to-service calls use Google-signed identity tokens against the exact
  # run.app audience. IAM remains the access boundary for non-public services.
  ingress = "INGRESS_TRAFFIC_ALL"

  # Public staging endpoints use Cloud Run's dedicated invoker-check setting.
  # This avoids weakening the organization's domain-restricted IAM policy.
  invoker_iam_disabled = contains(["api", "employer", "admin", "worker", "worker-api"], each.key)

  deletion_protection = true
  template {
    service_account                  = google_service_account.runtime[each.key].email
    max_instance_request_concurrency = each.value.concurrency
    timeout                          = each.key == "qa-reset" ? "120s" : "60s"
    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }
    containers {
      image = var.image_digests[each.value.image]
      dynamic "env" {
        for_each = merge(var.service_environment[each.value.config], local.derived_environment[each.key])
        content {
          name  = env.key
          value = env.value
        }
      }
      dynamic "env" {
        for_each = local.effective_secret_environment[each.key]
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.runtime[env.value].secret_id
              version = "latest"
            }
          }
        }
      }
      resources {
        limits = { cpu = each.value.cpu, memory = each.value.memory }
      }
      liveness_probe {
        http_get {
          path = "/health"
        }
      }
      startup_probe {
        http_get {
          path = "/health"
        }
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
  depends_on = [
    google_secret_manager_secret_iam_member.runtime,
    google_service_account_iam_member.deployer_act_as,
    google_service_networking_connection.private_services
  ]
}

resource "google_cloud_run_v2_service_iam_member" "web_to_api" {
  for_each = var.deploy_runtime_services ? toset(["employer", "admin"]) : toset([])
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.service["api"].name
  role     = "roles/run.invoker"
  member   = google_service_account.runtime[each.key].member
}

resource "google_cloud_run_v2_service_iam_member" "api_to_adapters" {
  for_each = var.deploy_runtime_services ? toset(["auth-limiter", "candidate-source", "offer-delivery"]) : toset([])
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.service[each.key].name
  role     = "roles/run.invoker"
  member   = google_service_account.runtime["api"].member
}

resource "google_cloud_run_v2_service_iam_member" "qa_reset_callers" {
  for_each = var.deploy_runtime_services ? {
    browser-e2e = "employer"
    ios-e2e     = "worker"
    android-e2e = "worker-api"
    manual-qa   = "admin"
    monitoring  = "auth-limiter"
  } : {}
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.service["qa-reset"].name
  role     = "roles/run.invoker"
  member   = google_service_account.runtime[each.value].member
}

resource "google_logging_project_bucket_config" "application" {
  project        = var.project_id
  location       = var.region
  bucket_id      = "rwos-staging-application"
  retention_days = var.log_retention_days
}

resource "google_logging_project_sink" "application" {
  name                   = "rwos-staging-application"
  destination            = "logging.googleapis.com/${google_logging_project_bucket_config.application.id}"
  filter                 = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=~\"rwos-stg-.*\""
  unique_writer_identity = true
}

resource "google_monitoring_alert_policy" "cloud_sql_cpu" {
  count        = var.deploy_monitoring_alerts ? 1 : 0
  display_name = "RWOS staging Cloud SQL CPU"
  combiner     = "OR"
  conditions {
    display_name = "CPU above 80 percent for 5 minutes"
    condition_threshold {
      filter          = "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/cpu/utilization\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      duration        = "300s"
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
  notification_channels = var.monitoring_notification_channels
}
