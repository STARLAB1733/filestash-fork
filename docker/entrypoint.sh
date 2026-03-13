#!/bin/sh
set -e
CONFIG_FILE="/app/data/state/config/config.json"
DEFAULT_CONFIG="/app/default-config.json"
if [ ! -f "$CONFIG_FILE" ]; then
    mkdir -p "$(dirname "$CONFIG_FILE")"
    cp "$DEFAULT_CONFIG" "$CONFIG_FILE"
    echo "INFO: seeded default config from image"
else
    echo "INFO: existing config found, skipping seed"
fi
exec /app/filestash "$@"
