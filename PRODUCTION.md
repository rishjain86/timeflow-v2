# TimeFlow ERP - production checklist

Work through this top to bottom the first time you deploy. Nothing here is optional for a system that stores health data.

## 1. Secrets (do before anything else)
- [ ] Rotate every secret that ever lived in a file or screenshot: old Neon password, old `JWT_SECRET`, any `PHI_ENCRYPTION_KEY` you showed anywhere.
- [ ] Generate **new** production secrets (never reuse development ones):
  - `JWT_SECRET`      -> `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`
  - `NEXTAUTH_SECRET` -> same command
  - `PHI_ENCRYPTION_KEY` -> `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- [ ] Store `PHI_ENCRYPTION_KEY` in a password manager **as well as** the host. Without it, encrypted clinical notes cannot be read. Do not change it while encrypted data exists (key rotation needs a re-encrypt script).
- [ ] Secrets live only in the hosting dashboards (Render / Vercel), never in git, chat or screenshots.

## 2. Database (Neon)
- [ ] Create a **new** Neon project for production (separate from development). Use the pooled connection string.
- [ ] Turn on point-in-time recovery / backups and test a restore once.
- [ ] Put the API in the **same region** as the Neon database (round trips of 200-300 ms between continents make every request, and every multi-query transaction, slow and can cause "Unable to start a transaction" timeouts).
- [ ] Deploys run `prisma migrate deploy` (never `db push`). Every schema change needs a committed migration - CI fails if one is missing.

## 3. API (Render, or any Node host)
| Setting | Value |
|---|---|
| Build command | `pnpm install --no-frozen-lockfile && pnpm --filter @timeflow/api build` |
| Start command | `pnpm --filter @timeflow/api exec prisma migrate deploy && pnpm --filter @timeflow/api start` |
| Health check path | `/api/health` |

Environment variables:
| Variable | Value |
|---|---|
| `NODE_ENV` | `production` (**required** - otherwise error details can leak) |
| `DATABASE_URL` | production Neon URL |
| `JWT_SECRET` | production secret |
| `PHI_ENCRYPTION_KEY` | production key (the server refuses to start without it in production) |
| `CORS_ORIGIN` | the exact web origin, e.g. `https://app.yourdomain.com` (comma-separate several) |
| `FRONTEND_URL` | same web origin (used in emails) |
| `MFA_ENFORCE` | `true` to make multi-factor authentication mandatory for `MFA_REQUIRED_ROLES` (default `SUPER_ADMIN,ADMIN,MANAGER,THERAPIST`). Recommended in production once staff have enrolled at `/mfa-setup` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | optional: key for the live Google Sheet mirror (see `apps/api/GOOGLE_SHEETS_SETUP.md`). Use only with an account your company has approved for patient data |
| `BILLING_SHEET_WORKER` | `off` on all but ONE API instance (the sheet refresh job must run once) |
| `SESSION_IDLE_TIMEOUT_MINUTES` | optional, default 60 (15-30 is common for clinical systems) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM_ADDRESS` | needed for OTP / reset / invite emails |
| `REDIS_URL` | optional |

## 4. Web (Vercel)
- [ ] Project root: `apps/web`
- [ ] `NEXT_PUBLIC_API_URL` = `https://<your-api>/api/v1`  (there is no hidden default any more: localhost is the fallback)
- [ ] `NEXTAUTH_URL` = the public web URL, `NEXTAUTH_SECRET` = production secret
- [ ] Add your domain to the API's `CORS_ORIGIN`.

## 5. Before real patient data
- [ ] Sign a BAA (or your region's equivalent data-processing agreement) with every vendor that touches patient data: database, API host, web host, email provider, error tracking.
- [ ] Decide your regulatory frame with a compliance specialist: HIPAA (US), DPDP Act (India), GDPR (EU). The controls in `apps/api/HEALTHCARE_SECURITY.md` support this but do not replace it.
- [ ] Confirm backups, a retention/deletion policy and an incident-response contact exist.
- [ ] Review who has ADMIN / SUPER_ADMIN / MANAGER roles. Remove test and `smoke-*` accounts from any shared database.

## 6. After every deploy
- [ ] Open `/api/health`.
- [ ] CI is green (build + `api-smoke` + tenant isolation).
- [ ] Spot-check: log in, open a clinical note, confirm the audit log recorded the access.

## 6b. Billing sheet
- Every change to a time entry (create / edit / move to another task or plan / approve / reject / delete) is recorded in `time_entry_changes` and shown in the Billing Sheet page (`/billing-sheet`, management roles only).
- Deleting a whole plan, task or user removes its time entries through the database (cascade) and is **not** recorded entry-by-entry. Prefer deactivating over deleting.
- Hand-filled cells (previous pay hours, invoice #, amount, notes) are stored separately and are never overwritten by automatic updates.

## 7. Known gaps (as of this version) - be honest with customers about these
- API token is held by the browser session (not a pure httpOnly-cookie design). A strong CSP and short sessions reduce, but do not remove, the XSS risk.
- Multi-factor authentication (authenticator app + recovery codes) exists and can be enforced per role, but setup shows a text key rather than a QR code, and there is no admin "reset a colleague's MFA" screen yet (lost device + lost recovery codes needs a manual database reset).
- Email verification (OTP) is not enforced at login and OTP guesses are only limited by the IP rate limiter.
- Uploaded documents are stored on the API server's disk (ephemeral on most hosts). Move to object storage (S3/R2) with virus scanning before relying on them.
- Patients are modelled as **cases** (`Project`), not as a separate patient record, so a patient with several cases is only joined together by their portal login. A dedicated patient record is the cleaner long-term design.
- `Dockerfile.api` health check calls `/api/v1/health` on port 8080 and installs with `--frozen-lockfile`; verify both before using Docker in production.
