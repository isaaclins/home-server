#!/usr/bin/env bash
set -euo pipefail

if command -v docker >/dev/null 2>&1; then
    printf 'Docker is installed\n'
else
    printf 'Docker is not installed\n'
    exit 1
fi

# Create .env file with expanded path if it doesn't exist
if [ ! -f .env ]; then
    echo "SERVICES_DIR=$HOME/services" > .env
    printf 'Created .env file\n'
fi

mkdir -p ~/services 
cd ~/services

# Detect server IP address
printf '\n=== Detecting Server IP Address ===\n'
SERVER_IP=""
if command -v curl >/dev/null 2>&1; then
    SERVER_IP=$(curl -s https://api.ipify.org 2>/dev/null || curl -s https://ifconfig.me 2>/dev/null || echo "")
fi

if [ -z "$SERVER_IP" ]; then
    printf 'Could not automatically detect server IP.\n'
    printf 'Please enter your server'\''s public IP address: '
    read -r SERVER_IP
else
    printf "Detected server IP: %s\n" "$SERVER_IP"
    printf 'Is this correct? (y/n, default: y): '
    read -r confirm
    if [ "${confirm:-y}" != "y" ] && [ "${confirm:-y}" != "Y" ]; then
        printf 'Please enter your server'\''s public IP address: '
        read -r SERVER_IP
    fi
fi

printf '\n=== DNS Configuration Required ===\n'
printf 'Add the following DNS record in your Squarespace DNS settings:\n\n'
printf '┌─────────────────────────────────────────────────────────────┐\n'
printf '│ HOST: minecraft                                              │\n'
printf '│ TYPE: A                                                      │\n'
printf '│ PRIORITY: (leave empty or N/A)                              │\n'
printf '│ TTL: 4 hrs (or your preferred value)                        │\n'
printf '│ DATA: %-52s │\n' "$SERVER_IP"
printf '└─────────────────────────────────────────────────────────────┘\n\n'
printf 'Steps:\n'
printf '1. Go to your Squarespace DNS settings\n'
printf '2. Scroll to the "Custom records" section\n'
printf '3. Click "ADD RECORD"\n'
printf '4. Fill in the form with the values above:\n'
printf '   - HOST: minecraft\n'
printf '   - TYPE: A (select from dropdown)\n'
printf '   - PRIORITY: (leave empty)\n'
printf '   - TTL: 4 hrs (or select your preferred value)\n'
printf '   - DATA: %s\n' "$SERVER_IP"
printf '5. Click "SAVE"\n\n'
printf 'After adding the DNS record, it may take a few minutes to propagate.\n'
printf 'You can verify it'\''s working by running: dig minecraft.isaaclins.com\n\n'
