# Unmounted / quarantined modules

These files are NOT imported by `src/server.ts`, so they never run. They are excluded from `tsc`
(see `exclude` in tsconfig.json) so CI only checks code that actually ships.
Un-quarantine a module by (1) mounting its router in server.ts and (2) deleting its lines from tsconfig `exclude`.

Not mounted today: appointments, attendance, clinical-notes, therapists, service-codes,
modules/expense, modules/invoice (duplicates of controllers/*), invoice-automation, forecast-engine,
notification-engine, allocation-engine, dashboard.service, billing.service.
