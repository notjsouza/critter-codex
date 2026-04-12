output "api_base_url" {
  description = "Base URL for the mobile app EXPO_PUBLIC_API_BASE_URL"
  value       = aws_apigatewayv2_api.http.api_endpoint
}

output "oauth_callback_url" {
  description = "Google OAuth redirect URI to register in Google Cloud Console"
  value       = "${aws_apigatewayv2_api.http.api_endpoint}/auth/oauth/callback"
}

output "entries_table_name" {
  value = aws_dynamodb_table.entries.name
}

output "users_table_name" {
  value = aws_dynamodb_table.users.name
}

output "entry_images_bucket_name" {
  value = aws_s3_bucket.entry_images.bucket
}
