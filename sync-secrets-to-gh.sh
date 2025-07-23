#!/bin/bash
# Usage: ./sync-secrets-to-gh.sh <owner/repo>
# Example: ./sync-secrets-to-gh.sh isaaclins/home-server

if [ -z "$1" ]; then
  echo "Usage: $0 <owner/repo>"
  exit 1
fi

REPO="$1"

# List of keys to upload
CI_KEYS="MYSQL_DATABASE MYSQL_USER MYSQL_PASSWORD MYSQL_ROOT_PASSWORD JWT_SECRET JWT_EXPIRATION"

while IFS='=' read -r key value; do
  [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
  key=$(echo "$key" | xargs)
  value=$(echo "$value" | sed -e 's/^\"//' -e 's/\"$//' | xargs)
  if [[ " $CI_KEYS " =~ " $key " ]] && [ -n "$key" ] && [ -n "$value" ]; then
    echo "Setting secret: $key"
    gh secret set "$key" -b"$value" -R "$REPO"
  fi
done < .secrets
