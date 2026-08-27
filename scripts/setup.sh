#!/usr/bin/env bash
# One-time local setup after cloning.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Installing git hooks (gitleaks pre-commit)…"
git config core.hooksPath .githooks
chmod +x .githooks/*

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "⚠ gitleaks not found — install it: brew install gitleaks"
else
  echo "✓ gitleaks $(gitleaks version)"
fi

if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "→ Created .env.local from .env.example — fill in real values."
fi

echo "✓ Setup complete. Run: npm install && npm run dev"
