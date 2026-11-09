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

## Healthcare data model (how this product maps to the database)
| In the healthcare UI | Database | Notes |
|---|---|---|
| **Case / Patient** | `Project` | `patientName` holds the clean patient name; `name` is a long stitched display string. A patient's portal login is `Project.patientUserId` (role `PATIENT`) |
| **Payor** (therapist / consultant / case owner) | `Client` | Created with a staff login; a case points at its payor with `Project.clientId` |
| **Team** (admin / super admin / manager) | `User` | Roles `SUPER_ADMIN`, `ADMIN`, `MANAGER` |
| Session / appointment | `Appointment` | Belongs to a **case** (`projectId`), a therapist profile and a service code; `clientId` (payor) is optional and defaults from the case |

Patient portal rules: a patient login sees only appointments and invoices of the cases linked to it, never drafts, never clinical notes.
