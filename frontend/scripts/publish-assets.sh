#!/bin/sh
set -eu

until mcli alias set local http://object-storage:9000 "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY"; do
  sleep 2
done
mcli mb --ignore-existing local/public-assets
mcli anonymous set-json /public-assets-policy.json local/public-assets
# Keep older hashed files available for clients running a previous build.
mcli cp --recursive /assets/ local/public-assets/
