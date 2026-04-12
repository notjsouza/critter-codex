#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TF_DIR="$ROOT_DIR/infra/terraform"
WORKSPACE_ROOT="$(cd "$ROOT_DIR/.." && pwd)"
ENV_FILE="$WORKSPACE_ROOT/.env.local"

cd "$TF_DIR"

if [[ ! -f terraform.tfvars ]]; then
  echo "No terraform.tfvars found. Copy terraform.tfvars.example and fill in secrets first."
  echo "Example: cp terraform.tfvars.example terraform.tfvars"
fi

terraform init
terraform apply -auto-approve "$@"

API_BASE_URL="$(terraform output -raw api_base_url)"

if [[ -f "$ENV_FILE" ]]; then
  if grep -q '^EXPO_PUBLIC_API_BASE_URL=' "$ENV_FILE"; then
    sed -i.bak "s|^EXPO_PUBLIC_API_BASE_URL=.*$|EXPO_PUBLIC_API_BASE_URL=$API_BASE_URL|" "$ENV_FILE"
    rm -f "$ENV_FILE.bak"
  else
    printf '\nEXPO_PUBLIC_API_BASE_URL=%s\n' "$API_BASE_URL" >> "$ENV_FILE"
  fi
else
  printf 'EXPO_PUBLIC_API_BASE_URL=%s\n' "$API_BASE_URL" > "$ENV_FILE"
fi

echo
terraform output
echo
echo "Wrote EXPO_PUBLIC_API_BASE_URL to $ENV_FILE"
