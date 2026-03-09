# A Seed

A platform for food groups to exchange resources and needs, hosted on the Internet Computer (ICP).

## Overview

- **Resources** – items groups offer (e.g. kitchen space, food)
- **Needs** – items groups request (e.g. equipment, storage)
- **Groups** – organizations with members, roles, and profiles
- **Matching** – same-category resources and needs, with optional date overlap

## Stack

- **Backend**: Motoko (ICP canister)
- **Frontend**: React + TypeScript + Tailwind + shadcn/ui
- **Auth**: Internet Identity (II 2.0, id.ai)
- **Deployment**: ICP WebAssembly canisters

## Quick Start

```bash
# Install deps
cd frontend && npm install
cd ..

# Build backend (requires dfx)
dfx build aseed_backend --check

# Run frontend
cd frontend && npm run dev
```

## Project Structure

```
/
├── backend/           # Motoko canister
│   ├── main.mo        # Actor entry
│   ├── access-control.mo
│   ├── approval.mo
│   ├── groups.mo
│   ├── needs.mo
│   ├── resources.mo
│   ├── events.mo
│   ├── matching.mo
│   ├── types.mo
│   └── users.mo
├── frontend/          # React + Vite app
│   └── src/
│       ├── components/
│       ├── contexts/
│       ├── hooks/
│       ├── pages/
│       └── declarations/  # dfx generate output
├── docs/
│   └── deployment.md
├── dfx.json
├── mops.toml
└── spec.md
```

## Deployment

See [docs/deployment.md](docs/deployment.md).

## Admin

After deploy, assign admin role via `assign_role(principal)` with your Internet Identity principal. First authenticated caller can add themselves when no admins exist.
