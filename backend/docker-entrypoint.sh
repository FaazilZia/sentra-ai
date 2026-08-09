#!/bin/sh
echo "[EP] v4 starting. PORT=$PORT"

echo "[EP] Checking migration status..."
npx --ignore-scripts prisma migrate status 2>&1 || true

echo "[EP] Running migrations..."
npx --ignore-scripts prisma migrate deploy 2>&1
MIGRATION_EXIT=$?
echo "[EP] Migration exit code: $MIGRATION_EXIT"

if [ $MIGRATION_EXIT -ne 0 ]; then
  echo "[EP] Migration failed. Attempting to resolve..."
  
  # Check if it's a failed migration that needs resolving
  node scripts/resolve-failed-migration.js 2>&1 || true
  
  echo "[EP] Retrying migration..."
  npx --ignore-scripts prisma migrate deploy 2>&1
  RETRY_EXIT=$?
  echo "[EP] Retry exit code: $RETRY_EXIT"
  
  if [ $RETRY_EXIT -ne 0 ]; then
    echo "[EP] Migration retry also failed. Starting server anyway..."
  fi
fi

echo "[EP] Launching server..."
exec node dist/src/server.js
