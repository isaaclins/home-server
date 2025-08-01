#!/bin/bash

# Home Server Backup and Disaster Recovery Script
# Provides automated backup, verification, and recovery capabilities

set -e

# Configuration
BACKUP_DIR="/var/backups/homeserver"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PREFIX="homeserver_backup"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
MYSQL_CONTAINER=${MYSQL_CONTAINER:-homeserver-mysql}
MYSQL_DATABASE=${MYSQL_DATABASE:-homeserver}
MYSQL_USER=${MYSQL_USER:-homeserver_app}
COMPOSE_PROJECT=${COMPOSE_PROJECT_NAME:-homeserver}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ✗${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Home Server Backup and Recovery Tool"
    echo ""
    echo "Usage: $0 [OPTIONS] COMMAND"
    echo ""
    echo "Commands:"
    echo "  backup      Create a full backup"
    echo "  restore     Restore from backup"
    echo "  list        List available backups"
    echo "  cleanup     Remove old backups"
    echo "  verify      Verify backup integrity"
    echo "  schedule    Setup automated backups"
    echo ""
    echo "Options:"
    echo "  -d, --backup-dir DIR    Backup directory (default: $BACKUP_DIR)"
    echo "  -r, --retention DAYS    Retention period in days (default: $RETENTION_DAYS)"
    echo "  -f, --backup-file FILE  Specific backup file for restore"
    echo "  -h, --help             Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 backup                    # Create a backup"
    echo "  $0 restore -f backup.tar.gz # Restore from specific backup"
    echo "  $0 cleanup                   # Remove old backups"
    echo "  $0 verify                    # Verify latest backup"
}

# Function to check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running"
        exit 1
    fi
    
    # Check if backup directory exists or can be created
    if [ ! -d "$BACKUP_DIR" ]; then
        log "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR" || {
            log_error "Cannot create backup directory: $BACKUP_DIR"
            exit 1
        }
    fi
    
    # Check if MySQL container is running
    if ! docker ps | grep -q "$MYSQL_CONTAINER"; then
        log_error "MySQL container '$MYSQL_CONTAINER' is not running"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Function to create database backup
backup_database() {
    local backup_file="$1"
    
    log "Creating database backup..."
    
    # Get MySQL root password from container environment
    local mysql_root_password
    mysql_root_password=$(docker exec "$MYSQL_CONTAINER" printenv MYSQL_ROOT_PASSWORD)
    
    # Create database dump
    docker exec "$MYSQL_CONTAINER" mysqldump \
        -u root \
        -p"$mysql_root_password" \
        --single-transaction \
        --routines \
        --triggers \
        --all-databases > "$backup_file" || {
        log_error "Database backup failed"
        return 1
    }
    
    log_success "Database backup created: $backup_file"
}

# Function to backup application files
backup_application_files() {
    local backup_dir="$1"
    
    log "Backing up application files..."
    
    # Get the project root directory
    local project_root
    project_root=$(dirname "$(readlink -f "$0")")
    
    # Create application backup (excluding sensitive files and build artifacts)
    tar -czf "$backup_dir/application_files.tar.gz" \
        -C "$project_root" \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='target' \
        --exclude='.next' \
        --exclude='*.log' \
        --exclude='.secrets' \
        --exclude='backups' \
        . || {
        log_error "Application files backup failed"
        return 1
    }
    
    log_success "Application files backed up"
}

# Function to backup Docker volumes
backup_volumes() {
    local backup_dir="$1"
    
    log "Backing up Docker volumes..."
    
    # Backup MySQL data volume
    docker run --rm \
        -v "${COMPOSE_PROJECT}_mysql_data:/data:ro" \
        -v "$backup_dir:/backup" \
        alpine:latest \
        tar -czf /backup/mysql_volume.tar.gz -C /data . || {
        log_error "MySQL volume backup failed"
        return 1
    }
    
    log_success "Docker volumes backed up"
}

# Function to create backup manifest
create_backup_manifest() {
    local backup_dir="$1"
    
    log "Creating backup manifest..."
    
    cat > "$backup_dir/backup_manifest.json" << EOF
{
    "backup_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "backup_type": "full",
    "components": {
        "database": {
            "file": "database_dump.sql",
            "checksum": "$(sha256sum "$backup_dir/database_dump.sql" | cut -d' ' -f1)"
        },
        "application_files": {
            "file": "application_files.tar.gz",
            "checksum": "$(sha256sum "$backup_dir/application_files.tar.gz" | cut -d' ' -f1)"
        },
        "mysql_volume": {
            "file": "mysql_volume.tar.gz",
            "checksum": "$(sha256sum "$backup_dir/mysql_volume.tar.gz" | cut -d' ' -f1)"
        }
    },
    "mysql_container": "$MYSQL_CONTAINER",
    "mysql_database": "$MYSQL_DATABASE",
    "compose_project": "$COMPOSE_PROJECT"
}
EOF
    
    log_success "Backup manifest created"
}

# Function to perform full backup
perform_backup() {
    log "Starting full backup process..."
    
    local backup_name="${BACKUP_PREFIX}_${DATE}"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    # Create backup directory
    mkdir -p "$backup_path"
    
    # Perform individual backups
    backup_database "$backup_path/database_dump.sql"
    backup_application_files "$backup_path"
    backup_volumes "$backup_path"
    create_backup_manifest "$backup_path"
    
    # Create compressed archive
    local archive_path="$BACKUP_DIR/${backup_name}.tar.gz"
    tar -czf "$archive_path" -C "$BACKUP_DIR" "$backup_name"
    
    # Remove temporary directory
    rm -rf "$backup_path"
    
    # Verify backup
    if verify_backup "$archive_path"; then
        log_success "Backup completed successfully: $archive_path"
        
        # Update latest backup symlink
        ln -sf "$archive_path" "$BACKUP_DIR/latest_backup.tar.gz"
        
        # Log backup information
        local backup_size
        backup_size=$(du -h "$archive_path" | cut -f1)
        log "Backup size: $backup_size"
        
        return 0
    else
        log_error "Backup verification failed"
        rm -f "$archive_path"
        return 1
    fi
}

# Function to verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        backup_file="$BACKUP_DIR/latest_backup.tar.gz"
    fi
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    
    log "Verifying backup integrity: $backup_file"
    
    # Extract to temporary directory for verification
    local temp_dir
    temp_dir=$(mktemp -d)
    
    if ! tar -xzf "$backup_file" -C "$temp_dir"; then
        log_error "Failed to extract backup archive"
        rm -rf "$temp_dir"
        return 1
    fi
    
    # Find the backup directory
    local backup_dir
    backup_dir=$(find "$temp_dir" -maxdepth 1 -type d -name "${BACKUP_PREFIX}_*" | head -1)
    
    if [ ! -f "$backup_dir/backup_manifest.json" ]; then
        log_error "Backup manifest not found"
        rm -rf "$temp_dir"
        return 1
    fi
    
    # Verify checksums
    log "Verifying checksums..."
    local verification_failed=false
    
    while IFS= read -r file; do
        local expected_checksum
        expected_checksum=$(jq -r ".components.$file.checksum" "$backup_dir/backup_manifest.json")
        local actual_checksum
        actual_checksum=$(sha256sum "$backup_dir/$(jq -r ".components.$file.file" "$backup_dir/backup_manifest.json")" | cut -d' ' -f1)
        
        if [ "$expected_checksum" = "$actual_checksum" ]; then
            log_success "Checksum verified: $file"
        else
            log_error "Checksum mismatch: $file"
            verification_failed=true
        fi
    done < <(jq -r '.components | keys[]' "$backup_dir/backup_manifest.json")
    
    rm -rf "$temp_dir"
    
    if [ "$verification_failed" = true ]; then
        log_error "Backup verification failed"
        return 1
    else
        log_success "Backup verification passed"
        return 0
    fi
}

# Function to list backups
list_backups() {
    log "Available backups:"
    echo ""
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR"/*.tar.gz 2>/dev/null)" ]; then
        log_warning "No backups found in $BACKUP_DIR"
        return
    fi
    
    printf "%-30s %-10s %-20s\n" "Backup File" "Size" "Date"
    printf "%-30s %-10s %-20s\n" "----------" "----" "----"
    
    for backup in "$BACKUP_DIR"/*.tar.gz; do
        if [ -f "$backup" ]; then
            local filename
            filename=$(basename "$backup")
            local size
            size=$(du -h "$backup" | cut -f1)
            local date
            date=$(stat -c %y "$backup" | cut -d'.' -f1)
            printf "%-30s %-10s %-20s\n" "$filename" "$size" "$date"
        fi
    done
}

# Function to cleanup old backups
cleanup_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    if [ ! -d "$BACKUP_DIR" ]; then
        log_warning "Backup directory does not exist: $BACKUP_DIR"
        return
    fi
    
    local deleted_count=0
    
    find "$BACKUP_DIR" -name "*.tar.gz" -type f -mtime +$RETENTION_DAYS -print0 | while IFS= read -r -d '' backup; do
        log "Removing old backup: $(basename "$backup")"
        rm -f "$backup"
        deleted_count=$((deleted_count + 1))
    done
    
    log_success "Cleanup completed. Removed $deleted_count old backups."
}

# Function to setup scheduled backups
setup_schedule() {
    log "Setting up automated backup schedule..."
    
    local cron_schedule="${BACKUP_SCHEDULE:-0 2 * * *}"  # Default: 2 AM daily
    local script_path
    script_path=$(readlink -f "$0")
    
    # Create cron job
    (crontab -l 2>/dev/null | grep -v "$script_path backup"; echo "$cron_schedule $script_path backup >> /var/log/homeserver-backup.log 2>&1") | crontab -
    
    log_success "Backup schedule configured: $cron_schedule"
    log "Backups will be logged to: /var/log/homeserver-backup.log"
}

# Function to restore from backup
restore_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        backup_file="$BACKUP_DIR/latest_backup.tar.gz"
    fi
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    
    log_warning "WARNING: This will restore the system from backup and may overwrite current data!"
    read -p "Are you sure you want to continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^yes$ ]]; then
        log "Restore cancelled by user"
        return 1
    fi
    
    log "Starting restore process from: $backup_file"
    
    # Verify backup before restore
    if ! verify_backup "$backup_file"; then
        log_error "Backup verification failed. Restore aborted."
        return 1
    fi
    
    # Extract backup
    local temp_dir
    temp_dir=$(mktemp -d)
    tar -xzf "$backup_file" -C "$temp_dir"
    
    local backup_dir
    backup_dir=$(find "$temp_dir" -maxdepth 1 -type d -name "${BACKUP_PREFIX}_*" | head -1)
    
    # Stop services
    log "Stopping services..."
    docker compose -p "$COMPOSE_PROJECT" down
    
    # Restore database
    log "Restoring database..."
    docker compose -p "$COMPOSE_PROJECT" up -d mysql
    
    # Wait for MySQL to be ready
    sleep 30
    
    # Restore database dump
    docker exec -i "$MYSQL_CONTAINER" mysql -u root -p"$(docker exec "$MYSQL_CONTAINER" printenv MYSQL_ROOT_PASSWORD)" < "$backup_dir/database_dump.sql"
    
    # Restore volumes
    log "Restoring volumes..."
    docker run --rm \
        -v "${COMPOSE_PROJECT}_mysql_data:/data" \
        -v "$backup_dir:/backup:ro" \
        alpine:latest \
        sh -c "rm -rf /data/* && tar -xzf /backup/mysql_volume.tar.gz -C /data"
    
    # Restart all services
    log "Starting all services..."
    docker compose -p "$COMPOSE_PROJECT" up -d
    
    rm -rf "$temp_dir"
    
    log_success "Restore completed successfully!"
}

# Main function
main() {
    local command=""
    local backup_file=""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -d|--backup-dir)
                BACKUP_DIR="$2"
                shift 2
                ;;
            -r|--retention)
                RETENTION_DAYS="$2"
                shift 2
                ;;
            -f|--backup-file)
                backup_file="$2"
                shift 2
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            backup|restore|list|cleanup|verify|schedule)
                command="$1"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    if [ -z "$command" ]; then
        log_error "No command specified"
        show_usage
        exit 1
    fi
    
    # Execute command
    case $command in
        backup)
            check_prerequisites
            perform_backup
            ;;
        restore)
            check_prerequisites
            restore_backup "$backup_file"
            ;;
        list)
            list_backups
            ;;
        cleanup)
            cleanup_backups
            ;;
        verify)
            verify_backup "$backup_file"
            ;;
        schedule)
            setup_schedule
            ;;
        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Check if jq is available (required for JSON processing)
if ! command -v jq > /dev/null 2>&1; then
    log_error "jq is required but not installed. Please install jq."
    exit 1
fi

# Run main function
main "$@"