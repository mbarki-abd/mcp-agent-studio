#!/bin/bash
# MCP Agent Studio - Database Backup Script
# Run daily via cron: 0 2 * * * /opt/mcp-agent-studio/deploy/scripts/backup.sh

set -e

# Configuration
BACKUP_DIR="/opt/mcp-agent-studio/deploy/backups"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Load environment
source /opt/mcp-agent-studio/deploy/.env

echo "=== Starting backup at $(date) ==="

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL
echo "Backing up PostgreSQL..."
docker exec mcp-postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_DIR/postgres-$TIMESTAMP.sql.gz"

# Backup Redis (if needed)
echo "Backing up Redis..."
docker exec mcp-redis redis-cli -a "$REDIS_PASSWORD" BGSAVE
sleep 5
docker cp mcp-redis:/data/dump.rdb "$BACKUP_DIR/redis-$TIMESTAMP.rdb"

# Remove old backups
echo "Cleaning old backups..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.rdb" -mtime +$RETENTION_DAYS -delete

# Calculate backup size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

echo "=== Backup complete ==="
echo "Location: $BACKUP_DIR"
echo "Total size: $BACKUP_SIZE"
echo "Files:"
ls -lh "$BACKUP_DIR" | tail -5
