#!/usr/bin/env bash
set -eo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Sentra AI: Production Encrypted Database Backup Script
# Performs pg_dump with zero-leakage, encrypted with AES-256-CBC via OpenSSL.
# NEVER prints database URLs, passwords, or encryption keys.
# ─────────────────────────────────────────────────────────────────────────────

TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
OUTPUT_DIR="${BACKUP_OUTPUT_DIR:-./backups}"
mkdir -p "$OUTPUT_DIR"

ENC_FILE="${OUTPUT_DIR}/sentra_backup_${TIMESTAMP}.dump.enc"
SHA_FILE="${ENC_FILE}.sha256"

# Validate requirements
if ! command -v pg_dump >/dev/null 2>&1; then
  if [ -x "/opt/homebrew/bin/pg_dump" ]; then
    export PATH="/opt/homebrew/bin:$PATH"
  else
    echo "❌ Error: pg_dump utility not found in PATH." >&2
    exit 1
  fi
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "❌ Error: openssl utility not found in PATH." >&2
  exit 1
fi

TARGET_URL="${BACKUP_DATABASE_URL:-${DATABASE_URL:-${DIRECT_URL}}}"
if [ -z "$TARGET_URL" ]; then
  echo "❌ Error: No database URL provided. Set DATABASE_URL or BACKUP_DATABASE_URL." >&2
  exit 1
fi

ENCRYPT_KEY="${BACKUP_ENCRYPTION_KEY:-${ENCRYPTION_KEY}}"
if [ -z "$ENCRYPT_KEY" ] || [ "${#ENCRYPT_KEY}" -lt 16 ]; then
  echo "❌ Error: BACKUP_ENCRYPTION_KEY or ENCRYPTION_KEY must be set (min 16 chars)." >&2
  exit 1
fi

export BACKUP_SECRET_PASSPHRASE="$ENCRYPT_KEY"

echo "============================================================"
echo "🔒  Sentra AI: Initiating Encrypted Database Backup"
echo "============================================================"
echo "Timestamp:    ${TIMESTAMP}"
echo "Output File:  ${ENC_FILE}"
echo "Algorithm:    AES-256-CBC (PBKDF2 with 100,000 iterations)"
echo "------------------------------------------------------------"

# Execute pg_dump streaming through openssl without writing plaintext to disk
# Pass connection URL directly without printing to console
pg_dump "$TARGET_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --format=plain \
  2> /tmp/sentra_backup_err.log \
  | openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 -pass env:BACKUP_SECRET_PASSPHRASE -out "$ENC_FILE"

# Scrub temp error log for safety
rm -f /tmp/sentra_backup_err.log
unset BACKUP_SECRET_PASSPHRASE

# Generate SHA-256 integrity checksum
if command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "$ENC_FILE" > "$SHA_FILE"
elif command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$ENC_FILE" > "$SHA_FILE"
fi

FILE_SIZE=$(ls -lh "$ENC_FILE" | awk '{print $5}')
CHECKSUM=$(awk '{print $1}' "$SHA_FILE")

echo "✅ Backup Completed Successfully!"
echo "Size:         ${FILE_SIZE}"
echo "SHA-256 Hash: ${CHECKSUM}"
echo "Archive:      ${ENC_FILE}"
echo "Checksum:     ${SHA_FILE}"
echo "============================================================"
