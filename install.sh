#!/usr/bin/env bash
# MeadOS — © 2026 icemanxbe (https://github.com/icemanxbe/MeadOS)
# Licensed under the PolyForm Noncommercial License 1.0.0 (see LICENSE).
#
# Cross-platform install/update/run helper. Detects macOS vs Linux and sets
# up MeadOS as a user-level background service (launchd / systemd --user) so
# it starts on login and restarts itself if it ever crashes — the same setup
# a hand-rolled launchd plist would give you, just reproducible on any machine.
#
# Usage: ./install.sh <command> [--port N] [--db PATH]
#   install   Set up the background service (installs + starts it)
#   update    git pull the latest code, then restart the service
#   start     Start the service
#   stop      Stop the service
#   restart   Restart the service
#   status    Show whether the service is running
#   uninstall Remove the background service (does not delete your data)
#   run       Run server.py directly in the foreground (no service; Ctrl-C to stop)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

SERVICE_LABEL="com.meados.server"
PORT="8080"
DB_PATH=""
COMMAND="${1:-}"
[ $# -gt 0 ] && shift || true

while [ $# -gt 0 ]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    --db) DB_PATH="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

PYTHON_BIN="$(command -v python3 || true)"
if [ -z "$PYTHON_BIN" ]; then
  echo "Python 3.8+ is required but wasn't found on PATH. Install it and re-run." >&2
  exit 1
fi

OS="$(uname -s 2>/dev/null || echo unknown)"

usage() {
  # Prints the header comment block verbatim (minus the shebang) — self-
  # adjusts if the header above grows or shrinks, no line numbers to keep in sync.
  awk '/^#!/{next} /^#/{sub(/^# ?/,""); print; next} {exit}' "$0"
}

server_args() {
  printf '%s' "--port $PORT"
  [ -n "$DB_PATH" ] && printf ' %s' "--db $DB_PATH"
}

# ---------------------------------------------------------------- macOS (launchd)
PLIST="$HOME/Library/LaunchAgents/${SERVICE_LABEL}.plist"
LOG_PATH="$HOME/Library/Logs/meados.log"

macos_write_plist() {
  mkdir -p "$(dirname "$PLIST")" "$(dirname "$LOG_PATH")"
  cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${SERVICE_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${PYTHON_BIN}</string>
        <string>${SCRIPT_DIR}/server.py</string>
        <string>--port</string>
        <string>${PORT}</string>
$( [ -n "$DB_PATH" ] && printf '        <string>--db</string>\n        <string>%s</string>\n' "$DB_PATH" )
    </array>
    <key>WorkingDirectory</key>
    <string>${SCRIPT_DIR}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${LOG_PATH}</string>
    <key>StandardErrorPath</key>
    <string>${LOG_PATH}</string>
</dict>
</plist>
EOF
}

macos_cmd() {
  local domain="gui/$(id -u)"
  case "$1" in
    install)
      macos_write_plist
      launchctl bootout "$domain/$SERVICE_LABEL" 2>/dev/null || true
      launchctl bootstrap "$domain" "$PLIST"
      launchctl enable "$domain/$SERVICE_LABEL"
      echo "Installed. MeadOS will start on login and restart itself if it crashes."
      echo "Logs: $LOG_PATH"
      ;;
    start|restart)
      if [ ! -f "$PLIST" ]; then
        echo "Not installed yet — run ./install.sh install first." >&2
        exit 1
      fi
      # stop uses bootout, which fully unloads the job — KeepAlive can only
      # resurrect a job launchd still knows about, so start/restart must
      # re-bootstrap (harmless no-op if it's already loaded) before kickstarting.
      launchctl bootstrap "$domain" "$PLIST" 2>/dev/null || true
      launchctl enable "$domain/$SERVICE_LABEL"
      if [ "$1" = "restart" ]; then
        launchctl kickstart -k "$domain/$SERVICE_LABEL"
      else
        launchctl kickstart "$domain/$SERVICE_LABEL"
      fi
      ;;
    stop) launchctl bootout "$domain/$SERVICE_LABEL" 2>/dev/null || true ;;
    status)
      if launchctl print "$domain/$SERVICE_LABEL" >/dev/null 2>&1; then
        echo "running"
      else
        echo "not running"
      fi
      ;;
    uninstall)
      launchctl bootout "$domain/$SERVICE_LABEL" 2>/dev/null || true
      rm -f "$PLIST"
      echo "Removed the background service. Your data in meados.db is untouched."
      ;;
  esac
}

# ------------------------------------------------------------ Linux (systemd --user)
UNIT_DIR="$HOME/.config/systemd/user"
UNIT_PATH="$UNIT_DIR/meados.service"

linux_write_unit() {
  mkdir -p "$UNIT_DIR"
  cat > "$UNIT_PATH" <<EOF
[Unit]
Description=MeadOS mead-brewing companion
After=network.target

[Service]
ExecStart=${PYTHON_BIN} ${SCRIPT_DIR}/server.py $(server_args)
WorkingDirectory=${SCRIPT_DIR}
Restart=on-failure
RestartSec=3

[Install]
WantedBy=default.target
EOF
}

linux_cmd() {
  case "$1" in
    install)
      linux_write_unit
      systemctl --user daemon-reload
      systemctl --user enable --now meados.service
      echo "Installed. MeadOS will start on login and restart itself if it crashes."
      echo "Logs: journalctl --user -u meados.service -f"
      echo "Tip: to keep running even when you're logged out, run:"
      echo "  sudo loginctl enable-linger \$USER"
      ;;
    start|restart)
      if [ ! -f "$UNIT_PATH" ]; then
        echo "Not installed yet — run ./install.sh install first." >&2
        exit 1
      fi
      systemctl --user "$1" meados.service
      ;;
    stop) systemctl --user stop meados.service ;;
    status) systemctl --user is-active meados.service 2>/dev/null || echo "not running" ;;
    uninstall)
      systemctl --user disable --now meados.service 2>/dev/null || true
      rm -f "$UNIT_PATH"
      systemctl --user daemon-reload
      echo "Removed the background service. Your data in meados.db is untouched."
      ;;
  esac
}

# --------------------------------------------------------------------- dispatch
git_update() {
  if [ -d "$SCRIPT_DIR/.git" ]; then
    echo "Pulling the latest code..."
    git -C "$SCRIPT_DIR" pull --ff-only
  else
    echo "This isn't a git checkout — download the latest release from" >&2
    echo "https://github.com/icemanxbe/MeadOS and replace the app files" >&2
    echo "(meados.db and assets/ are untouched either way)." >&2
    exit 1
  fi
}

case "$COMMAND" in
  run)
    exec "$PYTHON_BIN" "$SCRIPT_DIR/server.py" $(server_args)
    ;;
  install|start|stop|restart|status|uninstall)
    case "$OS" in
      Darwin) macos_cmd "$COMMAND" ;;
      Linux) linux_cmd "$COMMAND" ;;
      *)
        echo "No background-service support for '$OS' yet." >&2
        echo "Run MeadOS directly instead: ./install.sh run" >&2
        exit 1
        ;;
    esac
    ;;
  update)
    git_update
    case "$OS" in
      Darwin) macos_cmd restart ;;
      Linux) linux_cmd restart ;;
      *) echo "Code updated. Restart MeadOS yourself (./install.sh run)." ;;
    esac
    ;;
  ""|help|-h|--help)
    usage
    ;;
  *)
    echo "Unknown command: $COMMAND" >&2
    usage >&2
    exit 1
    ;;
esac
