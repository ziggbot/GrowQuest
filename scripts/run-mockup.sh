#!/usr/bin/env bash
# scripts/run-mockup.sh
# Boot the React UX prototype (design/mockup.jsx) as a local web app.
# Works on PC (Linux/macOS/WSL/Git Bash) — needs Node 18+ and npm.
#
# Pure-Windows users without WSL can run the same three commands manually:
#   cd design\web
#   npm install
#   npm run dev

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT/design/web"

if ! command -v npm >/dev/null 2>&1; then
  echo "missing: npm. Install Node.js 18+ from https://nodejs.org/ (or use nvm)." >&2
  exit 1
fi

# Refuse ancient Node — Vite 5 needs >= 18.
node_major=$(node -p "process.versions.node.split('.')[0]")
if [ "$node_major" -lt 18 ]; then
  echo "Node $node_major detected — Vite 5 requires Node 18 or newer." >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "── installing dependencies (one-time) ──"
  npm install
fi

echo
echo "── starting Vite dev server ──"
echo "   open http://localhost:5173 in your browser"
echo "   the mockup is the UX spec — not the shipped iOS app"
echo
exec npm run dev
