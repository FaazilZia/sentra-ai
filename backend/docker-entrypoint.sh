#!/bin/sh
echo "[ENTRYPOINT] Starting entrypoint script..."
echo "[ENTRYPOINT] PORT=$PORT NODE_ENV=$NODE_ENV"

echo "[ENTRYPOINT] Running database migrations..."
npx prisma migrate deploy
MIGRATION_EXIT=$?
echo "[ENTRYPOINT] Migration exit code: $MIGRATION_EXIT"

if [ $MIGRATION_EXIT -ne 0 ]; then
  echo "[ENTRYPOINT] Migration failed — aborting"
  exit 1
fi

echo "[ENTRYPOINT] Checking dist output..."
ls -la /app/dist/src/ || echo "dist/src missing!"
ls /app/dist/src/server.js || { echo "ERROR: dist/src/server.js not found!"; exit 1; }

echo "[ENTRYPOINT] Testing server module load..."
NODE_ENV=test node -e "
  try {
    require('./dist/src/server.js');
    console.log('[ENTRYPOINT] Module load successful');
  } catch(e) {
    console.error('MODULE LOAD FAILED:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
"
echo "[ENTRYPOINT] Module test done"

echo "[ENTRYPOINT] Starting server..."
exec "$@"
