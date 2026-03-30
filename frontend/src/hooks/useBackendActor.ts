import { useEffect, useState } from "react";
import { createActor } from "@/declarations";
import { useAuth } from "@/contexts/AuthContext";
import { HttpAgent } from "@icp-sdk/core/agent";

export function useBackendActor(): ReturnType<typeof createActor> | null {
  const { identity } = useAuth();
  const [actor, setActor] = useState<ReturnType<typeof createActor> | null>(null);

  useEffect(() => {
    if (!identity) {
      setActor(null);
      return;
    }

    let cancelled = false;
    const canisterId = import.meta.env.VITE_CANISTER_ID_ASEED_BACKEND || "rrkah-fqaaa-aaaaa-aaaaq-cai";
    const host =
      import.meta.env.VITE_DFX_HOST ||
      import.meta.env.DFX_HOST ||
      "http://127.0.0.1:4943";
    const isLocal = (import.meta.env.VITE_DFX_NETWORK || "local") !== "ic";

    const agent = new HttpAgent({
      identity,
      host,
    });

    if (isLocal) {
      agent
        .fetchRootKey()
        .then(() => {
          if (!cancelled) setActor(createActor(canisterId, { agent }));
        })
        .catch((err) => {
          console.warn("Failed to fetch root key:", err);
          if (!cancelled) setActor(null);
        });
    } else {
      setActor(createActor(canisterId, { agent }));
    }

    return () => {
      cancelled = true;
    };
  }, [identity]);

  return actor;
}
