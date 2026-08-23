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

resource "aws_ssm_parameter" "porto_victoria_client_secret" {
  name  = "/lasso/client/porto-victoria-secret"
  type  = "SecureString"
  value = "REPLACE_ME_MANUALLY"

  lifecycle {
    ignore_changes = [value]
  }
}
