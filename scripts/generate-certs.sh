#!/usr/bin/env bash
#
# Generates locally trusted TLS certificates for development.
#
# Why this is mandatory rather than a hardening step: apps/web and
# apps/server are separate origins, so the session cookie must be
# SameSite=None, and SameSite=None requires Secure. Browsers refuse Secure
# cookies over plain HTTP - including on localhost. Without TLS the login
# request succeeds and the session silently never reaches the API.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERT_DIR="${ROOT_DIR}/certs"

if ! command -v mkcert >/dev/null 2>&1; then
  cat >&2 <<'EOF'
mkcert is not installed.

  Debian/Ubuntu:
    sudo apt install libnss3-tools
    curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
    chmod +x mkcert-v*-linux-amd64
    sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert

  macOS:
    brew install mkcert nss

Then run this script again.
EOF
  exit 1
fi

# Installs the local CA into the system and browser trust stores. Idempotent.
mkcert -install

mkdir -p "${CERT_DIR}"

# 127.0.0.1 and ::1 are listed alongside localhost so the certificate also
# validates when a tool connects by address. The LAN address used for
# checkpoint C in task 2.7 has to be added by hand, since it varies per
# machine:
#
#   mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem \
#     localhost 127.0.0.1 ::1 192.168.1.42
mkcert \
  -key-file "${CERT_DIR}/localhost-key.pem" \
  -cert-file "${CERT_DIR}/localhost.pem" \
  localhost 127.0.0.1 ::1

echo
echo "Certificates written to ${CERT_DIR}"
echo "HTTPS_KEY_FILE and HTTPS_CERT_FILE in .env already point at them."
