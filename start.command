#!/bin/zsh
# Double-clickable launcher for the recipe app (macOS Finder).
# Starts the local server on http://localhost:7878 and opens the browser.
# Close this Terminal window (or Ctrl-C) to stop the app.
set -e
cd "$(dirname "$0")/app"

# Make nvm-installed node available in this non-interactive shell.
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# The app needs Node 20.19+ (see package.json engines).
major=$(node -v 2>/dev/null | sed 's/^v//' | cut -d. -f1 || echo 0)
if [ "${major:-0}" -lt 20 ]; then
  echo "This app needs Node 20.19 or newer (found: $(node -v 2>/dev/null || echo none))."
  echo "Install it with:  nvm install 22 && nvm alias default 22"
  echo
  read -r "?Press Enter to close…"
  exit 1
fi

# First run: install dependencies.
if [ ! -d node_modules ]; then
  echo "First run — installing dependencies (one-time, ~1 minute)…"
  npm install
fi

npm start
