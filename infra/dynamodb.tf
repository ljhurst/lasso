# Single-table design (DESIGN §5): codes, tokens, grants, sessions, and
# interactions all live here as items keyed by `${modelName}#${id}`. Three
# sparse GSIs cover oidc-provider's findByUid / findByUserCode /
# revokeByGrantId lookups (see src/adapter/keys.ts for the key scheme).

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

# Manually-provisioned user accounts (DESIGN §6) — kept separate from the
# table above since these records aren't TTL'd and don't fit its key
# scheme or GSIs. Keyed by a stable UUID sub; email-index supports the
# login-time lookup (email -> sub).

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
