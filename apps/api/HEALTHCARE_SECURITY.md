# Healthcare modules: security model

Mounted routes: `/api/v1/appointments`, `/api/v1/therapists`, `/api/v1/service-codes`.

| Control | Where | What it does |
|---|---|---|
| Authentication | `middleware/auth.middleware.ts` | Verified JWT + live session lookup; banned/inactive users rejected on every request |
| Role-based access | each `*.routes.ts` | `requireRole([...])` per endpoint |
| Least privilege | `appointment.access.ts` | Therapists only see/modify their own caseload; managers/admins are org-wide. Out-of-scope ids return 404 |
| Tenant isolation | services | every query filters by `organizationId` |
| Encryption at rest | `utils/phi-crypto.ts` | Clinical note text encrypted with AES-256-GCM, bound to org+appointment (AAD) |
| Access audit | `phi-guard.middleware.ts` | Every read/write/denied attempt written to `audit_logs` (no bodies, no query values) |
| No caching | `phi-guard.middleware.ts` | `Cache-Control: no-store` on all PHI responses |
| Record integrity | `appointment.service.ts` | Approved notes and fully-signed attendance are locked; approval requires therapist signature |

## Operating rules
- Set `PHI_ENCRYPTION_KEY` (32 random bytes, base64). Production refuses to start without it.
  Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- **Back the key up separately from the database.** Losing it makes encrypted notes unrecoverable. Never change it while encrypted data exists (key rotation needs a re-encrypt script).
- Notes written before the key was set stay readable (plaintext passthrough) and are encrypted on their next edit.
- Sign a BAA with your database/hosting/email vendors before storing real patient data.
