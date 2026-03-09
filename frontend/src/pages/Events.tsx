import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useBackendActor } from "@/hooks/useBackendActor";
import type { Event } from "@/declarations/aseed_backend.did";

function formatNs(ns: bigint): Date {
  return new Date(Number(ns) / 1_000_000);
}

function isPassed(e: Event): boolean {
  return formatNs(e.dateRange.endNs) < new Date();
}

function isUpcoming(e: Event): boolean {
  return formatNs(e.dateRange.startNs) > new Date();
}

export default function Events() {
  const actor = useBackendActor();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor) return;
    actor.list_events()
      .then(setEvents)
      .catch(() => [])
      .finally(() => setLoading(false));
  }, [actor]);

  const active = events.filter((e) => !isPassed(e) && !isUpcoming(e));
  const upcoming = events.filter(isUpcoming).sort(
    (a, b) => Number(a.dateRange.startNs) - Number(b.dateRange.startNs)
  );
  const passed = events.filter(isPassed).sort(
    (a, b) => Number(b.dateRange.endNs) - Number(a.dateRange.endNs)
  );

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Events</h1>

      <section className="mb-8">
        <h2 className="font-semibold mb-3">Active</h2>
        {active.length === 0 ? (
          <p className="text-muted-foreground">No active events.</p>
        ) : (
          <ul className="space-y-2">
            {active.map((e) => (
              <li key={e.id} className="p-4 border rounded">
                <Link to={`/profile?groupId=${e.groupId}`} className="font-medium hover:underline">
                  {e.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {formatNs(e.dateRange.startNs).toLocaleString()} -{" "}
                  {formatNs(e.dateRange.endNs).toLocaleString()} | {e.timeRange}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="font-semibold mb-3">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground">No upcoming events.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((e) => (
              <li key={e.id} className="p-4 border rounded">
                <Link to={`/profile?groupId=${e.groupId}`} className="font-medium hover:underline">
                  {e.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {formatNs(e.dateRange.startNs).toLocaleString()} -{" "}
                  {formatNs(e.dateRange.endNs).toLocaleString()} | {e.timeRange}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-semibold mb-3">Past</h2>
        {passed.length === 0 ? (
          <p className="text-muted-foreground">No past events.</p>
        ) : (
          <ul className="space-y-2">
            {passed.map((e) => (
              <li key={e.id} className="p-4 border rounded opacity-75">
                <Link to={`/profile?groupId=${e.groupId}`} className="font-medium hover:underline">
                  {e.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {formatNs(e.dateRange.startNs).toLocaleString()} -{" "}
                  {formatNs(e.dateRange.endNs).toLocaleString()} | {e.timeRange}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
