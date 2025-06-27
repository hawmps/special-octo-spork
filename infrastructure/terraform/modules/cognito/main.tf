resource "aws_cognito_user_pool" "main" {
  name = "${var.environment}-${var.user_pool_name}"

  username_attributes = ["email"]
  
  username_configuration {
    case_sensitive = false
  }

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  mfa_configuration = "OPTIONAL"

  software_token_mfa_configuration {
    enabled = true
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  user_attribute_update_settings {
    attributes_require_verification_before_update = ["email"]
  }

  schema {
    attribute_data_type = "String"
    name                = "email"
    required            = true
    mutable             = true

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  schema {
    attribute_data_type = "String"
    name                = "given_name"
    required            = true
    mutable             = true

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  schema {
    attribute_data_type = "String"
    name                = "family_name"
    required            = true
    mutable             = true

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  schema {
    attribute_data_type = "String"
    name                = "role"
    required            = false
    mutable             = true

    string_attribute_constraints {
      min_length = 1
      max_length = 50
    }
  }

  tags = {
    Name = "${var.environment}-user-pool"
  }
}

resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.environment}-app-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret                      = false
  prevent_user_existence_errors        = "ENABLED"
  enable_token_revocation             = true
  enable_propagate_additional_user_context_data = false

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 30

  read_attributes = [
    "email",
    "given_name",
    "family_name",
    "custom:role"
  ]

  write_attributes = [
    "email",
    "given_name",
    "family_name",
    "custom:role"
  ]
}

resource "aws_cognito_user_group" "platform_admin" {
  name         = "platform_admin"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Platform administrators with full system access"
  precedence   = 1
}

resource "aws_cognito_user_group" "field_manager" {
  name         = "field_manager"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Field managers who manage technicians and work orders"
  precedence   = 2
}

resource "aws_cognito_user_group" "field_technician" {
  name         = "field_technician"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Field technicians who perform service work"
  precedence   = 3
}

resource "aws_cognito_user_group" "customer_service" {
  name         = "customer_service"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Customer service representatives"
  precedence   = 4
}

resource "aws_cognito_identity_pool" "main" {
  identity_pool_name               = "${var.environment}_identity_pool"
  allow_unauthenticated_identities = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.main.id
    provider_name           = aws_cognito_user_pool.main.endpoint
    server_side_token_check = false
  }

  tags = {
    Name = "${var.environment}-identity-pool"
  }
}