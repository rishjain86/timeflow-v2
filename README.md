```markdown
# TimeFlow ERP

Enterprise Resource Planning foundation built as a monorepo.

## Overview
TimeFlow ERP utilizes a modern, robust tech stack aimed at scale and performance.
- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS v4, shadcn/ui
- **Backend:** Node.js, Express, Pino Logger
- **Database:** PostgreSQL, Prisma ORM
- **Tooling:** Turborepo, pnpm workspaces, strict TypeScript

## Requirements
- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Docker & Docker Compose
- PostgreSQL 15+

## Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   pnpm install

```
 3. Copy the environment variables:
   ```bash
   cp .env.example .env.development
   
   ```
## Folder Structure
 * apps/api: Express Backend (REST API)
 * apps/web: Next.js Frontend UI
 * packages/config: Shared ESLint, Prettier, TS configurations
 * packages/types: Shared domain interfaces
 * packages/ui: Shared React components (shadcn)
 * packages/utils: Shared stateless utilities
 * packages/validation: Zod schemas
## Scripts
 * pnpm dev: Start all services in watch mode
 * pnpm build: Build all workspaces via Turbo
 * pnpm lint: Run ESLint across monorepo
 * pnpm typecheck: Run tsc validation
 * pnpm db:generate: Generate Prisma client
 * pnpm db:push: Sync schema to database without migrations
## Deployment
Dockerization is available via Dockerfile.api and Dockerfile.web utilizing multi-stage builds and Turborepo pruning for highly optimized production images. PM2 and Nginx config files are provided for bare-metal deployments.
## Contribution & License
Strict branch protection policies apply. Follow conventional commits (Husky + Commitlint).
Proprietary License - Do not distribute.
```

```
