# Removed: /emergency-super-admin

`server.ts` used to expose an unauthenticated GET route (`/emergency-super-admin` and
`/api/v1/emergency-super-admin`) that reset the first admin account's password to a hard-coded
value and returned it in the response. It has been removed. If you ever need to recover an admin
account, do it with a one-off script run against the database, never over HTTP.
