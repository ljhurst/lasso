resource "aws_dynamodb_table" "lasso" {
  name         = "lj-lasso"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "uid"
    type = "S"
  }

  attribute {
    name = "grantId"
    type = "S"
  }

  attribute {
    name = "userCode"
    type = "S"
  }

  global_secondary_index {
    name            = "uid-index"
    projection_type = "ALL"

    key_schema {
      attribute_name = "uid"
      key_type       = "HASH"
    }
  }

  global_secondary_index {
    name            = "grant-index"
    projection_type = "ALL"

    key_schema {
      attribute_name = "grantId"
      key_type       = "HASH"
    }
  }

  global_secondary_index {
    name            = "user-code-index"
    projection_type = "ALL"

    key_schema {
      attribute_name = "userCode"
      key_type       = "HASH"
    }
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }
}

resource "aws_dynamodb_table" "lasso_users" {
  name         = "lj-lasso-users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "sub"

  attribute {
    name = "sub"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name            = "email-index"
    projection_type = "ALL"

    key_schema {
      attribute_name = "email"
      key_type       = "HASH"
    }
  }
}
