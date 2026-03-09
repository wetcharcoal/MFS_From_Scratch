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

### 1. Configure for IC

Set `DFX_NETWORK=ic` and use mainnet replica. Update Internet Identity provider in the frontend to `https://id.ai`.

### 2. Create canisters on mainnet

```bash
dfx deploy --network ic
```

### 3. Update frontend env

Point to mainnet canister IDs and `DFX_NETWORK=ic`, `DFX_HOST=https://mainnet.dfinity.network`.

## Canister Upgrade

The backend uses `transient` storage for HashMaps; only stable vars persist across upgrades. Counters (_nextUserId, etc.) persist; users, groups, resources, needs, events, and join requests do not. For production, implement:

1. `system preupgrade` – serialize HashMaps to arrays and store in stable vars
2. `system postupgrade` – deserialize arrays back into HashMaps

Use the Motoko `Array` and `Iter` modules to convert between `HashMap` and `[(K, V)]` for each collection.
