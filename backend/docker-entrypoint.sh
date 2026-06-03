#!/bin/sh
set -e
echo "[EP] v3 starting. PORT=$PORT"

echo "[EP] Running migrations..."
npx prisma migrate deploy
echo "[EP] Migrations done."

echo "[EP] Launching server..."
exec node dist/src/server.js
