import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useBackendActor } from "@/hooks/useBackendActor";
import { useToast } from "@/hooks/useToast";
import type { Group } from "@/declarations/aseed_backend.did";

export default function GroupsAdmin() {
  const actor = useBackendActor();
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    if (!actor) return;
    actor.list_groups()
      .then(setGroups)
      .catch(() => [])
      .finally(() => setLoading(false));
  }, [actor]);

  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleRemove = async (groupId: string) => {
    if (!actor) return;
    try {
      const ok = await actor.admin_remove_group(groupId);
      if (ok) {
        addToast("Group removed");
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
      } else addToast("Failed to remove", "error");
    } catch {
      addToast("Failed to remove", "error");
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Groups (Admin)</h1>
      <input
        type="text"
        placeholder="Search by group name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md px-3 py-2 border rounded bg-background mb-6"
      />
      {filtered.length === 0 ? (
        <p className="text-muted-foreground">No groups found.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((g) => (
            <li key={g.id} className="flex justify-between items-center p-4 border rounded">
              <div>
                <h3 className="font-medium">{g.name}</h3>
                <p className="text-sm text-muted-foreground">{g.email}</p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => handleRemove(g.id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
