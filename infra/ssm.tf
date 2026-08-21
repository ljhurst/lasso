# SSM Parameter Store over Secrets Manager (DESIGN §1, §5): free tier vs.
# per-secret cost, same reasoning as victoria's ssm.tf. Values are set
# out-of-band (scripts/generate-jwks.ts, scripts/set-credential.ts), never
# through Terraform state — these resources only reserve the parameter
# names; `aws ssm put-parameter --overwrite` sets the actual values
# manually after apply.

resource "aws_ssm_parameter" "jwks" {
  name  = "/lasso/jwks"
  type  = "SecureString"
  value = "REPLACE_ME_MANUALLY"

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "login_credential" {
  name  = "/lasso/login-credential"
  type  = "SecureString"
  value = "REPLACE_ME_MANUALLY"

  lifecycle {
    ignore_changes = [value]
  }
}
