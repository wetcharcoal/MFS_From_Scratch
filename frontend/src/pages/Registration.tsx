import { useState, useEffect } from "react";
import type { GroupRole } from "@/declarations/aseed_backend.did";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useBackendActor } from "@/hooks/useBackendActor";
import { useToast } from "@/hooks/useToast";

const GROUP_ROLES: { value: GroupRole; label: string }[] = [
  { value: { production: null }, label: "Production" },
  { value: { processing: null }, label: "Processing" },
  { value: { distribution: null }, label: "Distribution" },
  { value: { wasteManagement: null }, label: "Waste Management" },
  { value: { educationInformation: null }, label: "Education/Information" },
  { value: { equipmentSpace: null }, label: "Equipment/Space" },
];

export default function Registration() {
  const [mode, setMode] = useState<"choose" | "create" | "request">("choose");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<GroupRole[]>([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const actor = useBackendActor();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const toggleRole = (role: GroupRole) => {
    const key = Object.keys(role)[0];
    setRoles((prev) =>
      prev.some((r) => Object.keys(r)[0] === key)
        ? prev.filter((r) => Object.keys(r)[0] !== key)
        : [...prev, role]
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) return;
    if (roles.length === 0) {
      addToast("Select at least one role", "error");
      return;
    }
    setLoading(true);
    try {
      const result = await actor.create_group(name, email, roles, [], [], [], [], []);
      if (result && result.length > 0) {
        addToast("Group created", "success");
        navigate("/");
      } else {
        addToast("Failed to create group (rate limit or error)", "error");
      }
    } catch (err) {
      addToast(String(err), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestJoin = async (groupId: string) => {
    if (!actor) return;
    setLoading(true);
    try {
      const result = await actor.request_join_group(groupId);
      if (result && result.length > 0) {
        addToast("Request sent", "success");
        navigate("/request");
      } else {
        addToast("Failed to send request", "error");
      }
    } catch (err) {
      addToast(String(err), "error");
    } finally {
      setLoading(false);
    }
  };

  if (mode === "choose") {
    return (
      <div className="max-w-md mx-auto py-12">
        <h1 className="text-2xl font-bold mb-4">Registration</h1>
        <p className="text-muted-foreground mb-6">
          Choose how you want to join A Seed.
        </p>
        <div className="space-y-4">
          <Button onClick={() => setMode("create")} className="w-full">
            Create a new group
          </Button>
          <Button onClick={() => setMode("request")} variant="outline" className="w-full">
            Request to join a group
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className="max-w-md mx-auto py-12">
        <h1 className="text-2xl font-bold mb-4">Create a group</h1>
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Group name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Roles (select at least one)</label>
            <div className="flex flex-wrap gap-2">
              {GROUP_ROLES.map((r) => {
                const key = Object.keys(r.value)[0]!;
                const checked = roles.some((x) => Object.keys(x)[0] === key);
                return (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRole(r.value)}
                    />
                    {r.label}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setMode("choose")}>
              Back
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create group"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // Request mode: list groups and allow request
  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-2xl font-bold mb-4">Request to join a group</h1>
      <p className="text-muted-foreground mb-4">
        Search for a group by name and request to join.
      </p>
      <input
        type="text"
        placeholder="Search group name..."
        value={groupSearch}
        onChange={(e) => setGroupSearch(e.target.value)}
        className="w-full px-3 py-2 border rounded-md bg-background mb-4"
      />
      <RequestJoinList
        search={groupSearch}
        onRequest={handleRequestJoin}
        disabled={loading}
      />
      <Button variant="outline" className="mt-4" onClick={() => setMode("choose")}>
        Back
      </Button>
    </div>
  );
}

function RequestJoinList({
  search,
  onRequest,
  disabled,
}: {
  search: string;
  onRequest: (groupId: string) => void;
  disabled: boolean;
}) {
  const actor = useBackendActor();
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor) return;
    actor.list_groups()
      .then((list) => setGroups(list.map((g) => ({ id: g.id, name: g.name }))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [actor]);

  const filtered = groups.filter(
    (g) => !search || g.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <p className="text-muted-foreground">Loading groups...</p>;
  if (filtered.length === 0) return <p className="text-muted-foreground">No groups found.</p>;

  return (
    <ul className="space-y-2">
      {filtered.map((g) => (
        <li key={g.id} className="flex justify-between items-center p-2 border rounded">
          <span>{g.name}</span>
          <Button size="sm" onClick={() => onRequest(g.id)} disabled={disabled}>
            Request join
          </Button>
        </li>
      ))}
    </ul>
  );
}
