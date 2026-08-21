# Node app (src/server.ts) runs unmodified behind Lambda Web Adapter
# (DESIGN §5): the managed nodejs22.x runtime with the LWA layer attached
# and AWS_LAMBDA_EXEC_WRAPPER pointing at the layer's exec wrapper, which
# takes over invocation and proxies to the plain HTTP server listening on
# AWS_LWA_PORT — `handler` is unused once the wrapper takes over, so it's
# set to the startup script by convention.

resource "aws_lambda_function" "lasso" {
  function_name = "lj-lasso"
  role          = aws_iam_role.lambda.arn

  filename         = var.lambda_package_path
  source_code_hash = filebase64sha256(var.lambda_package_path)

  handler       = "run.sh"
  runtime       = "nodejs22.x"
  architectures = ["arm64"]
  layers        = [var.lwa_layer_arn]

  memory_size = 256
  timeout     = 15

  environment {
    variables = {
      AWS_LAMBDA_EXEC_WRAPPER = "/opt/bootstrap"
      AWS_LWA_PORT            = "8080"
      PORT                    = "8080"
      TABLE_NAME              = aws_dynamodb_table.lasso.name
      JWKS_SSM_PARAM          = aws_ssm_parameter.jwks.name
      CREDENTIAL_SSM_PARAM    = aws_ssm_parameter.login_credential.name
      ISSUER                  = var.issuer
    }
  }
}

resource "aws_lambda_function_url" "lasso" {
  function_name      = aws_lambda_function.lasso.function_name
  authorization_type = "NONE" # auth happens in-app via oidc-provider, not IAM
  invoke_mode        = "BUFFERED"
}
