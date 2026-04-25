# A Seed - Deployment Guide

## Prerequisites

- [dfx](https://internetcomputer.org/docs/current/developer-docs/setup/install/) (DFINITY SDK)
- Node.js 18+
- npm or pnpm

## Local Development

### 1. Start the local replica

```bash
dfx start --background
```

### 2. Deploy the canisters

```bash
dfx deploy
```

### 3. Generate environment for frontend

```bash
dfx generate aseed_backend
```

This generates declarations in `frontend/src/declarations/`. Ensure `dfx.json` has:

```json
"aseed_backend": {
  "declarations": {
    "output": "frontend/src/declarations"
  }
}
```

### 4. Configure frontend env

Create `frontend/.env.local`:

```
VITE_CANISTER_ID_ASEED_BACKEND=<canister-id-from-dfx-canister-id-aseed_backend>
DFX_NETWORK=local
DFX_HOST=http://127.0.0.1:4943
```

Or run `dfx canister id aseed_backend` and set `VITE_CANISTER_ID_ASEED_BACKEND`.

### 5. Build and serve frontend

```bash
cd frontend
npm install
npm run build
```

Use `npm run build` only for local or ad-hoc bundles. **Do not** use that output for `dfx deploy --network ic` if your `.env.local` sets `VITE_AUTH_MODE=dev_key` — use `npm run build:ic` instead (see Mainnet Deployment).

For development with hot reload:

```bash
npm run dev
```

### 6. Assign admin role (Internet Identity)

After deploy, log in with your Internet Identity via the app, then call:

```bash
dfx canister call aseed_backend assign_role '(principal "<your-ii-principal>")'
```

Or: in the app, call `assign_role` with your II principal (only works when no admins exist yet; first authenticated caller can add themselves).

## Mainnet Deployment

### 1. Set mainnet canister IDs in the IC build env

The frontend reads `VITE_*` variables **at build time**. For mainnet you must produce assets with Internet Identity and `VITE_DFX_NETWORK=ic`.

1. Edit `frontend/.env.ic` and replace the placeholder canister IDs with your IC IDs (or copy `frontend/.env.ic.local.example` to `frontend/.env.ic.local` and set IDs there — that file overrides `.env.ic` and is loaded after `.env.local`).

2. Vite loads env files in this order for `vite build --mode ic`: `.env`, `.env.local`, `.env.ic`, `.env.ic.local`. Later files override earlier keys, so **`npm run build:ic` is deterministic** even if `.env.local` exists for local dev.

Committed `frontend/.env.ic` already sets `VITE_AUTH_MODE=ii`, `VITE_II_PROVIDER=https://id.ai`, `VITE_DFX_NETWORK=ic`, and `VITE_DFX_HOST=https://icp0.io`.

### 2. Build the frontend for IC, then deploy

From the repo root:

```bash
cd frontend && npm install && npm run build:ic && cd ..
dfx deploy --network ic
```

`dfx.json` points the asset canister at `frontend/dist`; the deploy step uploads whatever was last built.

### 3. Verify the live login page

Open your frontend URL (`https://<frontend-canister-id>.icp0.io/login`). You should see **“Login to continue”** (Internet Identity), not **“Continue (Local Dev Identity)”**. If you still see the dev button, the bundle was not built with `build:ic` or canister IDs in `.env.ic` / `.env.ic.local` are wrong.

## Canister Upgrade

The backend uses `transient` storage for HashMaps; only stable vars persist across upgrades. Counters (_nextUserId, etc.) persist; users, groups, resources, needs, events, and join requests do not. For production, implement:

1. `system preupgrade` – serialize HashMaps to arrays and store in stable vars
2. `system postupgrade` – deserialize arrays back into HashMaps

Use the Motoko `Array` and `Iter` modules to convert between `HashMap` and `[(K, V)]` for each collection.
