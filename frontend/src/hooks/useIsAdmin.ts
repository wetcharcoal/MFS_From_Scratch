import { useEffect, useState } from "react";
import { useBackendActor } from "./useBackendActor";
import { useAuth } from "@/contexts/AuthContext";

export function useIsAdmin() {
  const actor = useBackendActor();
  const { identity } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!actor || !identity) return;
    // Check if caller can list_all_users (admin only)
    actor.list_all_users()
      .then(() => setIsAdmin(true))
      .catch(() => setIsAdmin(false));
  }, [actor, identity]);

  return isAdmin;
}
