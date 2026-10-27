output "function_url" {
  description = "The Function URL behind the front door; clients use the custom domain, not this"
  value       = aws_lambda_function_url.lasso.function_url
}

output "table_name" {
  value = aws_dynamodb_table.lasso.name
}

output "cname_target" {
  description = "Point a DNS-only CNAME for lasso in Cloudflare at this hostname"
  value       = module.front.cname_target
}
