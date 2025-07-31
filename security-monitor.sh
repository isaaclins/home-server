#!/bin/bash

# Home Server Security Monitoring Script
# Monitors security-related metrics and logs potential issues

set -euo pipefail

# Configuration
LOG_FILE="/var/log/homeserver-security.log"
ALERT_EMAIL="${SECURITY_ALERT_EMAIL:-admin@localhost}"
BACKEND_URL="${BACKEND_URL:-http://localhost:8080}"
CHECK_INTERVAL="${CHECK_INTERVAL:-300}" # 5 minutes

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Alert function
alert() {
    local message="$1"
    log "ALERT" "$message"
    # Send email alert if configured
    if command -v mail >/dev/null 2>&1 && [[ "$ALERT_EMAIL" != "admin@localhost" ]]; then
        echo "$message" | mail -s "Home Server Security Alert" "$ALERT_EMAIL"
    fi
}

# Check if running as root (security risk)
check_root_processes() {
    log "INFO" "Checking for processes running as root..."
    
    local root_processes=$(docker ps --format "table {{.Names}}\t{{.Image}}" | grep -v NAMES | while read container image; do
        local user=$(docker exec "$container" whoami 2>/dev/null || echo "unknown")
        if [[ "$user" == "root" ]]; then
            echo "$container ($image)"
        fi
    done)
    
    if [[ -n "$root_processes" ]]; then
        alert "Containers running as root detected: $root_processes"
        return 1
    else
        log "INFO" "✓ All containers running as non-root users"
        return 0
    fi
}

# Check for failed authentication attempts
check_auth_failures() {
    log "INFO" "Checking for authentication failures..."
    
    # Check application logs for auth failures
    local auth_failures=$(docker logs homeserver-backend 2>&1 | grep -i "authentication failed\|login failed\|unauthorized" | tail -10)
    
    if [[ -n "$auth_failures" ]]; then
        local failure_count=$(echo "$auth_failures" | wc -l)
        if [[ $failure_count -gt 5 ]]; then
            alert "High number of authentication failures detected ($failure_count recent failures)"
        else
            log "WARN" "Authentication failures detected ($failure_count recent failures)"
        fi
    else
        log "INFO" "✓ No recent authentication failures"
    fi
}

# Check SSL certificate expiration
check_ssl_expiration() {
    log "INFO" "Checking SSL certificate expiration..."
    
    local ssl_dir="./ssl"
    if [[ -d "$ssl_dir" ]]; then
        local cert_file="$ssl_dir/live/*/fullchain.pem"
        if ls $cert_file 1> /dev/null 2>&1; then
            local expiry_date=$(openssl x509 -enddate -noout -in $cert_file 2>/dev/null | cut -d= -f2)
            local expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null || echo "0")
            local current_epoch=$(date +%s)
            local days_remaining=$(( (expiry_epoch - current_epoch) / 86400 ))
            
            if [[ $days_remaining -lt 7 ]]; then
                alert "SSL certificate expires in $days_remaining days!"
            elif [[ $days_remaining -lt 30 ]]; then
                log "WARN" "SSL certificate expires in $days_remaining days"
            else
                log "INFO" "✓ SSL certificate valid for $days_remaining days"
            fi
        else
            log "WARN" "SSL certificate not found"
        fi
    else
        log "INFO" "SSL directory not found - assuming development environment"
    fi
}

# Check for suspicious network activity
check_network_activity() {
    log "INFO" "Checking network activity..."
    
    # Check for unusual connection patterns
    local nginx_container="homeserver-nginx"
    if docker ps --format "{{.Names}}" | grep -q "$nginx_container"; then
        # Check for high number of requests from single IP
        local suspicious_ips=$(docker logs "$nginx_container" 2>&1 | \
            grep -E '^\d+\.\d+\.\d+\.\d+' | \
            awk '{print $1}' | \
            sort | uniq -c | \
            awk '$1 > 100 {print $2 " (" $1 " requests)"}')
        
        if [[ -n "$suspicious_ips" ]]; then
            log "WARN" "High request volume from IPs: $suspicious_ips"
        else
            log "INFO" "✓ No suspicious network activity detected"
        fi
    else
        log "INFO" "Nginx container not running - skipping network check"
    fi
}

# Check container health
check_container_health() {
    log "INFO" "Checking container health..."
    
    local unhealthy_containers=$(docker ps --filter "health=unhealthy" --format "{{.Names}}")
    
    if [[ -n "$unhealthy_containers" ]]; then
        alert "Unhealthy containers detected: $unhealthy_containers"
        return 1
    else
        log "INFO" "✓ All containers healthy"
        return 0
    fi
}

# Check disk space
check_disk_space() {
    log "INFO" "Checking disk space..."
    
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [[ $disk_usage -gt 90 ]]; then
        alert "Critical disk space: ${disk_usage}% used"
        return 1
    elif [[ $disk_usage -gt 80 ]]; then
        log "WARN" "High disk usage: ${disk_usage}% used"
    else
        log "INFO" "✓ Disk usage normal: ${disk_usage}% used"
    fi
}

# Check for security updates
check_security_updates() {
    log "INFO" "Checking for security updates..."
    
    # Check if running in a container or on host
    if [[ -f /.dockerenv ]]; then
        log "INFO" "Running in container - skipping host security updates"
        return 0
    fi
    
    if command -v apt >/dev/null 2>&1; then
        local security_updates=$(apt list --upgradable 2>/dev/null | grep -i security | wc -l)
        if [[ $security_updates -gt 0 ]]; then
            log "WARN" "$security_updates security updates available"
        else
            log "INFO" "✓ No security updates pending"
        fi
    elif command -v yum >/dev/null 2>&1; then
        local security_updates=$(yum --security check-update 2>/dev/null | grep -c "needed for security" || echo "0")
        if [[ $security_updates -gt 0 ]]; then
            log "WARN" "$security_updates security updates available"
        else
            log "INFO" "✓ No security updates pending"
        fi
    else
        log "INFO" "Package manager not detected - skipping security update check"
    fi
}

# Check application health endpoint
check_app_health() {
    log "INFO" "Checking application health..."
    
    local health_response=$(curl -sf "$BACKEND_URL/actuator/health" 2>/dev/null || echo "DOWN")
    
    if [[ "$health_response" == "DOWN" ]]; then
        alert "Application health check failed"
        return 1
    elif echo "$health_response" | grep -q '"status":"UP"'; then
        log "INFO" "✓ Application health check passed"
        return 0
    else
        log "WARN" "Application health check returned unexpected response: $health_response"
        return 1
    fi
}

# Check file permissions
check_file_permissions() {
    log "INFO" "Checking sensitive file permissions..."
    
    local issues=0
    
    # Check .secrets file permissions
    if [[ -f ".secrets" ]]; then
        local secrets_perms=$(stat -c "%a" .secrets)
        if [[ "$secrets_perms" != "600" ]]; then
            log "WARN" ".secrets file permissions are $secrets_perms (should be 600)"
            ((issues++))
        else
            log "INFO" "✓ .secrets file permissions correct"
        fi
    fi
    
    # Check for world-readable sensitive files
    local world_readable=$(find . -type f \( -name "*.key" -o -name "*.pem" -o -name "*.p12" \) -perm /004 2>/dev/null)
    if [[ -n "$world_readable" ]]; then
        log "WARN" "World-readable sensitive files found: $world_readable"
        ((issues++))
    fi
    
    if [[ $issues -eq 0 ]]; then
        log "INFO" "✓ File permissions check passed"
    fi
    
    return $issues
}

# Main monitoring function
run_security_checks() {
    log "INFO" "Starting security monitoring checks..."
    
    local failed_checks=0
    
    check_root_processes || ((failed_checks++))
    check_auth_failures
    check_ssl_expiration
    check_network_activity
    check_container_health || ((failed_checks++))
    check_disk_space || ((failed_checks++))
    check_security_updates
    check_app_health || ((failed_checks++))
    check_file_permissions || ((failed_checks++))
    
    if [[ $failed_checks -gt 0 ]]; then
        log "ERROR" "Security monitoring completed with $failed_checks failed checks"
        return 1
    else
        log "INFO" "✓ All security checks passed"
        return 0
    fi
}

# Show usage
show_usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -c, --continuous    Run continuously with specified interval"
    echo "  -i, --interval SEC  Set check interval in seconds (default: 300)"
    echo "  -v, --verbose       Enable verbose logging"
    echo "  -e, --email EMAIL   Set alert email address"
    echo ""
    echo "Environment variables:"
    echo "  SECURITY_ALERT_EMAIL  Email address for alerts"
    echo "  BACKEND_URL          Backend URL for health checks"
    echo "  CHECK_INTERVAL       Check interval in seconds"
}

# Parse command line arguments
CONTINUOUS=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -c|--continuous)
            CONTINUOUS=true
            shift
            ;;
        -i|--interval)
            CHECK_INTERVAL="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -e|--email)
            ALERT_EMAIL="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Create log file if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

# Run checks
if [[ "$CONTINUOUS" == "true" ]]; then
    log "INFO" "Starting continuous security monitoring (interval: ${CHECK_INTERVAL}s)"
    while true; do
        run_security_checks
        sleep "$CHECK_INTERVAL"
    done
else
    run_security_checks
fi