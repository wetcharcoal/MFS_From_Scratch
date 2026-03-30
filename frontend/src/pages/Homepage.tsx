import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { ExpandableDescription } from "@/components/ExpandableDescription";
import { useBackendActor } from "@/hooks/useBackendActor";
import type { Resource, Need, Group, Category, GroupRole } from "@/declarations/aseed_backend.did";

const INITIAL_CHUNK = 10;
const SCROLL_LOAD_MARGIN = "320px";

/** Matches footer email link (`mcgillfoodco@gmail.com`). */
const HOME_WELCOME_LINK_CLASS = "text-red-500 underline hover:text-foreground";

function formatCategory(cat: Category): string {
  const key = Object.keys(cat)[0] as keyof Category;
  const labels: Record<string, string> = {
    FoodDrink: "Food/Drink",
    StorageSpace: "Storage space",
    KitchenSpace: "Kitchen space",
    DistributionSpace: "Distribution space",
    Equipment: "Equipment",
    Publicity: "Publicity",
    EventSpace: "Event Space",
    Other: "Other",
  };
  return labels[key] ?? key;
}

function roleLabel(r: GroupRole): string {
  if ("production" in r) return "Production";
  if ("educationInformation" in r) return "Education/Information";
  if ("equipmentSpace" in r) return "Equipment/Space";
  if ("wasteManagement" in r) return "Waste management";
  if ("processing" in r) return "Processing";
  if ("distribution" in r) return "Distribution";
  return "Group";
}

function formatGroupRoles(roles: GroupRole[]): string {
  if (roles.length === 0) return "Community";
  return roles.map(roleLabel).join(" · ");
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function matchesNeedOrResourceSearch(
  item: { title: string; description: string; category: Category },
  groupName: string,
  search: string
): boolean {
  if (!search.trim()) return true;
  const s = search.toLowerCase();
  const catLabel = formatCategory(item.category).toLowerCase();
  const catKey = Object.keys(item.category)[0]?.toLowerCase() ?? "";
  return (
    item.title.toLowerCase().includes(s) ||
    item.description.toLowerCase().includes(s) ||
    groupName.toLowerCase().includes(s) ||
    catLabel.includes(s) ||
    catKey.includes(s)
  );
}

function groupMatchesSearch(g: Group, search: string): boolean {
  if (!search.trim()) return true;
  const s = search.toLowerCase();
  if (g.name.toLowerCase().includes(s)) return true;
  return formatGroupRoles(g.roles).toLowerCase().includes(s);
}

function slugTitle(title: string): string {
  return title.replace(/\s+/g, "-").toLowerCase();
}

/**
 * Renders only the first `visibleCount` items; when the sentinel intersects the scroll root, loads more in chunks of INITIAL_CHUNK.
 */
function useScrollRevealCount(itemCount: number, listKey: unknown) {
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(INITIAL_CHUNK, itemCount)
  );

  useEffect(() => {
    setVisibleCount(Math.min(INITIAL_CHUNK, itemCount));
  }, [listKey, itemCount]);

  const tryLoadMore = useCallback(() => {
    setVisibleCount((c) => Math.min(c + INITIAL_CHUNK, itemCount));
  }, [itemCount]);

  return { visibleCount, tryLoadMore };
}

function ScrollRevealSentinel({
  scrollRootRef,
  enabled,
  onReveal,
}: {
  scrollRootRef: React.RefObject<HTMLDivElement | null>;
  enabled: boolean;
  onReveal: () => void;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const cooldownRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const root = scrollRootRef.current;
    const target = sentinelRef.current;
    if (!root || !target) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || cooldownRef.current) return;
        cooldownRef.current = true;
        onReveal();
        window.setTimeout(() => {
          cooldownRef.current = false;
        }, 120);
      },
      { root, rootMargin: SCROLL_LOAD_MARGIN, threshold: 0 }
    );
    io.observe(target);
    return () => io.disconnect();
  }, [enabled, onReveal, scrollRootRef]);

  if (!enabled) return null;
  return <div ref={sentinelRef} className="h-px w-full shrink-0" aria-hidden />;
}

function SquiggleSection({
  title,
  titleClassName,
  count,
  scrollAreaRef,
  scrollAreaClassName,
  showPostLink,
  children,
}: {
  title: string;
  titleClassName: string;
  count: number;
  scrollAreaRef: React.Ref<HTMLDivElement>;
  scrollAreaClassName: string;
  /** Top-right + control linking to the Post page (needs/resources columns). */
  showPostLink?: boolean;
  children: React.ReactNode;
}) {
  const id = slugTitle(title);
  return (
    <section
      className="flex flex-col rounded-[1.75rem] bg-card border border-border/70 shadow-sm px-5 pt-5 pb-5 min-h-0"
      aria-labelledby={`home-col-${id}`}
    >
      <div className="flex items-center gap-2 mb-4 shrink-0 justify-between min-w-0">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <h2 id={`home-col-${id}`} className={`text-lg font-bold tracking-tight ${titleClassName}`}>
            {title}
          </h2>
          <span
            className="inline-flex h-8 min-w-8 px-2 items-center justify-center rounded-full bg-[#2e7d32] text-white text-sm font-semibold tabular-nums shadow-sm"
            aria-label={`${count} ${title}`}
          >
            {count}
          </span>
        </div>
        {showPostLink && (
          <Link
            to="/post"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-black hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Post a new need or resource"
          >
            <Plus className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </Link>
        )}
      </div>
      <div
        ref={scrollAreaRef}
        className={`flex flex-col gap-3 min-h-0 overflow-y-auto overscroll-y-contain pr-1 scroll-smooth ${scrollAreaClassName}`}
      >
        {children}
      </div>
    </section>
  );
}

export default function Homepage() {
  const actor = useBackendActor();
  const [resources, setResources] = useState<Resource[]>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const needsScrollRef = useRef<HTMLDivElement>(null);
  const resourcesScrollRef = useRef<HTMLDivElement>(null);
  const profilesScrollRef = useRef<HTMLDivElement>(null);

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

  const groupMap = useMemo(() => Object.fromEntries(groups.map((g) => [g.id, g.name])), [groups]);

  const filteredResources = useMemo(
    () =>
      resources.filter((r) =>
        matchesNeedOrResourceSearch(r, groupMap[r.groupId] ?? "", search)
      ),
    [resources, groupMap, search]
  );

  const filteredNeeds = useMemo(
    () =>
      needs.filter((n) =>
        matchesNeedOrResourceSearch(n, groupMap[n.groupId] ?? "", search)
      ),
    [needs, groupMap, search]
  );

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    return groups.filter((g) => {
      if (groupMatchesSearch(g, search)) return true;
      return (
        filteredNeeds.some((n) => n.groupId === g.id) ||
        filteredResources.some((r) => r.groupId === g.id)
      );
    });
  }, [groups, search, filteredNeeds, filteredResources]);

  const needsKey = useMemo(() => filteredNeeds.map((n) => n.id).join(","), [filteredNeeds]);
  const resourcesKey = useMemo(() => filteredResources.map((r) => r.id).join(","), [filteredResources]);
  const groupsKey = useMemo(() => filteredGroups.map((g) => g.id).join(","), [filteredGroups]);

  const {
    visibleCount: visibleNeeds,
    tryLoadMore: loadMoreNeeds,
  } = useScrollRevealCount(filteredNeeds.length, needsKey);
  const {
    visibleCount: visibleResources,
    tryLoadMore: loadMoreResources,
  } = useScrollRevealCount(filteredResources.length, resourcesKey);
  const {
    visibleCount: visibleProfiles,
    tryLoadMore: loadMoreProfiles,
  } = useScrollRevealCount(filteredGroups.length, groupsKey);

  const countsByGroup = useMemo(() => {
    const map = new Map<string, { resources: number; needs: number }>();
    for (const g of groups) map.set(g.id, { resources: 0, needs: 0 });
    for (const r of resources) {
      const c = map.get(r.groupId);
      if (c) c.resources += 1;
    }
    for (const n of needs) {
      const c = map.get(n.groupId);
      if (c) c.needs += 1;
    }
    return map;
  }, [groups, resources, needs]);

  const topScrollH = "h-[min(520px,52vh)]";

  if (loading) {
    return (
      <p className="text-muted-foreground py-8 text-center">Loading...</p>
    );
  }

  const visibleNeedList = filteredNeeds.slice(0, visibleNeeds);
  const visibleResourceList = filteredResources.slice(0, visibleResources);
  const visibleGroupList = filteredGroups.slice(0, visibleProfiles);

  return (
    <div className="w-full max-w-[1600px] mx-auto pb-10 rounded-[2rem] bg-muted/30 p-5 md:p-8 lg:p-10">
      <div className="flex flex-col items-center gap-6 mb-8 lg:mb-10">
        <p className="text-center text-sm text-foreground max-w-3xl leading-relaxed px-2">
          Hello! welcome to A Seed! This is a platform for food groups to connect, share resources,
          and share needs. Want to learn how it works? Watch the video{" "}
          <Link to="/" className={HOME_WELCOME_LINK_CLASS}>
            here!
          </Link>{" "}
          or download our{" "}
          <Link to="/" className={HOME_WELCOME_LINK_CLASS}>
            pdf guide
          </Link>
          ! Disclaimer: I have not made these yet, they will come soon! In the meantime, you can book a call with me to learn more,
          just email me at mcgillfoodco@gmail.com.
        </p>
        <label className="relative w-full max-w-3xl flex items-center gap-3 rounded-full border border-border bg-background px-5 py-3.5 shadow-sm">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <input
            type="search"
            placeholder="Search profiles, resources, needs, or categories (e.g. equipment)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 mb-8 lg:mb-10">
        <SquiggleSection
          title="Current Needs"
          titleClassName="text-[#8b1538]"
          count={filteredNeeds.length}
          scrollAreaRef={needsScrollRef}
          scrollAreaClassName={topScrollH}
          showPostLink
        >
          {filteredNeeds.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No needs found.</p>
          ) : (
            <>
              {visibleNeedList.map((n) => (
                <article
                  key={n.id}
                  className="rounded-2xl bg-muted/50 border border-border/40 p-4 space-y-2 shrink-0"
                >
                  <span className="inline-block rounded-full bg-[#c62828] text-white text-xs font-semibold px-3 py-0.5">
                    {formatCategory(n.category)}
                  </span>
                  <h3 className="text-[15px] leading-snug font-bold text-foreground">{n.title}</h3>
                  <ExpandableDescription text={n.description} />
                  <p className="text-sm text-muted-foreground">
                    <Link to={`/profile?groupId=${n.groupId}`} className="hover:underline">
                      {groupMap[n.groupId] ?? n.groupId}
                    </Link>
                  </p>
                </article>
              ))}
              <ScrollRevealSentinel
                scrollRootRef={needsScrollRef}
                enabled={visibleNeeds < filteredNeeds.length}
                onReveal={loadMoreNeeds}
              />
            </>
          )}
        </SquiggleSection>

        <SquiggleSection
          title="Available Resources"
          titleClassName="text-[#1b5e20]"
          count={filteredResources.length}
          scrollAreaRef={resourcesScrollRef}
          scrollAreaClassName={topScrollH}
          showPostLink
        >
          {filteredResources.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No resources found.</p>
          ) : (
            <>
              {visibleResourceList.map((r) => (
                <article
                  key={r.id}
                  className="rounded-2xl bg-muted/50 border border-border/40 p-4 space-y-2 shrink-0"
                >
                  <span className="inline-block rounded-full bg-[#2e7d32] text-white text-xs font-semibold px-3 py-0.5">
                    {formatCategory(r.category)}
                  </span>
                  <h3 className="text-[15px] leading-snug font-bold text-foreground">{r.title}</h3>
                  <ExpandableDescription text={r.description} />
                  <p className="text-sm text-muted-foreground">
                    <Link to={`/profile?groupId=${r.groupId}`} className="hover:underline">
                      {groupMap[r.groupId] ?? r.groupId}
                    </Link>
                  </p>
                </article>
              ))}
              <ScrollRevealSentinel
                scrollRootRef={resourcesScrollRef}
                enabled={visibleResources < filteredResources.length}
                onReveal={loadMoreResources}
              />
            </>
          )}
        </SquiggleSection>
      </div>

      <SquiggleSection
        title="All Profiles"
        titleClassName="text-[#b8860b]"
        count={filteredGroups.length}
        scrollAreaRef={profilesScrollRef}
        scrollAreaClassName="h-[min(480px,45vh)]"
      >
        {filteredGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No profiles found.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {visibleGroupList.map((g) => {
                const { resources: rc, needs: nc } = countsByGroup.get(g.id) ?? {
                  resources: 0,
                  needs: 0,
                };
                const inactive = rc === 0 && nc === 0;
                return (
                  <Link
                    key={g.id}
                    to={`/profile?groupId=${g.id}`}
                    className="flex gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-sm hover:border-border transition-colors text-left shrink-0"
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#6d4c41] text-xs font-bold text-white"
                      aria-hidden
                    >
                      {initials(g.name)}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <p className="font-semibold text-foreground truncate">{g.name}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {formatGroupRoles(g.roles)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        {rc > 0 && (
                          <span className="rounded-full bg-[#e8f5e9] text-[#2e7d32] text-xs font-medium px-2.5 py-0.5">
                            {rc} resource{rc === 1 ? "" : "s"}
                          </span>
                        )}
                        {nc > 0 && (
                          <span className="rounded-full bg-[#ffebee] text-[#c62828] text-xs font-medium px-2.5 py-0.5">
                            {nc} need{nc === 1 ? "" : "s"}
                          </span>
                        )}
                        {inactive && (
                          <span className="text-xs text-muted-foreground">No activity yet</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            <ScrollRevealSentinel
              scrollRootRef={profilesScrollRef}
              enabled={visibleProfiles < filteredGroups.length}
              onReveal={loadMoreProfiles}
            />
          </>
        )}
      </SquiggleSection>
    </div>
  );
}
