# Least-privilege IAM role for the Lambda (DESIGN §5): scoped DynamoDB
# table + GSI access, SSM read on exactly the two parameters this service
# uses, CloudWatch Logs.

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "lasso-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

data "aws_iam_policy_document" "lambda_permissions" {
  statement {
    sid    = "DynamoTableReadWrite"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:BatchWriteItem",
    ]
    resources = [
      aws_dynamodb_table.lasso.arn,
      "${aws_dynamodb_table.lasso.arn}/index/*",
    ]
  }

  statement {
    sid     = "ReadLassoSsmParameters"
    effect  = "Allow"
    actions = ["ssm:GetParameter"]
    resources = [
      aws_ssm_parameter.jwks.arn,
      aws_ssm_parameter.login_credential.arn,
      aws_ssm_parameter.porto_victoria_client_secret.arn,
    ]
  }

  statement {
    sid       = "CloudWatchLogs"
    effect    = "Allow"
    actions   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.lasso.arn}:*"]
  }
}

resource "aws_iam_role_policy" "lambda" {
  name   = "lasso-lambda-permissions"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda_permissions.json
}
