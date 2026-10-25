# Secret values are written by scripts/bootstrap and never managed here:
# Terraform refreshes every attribute into state, including decrypted values.
locals {
  jwks_ssm_param                  = "/lasso/jwks"
  porto_victoria_secret_ssm_param = "/lasso/client/porto-victoria-secret"

  ssm_param_arn_prefix = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter"
}

data "aws_caller_identity" "current" {}
