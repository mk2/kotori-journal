#!/bin/bash

LOG_FILE="$HOME/.kotori-journal-data/server.log"

echo "=== Kotori Journal Server Logs ==="
echo "Log file: $LOG_FILE"
echo

if [ -f "$LOG_FILE" ]; then
    echo "=== Latest logs (last 50 lines) ==="
    tail -n 50 "$LOG_FILE"
    echo
    echo "=== Follow logs (press Ctrl+C to stop) ==="
    tail -f "$LOG_FILE"
else
    echo "Log file not found. Make sure the server is running."
    echo "Expected location: $LOG_FILE"
fi