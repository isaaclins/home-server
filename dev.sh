#!/bin/bash

#first, start docker daemon
open -a Docker && while ! docker info > /dev/null 2>&1; do sleep 1; done

# --- Check for Optional Arguments ---
INITIAL_ADMIN_USER="$1"
INITIAL_ADMIN_EMAIL="$2"
INITIAL_ADMIN_PASSWORD="$3"

DOCKER_ENV_VARS=""
if [ -n "$INITIAL_ADMIN_USER" ] && [ -n "$INITIAL_ADMIN_EMAIL" ] && [ -n "$INITIAL_ADMIN_PASSWORD" ]; then
    echo "Admin credentials provided via arguments. Passing them to Docker container."
    # Important: Ensure proper quoting if passwords contain special characters, although
    # passing sensitive data via env vars has security implications.
    DOCKER_ENV_VARS="-e INITIAL_ADMIN_USER='$INITIAL_ADMIN_USER' -e INITIAL_ADMIN_EMAIL='$INITIAL_ADMIN_EMAIL' -e INITIAL_ADMIN_PASSWORD='$INITIAL_ADMIN_PASSWORD'"
else
    echo "Admin credentials not provided via arguments. Container will prompt if needed."
fi

# First, delete the container if it exists
docker rm -f home-server 2>/dev/null

# Then, build the image
docker build -t home-server-image .

# Then, run the container, adding env vars if they were set
# Note the use of `eval` to correctly handle the expansion of $DOCKER_ENV_VARS which might be empty
eval docker run -it -p 3000:3000 -p 3002:3002 $DOCKER_ENV_VARS home-server-image
