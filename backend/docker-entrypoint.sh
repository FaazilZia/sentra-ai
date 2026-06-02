#!/bin/sh
echo "[ENTRYPOINT] Starting entrypoint script..."
echo "[ENTRYPOINT] PORT=$PORT NODE_ENV=$NODE_ENV"

echo "[ENTRYPOINT] Running database migrations..."
npx prisma migrate deploy
MIGRATION_EXIT=$?
echo "[ENTRYPOINT] Migration exit code: $MIGRATION_EXIT"

if [ $MIGRATION_EXIT -ne 0 ]; then
  echo "[ENTRYPOINT] Migration failed with exit code $MIGRATION_EXIT — aborting"
  exit 1
fi

echo "[ENTRYPOINT] Migrations complete. Starting server..."
echo "[ENTRYPOINT] Executing: $@"
exec "$@"
