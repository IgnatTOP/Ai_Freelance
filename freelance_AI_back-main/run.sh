#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

MODE="${1:-watch}"

if [[ "$MODE" == "once" ]]; then
  echo "Starting backend server (no watch)..."
  exec go run ./cmd/server
fi

if [[ "$MODE" != "watch" ]]; then
  echo "Unknown mode: $MODE"
  echo "Usage: ./run.sh [watch|once]"
  exit 1
fi

echo "Starting backend server with auto-reload..."

if command -v air >/dev/null 2>&1; then
  exec air -c .air.toml
fi

echo "air is not installed globally. Running via 'go run github.com/air-verse/air@latest'..."
exec go run github.com/air-verse/air@latest -c .air.toml
