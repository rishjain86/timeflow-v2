# DATABASE_STANDARDS.md

> **Document Version:** v1.0
> **Project:** TimeFlow ERP
> **Status:** Approved

---

# 1. Purpose

This document defines the database standards for TimeFlow ERP to ensure consistency, scalability, performance, and maintainability.

---

# 2. Database Engine

- PostgreSQL 17
- Prisma ORM
- Prisma Migrate
- UTF-8 Encoding

---

# 3. Design Principles

- Normalize data where practical
- Avoid duplicate data
- Prefer explicit relationships
- Use foreign keys
- Maintain referential integrity

---

# 4. Multi-Tenant Strategy

- Every business record must belong to an Organization (Tenant)
- Tenant isolation must be enforced in application logic
- Every query must filter by organizationId where applicable

---

# 5. Primary Keys

- Use UUID for all primary keys
- Primary Key column name: `id`

Example:

```sql
id UUID PRIMARY KEY
```

---

# 6. Foreign Keys

Naming convention:

```text
organizationId
userId
projectId
invoiceId
clientId
```

Always create foreign key constraints.

---

# 7. Naming Conventions

## Tables

- Plural
- snake_case

Examples:

- users
- organizations
- invoices
- invoice_items

## Columns

- camelCase in Prisma
- snake_case in PostgreSQL (mapped by Prisma if needed)

---

# 8. Standard Audit Columns

Every table should include:

- createdAt
- updatedAt

Optional:

- deletedAt (Soft Delete)

---

# 9. Soft Delete

Use `deletedAt TIMESTAMP NULL`.

Never permanently delete business records unless legally required.

---

# 10. Indexing

Create indexes for:

- Foreign Keys
- Email
- Organization ID
- Status
- Created Date
- Frequently searched columns

Avoid unnecessary indexes.

---

# 11. Constraints

Use:

- PRIMARY KEY
- FOREIGN KEY
- UNIQUE
- NOT NULL
- CHECK constraints where appropriate

---

# 12. Transactions

Use Prisma transactions when:

- Multiple tables are updated
- Financial records are created
- Inventory changes
- Payments

---

# 13. Migrations

Rules:

- Never edit an applied migration
- One feature = one migration
- Review before production

---

# 14. Seed Data

Seed only:

- Roles
- Permissions
- Default settings
- Demo data (development only)

---

# 15. Backup Policy

- Daily automated backups
- Backup verification
- Restore testing
- Encrypted backup storage

---

# 16. Performance

- Avoid SELECT *
- Use pagination
- Optimize joins
- Prevent N+1 queries
- Analyze slow queries regularly

---

# 17. Security

- Use Prisma parameterized queries
- Avoid raw SQL
- Restrict DB user permissions
- Never expose database credentials

---

# 18. Example Standard Table

```text
id
organizationId
name
status
createdAt
updatedAt
deletedAt
```

---

# 19. Production Checklist

- [ ] Foreign keys added
- [ ] Indexes created
- [ ] Constraints verified
- [ ] Soft delete implemented
- [ ] Audit columns present
- [ ] Migration tested
- [ ] Backup verified
- [ ] Performance reviewed

---

# End of DATABASE_STANDARDS.md
