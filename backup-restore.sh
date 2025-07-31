#!/bin/bash

# Home Server Backup and Recovery Script
# Provides automated backup, encryption, and recovery capabilities

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/homeserver}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
ENCRYPTION_KEY_FILE="${ENCRYPTION_KEY_FILE:-/etc/homeserver/backup.key}"
S3_BUCKET="${S3_BUCKET:-}"
S3_REGION="${S3_REGION:-us-east-1}"
MYSQL_CONTAINER="${MYSQL_CONTAINER:-homeserver-mysql}"
NOTIFICATION_EMAIL="${NOTIFICATION_EMAIL:-}"
LOG_FILE="/var/log/homeserver-backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR" "$1"
    send_notification "BACKUP_FAILED" "$1"
    exit 1
}

# Send notification
send_notification() {
    local status=$1
    local message=$2
    
    if [[ -n "$NOTIFICATION_EMAIL" ]] && command -v mail >/dev/null 2>&1; then
        case $status in
            "BACKUP_SUCCESS")
                echo "$message" | mail -s "✅ Home Server Backup Successful" "$NOTIFICATION_EMAIL"
                ;;
            "BACKUP_FAILED")
                echo "$message" | mail -s "❌ Home Server Backup Failed" "$NOTIFICATION_EMAIL"
                ;;
            "RESTORE_SUCCESS")
                echo "$message" | mail -s "✅ Home Server Restore Successful" "$NOTIFICATION_EMAIL"
                ;;
            "RESTORE_FAILED")
                echo "$message" | mail -s "❌ Home Server Restore Failed" "$NOTIFICATION_EMAIL"
                ;;
        esac
    fi
}

# Generate encryption key
generate_encryption_key() {
    if [[ ! -f "$ENCRYPTION_KEY_FILE" ]]; then
        log "INFO" "Generating new backup encryption key..."
        mkdir -p "$(dirname "$ENCRYPTION_KEY_FILE")"
        openssl rand -base64 32 > "$ENCRYPTION_KEY_FILE"
        chmod 600 "$ENCRYPTION_KEY_FILE"
        log "INFO" "Encryption key generated at $ENCRYPTION_KEY_FILE"
    fi
}

# Backup database
backup_database() {
    local backup_file="$1"
    
    log "INFO" "Starting database backup..."
    
    if ! docker ps --format "{{.Names}}" | grep -q "^${MYSQL_CONTAINER}$"; then
        error_exit "MySQL container '$MYSQL_CONTAINER' is not running"
    fi
    
    # Get database credentials from container environment
    local mysql_root_password=$(docker exec "$MYSQL_CONTAINER" env | grep MYSQL_ROOT_PASSWORD | cut -d= -f2)
    local mysql_database=$(docker exec "$MYSQL_CONTAINER" env | grep MYSQL_DATABASE | cut -d= -f2)
    
    # Create database dump
    docker exec "$MYSQL_CONTAINER" mysqldump \
        -u root \
        -p"$mysql_root_password" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --opt \
        --comments \
        --dump-date \
        "$mysql_database" > "$backup_file" || error_exit "Database backup failed"
    
    log "INFO" "Database backup completed: $backup_file"
}

# Backup application files
backup_application_files() {
    local backup_file="$1"
    
    log "INFO" "Starting application files backup..."
    
    # Files to backup
    local files_to_backup=(
        ".secrets"
        "compose.yml"
        "compose.prod.yml"
        "nginx.conf"
        "db/init.sql"
        "ssl/"
        "docker-compose.override.yml"
    )
    
    # Create tar archive
    tar -czf "$backup_file" \
        --exclude-vcs \
        --exclude='*.log' \
        --exclude='target/' \
        --exclude='node_modules/' \
        --exclude='.next/' \
        "${files_to_backup[@]}" 2>/dev/null || true
    
    log "INFO" "Application files backup completed: $backup_file"
}

# Backup container volumes
backup_volumes() {
    local backup_file="$1"
    
    log "INFO" "Starting volume backup..."
    
    # Get volume names
    local volumes=$(docker volume ls --format "{{.Name}}" | grep homeserver || true)
    
    if [[ -z "$volumes" ]]; then
        log "WARN" "No homeserver volumes found to backup"
        return 0
    fi
    
    # Create temporary container to backup volumes
    local temp_container="homeserver-backup-temp"
    
    # Remove existing temp container if it exists
    docker rm -f "$temp_container" 2>/dev/null || true
    
    # Create backup container
    docker run --rm \
        --name "$temp_container" \
        -v homeserver_mysql_data:/data/mysql_data:ro \
        -v "$(dirname "$backup_file"):/backup" \
        ubuntu:20.04 \
        tar -czf "/backup/$(basename "$backup_file")" -C /data . || error_exit "Volume backup failed"
    
    log "INFO" "Volume backup completed: $backup_file"
}

# Encrypt backup
encrypt_backup() {
    local source_file="$1"
    local encrypted_file="${source_file}.enc"
    
    log "INFO" "Encrypting backup file..."
    
    openssl enc -aes-256-cbc -salt -in "$source_file" -out "$encrypted_file" -pass file:"$ENCRYPTION_KEY_FILE" || error_exit "Backup encryption failed"
    
    # Remove unencrypted file
    rm "$source_file"
    
    log "INFO" "Backup encrypted: $encrypted_file"
    echo "$encrypted_file"
}

# Upload to S3 (if configured)
upload_to_s3() {
    local file_path="$1"
    local s3_key="homeserver/$(basename "$file_path")"
    
    if [[ -z "$S3_BUCKET" ]]; then
        log "INFO" "S3 backup not configured, skipping upload"
        return 0
    fi
    
    if ! command -v aws >/dev/null 2>&1; then
        log "WARN" "AWS CLI not found, skipping S3 upload"
        return 0
    fi
    
    log "INFO" "Uploading backup to S3..."
    
    aws s3 cp "$file_path" "s3://$S3_BUCKET/$s3_key" \
        --region "$S3_REGION" \
        --storage-class STANDARD_IA || error_exit "S3 upload failed"
    
    log "INFO" "Backup uploaded to S3: s3://$S3_BUCKET/$s3_key"
}

# Clean old backups
cleanup_old_backups() {
    log "INFO" "Cleaning up old backups..."
    
    # Local cleanup
    find "$BACKUP_DIR" -name "*.enc" -type f -mtime +"$BACKUP_RETENTION_DAYS" -delete || true
    
    # S3 cleanup (if configured)
    if [[ -n "$S3_BUCKET" ]] && command -v aws >/dev/null 2>&1; then
        local cutoff_date=$(date -d "${BACKUP_RETENTION_DAYS} days ago" '+%Y-%m-%d')
        aws s3api list-objects-v2 \
            --bucket "$S3_BUCKET" \
            --prefix "homeserver/" \
            --query "Contents[?LastModified<='${cutoff_date}'].Key" \
            --output text | while read -r key; do
                if [[ -n "$key" && "$key" != "None" ]]; then
                    aws s3 rm "s3://$S3_BUCKET/$key"
                    log "INFO" "Deleted old S3 backup: $key"
                fi
            done
    fi
    
    log "INFO" "Cleanup completed"
}

# Full backup
perform_backup() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_prefix="$BACKUP_DIR/homeserver_backup_$timestamp"
    
    log "INFO" "Starting full backup process..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Generate encryption key if needed
    generate_encryption_key
    
    # Backup database
    local db_backup="${backup_prefix}_database.sql"
    backup_database "$db_backup"
    local encrypted_db=$(encrypt_backup "$db_backup")
    
    # Backup application files
    local files_backup="${backup_prefix}_files.tar.gz"
    backup_application_files "$files_backup"
    local encrypted_files=$(encrypt_backup "$files_backup")
    
    # Backup volumes
    local volumes_backup="${backup_prefix}_volumes.tar.gz"
    backup_volumes "$volumes_backup"
    local encrypted_volumes=$(encrypt_backup "$volumes_backup")
    
    # Upload to S3
    upload_to_s3 "$encrypted_db"
    upload_to_s3 "$encrypted_files"
    upload_to_s3 "$encrypted_volumes"
    
    # Create backup manifest
    local manifest="${backup_prefix}_manifest.json"
    cat > "$manifest" << EOF
{
    "timestamp": "$timestamp",
    "database_backup": "$(basename "$encrypted_db")",
    "files_backup": "$(basename "$encrypted_files")",
    "volumes_backup": "$(basename "$encrypted_volumes")",
    "backup_size": {
        "database": "$(stat -c%s "$encrypted_db" | numfmt --to=iec)",
        "files": "$(stat -c%s "$encrypted_files" | numfmt --to=iec)",
        "volumes": "$(stat -c%s "$encrypted_volumes" | numfmt --to=iec)"
    },
    "retention_days": "$BACKUP_RETENTION_DAYS"
}
EOF
    
    # Clean old backups
    cleanup_old_backups
    
    log "INFO" "Backup completed successfully"
    send_notification "BACKUP_SUCCESS" "Backup completed at $timestamp"
    
    echo -e "${GREEN}✅ Backup completed successfully!${NC}"
    echo -e "Database backup: ${BLUE}$encrypted_db${NC}"
    echo -e "Files backup: ${BLUE}$encrypted_files${NC}"  
    echo -e "Volumes backup: ${BLUE}$encrypted_volumes${NC}"
    echo -e "Manifest: ${BLUE}$manifest${NC}"
}

# Decrypt backup
decrypt_backup() {
    local encrypted_file="$1"
    local decrypted_file="${encrypted_file%.enc}"
    
    log "INFO" "Decrypting backup file..."
    
    openssl enc -aes-256-cbc -d -in "$encrypted_file" -out "$decrypted_file" -pass file:"$ENCRYPTION_KEY_FILE" || error_exit "Backup decryption failed"
    
    log "INFO" "Backup decrypted: $decrypted_file"
    echo "$decrypted_file"
}

# Restore database
restore_database() {
    local backup_file="$1"
    
    log "INFO" "Starting database restore..."
    
    if ! docker ps --format "{{.Names}}" | grep -q "^${MYSQL_CONTAINER}$"; then
        error_exit "MySQL container '$MYSQL_CONTAINER' is not running"
    fi
    
    # Get database credentials
    local mysql_root_password=$(docker exec "$MYSQL_CONTAINER" env | grep MYSQL_ROOT_PASSWORD | cut -d= -f2)
    local mysql_database=$(docker exec "$MYSQL_CONTAINER" env | grep MYSQL_DATABASE | cut -d= -f2)
    
    # Restore database
    cat "$backup_file" | docker exec -i "$MYSQL_CONTAINER" mysql \
        -u root \
        -p"$mysql_root_password" \
        "$mysql_database" || error_exit "Database restore failed"
    
    log "INFO" "Database restore completed"
}

# List available backups
list_backups() {
    echo -e "${BLUE}📋 Available Backups:${NC}"
    echo ""
    
    if [[ -d "$BACKUP_DIR" ]]; then
        local backups=$(find "$BACKUP_DIR" -name "*_manifest.json" | sort -r)
        
        if [[ -z "$backups" ]]; then
            echo -e "${YELLOW}No backups found in $BACKUP_DIR${NC}"
            return 0
        fi
        
        for manifest in $backups; do
            local timestamp=$(basename "$manifest" | sed 's/homeserver_backup_\([0-9_]*\)_manifest.json/\1/')
            local formatted_time=$(echo "$timestamp" | sed 's/_/ /')
            local db_size=$(jq -r '.backup_size.database' "$manifest" 2>/dev/null || echo "unknown")
            local files_size=$(jq -r '.backup_size.files' "$manifest" 2>/dev/null || echo "unknown")
            local volumes_size=$(jq -r '.backup_size.volumes' "$manifest" 2>/dev/null || echo "unknown")
            
            echo -e "${GREEN}📅 $formatted_time${NC}"
            echo -e "   Database: $db_size, Files: $files_size, Volumes: $volumes_size"
            echo -e "   Manifest: $manifest"
            echo ""
        done
    else
        echo -e "${YELLOW}Backup directory $BACKUP_DIR does not exist${NC}"
    fi
}

# Show usage
show_usage() {
    echo "Home Server Backup and Recovery Tool"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  backup                     Perform full backup"
    echo "  restore <timestamp>        Restore from backup"
    echo "  list                       List available backups"
    echo "  encrypt <file>            Encrypt a file"
    echo "  decrypt <file>            Decrypt a file"
    echo "  cleanup                   Clean old backups"
    echo ""
    echo "Options:"
    echo "  -h, --help               Show this help"
    echo "  -v, --verbose            Enable verbose logging"
    echo ""
    echo "Environment Variables:"
    echo "  BACKUP_DIR               Backup directory (default: /var/backups/homeserver)"
    echo "  BACKUP_RETENTION_DAYS    Retention period (default: 30)"
    echo "  ENCRYPTION_KEY_FILE      Encryption key file path"
    echo "  S3_BUCKET               S3 bucket for offsite backup"
    echo "  S3_REGION               S3 region (default: us-east-1)"
    echo "  MYSQL_CONTAINER         MySQL container name"
    echo "  NOTIFICATION_EMAIL      Email for notifications"
}

# Main function
main() {
    # Create log file
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    case "${1:-}" in
        "backup")
            perform_backup
            ;;
        "restore")
            if [[ -z "${2:-}" ]]; then
                echo -e "${RED}Error: Please specify backup timestamp${NC}"
                echo "Usage: $0 restore <timestamp>"
                exit 1
            fi
            restore_from_backup "$2"
            ;;
        "list")
            list_backups
            ;;
        "encrypt")
            if [[ -z "${2:-}" ]]; then
                echo -e "${RED}Error: Please specify file to encrypt${NC}"
                exit 1
            fi
            generate_encryption_key
            encrypt_backup "$2"
            ;;
        "decrypt")
            if [[ -z "${2:-}" ]]; then
                echo -e "${RED}Error: Please specify file to decrypt${NC}"
                exit 1
            fi
            decrypt_backup "$2"
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        "-h"|"--help"|"help"|"")
            show_usage
            ;;
        *)
            echo -e "${RED}Error: Unknown command '$1'${NC}"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"