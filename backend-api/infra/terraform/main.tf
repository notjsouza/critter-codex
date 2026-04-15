locals {
  common_tags = {
    Project   = var.project_name
    ManagedBy = "terraform"
  }

  functions = {
    list_entries = {
      handler = "src/handlers/listEntries.handler"
      method  = "GET"
      path    = "/entries"
    }
    create_entry = {
      handler = "src/handlers/createEntry.handler"
      method  = "POST"
      path    = "/entries"
    }
    delete_entry = {
      handler = "src/handlers/deleteEntry.handler"
      method  = "DELETE"
      path    = "/entries/{id}"
    }
    presign_upload = {
      handler = "src/handlers/presignUpload.handler"
      method  = "POST"
      path    = "/uploads/presign"
    }
    delete_upload = {
      handler = "src/handlers/deleteUpload.handler"
      method  = "DELETE"
      path    = "/uploads"
    }
    auth_sign_up = {
      handler = "src/handlers/authSignUp.handler"
      method  = "POST"
      path    = "/auth/sign-up"
    }
    auth_confirm_sign_up = {
      handler = "src/handlers/authConfirmSignUp.handler"
      method  = "POST"
      path    = "/auth/confirm-sign-up"
    }
    auth_resend_confirmation_code = {
      handler = "src/handlers/authResendConfirmationCode.handler"
      method  = "POST"
      path    = "/auth/resend-confirmation-code"
    }
    auth_sign_in = {
      handler = "src/handlers/authSignIn.handler"
      method  = "POST"
      path    = "/auth/sign-in"
    }
    auth_sign_out = {
      handler = "src/handlers/authSignOut.handler"
      method  = "POST"
      path    = "/auth/sign-out"
    }
    auth_hosted_sign_in = {
      handler = "src/handlers/authHostedSignIn.handler"
      method  = "POST"
      path    = "/auth/hosted-sign-in"
    }
    auth_oauth_callback = {
      handler = "src/handlers/authOAuthCallback.handler"
      method  = "GET"
      path    = "/auth/oauth/callback"
    }
  }
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

data "archive_file" "lambda_bundle" {
  type        = "zip"
  source_dir  = "${path.module}/../.."
  output_path = "${path.module}/.build/lambda.zip"
  excludes = [
    "infra",
    "scripts",
    "README.md",
    "package-lock.json",
    "node_modules/.cache",
    "*.tfstate",
    "*.tfstate.backup",
    ".terraform"
  ]
}

resource "aws_dynamodb_table" "entries" {
  name         = "${var.project_name}-entries"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  ttl {
    enabled        = true
    attribute_name = "ttlEpoch"
  }

  tags = local.common_tags
}

resource "aws_dynamodb_table" "users" {
  name         = "${var.project_name}-users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "email"

  attribute {
    name = "email"
    type = "S"
  }

  tags = local.common_tags
}

resource "aws_s3_bucket" "entry_images" {
  bucket = "${var.project_name}-entry-images-${random_id.bucket_suffix.hex}"

  tags = local.common_tags
}

resource "aws_s3_bucket_lifecycle_configuration" "entry_images" {
  bucket = aws_s3_bucket.entry_images.id

  rule {
    id     = "expire-entry-images-after-1-day"
    status = "Enabled"

    filter {
      prefix = "entries/"
    }

    expiration {
      days = 1
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "entry_images" {
  bucket = aws_s3_bucket.entry_images.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "DELETE"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_iam_role" "lambda_exec" {
  name = "${var.project_name}-lambda-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "lambda_access" {
  name = "${var.project_name}-lambda-access"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:UpdateItem",
          "dynamodb:Scan",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.entries.arn,
          aws_dynamodb_table.users.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "${aws_s3_bucket.entry_images.arn}/entries/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.entry_images.arn
        ]
      }
    ]
  })
}

resource "aws_lambda_function" "api" {
  for_each = local.functions

  function_name    = "${var.project_name}-${each.key}"
  filename         = data.archive_file.lambda_bundle.output_path
  source_code_hash = data.archive_file.lambda_bundle.output_base64sha256
  role             = aws_iam_role.lambda_exec.arn
  handler          = each.value.handler
  runtime          = "nodejs20.x"
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      ENTRIES_TABLE_NAME         = aws_dynamodb_table.entries.name
      ENTRY_IMAGES_BUCKET_NAME   = aws_s3_bucket.entry_images.bucket
      USERS_TABLE_NAME           = aws_dynamodb_table.users.name
      APP_AUTH_REDIRECT_URI      = var.app_auth_redirect_uri
      AUTH_TOKEN_SECRET          = var.auth_token_secret
      AUTH_STATE_SECRET          = var.auth_state_secret
      GOOGLE_OAUTH_CLIENT_ID     = var.google_oauth_client_id
      GOOGLE_OAUTH_CLIENT_SECRET = var.google_oauth_client_secret
      GOOGLE_OAUTH_REDIRECT_URI  = var.google_oauth_redirect_uri
    }
  }

  tags = local.common_tags
}

resource "aws_apigatewayv2_api" "http" {
  name          = "${var.project_name}-http-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "DELETE", "OPTIONS"]
    allow_headers = ["content-type", "authorization"]
  }

  tags = local.common_tags
}

resource "aws_apigatewayv2_integration" "lambda" {
  for_each = local.functions

  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  integration_uri        = aws_lambda_function.api[each.key].invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "routes" {
  for_each = local.functions

  api_id    = aws_apigatewayv2_api.http.id
  route_key = "${each.value.method} ${each.value.path}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda[each.key].id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true

  tags = local.common_tags
}

resource "aws_lambda_permission" "api_gateway" {
  for_each = local.functions

  statement_id  = "AllowApiGatewayInvoke-${each.key}"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api[each.key].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}
