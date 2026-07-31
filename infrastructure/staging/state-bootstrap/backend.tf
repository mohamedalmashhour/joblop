terraform {
  backend "local" {
    path = "../../../.staging-inputs/terraform-plan0-bootstrap.tfstate"
  }
}
