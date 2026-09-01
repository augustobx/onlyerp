#!/usr/bin/env sh
set -eu

APP_DIR=/opt/apps/tommasi
BACKUP_DIR=/opt/backups/tommasi/db
LOCK_FILE=/run/lock/tommasi-backup-db.lock
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-14}

umask 077

if [ "$BACKUP_DIR" != "/opt/backups/tommasi/db" ]; then
  echo "Unexpected backup directory" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
exec 9>"$LOCK_FILE"
flock -n 9 || {
  echo "Another Tommasi backup is already running" >&2
  exit 1
}

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
base="tommasi-db-$timestamp.sql.gz"
partial="$BACKUP_DIR/.$base.partial"
final="$BACKUP_DIR/$base"

cleanup() {
  rm -f -- "$partial"
}
trap cleanup EXIT INT TERM

cd "$APP_DIR"
docker compose --env-file .env exec -T db sh -c \
  'MYSQL_PWD="$MYSQL_PASSWORD" exec mysqldump --user="$MYSQL_USER" --single-transaction --quick --routines --triggers --events --hex-blob --default-character-set=utf8mb4 --set-gtid-purged=OFF "$MYSQL_DATABASE"' \
  | gzip -9 >"$partial"

test -s "$partial"
gzip -t "$partial"
mv -- "$partial" "$final"
sha256sum "$final" >"$final.sha256"

find "$BACKUP_DIR" -maxdepth 1 -type f -name 'tommasi-db-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'tommasi-db-*.sql.gz.sha256' -mtime "+$RETENTION_DAYS" -delete

trap - EXIT INT TERM
echo "$final"
