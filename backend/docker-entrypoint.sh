#!/bin/sh
# cache-bust: 2026-06-03-v2
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
ls /app/dist/src/server.js && echo "[ENTRYPOINT] server.js found" || { echo "[ENTRYPOINT] ERROR: server.js not found"; exit 1; }

echo "[ENTRYPOINT] Testing module load..."
NODE_ENV=test node dist/src/server.js &
SERVER_PID=$!
sleep 5
if kill -0 $SERVER_PID 2>/dev/null; then
  echo "[ENTRYPOINT] Module load OK — process is running"
  kill $SERVER_PID
else
  echo "[ENTRYPOINT] ERROR: server.js exited immediately"
  exit 1
fi

echo "[ENTRYPOINT] Starting server for real..."
exec "$@"
