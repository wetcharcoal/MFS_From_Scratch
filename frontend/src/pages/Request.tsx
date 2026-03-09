import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBackendActor } from "@/hooks/useBackendActor";
import type { JoinRequest } from "@/declarations/aseed_backend.did";

export default function Request() {
  const actor = useBackendActor();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor) return;
    actor.get_my_join_requests()
      .then(setRequests)
      .catch(() => [])
      .finally(() => setLoading(false));
  }, [actor]);

  const hasPending = requests.some(
    (r) => "pending" in r.status
  );
  const hasDenied = requests.some(
    (r) => "denied" in r.status
  );
  const hasApproved = requests.some(
    (r) => "approved" in r.status
  );

  if (hasApproved) {
    navigate("/");
    return null;
  }

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Request</h1>
      {hasDenied && (
        <div className="mb-4 p-4 rounded bg-destructive/20 text-destructive border border-destructive/50">
          Your request to join a group was denied.
        </div>
      )}
      {hasPending && (
        <p className="text-muted-foreground mb-4">
          Your request to join a group is pending approval.
        </p>
      )}
      {requests.length === 0 && !hasDenied && (
        <p className="text-muted-foreground">
          You have no pending join requests.
        </p>
      )}
      {requests.length > 0 && (
        <ul className="space-y-2">
          {requests.map((r) => (
            <li key={r.id} className="p-3 border rounded">
              Group ID: {r.groupId} - Status:{" "}
              {"pending" in r.status
                ? "Pending"
                : "approved" in r.status
                ? "Approved"
                : "Denied"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
