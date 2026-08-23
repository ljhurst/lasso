resource "aws_lambda_function" "lasso" {
  function_name = "lj-lasso"
  role          = aws_iam_role.lambda.arn

  filename         = var.lambda_package_path
  source_code_hash = filebase64sha256(var.lambda_package_path)

  handler       = "run.sh"
  runtime       = "nodejs24.x"
  architectures = ["arm64"]
  layers        = [var.lwa_layer_arn]

  memory_size = 256
  timeout     = 15

  environment {
    variables = {
      AWS_LAMBDA_EXEC_WRAPPER                       = "/opt/bootstrap"
      AWS_LWA_PORT                                  = "8080"
      PORT                                          = "8080"
      LASSO_DYNAMODB_TABLE_NAME                     = aws_dynamodb_table.lasso.name
      LASSO_JWKS_SSM_PARAM                          = aws_ssm_parameter.jwks.name
      LASSO_CREDENTIAL_SSM_PARAM                    = aws_ssm_parameter.login_credential.name
      LASSO_CLIENT__PORTO_VICTORIA_SECRET_SSM_PARAM = aws_ssm_parameter.porto_victoria_client_secret.name
      LASSO_ISSUER                                  = var.issuer
    }
  }
}

resource "aws_lambda_function_url" "lasso" {
  function_name      = aws_lambda_function.lasso.function_name
  authorization_type = "NONE" # auth happens in-app via oidc-provider, not IAM
  invoke_mode        = "BUFFERED"
}
