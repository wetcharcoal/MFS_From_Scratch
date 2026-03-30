/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_MODE?: "ii" | "dev_key";
  readonly VITE_II_PROVIDER?: string;
  readonly VITE_DFX_NETWORK?: "local" | "ic" | string;
  readonly DFX_NETWORK?: string;
  readonly DFX_HOST?: string;
  /** Exposed to client; prefer this over DFX_HOST for Vite */
  readonly VITE_DFX_HOST?: string;
  readonly VITE_CANISTER_ID_ASEED_BACKEND?: string;
  /** Asset / frontend canister — required for profile image upload & URLs */
  readonly VITE_CANISTER_ID_ASEED_FRONTEND?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
