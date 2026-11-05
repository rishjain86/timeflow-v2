# Local setup (first time)

1. Install Node 20+ and run `corepack enable`.
2. `pnpm install`   (this also refreshes pnpm-lock.yaml - commit it afterwards)
3. `node scripts/setup.js`   (creates .env files with fresh secrets)
4. Paste a NEW Neon database URL into `apps/api/.env` (`DATABASE_URL`).
5. `pnpm --filter @timeflow/api exec prisma migrate dev --name init`  (commit the new `prisma/migrations` folder)
6. Start: `pnpm --filter @timeflow/api dev` and `pnpm --filter @timeflow/web dev`

Never commit `.env` files. Production secrets belong in Render/Vercel settings only.
