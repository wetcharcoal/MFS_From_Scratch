import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useBackendActor } from "@/hooks/useBackendActor";
import type { Group } from "@/declarations/aseed_backend.did";

type MatchPair = {
  resource: { id: string; title: string; groupId: string };
  need: { id: string; title: string; groupId: string };
};

export default function Exchange() {
  const actor = useBackendActor();
  const [tab, setTab] = useState<"my" | "global">("my");
  const [groups, setGroups] = useState<Group[]>([]);
  const [myMatches, setMyMatches] = useState<{
    resourceMatches: { resource: { id: string; title: string; groupId: string }; matchingNeeds: { id: string; title: string; groupId: string }[] }[];
    needMatches: { need: { id: string; title: string; groupId: string }; matchingResources: { id: string; title: string; groupId: string }[] }[];
  } | null>(null);
  const [globalMatches, setGlobalMatches] = useState<MatchPair[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    Promise.all([
      actor.list_groups().then(setGroups).catch(() => [] as Group[]),
      actor.get_matches_for_my_group().then(setMyMatches).catch(() => setMyMatches(null)),
      actor.get_global_matches().then(setGlobalMatches).catch(() => [] as MatchPair[]),
    ]).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [actor]);

  const groupMap = Object.fromEntries(groups.map((g) => [g.id, g.name]));

  const globalByNeed = useMemo(() => {
    const map = new Map<
      string,
      { need: MatchPair["need"]; resources: MatchPair["resource"][] }
    >();
    for (const m of globalMatches) {
      const cur = map.get(m.need.id);
      if (cur) {
        if (!cur.resources.some((r) => r.id === m.resource.id)) {
          cur.resources.push(m.resource);
        }
      } else {
        map.set(m.need.id, { need: m.need, resources: [m.resource] });
      }
    }
    return Array.from(map.values());
  }, [globalMatches]);

  const resourceNeedMatchCount = useMemo(
    () =>
      myMatches?.resourceMatches.reduce((acc, m) => acc + m.matchingNeeds.length, 0) ?? 0,
    [myMatches]
  );
  const needResourceMatchCount = useMemo(
    () =>
      myMatches?.needMatches.reduce((acc, m) => acc + m.matchingResources.length, 0) ?? 0,
    [myMatches]
  );
  const globalPairCount = useMemo(
    () => globalByNeed.reduce((acc, { resources }) => acc + resources.length, 0),
    [globalByNeed]
  );

  const columnScrollH = "h-[min(520px,52vh)]";

  if (loading) {
    return (
      <p className="text-muted-foreground py-8 text-center">Loading...</p>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto pb-10 rounded-[2rem] bg-muted/30 p-5 md:p-8 lg:p-10">
      <h1 className="text-2xl font-bold tracking-tight text-foreground mb-6 lg:mb-8">
        Exchange
      </h1>

      <div className="flex flex-wrap gap-3 mb-8 lg:mb-10">
        <button
          type="button"
          onClick={() => setTab("my")}
          className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors border shadow-sm ${
            tab === "my"
              ? "bg-[#8b1538] text-white border-[#8b1538]"
              : "bg-card text-foreground border-border/70 hover:bg-muted/50"
          }`}
        >
          My matches
        </button>
        <button
          type="button"
          onClick={() => setTab("global")}
          className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors border shadow-sm ${
            tab === "global"
              ? "bg-[#8b1538] text-white border-[#8b1538]"
              : "bg-card text-foreground border-border/70 hover:bg-muted/50"
          }`}
        >
          Global matches
        </button>
      </div>

      {tab === "my" && !myMatches && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Could not load your matches. Try again later.
        </p>
      )}

      {tab === "my" && myMatches && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
          <section
            className="flex flex-col rounded-[1.75rem] bg-card border border-border/70 shadow-sm px-5 pt-5 pb-5 min-h-0"
            aria-labelledby="exchange-col-resources"
          >
            <div className="flex items-center gap-2 flex-wrap mb-4 shrink-0">
              <h2
                id="exchange-col-resources"
                className="text-lg font-bold tracking-tight text-[#1b5e20]"
              >
                Resources matching needs
              </h2>
              <span
                className="inline-flex h-8 min-w-8 px-2 items-center justify-center rounded-full bg-[#2e7d32] text-white text-sm font-semibold tabular-nums shadow-sm"
                aria-label={`${resourceNeedMatchCount} resources matching needs`}
              >
                {resourceNeedMatchCount}
              </span>
            </div>
            <div
              className={`flex flex-col gap-3 min-h-0 overflow-y-auto overscroll-y-contain pr-1 scroll-smooth ${columnScrollH}`}
            >
              {myMatches.resourceMatches.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No resources to show.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {myMatches.resourceMatches.map((m) => (
                    <li
                      key={m.resource.id}
                      className="rounded-2xl bg-card border border-border/80 p-4 space-y-2 shadow-sm shrink-0"
                    >
                      <h3 className="font-semibold text-foreground">{m.resource.title}</h3>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <span className="font-normal normal-case">Your resource · </span>
                        <Link
                          to={`/profile?groupId=${m.resource.groupId}`}
                          className="hover:underline"
                        >
                          {groupMap[m.resource.groupId] ?? m.resource.groupId}
                        </Link>
                      </p>
                      <p className="text-sm font-bold text-[#2e7d32]">Matching needs</p>
                      {m.matchingNeeds.length === 0 ? (
                        <p className="text-sm text-muted-foreground">None yet.</p>
                      ) : (
                        <ul className="space-y-2 pl-1 border-l-2 border-[#e8f5e9]">
                          {m.matchingNeeds.map((n) => (
                            <li key={n.id} className="pl-3">
                              <Link
                                to={`/profile?groupId=${n.groupId}`}
                                className="text-sm font-medium text-foreground hover:underline"
                              >
                                {n.title}
                              </Link>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                <Link to={`/profile?groupId=${n.groupId}`} className="hover:underline">
                                  {groupMap[n.groupId] ?? n.groupId}
                                </Link>
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section
            className="flex flex-col rounded-[1.75rem] bg-card border border-border/70 shadow-sm px-5 pt-5 pb-5 min-h-0"
            aria-labelledby="exchange-col-needs"
          >
            <div className="flex items-center gap-2 flex-wrap mb-4 shrink-0">
              <h2
                id="exchange-col-needs"
                className="text-lg font-bold tracking-tight text-[#8b1538]"
              >
                Needs matching resources
              </h2>
              <span
                className="inline-flex h-8 min-w-8 px-2 items-center justify-center rounded-full bg-[#2e7d32] text-white text-sm font-semibold tabular-nums shadow-sm"
                aria-label={`${needResourceMatchCount} needs matching resources`}
              >
                {needResourceMatchCount}
              </span>
            </div>
            <div
              className={`flex flex-col gap-3 min-h-0 overflow-y-auto overscroll-y-contain pr-1 scroll-smooth ${columnScrollH}`}
            >
              {myMatches.needMatches.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No needs to show.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {myMatches.needMatches.map((m) => (
                    <li
                      key={m.need.id}
                      className="rounded-2xl bg-muted/50 border border-border/40 p-4 space-y-2 shrink-0"
                    >
                      <h3 className="text-[15px] leading-snug font-medium text-foreground">
                        {m.need.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        <span className="text-muted-foreground/80">Your need · </span>
                        <Link to={`/profile?groupId=${m.need.groupId}`} className="hover:underline">
                          {groupMap[m.need.groupId] ?? m.need.groupId}
                        </Link>
                      </p>
                      <p className="text-sm font-semibold text-[#8b1538]">Matching resources</p>
                      {m.matchingResources.length === 0 ? (
                        <p className="text-sm text-muted-foreground">None yet.</p>
                      ) : (
                        <ul className="space-y-2 pl-1 border-l-2 border-[#ffebee]">
                          {m.matchingResources.map((r) => (
                            <li key={r.id} className="pl-3">
                              <Link
                                to={`/profile?groupId=${r.groupId}`}
                                className="text-sm font-medium text-foreground hover:underline"
                              >
                                {r.title}
                              </Link>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                <Link to={`/profile?groupId=${r.groupId}`} className="hover:underline">
                                  {groupMap[r.groupId] ?? r.groupId}
                                </Link>
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}

      {tab === "global" && (
        <section
          className="flex flex-col rounded-[1.75rem] bg-card border border-border/70 shadow-sm px-5 pt-5 pb-5 min-h-0"
          aria-labelledby="exchange-global"
        >
          <div className="flex items-center gap-2 flex-wrap mb-4 shrink-0">
            <h2
              id="exchange-global"
              className="text-lg font-bold tracking-tight text-[#8b1538]"
            >
              All matches
            </h2>
            <span
              className="inline-flex h-8 min-w-8 px-2 items-center justify-center rounded-full bg-[#2e7d32] text-white text-sm font-semibold tabular-nums shadow-sm"
              aria-label={`${globalPairCount} global matches`}
            >
              {globalPairCount}
            </span>
          </div>
          <div className="flex flex-col gap-3 min-h-0 overflow-y-auto overscroll-y-contain pr-1 scroll-smooth h-[min(560px,55vh)]">
            {globalByNeed.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No global matches.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {globalByNeed.map(({ need, resources }) => (
                  <li
                    key={need.id}
                    className="rounded-2xl bg-muted/50 border border-border/40 p-4 space-y-2 shrink-0"
                  >
                    <h3 className="text-[15px] leading-snug font-medium text-foreground">
                      {need.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      <Link to={`/profile?groupId=${need.groupId}`} className="hover:underline">
                        {groupMap[need.groupId] ?? need.groupId}
                      </Link>
                    </p>
                    <p className="text-sm font-semibold text-[#1b5e20]">Matching resources</p>
                    <ul className="space-y-3 pl-1 border-l-2 border-[#e8f5e9]">
                      {resources.map((r) => (
                        <li key={r.id} className="pl-3">
                          <Link
                            to={`/profile?groupId=${r.groupId}`}
                            className="font-medium text-foreground hover:underline"
                          >
                            {r.title}
                          </Link>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            <Link to={`/profile?groupId=${r.groupId}`} className="hover:underline">
                              {groupMap[r.groupId] ?? r.groupId}
                            </Link>
                          </p>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
