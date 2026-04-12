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
  exit 1
fi

terraform init
terraform apply -auto-approve "$@"

API_BASE_URL="$(terraform output -raw api_base_url)"
OAUTH_CALLBACK_URL="$(terraform output -raw oauth_callback_url)"

update_tfvar() {
  local key="$1"
  local value="$2"
  local tfvars_file="$TF_DIR/terraform.tfvars"

  if grep -qE "^[[:space:]]*${key}[[:space:]]*=" "$tfvars_file"; then
    if [[ "$OSTYPE" == darwin* ]]; then
      sed -i '' "s|^[[:space:]]*${key}[[:space:]]*=.*$|${key} = \"${value}\"|" "$tfvars_file"
    else
      sed -i "s|^[[:space:]]*${key}[[:space:]]*=.*$|${key} = \"${value}\"|" "$tfvars_file"
    fi
  else
    printf '\n%s = "%s"\n' "$key" "$value" >> "$tfvars_file"
  fi
}

# Auto-fill Google OAuth redirect URI if empty
if grep -qE '^[[:space:]]*google_oauth_redirect_uri[[:space:]]*=[[:space:]]*""[[:space:]]*$' "$TF_DIR/terraform.tfvars" || ! grep -qE '^[[:space:]]*google_oauth_redirect_uri[[:space:]]*=' "$TF_DIR/terraform.tfvars"; then
  update_tfvar "google_oauth_redirect_uri" "$OAUTH_CALLBACK_URL"
  terraform apply -auto-approve "$@"
fi

if [[ -f "$ENV_FILE" ]]; then
  if grep -q '^EXPO_PUBLIC_API_BASE_URL=' "$ENV_FILE"; then
    if [[ "$OSTYPE" == darwin* ]]; then
      sed -i '' "s|^EXPO_PUBLIC_API_BASE_URL=.*$|EXPO_PUBLIC_API_BASE_URL=$API_BASE_URL|" "$ENV_FILE"
    else
      sed -i "s|^EXPO_PUBLIC_API_BASE_URL=.*$|EXPO_PUBLIC_API_BASE_URL=$API_BASE_URL|" "$ENV_FILE"
    fi
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
echo "Wrote google_oauth_redirect_uri to terraform.tfvars"
echo "Register the oauth_callback_url above in Google Cloud Console."
