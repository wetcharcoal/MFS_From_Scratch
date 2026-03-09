import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useBackendActor } from "@/hooks/useBackendActor";
import { useToast } from "@/hooks/useToast";
import type { Group, User, JoinRequest } from "@/declarations/aseed_backend.did";

export default function Profile() {
  const [searchParams] = useSearchParams();
  const groupIdParam = searchParams.get("groupId");
  const actor = useBackendActor();
  const [user, setUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const groupId = groupIdParam ?? (user && user.activeGroupId[0] ? user.activeGroupId[0] : null);

  useEffect(() => {
    if (!actor) return;
    actor.list_groups().then(setGroups).catch(() => []);
    actor.get_me().then((me) => me && me[0] && setUser(me[0]));
  }, [actor]);

  useEffect(() => {
    if (!actor || !groupId) {
      setLoading(false);
      return;
    }
    Promise.all([
      actor.get_group(groupId),
      actor.get_pending_join_requests(groupId),
    ])
      .then(([gRes, reqs]) => {
        setGroup(gRes && gRes[0] ? gRes[0] : null);
        setPendingRequests(reqs);
      })
      .finally(() => setLoading(false));
  }, [actor, groupId]);


  const handleSetActive = (id: string) => {
    if (!actor) return;
    actor.set_active_group([id]).then((ok) => {
      if (ok) addToast("Active group updated");
      else addToast("Failed to update", "error");
    });
  };

  const handleApprove = async (requestId: string) => {
    if (!actor) return;
    try {
      const ok = await actor.approve_join_request(requestId);
      if (ok) {
        addToast("Request approved");
        actor.get_pending_join_requests(groupId!).then(setPendingRequests);
      } else addToast("Failed to approve", "error");
    } catch {
      addToast("Failed to approve", "error");
    }
  };

  const handleDeny = async (requestId: string) => {
    if (!actor) return;
    try {
      const ok = await actor.deny_join_request(requestId);
      if (ok) {
        addToast("Request denied");
        actor.get_pending_join_requests(groupId!).then(setPendingRequests);
      } else addToast("Failed to deny", "error");
    } catch {
      addToast("Failed to deny", "error");
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!group && groupId) return <p className="text-muted-foreground">Group not found.</p>;
  if (!group && !groupId) return <p className="text-muted-foreground">Select a group.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{group!.name}</h1>
      <p className="text-muted-foreground mb-4">{group!.email}</p>

      {user && (
        <div className="mb-6">
          <h2 className="font-semibold mb-2">Active group</h2>
          <select
            value={user.activeGroupId[0] ?? ""}
            onChange={(e) => handleSetActive(e.target.value)}
            className="px-3 py-2 border rounded bg-background"
          >
            {groups
              .filter((g) => user.groupIds.includes(g.id))
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
          </select>
        </div>
      )}

      <div className="mb-6">
        <h2 className="font-semibold mb-2">Members</h2>
        <p className="text-muted-foreground text-sm">{group!.userIds.length} member(s)</p>
      </div>

      {user && group!.userIds.includes(user.id) && pendingRequests.length > 0 && (
        <div>
          <h2 className="font-semibold mb-2">Pending join requests</h2>
          <ul className="space-y-2">
            {pendingRequests.map((r) => (
              <li key={r.id} className="flex items-center justify-between p-3 border rounded">
                <span>User {r.userId}</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApprove(r.id)}>
                    Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeny(r.id)}>
                    Deny
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
