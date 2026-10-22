#!/bin/sh
set -e

# Apply schema changes WITHOUT --accept-data-loss: if a change would drop a column/table,
# prisma refuses and the container stops here instead of silently deleting data.
echo "[entrypoint] Syncing database schema..."
if ! ./node_modules/.bin/prisma db push --skip-generate; then
  echo "[entrypoint] ERROR: 'prisma db push' failed. If it reported possible data loss, back up the"
  echo "[entrypoint] database and apply the change deliberately. The API will not start until this is fixed."
  exit 1
fi

echo "[entrypoint] Running admin bootstrap..."
node dist/seed.js || echo "[entrypoint] WARNING: admin bootstrap failed (see above)"

exec node dist/server.js
