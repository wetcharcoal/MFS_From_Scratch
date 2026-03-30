/*
 * Events page — full UI temporarily disabled; restore when the feature ships.
 *
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useBackendActor } from "@/hooks/useBackendActor";
import { useToast } from "@/hooks/useToast";
import type { Event, User } from "@/declarations/aseed_backend.did";

function formatNs(ns: bigint): Date {
  return new Date(Number(ns) / 1_000_000);
}

function toDateTimeLocal(ns: bigint): string {
  const d = new Date(Number(ns) / 1_000_000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

function isPassed(e: Event): boolean {
  return formatNs(e.dateRange.endNs) < new Date();
}

function isUpcoming(e: Event): boolean {
  return formatNs(e.dateRange.startNs) > new Date();
}

export default function Events() {
  const actor = useBackendActor();
  const { addToast } = useToast();
  const modalRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [eventFilter, setEventFilter] = useState<"all" | "active" | "upcoming" | "past">("all");

  useEffect(() => {
    if (!actor) return;
    actor.get_me().then((me) => me && me[0] && setUser(me[0]));
  }, [actor]);

  useEffect(() => {
    if (!actor) return;
    actor.list_events()
      .then(setEvents)
      .catch(() => [])
      .finally(() => setLoading(false));
  }, [actor]);

  useEffect(() => {
    if (editingEvent) {
      setEventTitle(editingEvent.title);
      setStartDateTime(toDateTimeLocal(editingEvent.dateRange.startNs));
      setEndDateTime(toDateTimeLocal(editingEvent.dateRange.endNs));
    }
  }, [editingEvent]);

  const active = events.filter((e) => !isPassed(e) && !isUpcoming(e));
  const upcoming = events.filter(isUpcoming).sort(
    (a, b) => Number(a.dateRange.startNs) - Number(b.dateRange.startNs)
  );
  const passed = events.filter(isPassed).sort(
    (a, b) => Number(b.dateRange.endNs) - Number(a.dateRange.endNs)
  );

  const displayedEvents =
    eventFilter === "all"
      ? [...upcoming, ...active, ...passed]
      : eventFilter === "active"
        ? active
        : eventFilter === "upcoming"
          ? upcoming
          : passed;

  const emptyMessage =
    eventFilter === "all"
      ? "No events."
      : eventFilter === "active"
        ? "No active events."
        : eventFilter === "upcoming"
          ? "No upcoming events."
          : "No past events.";

  const refreshEvents = () => {
    if (actor) actor.list_events().then(setEvents).catch(() => []);
  };

  const resetCreateForm = () => {
    setEventTitle("");
    setStartDateTime("");
    setEndDateTime("");
  };

  const closeModal = () => {
    setCreateEventOpen(false);
    setEditingEvent(null);
    resetCreateForm();
  };

  useEffect(() => {
    if (!createEventOpen && !editingEvent) return;
    modalRef.current?.focus();
  }, [createEventOpen, editingEvent]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) return;
    const title = eventTitle.trim();
    if (!title) {
      addToast("Title is required", "error");
      return;
    }
    if (!startDateTime || !endDateTime) {
      addToast("Start and end date/time are required", "error");
      return;
    }
    const startNs = BigInt(new Date(startDateTime).getTime()) * BigInt(1_000_000);
    const endNs = BigInt(new Date(endDateTime).getTime()) * BigInt(1_000_000);
    if (startNs >= endNs) {
      addToast("End must be after start", "error");
      return;
    }
    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);
    const timeRange = `${startDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} – ${endDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    setCreateLoading(true);
    try {
      const result = await actor.create_event(title, { startNs, endNs }, timeRange);
      if (result && result.length > 0) {
        addToast("Event created");
        closeModal();
        refreshEvents();
      } else {
        addToast("Failed to create event (check active group)", "error");
      }
    } catch {
      addToast("Failed to create event", "error");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor || !editingEvent) return;
    const title = eventTitle.trim();
    if (!title) {
      addToast("Title is required", "error");
      return;
    }
    if (!startDateTime || !endDateTime) {
      addToast("Start and end date/time are required", "error");
      return;
    }
    const startNs = BigInt(new Date(startDateTime).getTime()) * BigInt(1_000_000);
    const endNs = BigInt(new Date(endDateTime).getTime()) * BigInt(1_000_000);
    if (startNs >= endNs) {
      addToast("End must be after start", "error");
      return;
    }
    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);
    const timeRange = `${startDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} – ${endDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    setCreateLoading(true);
    try {
      const ok = await actor.update_event(
        editingEvent.id,
        [title],
        [{ startNs, endNs }],
        [timeRange]
      );
      if (ok) {
        addToast("Event updated");
        closeModal();
        refreshEvents();
      } else {
        addToast("Failed to update event", "error");
      }
    } catch {
      addToast("Failed to update event", "error");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!actor || !editingEvent) return;
    setCreateLoading(true);
    try {
      const ok = await actor.delete_event(editingEvent.id);
      if (ok) {
        addToast("Event deleted");
        closeModal();
        refreshEvents();
      } else {
        addToast("Failed to delete event", "error");
      }
    } catch {
      addToast("Failed to delete event", "error");
    } finally {
      setCreateLoading(false);
    }
  };

  const isMemberOfEventGroup = (event: Event) =>
    user !== null && user.groupIds.includes(event.groupId);

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events</h1>
        <Button
          onClick={() => {
            setEditingEvent(null);
            resetCreateForm();
            setCreateEventOpen(true);
          }}
        >
          Create event
        </Button>
      </div>

      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => setEventFilter("all")}
          className={`px-4 py-2 rounded ${
            eventFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setEventFilter("active")}
          className={`px-4 py-2 rounded ${
            eventFilter === "active" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          Active
        </button>
        <button
          type="button"
          onClick={() => setEventFilter("upcoming")}
          className={`px-4 py-2 rounded ${
            eventFilter === "upcoming" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          Upcoming
        </button>
        <button
          type="button"
          onClick={() => setEventFilter("past")}
          className={`px-4 py-2 rounded ${
            eventFilter === "past" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          Past
        </button>
      </div>

      {(createEventOpen || editingEvent) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            ref={modalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={editingEvent ? "Edit event" : "Create event"}
            className="w-full max-w-lg rounded-lg border bg-background p-9 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingEvent ? "Edit event" : "Create event"}
              </h2>
              <Button variant="ghost" size="sm" onClick={closeModal}>
                Close
              </Button>
            </div>
            <form
              onSubmit={editingEvent ? handleUpdateEvent : handleCreateEvent}
              className="space-y-4"
            >
              <div>
                <label className="mb-2 block text-sm font-medium">Title</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full rounded border bg-background px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Date range</label>
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={startDateTime}
                    onChange={(e) => setStartDateTime(e.target.value)}
                    className="flex-1 rounded border bg-background px-3 py-2"
                  />
                  <input
                    type="datetime-local"
                    value={endDateTime}
                    onChange={(e) => setEndDateTime(e.target.value)}
                    className="flex-1 rounded border bg-background px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button type="submit" disabled={createLoading}>
                  {editingEvent
                    ? createLoading
                      ? "Saving..."
                      : "Save"
                    : createLoading
                      ? "Creating..."
                      : "Create event"}
                </Button>
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                {editingEvent && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteEvent}
                    disabled={createLoading}
                  >
                    Delete event
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      <section>
        {displayedEvents.length === 0 ? (
          <p className="text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul className="space-y-2">
            {displayedEvents.map((e) => (
              <li
                key={e.id}
                className={`flex items-center justify-between gap-2 p-4 border rounded ${isPassed(e) ? "opacity-75" : ""}`}
              >
                <div>
                  <Link to={`/profile?groupId=${e.groupId}`} className="font-medium hover:underline">
                    {e.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {formatNs(e.dateRange.startNs).toLocaleString()} -{" "}
                    {formatNs(e.dateRange.endNs).toLocaleString()} | {e.timeRange}
                  </p>
                </div>
                {isMemberOfEventGroup(e) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCreateEventOpen(false);
                      setEditingEvent(e);
                    }}
                  >
                    Edit
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
 */

export default function Events() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <p className="text-center text-3xl font-bold">This feature is coming out soon!</p>
    </div>
  );
}
