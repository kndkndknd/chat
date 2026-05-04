#!/bin/bash
set -euo pipefail

SNAPSHOT_DIR="/mnt/sda1/redis_rdp_snapshot"
CONTAINER="redis"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOGFILE="$SNAPSHOT_DIR/snapshot.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOGFILE"; }

log "Starting snapshot..."

# Record current LASTSAVE before triggering new save
PREV_LASTSAVE=$(docker exec "$CONTAINER" redis-cli LASTSAVE)

docker exec "$CONTAINER" redis-cli BGSAVE

# Wait until background save completes
for i in $(seq 1 300); do
    IN_PROGRESS=$(docker exec "$CONTAINER" redis-cli INFO persistence \
        | grep rdb_bgsave_in_progress \
        | cut -d: -f2 | tr -d '\r\n ')
    CURRENT_LASTSAVE=$(docker exec "$CONTAINER" redis-cli LASTSAVE)

    if [ "$IN_PROGRESS" = "0" ] && [ "$CURRENT_LASTSAVE" != "$PREV_LASTSAVE" ]; then
        break
    fi

    if [ "$i" -eq 300 ]; then
        log "ERROR: BGSAVE timed out after 300 seconds"
        exit 1
    fi
    sleep 1
done

# Copy dump.rdb from container to snapshot directory
DEST="$SNAPSHOT_DIR/dump_${TIMESTAMP}.rdb"
docker cp "$CONTAINER:/data/dump.rdb" "$DEST"
log "Snapshot saved: $DEST"

# Flush all Redis data
docker exec "$CONTAINER" redis-cli FLUSHALL
log "Redis data flushed."
