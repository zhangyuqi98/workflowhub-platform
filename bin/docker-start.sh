#!/bin/sh
set -e

node ./bin/check-env.mjs
npx prisma migrate deploy

if [ "$WORKFLOWHUB_SEED_ON_BOOT" = "true" ]; then
  npm run db:seed
fi

exec npm run start
