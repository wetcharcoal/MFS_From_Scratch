export type AuthMode = "ii" | "dev_key";

/** True for canister-served sites on the IC (not local replica). */
export function isIcPortalHostname(hostname: string): boolean {
  return hostname.endsWith(".ic0.app") || hostname.endsWith(".icp0.io");
}

export function isRunningOnIcPortal(): boolean {
  if (typeof window === "undefined") return false;
  return isIcPortalHostname(window.location.hostname);
}

export function getBuildAuthMode(): AuthMode {
  return import.meta.env.VITE_AUTH_MODE === "dev_key" ? "dev_key" : "ii";
}

/**
 * On `.icp0.io` / `.ic0.app`, never use dev_key UX even if the bundle was misbuilt.
 */
export function getEffectiveAuthMode(): AuthMode {
  const build = getBuildAuthMode();
  if (typeof window === "undefined") return build;
  if (isIcPortalHostname(window.location.hostname) && build === "dev_key") {
    console.warn(
      "A Seed: IC portal host detected but this bundle was built with VITE_AUTH_MODE=dev_key. Using Internet Identity. For deploys run: npm run build:ic"
    );
    return "ii";
  }
  return build;
}
