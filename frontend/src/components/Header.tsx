import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  ClipboardList,
  Home,
  Shield,
  Sprout,
  StickyNote,
  UserCircle,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBackendActor } from "@/hooks/useBackendActor";
import { useToast } from "@/hooks/useToast";
import type { Group, User } from "@/declarations/aseed_backend.did";

function UserProfileMenu() {
  const actor = useBackendActor();
  const { logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [updatingDisplayName, setUpdatingDisplayName] = useState(false);
  const [switchingGroup, setSwitchingGroup] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [requestingGroupIds, setRequestingGroupIds] = useState<Set<string>>(new Set());
  const [groupSearch, setGroupSearch] = useState("");

  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [displayNameInput, setDisplayNameInput] = useState("");

  const refreshProfile = async () => {
    if (!actor) return;
    setLoadingProfile(true);
    try {
      const [me, allGroups] = await Promise.all([actor.get_me(), actor.list_groups()]);
      const meUser = me?.[0] ?? null;
      setUser(meUser);
      setGroups(allGroups);
      if (meUser) setDisplayNameInput(meUser.displayName);
    } catch (err) {
      addToast(String(err), "error");
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (!actor) return;
    refreshProfile();
  }, [actor]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuOpen && menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
        setConfirmDelete(false);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setJoinModalOpen(false);
        setConfirmDelete(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!joinModalOpen) return;
    modalRef.current?.focus();
  }, [joinModalOpen]);

  const userGroups = useMemo(() => {
    if (!user) return [];
    return groups.filter((g) => user.groupIds.includes(g.id));
  }, [groups, user]);

  const joinableGroups = useMemo(() => {
    if (!user) return [];
    const filtered = groups.filter((g) => !user.groupIds.includes(g.id));
    if (!groupSearch.trim()) return filtered;
    const search = groupSearch.toLowerCase();
    return filtered.filter((g) => g.name.toLowerCase().includes(search));
  }, [groups, groupSearch, user]);

  const handleSetActiveGroup = async (groupId: string) => {
    if (!actor || !groupId || switchingGroup) return;
    setSwitchingGroup(true);
    try {
      const ok = await actor.set_active_group([groupId]);
      if (!ok) {
        addToast("Failed to update active group", "error");
        return;
      }
      addToast("Active group updated", "success");
      await refreshProfile();
    } catch (err) {
      addToast(String(err), "error");
    } finally {
      setSwitchingGroup(false);
    }
  };

  const handleUpdateDisplayName = async () => {
    if (!actor || !user || updatingDisplayName) return;
    const nextValue = displayNameInput.trim();
    if (!nextValue) {
      addToast("Display name cannot be empty", "error");
      return;
    }
    setUpdatingDisplayName(true);
    try {
      const ok = await actor.update_display_name(nextValue);
      if (!ok) {
        addToast("Failed to update display name", "error");
        return;
      }
      addToast("Display name updated", "success");
      await refreshProfile();
    } catch (err) {
      addToast(String(err), "error");
    } finally {
      setUpdatingDisplayName(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!actor || deletingProfile) return;
    setDeletingProfile(true);
    try {
      const ok = await actor.delete_me();
      if (!ok) {
        addToast("Failed to delete profile", "error");
        return;
      }
      addToast("Profile deleted", "success");
      setUser(null);
      setGroups([]);
      setDisplayNameInput("");
      setMenuOpen(false);
      setJoinModalOpen(false);
      setConfirmDelete(false);
      navigate("/user-form");
    } catch (err) {
      addToast(String(err), "error");
    } finally {
      setDeletingProfile(false);
    }
  };

  const handleRequestJoinGroup = async (groupId: string) => {
    if (!actor || requestingGroupIds.has(groupId)) return;
    setRequestingGroupIds((prev) => new Set(prev).add(groupId));
    try {
      const res = await actor.request_join_group(groupId);
      if (!res || res.length === 0) {
        addToast("Failed to send join request", "error");
        return;
      }
      addToast("Join request sent", "success");
      setJoinModalOpen(false);
      setGroupSearch("");
    } catch (err) {
      addToast(String(err), "error");
    } finally {
      setRequestingGroupIds((prev) => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
    }
  };

  const openJoinModal = async () => {
    if (!actor) return;
    setLoadingGroups(true);
    setJoinModalOpen(true);
    try {
      const allGroups = await actor.list_groups();
      setGroups(allGroups);
    } catch (err) {
      addToast(String(err), "error");
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleCreateGroup = () => {
    setMenuOpen(false);
    setJoinModalOpen(false);
    setConfirmDelete(false);
    navigate("/registration");
  };

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="sm"
        className="font-semibold"
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        {loadingProfile ? "Loading..." : user ? `user: ${user.displayName}` : "User profile"}
      </Button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-80 rounded-md border bg-background shadow-lg p-3 z-50 space-y-4"
        >
          <div className="space-y-2">
            <label className="block text-xs font-medium text-muted-foreground">Active group</label>
            <select
              value={user?.activeGroupId[0] ?? ""}
              onChange={(e) => handleSetActiveGroup(e.target.value)}
              className="w-full rounded border bg-background px-2 py-2 text-sm"
              disabled={switchingGroup || userGroups.length === 0}
            >
              <option value="" disabled>
                {userGroups.length === 0 ? "No groups assigned" : "Select active group"}
              </option>
              {userGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-muted-foreground">Display name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                className="flex-1 rounded border bg-background px-2 py-2 text-sm"
                placeholder="Display name"
              />
              <Button size="sm" onClick={handleUpdateDisplayName} disabled={updatingDisplayName || !user}>
                Save
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={openJoinModal}
              disabled={loadingGroups}
            >
              Request to join group
            </Button>
            <Button variant="outline" size="sm" className="w-full" onClick={handleCreateGroup}>
              Create new group
            </Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={logout}>
              Logout
            </Button>
          </div>

          <div className="border-t pt-3 space-y-2">
            {!confirmDelete ? (
              <Button variant="destructive" size="sm" className="w-full" onClick={() => setConfirmDelete(true)}>
                Delete profile
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  This permanently deletes your user profile.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={handleDeleteProfile}
                    disabled={deletingProfile}
                  >
                    Confirm delete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deletingProfile}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {joinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            ref={modalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Request to join a group"
            className="w-full max-w-lg rounded-lg border bg-background p-4 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Request to join a group</h2>
              <Button variant="ghost" size="sm" onClick={() => setJoinModalOpen(false)}>
                Close
              </Button>
            </div>

            <input
              type="text"
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              placeholder="Search groups..."
              className="mb-4 w-full rounded border bg-background px-3 py-2 text-sm"
            />

            {loadingGroups ? (
              <p className="text-sm text-muted-foreground">Loading groups...</p>
            ) : joinableGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matching groups available.</p>
            ) : (
              <ul className="max-h-72 space-y-2 overflow-auto">
                {joinableGroups.map((group) => {
                  const requesting = requestingGroupIds.has(group.id);
                  return (
                    <li key={group.id} className="flex items-center justify-between rounded border p-2">
                      <span className="text-sm">{group.name}</span>
                      <Button
                        size="sm"
                        onClick={() => handleRequestJoinGroup(group.id)}
                        disabled={requesting}
                      >
                        {requesting ? "Requesting..." : "Request"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const navTabClass =
  "inline-flex items-center gap-2 rounded-md border-2 px-3 py-1.5 text-lg font-semibold leading-none hover:underline hover:text-[#CE3D31]";
const navIconClass = "h-[1em] w-[1em] shrink-0";

function HeaderNavLink({
  to,
  icon: Icon,
  children,
  isActive,
}: {
  to: string;
  icon: LucideIcon;
  children: React.ReactNode;
  isActive: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        navTabClass,
        isActive
          ? "border-[#CE3D31] text-foreground"
          : "border-transparent text-foreground"
      )}
    >
      <Icon className={navIconClass} aria-hidden />
      {children}
    </Link>
  );
}

function isHeaderNavActive(pathname: string, to: string): boolean {
  if (to === "/admin/groups") return pathname.startsWith("/admin");
  if (to === "/") return pathname === "/";
  return pathname === to;
}

export function Header() {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-24 items-center justify-between">
        <Link to="/" className="ml-20 flex items-center gap-3 font-semibold text-3xl">
          <img
            src="/logo.png"
            alt="A Seed"
            className="h-14 w-14 shrink-0 object-contain"
          />
          A Seed
        </Link>
        <nav className="flex items-center gap-7">
          {isAuthenticated ? (
            <>
              <HeaderNavLink to="/" icon={Home} isActive={isHeaderNavActive(pathname, "/")}>
                Home
              </HeaderNavLink>
              <HeaderNavLink
                to="/exchange"
                icon={Sprout}
                isActive={isHeaderNavActive(pathname, "/exchange")}
              >
                Exchange
              </HeaderNavLink>
              <HeaderNavLink
                to="/events"
                icon={Calendar}
                isActive={isHeaderNavActive(pathname, "/events")}
              >
                Events
              </HeaderNavLink>
              <HeaderNavLink to="/post" icon={StickyNote} isActive={isHeaderNavActive(pathname, "/post")}>
                Post
              </HeaderNavLink>
              <HeaderNavLink
                to="/profile"
                icon={UserCircle}
                isActive={isHeaderNavActive(pathname, "/profile")}
              >
                Profile
              </HeaderNavLink>
              <HeaderNavLink
                to="/request"
                icon={ClipboardList}
                isActive={isHeaderNavActive(pathname, "/request")}
              >
                Request
              </HeaderNavLink>
              <HeaderNavLink
                to="/admin/groups"
                icon={Shield}
                isActive={isHeaderNavActive(pathname, "/admin/groups")}
              >
                Admin
              </HeaderNavLink>
              <UserProfileMenu />
            </>
          ) : (
            <Link to="/login" className="text-lg font-semibold hover:underline">
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
