variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., prod)"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "lambda_package_path" {
  description = "Path to the zipped Lambda deployment package. Run `scripts/build_lambda.sh`"
  type        = string
}

variable "lwa_layer_arn" {
  description = <<-EOT
    Lambda Web Adapter layer ARN (DESIGN §5). No default on purpose — the
    version suffix changes over time; look up the current one with:
    aws lambda list-layer-versions --layer-name LambdaAdapterLayerArm64 \
      --compatible-architecture arm64 --region us-east-1
  EOT
  type        = string
}

variable "issuer" {
  description = "OIDC issuer URL (DESIGN §8 — depends on the domain/DNS decision)"
  type        = string
}
