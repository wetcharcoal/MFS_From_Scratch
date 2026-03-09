import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useBackendActor } from "@/hooks/useBackendActor";
import type { Resource, Need, Group, Category } from "@/declarations/aseed_backend.did";

const CATEGORIES: { value: Category | null; label: string }[] = [
  { value: null, label: "All" },
  { value: { FoodDrink: null }, label: "Food/drink" },
  { value: { StorageSpace: null }, label: "Storage space" },
  { value: { KitchenSpace: null }, label: "Kitchen space" },
  { value: { DistributionSpace: null } as Category, label: "Distribution space" },
  { value: { Equipment: null }, label: "Equipment" },
  { value: { Publicity: null }, label: "Publicity" },
  { value: { EventSpace: null }, label: "Event Space" },
  { value: { Other: null }, label: "Other" },
];

function categoryMatches(resource: Resource | Need, cat: Category | null): boolean {
  if (!cat) return true;
  return JSON.stringify(resource.category) === JSON.stringify(cat);
}

function matchesSearch(item: { title: string; description: string }, groupName: string, search: string): boolean {
  if (!search.trim()) return true;
  const s = search.toLowerCase();
  return (
    item.title.toLowerCase().includes(s) ||
    item.description.toLowerCase().includes(s) ||
    groupName.toLowerCase().includes(s)
  );
}

export default function Homepage() {
  const actor = useBackendActor();
  const [resources, setResources] = useState<Resource[]>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor) return;
    Promise.all([actor.list_resources(), actor.list_needs(), actor.list_groups()])
      .then(([r, n, g]) => {
        setResources(r);
        setNeeds(n);
        setGroups(g);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [actor]);

  const groupMap = Object.fromEntries(groups.map((g) => [g.id, g.name]));
  const filteredResources = resources.filter(
    (r) =>
      categoryMatches(r, catFilter) &&
      matchesSearch(r, groupMap[r.groupId] ?? "", search)
  );
  const filteredNeeds = needs.filter(
    (n) =>
      categoryMatches(n, catFilter) &&
      matchesSearch(n, groupMap[n.groupId] ?? "", search)
  );

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Home</h1>
      <div className="space-y-4 mb-6">
        <input
          type="text"
          placeholder="Search title, description, or group name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-3 py-2 border rounded-md bg-background"
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.label}
              onClick={() => setCatFilter(c.value)}
              className={`px-3 py-1 rounded text-sm ${
                JSON.stringify(catFilter) === JSON.stringify(c.value)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Resources</h2>
        {filteredResources.length === 0 ? (
          <p className="text-muted-foreground">No resources found.</p>
        ) : (
          <ul className="space-y-2">
            {filteredResources.map((r) => (
              <li key={r.id} className="p-4 border rounded">
                <Link to={`/profile?groupId=${r.groupId}`} className="font-medium hover:underline">
                  {groupMap[r.groupId] ?? r.groupId}
                </Link>
                <h3 className="font-medium">{r.title}</h3>
                <p className="text-sm text-muted-foreground">{r.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Needs</h2>
        {filteredNeeds.length === 0 ? (
          <p className="text-muted-foreground">No needs found.</p>
        ) : (
          <ul className="space-y-2">
            {filteredNeeds.map((n) => (
              <li key={n.id} className="p-4 border rounded">
                <Link to={`/profile?groupId=${n.groupId}`} className="font-medium hover:underline">
                  {groupMap[n.groupId] ?? n.groupId}
                </Link>
                <h3 className="font-medium">{n.title}</h3>
                <p className="text-sm text-muted-foreground">{n.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Groups</h2>
        {groups.length === 0 ? (
          <p className="text-muted-foreground">No groups yet.</p>
        ) : (
          <ul className="space-y-2">
            {groups.map((g) => (
              <li key={g.id}>
                <Link to={`/profile?groupId=${g.id}`} className="hover:underline">
                  {g.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
