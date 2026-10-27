aws_region   = "us-east-1"
environment  = "prod"
project_name = "lasso"

lambda_package_path = "../dist/lasso.zip"

# Verified current as of 2026-08-20: adapter v1.1.0.
# https://github.com/awslabs/aws-lambda-web-adapter
lwa_layer_arn = "arn:aws:lambda:us-east-1:753240598075:layer:LambdaAdapterLayerArm64:29"

# Lasso's public hostname, served through CloudFront.
issuer = "https://lasso.bylukehurst.com/"
