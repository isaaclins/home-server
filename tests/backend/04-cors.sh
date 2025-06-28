#!/bin/bash

BASE_URL="http://localhost:8080"
ENDPOINT="/api/login"

log(){ echo "[TEST] $*"; }

# Preflight request
log "Sending OPTIONS pre-flight request"
headers=$(curl -s -o /dev/null -w "%{http_code}\n" -X OPTIONS "$BASE_URL$ENDPOINT" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type")

if [[ "$headers" == "200" || "$headers" == "204" ]]; then
  log "✅ OPTIONS returned $headers"
else
  log "❌ OPTIONS failed (status $headers)"; exit 1;
fi

# Check actual header value using -I
cors=$(curl -s -I -X OPTIONS "$BASE_URL$ENDPOINT" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" | grep -i "access-control-allow-origin")

if [[ "$cors" == *"*"* ]]; then
  log "✅ Access-Control-Allow-Origin header present: $cors"
else
  log "❌ Access-Control-Allow-Origin missing"; exit 1;
fi

log "🎉 CORS tests passed"
exit 0 
