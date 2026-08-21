resource "aws_cloudwatch_log_group" "lasso" {
  name              = "/aws/lambda/lj-lasso"
  retention_in_days = 30
}
