#!/usr/bin/env bash
# Build a CA bundle that includes both the macOS system root certs and any
# corporate/enterprise CAs added to the System keychain. This is needed for
# Node.js (and tools like Resend's SDK) to validate TLS through corporate
# proxies/firewalls that re-sign HTTPS traffic.
#
# Usage: bash scripts/build-ca-bundle.sh
# Output: ./.cabundle.pem (gitignored)

set -euo pipefail

OUT=".cabundle.pem"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "[build-ca-bundle] Not on macOS; skipping (NODE_EXTRA_CA_CERTS will be empty)."
  : > "$OUT"
  exit 0
fi

TMP_SYS="$(mktemp)"
TMP_ROOT="$(mktemp)"
trap 'rm -f "$TMP_SYS" "$TMP_ROOT"' EXIT

security find-certificate -a -p /Library/Keychains/System.keychain >"$TMP_SYS" 2>/dev/null || true
security find-certificate -a -p /System/Library/Keychains/SystemRootCertificates.keychain >"$TMP_ROOT" 2>/dev/null || true

cat "$TMP_SYS" "$TMP_ROOT" >"$OUT"

CERTS=$(grep -c -- "-----BEGIN CERTIFICATE-----" "$OUT" || true)
echo "[build-ca-bundle] wrote $OUT (${CERTS} certs)"
