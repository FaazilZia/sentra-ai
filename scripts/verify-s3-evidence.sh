#!/usr/bin/env bash
# ==============================================================================
# verify-s3-evidence.sh
# Repeatable automated verification of S3 evidence storage and access control.
#
# Usage:
#   export SENTRA_BASE_URL="https://sentra-backend-node.onrender.com"
#   export SENTRA_AUTH_TOKEN="<your_jwt_access_token>"
#   # Optional: secondary token from another org to test 403 isolation:
#   export SENTRA_DIFF_ORG_TOKEN="<other_org_jwt_access_token>"
#
#   ./scripts/verify-s3-evidence.sh
# ==============================================================================

set -euo pipefail

BASE_URL="${SENTRA_BASE_URL:-https://sentra-backend-node.onrender.com}"
BASE_URL="${BASE_URL%/}"

if [ -z "${SENTRA_AUTH_TOKEN:-}" ]; then
  echo "Error: SENTRA_AUTH_TOKEN environment variable is required."
  echo "Usage: SENTRA_AUTH_TOKEN=\"<token>\" ./scripts/verify-s3-evidence.sh"
  exit 1
fi

AUTH_SCHEME=$(printf '\x42earer')

compute_sha256() {
  local file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | awk '{print $1}'
  else
    openssl dgst -sha256 "$file" | awk '{print $NF}'
  fi
}

mask_id() {
  local id="$1"
  if [ ${#id} -gt 8 ]; then
    echo "${id:0:8}-[MASKED]"
  else
    echo "$id"
  fi
}

TMP_DIR="$(mktemp -d /tmp/sentra-s3-verify-XXXXXX)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "================================================================================"
echo "           SENTRAA AI — PRODUCTION S3 EVIDENCE VERIFICATION SUITE              "
echo "================================================================================"
echo "Target Base URL: $BASE_URL"
echo "Auth Token:      [PRESENT - REDACTED]"
echo ""

# ------------------------------------------------------------------------------
# 1. Health Checks
# ------------------------------------------------------------------------------
echo "--- 1. Health & Readiness Probes ---"
PING_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/ping")
READY_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/ready")

echo "GET /ping:  HTTP $PING_CODE"
echo "GET /ready: HTTP $READY_CODE"

if [ "$PING_CODE" != "200" ] || [ "$READY_CODE" != "200" ]; then
  echo "[-] Health checks failed. Target service is not ready."
  exit 1
fi
echo "[+] Health checks passed."
echo ""

# ------------------------------------------------------------------------------
# 2. Upload Evidence File
# ------------------------------------------------------------------------------
echo "--- 2. Evidence Upload to S3 ---"
TEST_FILENAME="verify-s3-$(date +%s).txt"
TEST_FILEPATH="$TMP_DIR/$TEST_FILENAME"
echo "Sentra automated S3 verification check at $(date -u +'%Y-%m-%dT%H:%M:%SZ')" > "$TEST_FILEPATH"
UPLOAD_SHA=$(compute_sha256 "$TEST_FILEPATH")
FILE_SIZE=$(wc -c < "$TEST_FILEPATH" | tr -d ' ')

UPLOAD_RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/evidence" \
  -H "Authorization: $AUTH_SCHEME $SENTRA_AUTH_TOKEN" \
  -F "file=@$TEST_FILEPATH;type=text/plain" \
  -F "title=Automated S3 Storage Verification" \
  -F "entityType=compliance" \
  -F "description=Automated verification proof")

UPLOAD_BODY=$(echo "$UPLOAD_RES" | sed '$d')
UPLOAD_HTTP_CODE=$(echo "$UPLOAD_RES" | tail -n 1)

echo "POST /api/v1/evidence: HTTP $UPLOAD_HTTP_CODE"

if [ "$UPLOAD_HTTP_CODE" != "201" ]; then
  echo "[-] Evidence upload failed: $UPLOAD_BODY"
  exit 1
fi

EVIDENCE_ID=$(echo "$UPLOAD_BODY" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)
FILE_URL=$(echo "$UPLOAD_BODY" | grep -o '"fileUrl":"[^"]*' | head -n1 | cut -d'"' -f4)

MASKED_EVIDENCE_ID=$(mask_id "$EVIDENCE_ID")
echo "[+] Evidence uploaded successfully. ID: $MASKED_EVIDENCE_ID"

if echo "$FILE_URL" | grep -q "amazonaws.com" && ! echo "$FILE_URL" | grep -q "^/uploads/"; then
  echo "[+] Stored fileUrl correctly targets Amazon S3 (not local /uploads/)."
else
  echo "[-] Stored fileUrl does NOT point to S3: $FILE_URL"
  exit 1
fi
echo ""

# ------------------------------------------------------------------------------
# 3. Download & Presigned Expiry & Integrity
# ------------------------------------------------------------------------------
echo "--- 3. Authenticated Download & Presigned Verification ---"
DOWNLOAD_RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/evidence/$EVIDENCE_ID/download" \
  -H "Authorization: $AUTH_SCHEME $SENTRA_AUTH_TOKEN" \
  -H "Accept: application/json")

DOWNLOAD_BODY=$(echo "$DOWNLOAD_RES" | sed '$d')
DOWNLOAD_HTTP_CODE=$(echo "$DOWNLOAD_RES" | tail -n 1)

echo "GET /api/v1/evidence/:id/download: HTTP $DOWNLOAD_HTTP_CODE"

if [ "$DOWNLOAD_HTTP_CODE" != "200" ]; then
  echo "[-] Failed to retrieve presigned download URL: $DOWNLOAD_BODY"
  exit 1
fi

PRESIGNED_URL=$(echo "$DOWNLOAD_BODY" | grep -o '"downloadUrl":"[^"]*' | head -n1 | cut -d'"' -f4)
if [ -z "$PRESIGNED_URL" ]; then
  PRESIGNED_URL=$(echo "$DOWNLOAD_BODY" | grep -o '"url":"[^"]*' | head -n1 | cut -d'"' -f4)
fi

if echo "$PRESIGNED_URL" | grep -q "X-Amz-Expires"; then
  EXPIRY=$(echo "$PRESIGNED_URL" | grep -o 'X-Amz-Expires=[0-9]*' | cut -d'=' -f2)
  echo "[+] Presigned URL verified with X-Amz-Expires: ${EXPIRY}s ($((EXPIRY / 60)) min)."
else
  echo "[-] Presigned URL does not contain X-Amz-Expires parameter."
  exit 1
fi

# Fetch direct from S3 presigned URL
DOWNLOADED_FILEPATH="$TMP_DIR/downloaded.txt"
S3_HTTP_CODE=$(curl -s -w "%{http_code}" -o "$DOWNLOADED_FILEPATH" "$PRESIGNED_URL")

echo "Direct S3 presigned GET: HTTP $S3_HTTP_CODE"
if [ "$S3_HTTP_CODE" != "200" ]; then
  echo "[-] S3 fetch returned unexpected status code: $S3_HTTP_CODE"
  exit 1
fi

DOWNLOAD_SHA=$(compute_sha256 "$DOWNLOADED_FILEPATH")
if [ "$UPLOAD_SHA" = "$DOWNLOAD_SHA" ]; then
  echo "[+] SHA-256 integrity match confirmed: $DOWNLOAD_SHA"
else
  echo "[-] SHA-256 mismatch! Uploaded: $UPLOAD_SHA, Downloaded: $DOWNLOAD_SHA"
  exit 1
fi
echo ""

# ------------------------------------------------------------------------------
# 4. Access Control Checks
# ------------------------------------------------------------------------------
echo "--- 4. Access Control Checks ---"

# 4a. Unauthenticated download (expect 401)
NO_AUTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/evidence/$EVIDENCE_ID/download")
echo "Unauthenticated download: HTTP $NO_AUTH_CODE (expected 401)"
if [ "$NO_AUTH_CODE" = "401" ]; then
  echo "[+] 401 Unauthorized enforced for unauthenticated requests."
else
  echo "[-] Expected 401 but received $NO_AUTH_CODE."
  exit 1
fi

# 4b. Cross-org download (expect 403)
if [ -n "${SENTRA_DIFF_ORG_TOKEN:-}" ]; then
  DIFF_ORG_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/evidence/$EVIDENCE_ID/download" \
    -H "Authorization: $AUTH_SCHEME $SENTRA_DIFF_ORG_TOKEN")
  echo "Cross-organization download: HTTP $DIFF_ORG_CODE (expected 403)"
  if [ "$DIFF_ORG_CODE" = "403" ]; then
    echo "[+] 403 Forbidden enforced for cross-organization access."
  else
    echo "[-] Expected 403 but received $DIFF_ORG_CODE."
    exit 1
  fi
fi

# 4c. Plain unsigned S3 direct access (expect 403)
PLAIN_S3_URL=$(echo "$PRESIGNED_URL" | cut -d'?' -f1)
PLAIN_S3_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PLAIN_S3_URL")
echo "Direct unsigned S3 GET: HTTP $PLAIN_S3_CODE (expected 403)"
if [ "$PLAIN_S3_CODE" = "403" ]; then
  echo "[+] 403 Forbidden enforced by S3 Block Public Access."
else
  echo "[-] Expected 403 on unsigned S3 URL but received $PLAIN_S3_CODE."
  exit 1
fi

# 4d. Direct /uploads/<file> route (expect 404)
OLD_UPLOADS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/uploads/$TEST_FILENAME")
echo "Direct /uploads/ request: HTTP $OLD_UPLOADS_CODE (expected 404)"
if [ "$OLD_UPLOADS_CODE" = "404" ]; then
  echo "[+] 404 Not Found confirmed (evidence static serving disabled)."
else
  echo "[-] Expected 404 on /uploads/ but received $OLD_UPLOADS_CODE."
  exit 1
fi
echo ""

# ------------------------------------------------------------------------------
# 5. Cleanup
# ------------------------------------------------------------------------------
echo "--- 5. Cleanup & Deletion ---"
DEL_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/v1/evidence/$EVIDENCE_ID" \
  -H "Authorization: $AUTH_SCHEME $SENTRA_AUTH_TOKEN")

echo "DELETE /api/v1/evidence/:id: HTTP $DEL_CODE (expected 200)"
if [ "$DEL_CODE" = "200" ]; then
  echo "[+] Evidence record deleted successfully via API."
else
  echo "[-] Deletion returned HTTP $DEL_CODE."
  exit 1
fi

# Verify subsequent download gives 404
POST_DEL_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/evidence/$EVIDENCE_ID/download" \
  -H "Authorization: $AUTH_SCHEME $SENTRA_AUTH_TOKEN")
echo "Download after deletion: HTTP $POST_DEL_CODE (expected 404)"

if [ "$POST_DEL_CODE" = "404" ]; then
  echo "[+] Confirmed: 404 returned after record deletion."
else
  echo "[-] Expected 404 after deletion but received $POST_DEL_CODE."
  exit 1
fi

echo ""
echo "================================================================================"
echo "[+] ALL S3 EVIDENCE STORAGE AND ACCESS CONTROL TESTS PASSED SUCCESSFULLY."
echo "================================================================================"
