#!/usr/bin/env bash
set -euo pipefail

export LOAD_TARGET_URL="${LOAD_TARGET_URL:-http://127.0.0.1:10000}"
echo "RESOLVED LOAD_TARGET_URL=${LOAD_TARGET_URL}"

echo "================================================================================"
echo "⚠️  COOLDOWN NOTICE: Global apiRateLimiter enforces 2,000 req / 15 min per IP."
echo "   Running this load test (~1,800 requests) back-to-back within 15 minutes"
echo "   will trigger rate-limiting (HTTP 429) and fail the HTTP success-rate check."
echo "================================================================================"
echo ""

echo "[provision] Registering disposable load-test user against ${LOAD_TARGET_URL}..."
export TEST_AUTH_TOKEN
TEST_AUTH_TOKEN=$(node "$(dirname "$0")/provision-token.js")
echo "[provision] Token acquired."

npx artillery run "$(dirname "$0")/artillery.config.yml"
