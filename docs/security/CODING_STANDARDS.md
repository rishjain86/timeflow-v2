# CODING_STANDARDS.md

> **Document Version:** v1.0
> **Project:** TimeFlow ERP
> **Status:** Approved

---

# 1. Purpose

This document defines the coding standards for all TimeFlow ERP source code.

---

# 2. General Rules

- Use TypeScript only
- Strict mode enabled
- Keep code simple and readable
- Follow SOLID principles
- Avoid code duplication (DRY)
- Prefer composition over inheritance

---

# 3. File Naming

Components:
- PascalCase.tsx

Utilities:
- camelCase.ts

Folders:
- kebab-case

Examples:

```text
UserCard.tsx
formatCurrency.ts
invoice-service/
```

---

# 4. Naming Conventions

Variables:
- camelCase

Functions:
- camelCase

Classes:
- PascalCase

Interfaces:
- Prefix with I is not allowed

Enums:
- PascalCase

Constants:
- UPPER_SNAKE_CASE

---

# 5. Components

- One component per file
- Small and reusable
- No business logic inside UI components
- Extract repeated UI into shared components

---

# 6. Functions

- Keep functions focused
- Prefer pure functions
- Maximum recommended length: 50 lines

---

# 7. API

- Validate every request with Zod
- Return consistent response structure
- Never expose internal errors

---

# 8. Error Handling

- Throw meaningful errors
- Log server errors
- Show user-friendly messages

---

# 9. Imports

Order:

1. External packages
2. Internal packages
3. Relative imports

Remove unused imports.

---

# 10. Comments

- Write self-explanatory code
- Add comments only where necessary
- Remove commented-out code

---

# 11. Formatting

- ESLint required
- Prettier required
- 2-space indentation
- LF line endings

---

# 12. Git Commits

Examples:

```text
feat: authentication module
fix: invoice calculation
refactor: organization service
docs: update tech stack
test: add auth tests
```

---

# 13. Testing

- Unit test business logic
- Integration test APIs
- E2E test critical flows

---

# 14. Security

- Never hardcode secrets
- Sanitize inputs
- Validate all external data

---

# 15. Performance

- Avoid unnecessary renders
- Lazy load when appropriate
- Optimize database queries

---

# 16. Code Review Checklist

- [ ] Builds successfully
- [ ] Lint passes
- [ ] Tests pass
- [ ] Types pass
- [ ] No duplicate code
- [ ] No secrets committed
- [ ] Documentation updated if required

---

# End of CODING_STANDARDS.md
