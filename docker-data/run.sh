#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e


chmod +x setup.sh
./setup.sh


if [ $? -ne 0 ]; then
    echo "Error setting up DB and admin user. Exiting."
    exit 1
fi

cd /


# Ensure we are in the correct directory where package.json (with concurrently) is located
cd /app/docker-data
npm run dev

print_server_info() {
    echo ""
    echo "--- Server Availability (Typical Defaults) ---"
    echo "Frontend Next.js app: http://localhost:3000"
    echo "Backend Express API:  http://localhost:3001"
    echo "Ensure your Docker ports are mapped correctly (e.g., -p 3000:3000 -p 3001:3001)."
    echo "Output from both servers will appear below."
    echo "Press Ctrl+C in this terminal to stop all servers."
    echo ""
}

print_server_info

# Wait for any of the background jobs to exit. 
# If one server crashes, this script (and thus the container) will exit.
wait -n
EXIT_CODE=$?
echo "A server process has exited with code $EXIT_CODE. Shutting down other servers."

exit $EXIT_CODE 
