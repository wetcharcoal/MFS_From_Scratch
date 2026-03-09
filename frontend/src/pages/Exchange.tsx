import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useBackendActor } from "@/hooks/useBackendActor";

export default function Exchange() {
  const actor = useBackendActor();
  const [tab, setTab] = useState<"my" | "global">("my");
  const [myMatches, setMyMatches] = useState<{
    resourceMatches: { resource: { id: string; title: string; groupId: string }; matchingNeeds: { id: string; title: string; groupId: string }[] }[];
    needMatches: { need: { id: string; title: string; groupId: string }; matchingResources: { id: string; title: string; groupId: string }[] }[];
  } | null>(null);
  const [globalMatches, setGlobalMatches] = useState<{ resource: { id: string; title: string; groupId: string }; need: { id: string; title: string; groupId: string } }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor) return;
    actor.get_matches_for_my_group().then(setMyMatches).catch(() => setMyMatches(null));
  }, [actor]);

  useEffect(() => {
    if (!actor) return;
    actor.get_global_matches().then(setGlobalMatches).catch(() => []);
  }, [actor]);

  useEffect(() => {
    if (myMatches !== undefined || globalMatches.length > 0) setLoading(false);
  }, [myMatches, globalMatches]);

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Exchange</h1>
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("my")}
          className={`px-4 py-2 rounded ${
            tab === "my" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          My matches
        </button>
        <button
          onClick={() => setTab("global")}
          className={`px-4 py-2 rounded ${
            tab === "global" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          Global matches
        </button>
      </div>

      {tab === "my" && myMatches && (
        <div className="space-y-6">
          <section>
            <h2 className="font-semibold mb-3">Resources matching needs</h2>
            {myMatches.resourceMatches.length === 0 ? (
              <p className="text-muted-foreground">No matches.</p>
            ) : (
              <ul className="space-y-4">
                {myMatches.resourceMatches.map((m) => (
                  <li key={m.resource.id} className="p-4 border rounded">
                    <h3 className="font-medium">{m.resource.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Your resource (group {m.resource.groupId})
                    </p>
                    <p className="text-sm font-medium">Matching needs:</p>
                    <ul className="list-disc list-inside ml-2">
                      {m.matchingNeeds.map((n) => (
                        <li key={n.id}>
                          <Link to={`/profile?groupId=${n.groupId}`} className="hover:underline">
                            {n.title}
                          </Link>{" "}
                          (group {n.groupId})
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2 className="font-semibold mb-3">Needs matching resources</h2>
            {myMatches.needMatches.length === 0 ? (
              <p className="text-muted-foreground">No matches.</p>
            ) : (
              <ul className="space-y-4">
                {myMatches.needMatches.map((m) => (
                  <li key={m.need.id} className="p-4 border rounded">
                    <h3 className="font-medium">{m.need.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Your need (group {m.need.groupId})
                    </p>
                    <p className="text-sm font-medium">Matching resources:</p>
                    <ul className="list-disc list-inside ml-2">
                      {m.matchingResources.map((r) => (
                        <li key={r.id}>
                          <Link to={`/profile?groupId=${r.groupId}`} className="hover:underline">
                            {r.title}
                          </Link>{" "}
                          (group {r.groupId})
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === "global" && (
        <section>
          <h2 className="font-semibold mb-3">All matches</h2>
          {globalMatches.length === 0 ? (
            <p className="text-muted-foreground">No global matches.</p>
          ) : (
            <ul className="space-y-2">
              {globalMatches.map((m, i) => (
                <li key={i} className="p-3 border rounded">
                  <Link to={`/profile?groupId=${m.resource.groupId}`} className="hover:underline font-medium">
                    {m.resource.title}
                  </Link>{" "}
                  ↔{" "}
                  <Link to={`/profile?groupId=${m.need.groupId}`} className="hover:underline font-medium">
                    {m.need.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
