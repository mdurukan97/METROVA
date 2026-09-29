#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f tools/bob.jar ]]; then
  echo "[METROVA] tools/bob.jar missing (pin: Defold 1.13.1)."
  exit 2
fi

mkdir -p dist/android
java -jar tools/bob.jar \
  --platform armv7-android \
  --architectures arm64-android \
  --variant debug \
  --archive \
  --bundle-format apk \
  --bundle-output dist/android \
  resolve distclean build bundle
