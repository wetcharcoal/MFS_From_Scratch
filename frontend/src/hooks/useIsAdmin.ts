import { useEffect, useState } from "react";
import { useBackendActor } from "./useBackendActor";
import { useAuth } from "@/contexts/AuthContext";

export function useIsAdmin() {
  const actor = useBackendActor();
  const { identity } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!actor || !identity) return;
    actor
      .is_admin()
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false));
  }, [actor, identity]);

  return isAdmin;
}
