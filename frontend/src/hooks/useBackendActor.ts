import { useMemo } from "react";
import { createActor } from "@/declarations";
import { useAuth } from "@/contexts/AuthContext";
import { HttpAgent } from "@icp-sdk/core/agent";

export function useBackendActor() {
  const { identity } = useAuth();

  const actor = useMemo(() => {
    const canisterId = import.meta.env.VITE_CANISTER_ID_ASEED_BACKEND || "rrkah-fqaaa-aaaaa-aaaaq-cai";
    const host = import.meta.env.DFX_HOST || "http://127.0.0.1:4943";

    if (!identity) return null;

    const agent = new HttpAgent({
      identity,
      host,
    });

    if (import.meta.env.DEV && import.meta.env.VITE_DFX_NETWORK !== "ic") {
      agent.fetchRootKey().catch(console.warn);
    }

    return createActor(canisterId, { agent });
  }, [identity]);

  return actor;
}
