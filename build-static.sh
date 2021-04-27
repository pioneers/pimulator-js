#! /usr/bin/env bash

set -e

# Entrypoint script for render.com to serve static version of page

cache_key="${CACHE_KEY:-default}"

echo "Creating build directory"
mkdir -p build_artifacts

echo "Creating index file"
echo "{\"cache_key\": \"1\", \"prod\": true}" > context.json
jinja -d context.json templates/index.html > build_artifacts/index.html

cp -r static build_artifacts/static/
