import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useBackendActor } from "@/hooks/useBackendActor";
import { useToast } from "@/hooks/useToast";
import type { Event } from "@/declarations/aseed_backend.did";

function formatNs(ns: bigint): string {
  return new Date(Number(ns) / 1_000_000).toLocaleString();
}

export default function EventManagement() {
  const actor = useBackendActor();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    if (!actor) return;
    actor.list_events()
      .then(setEvents)
      .catch(() => [])
      .finally(() => setLoading(false));
  }, [actor]);

  const handleDelete = async (eventId: string) => {
    if (!actor) return;
    try {
      const ok = await actor.delete_event(eventId);
      if (ok) {
        addToast("Event deleted");
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
      } else addToast("Failed to delete", "error");
    } catch {
      addToast("Failed to delete", "error");
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Event Management (Admin)</h1>
      {events.length === 0 ? (
        <p className="text-muted-foreground">No events.</p>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => (
            <li key={e.id} className="flex justify-between items-center p-4 border rounded">
              <div>
                <h3 className="font-medium">{e.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Group: {e.groupId} | {formatNs(e.dateRange.startNs)} - {formatNs(e.dateRange.endNs)} | {e.timeRange}
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(e.id)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
