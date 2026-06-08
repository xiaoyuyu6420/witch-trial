#!/bin/sh
set -e

DB_PATH="/app/data/witch-trial.db"
BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/witch-trial_${TIMESTAMP}.db"

if [ ! -f "$DB_PATH" ]; then
  echo "[$(date)] No database found at $DB_PATH, skipping backup."
  exit 0
fi

mkdir -p "$BACKUP_DIR"

# SQLite safe backup using the .backup command
sqlite3 "$DB_PATH" ".backup '${BACKUP_FILE}'"

# Compress the backup
gzip -f "$BACKUP_FILE"

echo "[$(date)] Backup created: ${BACKUP_FILE}.gz ($(du -h "${BACKUP_FILE}.gz" | cut -f1))"

# Retain only the latest 30 backups, delete the rest
cd "$BACKUP_DIR"
ls -t witch-trial_*.db.gz 2>/dev/null | tail -n +31 | xargs -r rm -f
echo "[$(date)] Cleanup done. Current backups: $(ls witch-trial_*.db.gz 2>/dev/null | wc -l | tr -d ' ')"
