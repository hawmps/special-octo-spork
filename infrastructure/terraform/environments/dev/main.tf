terraform {
  backend "s3" {
    bucket = "field-service-crm-terraform-state-dev"
    key    = "dev/terraform.tfstate"
    region = "us-east-1"
  }
}

module "infrastructure" {
  source = "../../"
  
  environment = var.environment
  aws_region  = var.aws_region
  
  vpc_cidr                = var.vpc_cidr
  public_subnet_cidrs     = var.public_subnet_cidrs
  private_subnet_cidrs    = var.private_subnet_cidrs
  availability_zones      = var.availability_zones
  
  db_instance_class       = var.db_instance_class
  db_name                 = var.db_name
  db_username             = var.db_username
  db_password             = var.db_password
  backup_retention_period = var.backup_retention_period
  backup_window          = var.backup_window
  maintenance_window     = var.maintenance_window
  
  s3_bucket_name = var.s3_bucket_name
  
  cognito_user_pool_name = var.cognito_user_pool_name
}