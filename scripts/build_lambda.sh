#!/usr/bin/env bash
# Builds dist/lasso.zip: esbuild bundle of src/server.ts (with @aws-sdk/*
# bundled in, not relying on the Lambda runtime's built-in SDK version) +
# the run.sh startup script Lambda Web Adapter invokes.
#
# Reproducible: every file's mtime is normalized before zipping, and -X
# strips extra fields (extended timestamps, uid/gid) that would otherwise
# still leak the real build time. Without this, source_code_hash changes
# on every rebuild even when nothing actually changed, causing Terraform
# to see drift.
set -euo pipefail

cd "$(dirname "$0")/.."

rm -rf build dist
mkdir -p build dist

npm ci
npx esbuild src/server.ts --bundle --platform=node --target=node22 --format=esm \
  --outfile=build/server.js \
  --banner:js="import{createRequire}from'module';const require=createRequire(import.meta.url);"

cat >build/run.sh <<'EOF'
#!/bin/sh
exec node server.js
EOF
chmod +x build/run.sh

find build -exec touch -t 202001010000.00 {} +

(cd build && zip -Xrq ../dist/lasso.zip run.sh server.js)

rm -rf build

echo "Built $(cd dist && pwd)/lasso.zip"
