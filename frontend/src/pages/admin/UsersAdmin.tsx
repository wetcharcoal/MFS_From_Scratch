import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useBackendActor } from "@/hooks/useBackendActor";
import { useToast } from "@/hooks/useToast";
import type { User } from "@/declarations/aseed_backend.did";

export default function UsersAdmin() {
  const actor = useBackendActor();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    if (!actor) return;
    actor.list_all_users()
      .then(setUsers)
      .catch(() => [])
      .finally(() => setLoading(false));
  }, [actor]);

  const handleSuspend = async (userId: string, currentlySuspended: boolean) => {
    if (!actor) return;
    try {
      const ok = currentlySuspended
        ? await actor.unsuspend_user(userId)
        : await actor.suspend_user(userId);
      if (ok) {
        addToast(currentlySuspended ? "User unsuspended" : "User suspended");
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, suspended: !currentlySuspended } : u
          )
        );
      } else addToast("Failed", "error");
    } catch {
      addToast("Failed", "error");
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Users (Admin)</h1>
      {users.length === 0 ? (
        <p className="text-muted-foreground">No users.</p>
      ) : (
        <ul className="space-y-2">
          {users.map((u) => (
            <li key={u.id} className="flex justify-between items-center p-4 border rounded">
              <div>
                <h3 className="font-medium">{u.displayName}</h3>
                <p className="text-sm text-muted-foreground">
                  {u.id} | {u.groupIds.length} group(s) |{" "}
                  {u.suspended ? "Suspended" : "Active"}
                </p>
              </div>
              <Button
                variant={u.suspended ? "default" : "destructive"}
                size="sm"
                onClick={() => handleSuspend(u.id, u.suspended)}
              >
                {u.suspended ? "Unsuspend" : "Suspend"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
