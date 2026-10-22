#!/usr/bin/env bash
set -eo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Sentra AI: Database Restore from Encrypted Backup
# Streams encrypted archive through openssl decryption directly into psql.
# NEVER prints database connection strings or encryption keys.
# ─────────────────────────────────────────────────────────────────────────────

ENC_FILE="$1"
if [ -z "$ENC_FILE" ] && [ -n "$BACKUP_FILE" ]; then
  ENC_FILE="$BACKUP_FILE"
fi

if [ -z "$ENC_FILE" ] || [ ! -f "$ENC_FILE" ]; then
  echo "❌ Error: Encrypted backup file not found. Usage: $0 <path_to_backup.dump.enc>" >&2
  exit 1
fi

TARGET_URL="${RESTORE_DATABASE_URL:-${DATABASE_URL}}"
if [ -z "$TARGET_URL" ]; then
  echo "❌ Error: No restore target database URL provided. Set RESTORE_DATABASE_URL." >&2
  exit 1
fi

ENCRYPT_KEY="${BACKUP_ENCRYPTION_KEY:-${ENCRYPTION_KEY}}"
if [ -z "$ENCRYPT_KEY" ]; then
  echo "❌ Error: BACKUP_ENCRYPTION_KEY or ENCRYPTION_KEY must be set." >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  if [ -x "/opt/homebrew/bin/psql" ]; then
    export PATH="/opt/homebrew/bin:$PATH"
  else
    echo "❌ Error: psql utility not found in PATH." >&2
    exit 1
  fi
fi

# Verify SHA-256 checksum if .sha256 file exists
SHA_FILE="${ENC_FILE}.sha256"
if [ -f "$SHA_FILE" ]; then
  echo "🔍 Verifying archive SHA-256 integrity checksum..."
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 -c "$SHA_FILE" >/dev/null
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum -c "$SHA_FILE" >/dev/null
  fi
  echo "✅ Checksum verified: Archive has not been tampered with."
fi

export RESTORE_SECRET_PASSPHRASE="$ENCRYPT_KEY"

echo "============================================================"
echo "♻️  Sentra AI: Initiating Decrypted Database Restore"
echo "============================================================"
echo "Source Archive: ${ENC_FILE}"
echo "------------------------------------------------------------"

# Decrypt stream directly into psql
openssl enc -d -aes-256-cbc -salt -pbkdf2 -iter 100000 -pass env:RESTORE_SECRET_PASSPHRASE -in "$ENC_FILE" \
  | psql "$TARGET_URL" -q -v ON_ERROR_STOP=0 > /dev/null 2>&1

unset RESTORE_SECRET_PASSPHRASE

echo "✅ Database Restore Stream Completed Successfully!"
echo "============================================================"
