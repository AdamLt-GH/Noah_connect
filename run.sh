#!/usr/bin/env bash
# One-command launcher: starts the FastAPI extraction backend (creating the
# venv on first run) and opens the Noah Connect prototype dashboard.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$ROOT/.venv"
BACKEND_DIR="$ROOT/project/backend"
PROTOTYPE="$ROOT/prototype/index.html"

if [ ! -d "$VENV" ]; then
  echo "Setting up Python virtual environment..."
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -q -r "$BACKEND_DIR/requirements.txt"
fi

BACKEND_STARTED_HERE=0
if curl -sf http://localhost:8000/ > /dev/null 2>&1; then
  echo "Backend already running on http://localhost:8000 — reusing it."
else
  echo "Starting backend on http://localhost:8000..."
  (cd "$BACKEND_DIR" && exec "$VENV/bin/python" main.py) &
  BACKEND_PID=$!
  BACKEND_STARTED_HERE=1

  for i in $(seq 1 30); do
    if curl -sf http://localhost:8000/ > /dev/null 2>&1; then
      break
    fi
    sleep 0.5
  done
fi

cleanup() {
  if [ "$BACKEND_STARTED_HERE" = "1" ]; then
    echo ""
    echo "Stopping backend (pid $BACKEND_PID)..."
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "Opening the dashboard..."
open "$PROTOTYPE"

echo ""
echo "AC Grant Dashboard is running. Press Ctrl+C to stop the backend."

if [ "$BACKEND_STARTED_HERE" = "1" ]; then
  wait "$BACKEND_PID"
else
  # Backend belongs to another process — just keep the script alive so the
  # trap doesn't fire immediately; Ctrl+C simply exits without killing it.
  while true; do sleep 3600; done
fi
