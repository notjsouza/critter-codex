variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Prefix used for all resource names"
  type        = string
  default     = "critter-codex"
}

variable "app_auth_redirect_uri" {
  description = "Deep-link callback URI for mobile auth"
  type        = string
  default     = "crittercodex://auth"
}

variable "auth_token_secret" {
  description = "Secret used to sign session tokens"
  type        = string
  sensitive   = true
}

variable "auth_state_secret" {
  description = "Secret used to sign OAuth state"
  type        = string
  sensitive   = true
}

variable "google_oauth_client_id" {
  description = "Google OAuth client ID"
  type        = string
  default     = ""
}

variable "google_oauth_client_secret" {
  description = "Google OAuth client secret"
  type        = string
  default     = ""
  sensitive   = true
}

variable "google_oauth_redirect_uri" {
  description = "Google OAuth callback URI"
  type        = string
  default     = ""
}
