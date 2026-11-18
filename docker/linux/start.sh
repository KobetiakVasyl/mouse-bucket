#!/usr/bin/env bash
# Starts D-Bus and an unlocked GNOME Keyring, then keeps the container running. See docs/ENVIRONMENTS.md.
set -euo pipefail

rm -rf "$XDG_RUNTIME_DIR/bus" "$XDG_RUNTIME_DIR/keyring"

dbus-daemon --session --address="$DBUS_SESSION_BUS_ADDRESS" --fork --nopidfile --nosyslog

printf 'linux-container' | gnome-keyring-daemon --unlock --components=secrets --daemonize >/dev/null

exec sleep infinity
