#!/usr/bin/env bash
# scripts/setup-cloud.sh
# Interactive wizard that wires this checkout to your Supabase cloud project.
# Prompts for the URL + anon key, writes them to .env (gitignored), optionally
# links the supabase CLI and pushes migrations. Service-role key is NEVER
# written locally — that goes into GitHub Actions secrets only.
#
# Idempotent: re-running updates the same .env file, asking before overwriting
# existing values. Secrets are read with -s so they don't echo to the terminal
# or shell history.
#
# Works in bash (Linux / macOS / WSL / Git Bash on Windows).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

red()   { printf "\033[31m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
yel()   { printf "\033[33m%s\033[0m\n" "$*"; }
bold()  { printf "\033[1m%s\033[0m\n" "$*"; }
step()  { printf "\n\033[1m── %s ──\033[0m\n" "$*"; }

ask() {
  local prompt="$1" default="${2:-}" var
  if [ -n "$default" ]; then
    read -r -p "$prompt [$default]: " var
    echo "${var:-$default}"
  else
    read -r -p "$prompt: " var
    echo "$var"
  fi
}

ask_secret() {
  local prompt="$1" var
  read -r -s -p "$prompt: " var
  echo >&2
  echo "$var"
}

confirm() {
  local prompt="$1" reply
  read -r -p "$prompt [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]]
}

# Read an existing value from .env, blank if missing.
env_get() {
  local key="$1"
  if [ -f .env ]; then
    grep -E "^$key=" .env | head -1 | sed -E "s/^$key=//"
  fi
}

# Atomically rewrite .env with key=value (replaces existing key, appends if new).
env_set() {
  local key="$1" value="$2"
  local tmp
  tmp="$(mktemp)"
  if [ -f .env ]; then
    grep -v -E "^$key=" .env > "$tmp" || true
  fi
  echo "$key=$value" >> "$tmp"
  mv "$tmp" .env
  chmod 600 .env
}

step "GrowQuest cloud Supabase setup"
bold "This wires this checkout to your Supabase cloud project."
echo "Nothing you type is logged or shared. Secrets are written to .env (gitignored)."

# 1) Bootstrap .env from .env.example if missing.
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    chmod 600 .env
    yel "created .env from .env.example"
  else
    touch .env
    chmod 600 .env
    yel "created empty .env"
  fi
fi

# 2) URL.
step "1/4  Supabase project URL"
echo "Found in dashboard → Settings → API → \"Project URL\"."
echo "Looks like: https://<ref>.supabase.co"
existing_url="$(env_get SUPABASE_URL)"
new_url="$(ask "URL" "$existing_url")"
if [[ ! "$new_url" =~ ^https://[a-z0-9-]+\.supabase\.co/?$ ]]; then
  yel "warning: URL doesn't look like https://<ref>.supabase.co — continuing anyway"
fi
env_set SUPABASE_URL "$new_url"
green "saved SUPABASE_URL"

# Derive project ref from URL for later supabase link.
project_ref=""
if [[ "$new_url" =~ ^https://([a-z0-9-]+)\.supabase\.co ]]; then
  project_ref="${BASH_REMATCH[1]}"
fi

# 3) Anon key.
step "2/4  Supabase anon (publishable) key"
echo "Found in dashboard → Settings → API → \"Project API keys\" → \"anon public\"."
echo "It's a long JWT starting with eyJ — paste it; the screen won't show it."
new_anon="$(ask_secret 'anon key (input hidden)')"
if [[ ! "$new_anon" =~ ^eyJ ]]; then
  yel "warning: doesn't look like a JWT (eyJ...) — continuing anyway"
fi
env_set SUPABASE_ANON_KEY "$new_anon"
green "saved SUPABASE_ANON_KEY"

# 4) Optional: link the CLI.
step "3/4  link the Supabase CLI"
if ! command -v supabase >/dev/null 2>&1; then
  yel "supabase CLI not found — install it later from https://supabase.com/docs/guides/cli"
  yel "skipping link + db push"
else
  if [ -n "$project_ref" ] && confirm "Run 'supabase link --project-ref $project_ref' now?"; then
    supabase link --project-ref "$project_ref" || yel "link failed; you can re-run manually later"
  else
    echo "  (skip)"
  fi

  if confirm "Run 'supabase db push' to apply migrations to the cloud project now?"; then
    supabase db push || yel "db push failed; check the output above"
  else
    echo "  (skip — you can run it later)"
  fi
fi

# 5) Service-role reminder.
step "4/4  service-role key — DO NOT write it locally"
cat <<'EOF'
The service-role key bypasses RLS — never put it in .env or commit it.
It only belongs in:
  • GitHub Actions secrets (repo → Settings → Secrets and variables → Actions)
    add SUPABASE_SERVICE_ROLE_KEY there if you want CI to deploy migrations
    or run admin scripts.
  • Supabase edge functions (set with `supabase secrets set` per environment).
EOF

# 6) Smoke test offer.
step "ready"
green "wrote SUPABASE_URL + SUPABASE_ANON_KEY to .env"
echo "verify the wiring end-to-end:"
echo "    ./scripts/smoke-cloud.sh"
echo
if confirm "Run smoke-cloud.sh now?"; then
  ./scripts/smoke-cloud.sh
fi
