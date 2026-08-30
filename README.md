# Addis Mesob — Dynamic Property Management System (AM-PMS)

Dynamic, metadata-driven Property Management System for the Addis Mesob One Stop
Government Service Center — ICT & Property Administration Directorate.

> **Start here if you are an AI coding agent (Claude Code, GitHub Copilot, OpenAI
> Codex, Google Antigravity) or a new contributor:** read
> [`docs/AM-PMS_System_Design_Document_v1.0.md`](./docs/AM-PMS_System_Design_Document_v1.0.md)
> in full before writing any code. It is the single source of truth for
> requirements, architecture, data model, API contract, design system, and the
> phase-by-phase build plan (Section 12). This README only orients you inside
> the repo; it does not repeat that document.

---

## What this system does

AM-PMS manages the complete lifecycle of Addis Mesob's movable and immovable
property — registration → assignment → transfer → maintenance → periodic
inventory verification → disposal — with:

- a self-service portal for every employee,
- a configurable, no-deploy approval-workflow engine,
- a no-code report builder,
- and a fully immutable audit trail.

Full functional scope is traced to requirement IDs (`FR-*` / `NFR-*`) in
`docs/AM-PMS_System_Design_Document_v1.0.md`, Sections 1–3.

## Repository status

🚧 **Scaffold stage.** This repository currently contains the approved folder
structure, tooling config, and design/spec documents only. Implementation
follows the phase sequence in the design doc, Section 12 — **Phase 1 (Core
Platform: auth, RBAC, audit interceptor) must be completed and reviewed before
any other module is built.**

## Monorepo structure

```
am-pms/
├── server/     # Node.js + Express + TypeScript backend (REST API, workflow engine, jobs)
├── client/     # React + Vite + TypeScript frontend (Employee Portal + Admin Console)
├── packages/
│   ├── shared-types/       # TypeScript types shared FE ↔ BE (single source of truth)
│   ├── shared-constants/   # permission strings, status enums, event names
│   └── config/             # shared eslint/tsconfig/prettier base configs
├── infra/
│   ├── docker/              # Dockerfiles, nginx.conf, compose files
│   └── k8s/                 # optional, Phase 9+ orchestration manifests
├── docs/
│   ├── AM-PMS_System_Design_Document_v1.0.md   # ⭐ the spec — read this first
│   ├── api/                 # OpenAPI/Swagger spec (docs/api/openapi.yaml)
│   └── adr/                 # Architecture Decision Records
└── .github/workflows/       # CI pipelines
```

Every folder listed above mirrors **Section 4.4** of the design document.

## Tech stack (see design doc §4.3 for full rationale)

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Node.js 20 LTS, Express, TypeScript |
| Database | MongoDB 7 (replica set) via Mongoose |
| Cache / Queue | Redis 7, BullMQ |
| Real-time | Socket.IO |
| Object storage | MinIO (S3-compatible) |
| Containerization | Docker / Docker Compose |

## Getting started (local development)

```bash
# 1. Install dependencies (npm workspaces)
npm install

# 2. Copy environment templates and fill in local values
cp server/.env.example server/.env
cp client/.env.example client/.env

# 3. Start supporting services (MongoDB, Redis, MinIO)
docker compose -f infra/docker-compose.dev.yml up -d

# 4. Run the API and web app in dev mode
npm run dev --workspace=server
npm run dev --workspace=client
```

> These scripts are placeholders until Phase 1 scaffolding lands real
> `package.json` scripts in `server` and `client`. See design doc §12.2,
> Phase 1.

## Branching & review

- `main` — protected, deploys to staging automatically on merge (design doc §11.2).
- Feature branches: `phase-<n>/<module>-<short-description>`, e.g.
  `phase-1/auth-jwt-refresh-rotation`.
- Every PR must satisfy the **Definition of Done** in design doc §13
  (tests per requirement ID, OpenAPI updated, audit-log coverage, RBAC tests,
  design-token-only UI, accessibility scan, green CI) before human review.
- No AI agent merges directly to `main` — a human reviewer (ICT lead or
  delegate) approves every PR.

## Documents in this repo

| Document | Purpose |
|---|---|
| `docs/AM-PMS_System_Design_Document_v1.0.md` | Full system design & AI build spec (architecture, data model, API contract, design system, build plan) |
| `docs/api/openapi.yaml` | Machine-readable API contract (generated from the same validators used at runtime — see design doc §7) |
| `docs/adr/` | Architecture Decision Records for any deviation from the design doc |

## Open items requiring a human decision

See design doc **Section 14** (Open Risks & Questions) — including brand
palette confirmation, offline-support scope, SLA sign-off, audit retention
period, MFA enforcement scope, deployment topology, legacy data migration
plan, and Fayda National ID integration timing. Do not resolve these
silently in code; flag back to the ICT & Property Administration Directorate.

## License

Internal government system — not currently licensed for external
distribution. Confirm licensing/classification policy with Addis Mesob ICT
Directorate before any external sharing.
