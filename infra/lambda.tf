resource "aws_lambda_function" "lasso" {
  function_name = "lj-lasso"
  role          = aws_iam_role.lambda.arn

  filename         = var.lambda_package_path
  source_code_hash = filebase64sha256(var.lambda_package_path)

  handler       = "run.sh"
  runtime       = "nodejs24.x"
  architectures = ["arm64"]
  layers        = [var.lwa_layer_arn]

  memory_size = 512
  timeout     = 15

  environment {
    variables = {
      AWS_LAMBDA_EXEC_WRAPPER                       = "/opt/bootstrap"
      AWS_LWA_PORT                                  = "8080"
      PORT                                          = "8080"
      LASSO_OIDC_TABLE_NAME                         = aws_dynamodb_table.lasso.name
      LASSO_USERS_TABLE_NAME                        = aws_dynamodb_table.lasso_users.name
      LASSO_THROTTLE_TABLE_NAME                     = aws_dynamodb_table.lasso_throttle.name
      LASSO_JWKS_SSM_PARAM                          = local.jwks_ssm_param
      LASSO_CLIENT__PORTO_VICTORIA_SECRET_SSM_PARAM = local.porto_victoria_secret_ssm_param
      LASSO_COOKIE_KEY_SSM_PARAM                    = local.cookie_key_ssm_param
      LASSO_ISSUER                                  = var.issuer
    }
  }
}

resource "aws_lambda_function_url" "lasso" {
  function_name      = aws_lambda_function.lasso.function_name
  authorization_type = "NONE" # auth happens in-app via oidc-provider, not IAM
  invoke_mode        = "BUFFERED"
}

module "front" {
  source = "git::https://github.com/ljhurst/stych.git//infra/modules/function-url-site?ref=v1.8.0"

  domain_name           = "lasso.bylukehurst.com"
  function_url          = aws_lambda_function_url.lasso.function_url
  origin_timeout        = aws_lambda_function.lasso.timeout
  origin_verify_kvs_arn = "arn:aws:cloudfront::755958650241:key-value-store/e65cf756-5106-499a-a651-c690bad8f750"
}
