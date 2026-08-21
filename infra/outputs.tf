output "function_url" {
  description = "Lasso's OIDC issuer endpoint — register this (or a custom domain pointed at it) as the authorization server."
  value       = aws_lambda_function_url.lasso.function_url
}

output "table_name" {
  value = aws_dynamodb_table.lasso.name
}
