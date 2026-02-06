#!/bin/sh

echo "Running monitorbot..."
bun install --no-save # Reduce startup times after first run
bun /app/index.js
