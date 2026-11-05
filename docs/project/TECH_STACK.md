> **Document Version:** v1.0
> **Project:** TimeFlow ERP
> **Status:** Approved
> **Architecture:** Monorepo

---

# 1. Purpose

This document defines the official technology stack used throughout the TimeFlow ERP project.

Every developer, AI coding assistant, CI/CD workflow, and contributor must follow this document.

No technology should be introduced without approval through an Architecture Decision Record (ADR).

---

# 2. Core Principles

* Enterprise-grade architecture
* Type safety everywhere
* Modular codebase
* High performance
* Scalable infrastructure
* Developer-friendly tooling
* Long-term maintainability
* Cloud-native deployment
* Security by default

---

# 3. Monorepo Structure

```text
timeflow-erp/

apps/
    web/
    api/

packages/
    ui/
    types/
    config/
    utils/
    validation/

docs/
scripts/
infrastructure/

package.json
pnpm-workspace.yaml
turbo.json
```

---

# 4. Frontend Stack

## Framework

Next.js 15 (App Router)

Reason:

* Enterprise standard
* Server Components
* Route Groups
* Middleware
* Layout System
* Excellent Vercel support

---

## UI Library

React 19

Reason

* Modern ecosystem
* Concurrent rendering
* Future-ready architecture

---

## Language

TypeScript 5.x

Rule:

No JavaScript files are allowed except configuration files.

---

## Styling

Tailwind CSS v4

Reasons

* Utility-first
* Maintainable
* High performance
* Excellent DX

No Bootstrap.

No Material UI.

No inline styles.

---

## UI Components

shadcn/ui

Reason

* Accessible
* Customizable
* No vendor lock-in
* Production ready

---

## Icons

Lucide React

Reason

* Lightweight
* Consistent
* Tree-shakeable

---

## Forms

React Hook Form

Validation:

Zod

---

## State Management

### Server State

TanStack Query

Purpose

* API caching
* Mutations
* Background refetch
* Optimistic updates

---

### Client State

React Context

Only for

* Theme
* Sidebar state
* User preferences
* UI state

No Redux unless future scale demands it.

---

## Charts

Recharts

Reason

* Stable
* Responsive
* Enterprise dashboards

---

## Tables

TanStack Table

Reason

* Sorting
* Filtering
* Pagination
* Virtualization support

---

## Date Handling

date-fns

No Moment.js.

---

## File Upload

Native browser upload

Storage

AWS S3

---

# 5. Backend Stack

## Runtime

Node.js 22 LTS

---

## Framework

Express.js

Reason

* Mature
* Lightweight
* Massive ecosystem

---

## Language

TypeScript

Mandatory.

---

## ORM

Prisma ORM

Reasons

* Excellent migrations
* Type-safe queries
* Great DX
* PostgreSQL optimized

---

## Validation

Zod

Validation exists in:

* Request Body
* Query Params
* Route Params
* Environment Variables

---

## Authentication

JWT

Access Token

15 minutes

Refresh Token

7 Days

Stored as HttpOnly Secure Cookies.

---

## Password Hashing

Argon2id

Never bcrypt.

---

## Authorization

RBAC

Future support

* Custom Roles
* Permission Matrix

---

## API Style

REST API

Versioning

```text
/api/v1/
```

Future

```text
/api/v2/
```

---

## Logging

Pino

Features

* JSON Logs
* High performance
* Structured logging

---

## Background Jobs

BullMQ

Redis-backed queue

Use cases

* Emails
* Reports
* Imports
* Notifications

---

## Email

Resend

Future providers can be added.

---

# 6. Database

Engine

PostgreSQL 17

Reason

* Enterprise ready
* Reliable
* ACID compliant
* Excellent indexing

---

ORM

Prisma

---

Migration

Prisma Migrate

No manual SQL migrations.

---

Hosting

Railway PostgreSQL

Production can migrate later to AWS RDS.

---

# 7. Storage

AWS S3

Stores

* Documents
* Invoices
* Images
* Attachments
* Company Logos
* Exports

Never store uploaded files inside application server.

---

# 8. Cache

Redis

Purpose

* Sessions
* Queue
* Cache
* Rate limiting

---

# 9. Package Manager

pnpm

Reasons

* Faster installs
* Disk efficient
* Monorepo friendly

npm and yarn are not allowed.

---

# 10. Build System

TurboRepo

Purpose

* Monorepo caching
* Incremental builds
* Faster CI

---

# 11. Testing

## Unit

Vitest

---

## API

Supertest

---

## E2E

Playwright

---

Coverage Goal

Minimum 80%

Critical modules

95%+

---

# 12. Code Quality

ESLint

Prettier

Husky

lint-staged

Commitlint

Required.

---

# 13. Git Strategy

Main

Production

Develop

Development

Feature Branches

```text
feature/authentication

feature/invoices

feature/projects
```

Bugfix

```text
bugfix/login

bugfix/report-export
```

Hotfix

```text
hotfix/payment
```

---

# 14. Deployment

## Frontend

Vercel

---

## Backend

AWS EC2

Ubuntu LTS

Nginx Reverse Proxy

PM2

---

## Database

Railway PostgreSQL

---

## Storage

AWS S3

---

# 15. CI/CD

GitHub Actions

Pipeline

Lint

↓

Type Check

↓

Unit Tests

↓

Build

↓

Deploy

---

# 16. Monitoring

Future

* Better Stack
* Grafana
* Prometheus
* Sentry

---

# 17. Browser Support

Latest

* Chrome
* Edge
* Firefox
* Safari

Mobile

* Chrome Android
* Safari iOS

---

# 18. Coding Standards

Strict TypeScript

No any

No console.log in production

No duplicated code

Reusable components only

Feature-based architecture

Every API validated

Every endpoint authenticated unless public

Every module tested

---

# 19. Performance Targets

First Load

<2 sec

Dashboard

<1 sec

API Response

<300 ms average

Lighthouse

90+

Accessibility

95+

SEO

90+

---

# 20. Future Technologies (Not v1)

* WebSockets
* AI Assistant
* Event Bus
* Kafka
* Microservices
* Multi-region deployment
* Kubernetes
* Terraform
* GraphQL (if required)

---

# 21. Technologies Explicitly Rejected

The following will **not** be used unless an ADR approves them:

* Bootstrap
* jQuery
* Material UI
* Moment.js
* JavaScript for application code
* MongoDB (for core ERP data)
* Firebase Authentication
* Redux (unless justified)
* Yarn
* npm
* Inline CSS
* CSS Framework Mixing

---

# 22. Final Approved Stack Summary

| Category         | Technology                      |
| ---------------- | ------------------------------- |
| Frontend         | Next.js 15                      |
| UI               | React 19                        |
| Language         | TypeScript 5                    |
| Styling          | Tailwind CSS v4                 |
| Components       | shadcn/ui                       |
| Icons            | Lucide React                    |
| Forms            | React Hook Form                 |
| Validation       | Zod                             |
| Server State     | TanStack Query                  |
| Tables           | TanStack Table                  |
| Charts           | Recharts                        |
| Backend          | Express.js                      |
| Runtime          | Node.js 22 LTS                  |
| ORM              | Prisma                          |
| Database         | PostgreSQL 17                   |
| Cache            | Redis                           |
| Queue            | BullMQ                          |
| Storage          | AWS S3                          |
| Auth             | JWT + Refresh Token             |
| Password Hashing | Argon2id                        |
| Logging          | Pino                            |
| Testing          | Vitest + Supertest + Playwright |
| Package Manager  | pnpm                            |
| Monorepo         | TurboRepo                       |
| Frontend Hosting | Vercel                          |
| Backend Hosting  | AWS EC2                         |
| Database Hosting | Railway PostgreSQL              |
| CI/CD            | GitHub Actions                  |

---

