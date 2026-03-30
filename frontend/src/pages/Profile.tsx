import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { ExpandableDescription } from "@/components/ExpandableDescription";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useBackendActor } from "@/hooks/useBackendActor";
import { useToast } from "@/hooks/useToast";
import {
  deleteGroupProfilePicture,
  profileImagePublicUrl,
  uploadGroupProfilePicture,
} from "@/lib/assetUpload";
import type {
  Category,
  Group,
  JoinRequest,
  Need,
  Resource,
  SocialLink,
  User,
} from "@/declarations/aseed_backend.did";

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

function optWebsiteArg(
  edited: string,
  previous: [] | [string]
): [] | [string] {
  const t = edited.trim();
  const had = previous.length > 0;
  if (t === "") {
    return had ? [""] : [];
  }
  if (!had || previous[0] !== t) {
    return [t];
  }
  return [];
}

function ProfileSquiggle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[1.75rem] bg-card border border-border/70 shadow-sm px-5 pt-5 pb-6 ${className}`}
    >
      {children}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-2 border-b border-border/50 last:border-0">
      <p className="text-sm font-semibold text-foreground/90 mb-1">{label}</p>
      <div className="text-sm text-foreground/80">{children}</div>
    </div>
  );
}

export default function Profile() {
  const [searchParams] = useSearchParams();
  const groupIdParam = searchParams.get("groupId");
  const actor = useBackendActor();
  const { identity } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [groupNeeds, setGroupNeeds] = useState<Need[]>([]);
  const [groupResources, setGroupResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editSocials, setEditSocials] = useState<SocialLink[]>([]);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [removeProfilePic, setRemoveProfilePic] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [memberUsers, setMemberUsers] = useState<(User | null)[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: "need"; id: string; title: string }
    | { kind: "resource"; id: string; title: string }
    | null
  >(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { addToast } = useToast();

  const groupId = groupIdParam ?? (user && user.activeGroupId[0] ? user.activeGroupId[0] : null);
  const isMember = !!(user && group && group.userIds.includes(user.id));

  useEffect(() => {
    if (!actor) return;
    actor.list_groups().then(setGroups).catch(() => []);
    actor.get_me().then((me) => me && me[0] && setUser(me[0]));
  }, [actor]);

  useEffect(() => {
    if (!actor || !groupId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      actor.get_group(groupId),
      actor.get_pending_join_requests(groupId),
      actor.list_needs(),
      actor.list_resources(),
    ])
      .then(([gRes, reqs, needs, resources]) => {
        setGroup(gRes && gRes[0] ? gRes[0] : null);
        setPendingRequests(reqs);
        setGroupNeeds(needs.filter((n) => n.groupId === groupId));
        setGroupResources(resources.filter((r) => r.groupId === groupId));
      })
      .finally(() => setLoading(false));
  }, [actor, groupId]);

  useEffect(() => {
    if (group) {
      setEditName(group.name);
      setEditEmail(group.email);
      setEditAddress(group.address[0] ?? "");
      setEditPhone(group.phone[0] ?? "");
      setEditWebsite(group.website[0] ?? "");
      setEditSocials(
        group.socialLinks.length > 0
          ? group.socialLinks.map((s) => ({ platform: s.platform, url: s.url }))
          : []
      );
      setPendingImageFile(null);
      setRemoveProfilePic(false);
    }
  }, [group]);

  useEffect(() => {
    if (!actor || !group || !group.userIds.length) {
      setMemberUsers([]);
      setMembersLoading(false);
      return;
    }
    setMembersLoading(true);
    Promise.all(group.userIds.map((id) => actor.get_user(id)))
      .then((results) => results.map((r) => r[0] ?? null))
      .then(setMemberUsers)
      .finally(() => setMembersLoading(false));
  }, [actor, group]);

  const memberDisplayNames = memberUsers
    .map((u) => u?.displayName)
    .filter((n): n is string => !!n && n.trim() !== "");

  const handleSaveProfile = async () => {
    if (!actor || !groupId || !group) return;
    setSaveLoading(true);
    try {
      let profilePathArg: [] | [string] = [];

      if (removeProfilePic) {
        const prev = group.profilePicturePath[0];
        if (prev && identity) {
          try {
            await deleteGroupProfilePicture(actor, prev);
          } catch {
            /* asset may already be gone */
          }
        }
        profilePathArg = [""];
      } else if (pendingImageFile) {
        if (!identity) {
          addToast("Sign in to upload a profile image", "error");
          setSaveLoading(false);
          return;
        }
        const prev = group.profilePicturePath[0];
        if (prev) {
          try {
            await deleteGroupProfilePicture(actor, prev);
          } catch {
            /* ignore */
          }
        }
        try {
          const key = await uploadGroupProfilePicture(actor, groupId, pendingImageFile);
          profilePathArg = [key];
        } catch (e) {
          addToast(e instanceof Error ? e.message : "Image upload failed", "error");
          setSaveLoading(false);
          return;
        }
      }

      const socialFiltered = editSocials.filter(
        (s) => s.platform.trim() !== "" && s.url.trim() !== ""
      );
      const socialArg: [] | [SocialLink[]] = [socialFiltered];

      const ok = await actor.update_group(
        groupId,
        editName.trim() !== group.name ? [editName.trim()] : [],
        editEmail.trim() !== group.email ? [editEmail.trim()] : [],
        editAddress.trim() ? [editAddress.trim()] : [],
        editPhone.trim() ? [editPhone.trim()] : [],
        optWebsiteArg(editWebsite, group.website),
        socialArg,
        profilePathArg
      );
      if (ok) {
        addToast("Profile updated");
        const gRes = await actor.get_group(groupId);
        setGroup(gRes && gRes[0] ? gRes[0] : null);
        const [needs, resources] = await Promise.all([actor.list_needs(), actor.list_resources()]);
        setGroupNeeds(needs.filter((n) => n.groupId === groupId));
        setGroupResources(resources.filter((r) => r.groupId === groupId));
        setIsEditing(false);
        setPendingImageFile(null);
        setRemoveProfilePic(false);
      } else {
        addToast("Failed to update profile", "error");
      }
    } catch {
      addToast("Failed to update profile", "error");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSetActive = (id: string) => {
    if (!actor) return;
    actor.set_active_group([id]).then((ok) => {
      if (ok) addToast("Active group updated");
      else addToast("Failed to update", "error");
    });
  };

  const handleApprove = async (requestId: string) => {
    if (!actor || !groupId) return;
    try {
      const ok = await actor.approve_join_request(requestId);
      if (ok) {
        addToast("Request approved");
        actor.get_pending_join_requests(groupId).then(setPendingRequests);
      } else addToast("Failed to approve", "error");
    } catch {
      addToast("Failed to approve", "error");
    }
  };

  const handleDeny = async (requestId: string) => {
    if (!actor || !groupId) return;
    try {
      const ok = await actor.deny_join_request(requestId);
      if (ok) {
        addToast("Request denied");
        actor.get_pending_join_requests(groupId).then(setPendingRequests);
      } else addToast("Failed to deny", "error");
    } catch {
      addToast("Failed to deny", "error");
    }
  };

  const confirmDeleteNeedOrResource = async () => {
    if (!actor || !pendingDelete) return;
    setDeleteLoading(true);
    try {
      const ok =
        pendingDelete.kind === "need"
          ? await actor.delete_need(pendingDelete.id)
          : await actor.delete_resource(pendingDelete.id);
      if (ok) {
        addToast(pendingDelete.kind === "need" ? "Need removed" : "Resource removed");
        if (pendingDelete.kind === "need") {
          setGroupNeeds((prev) => prev.filter((n) => n.id !== pendingDelete.id));
        } else {
          setGroupResources((prev) => prev.filter((r) => r.id !== pendingDelete.id));
        }
        setPendingDelete(null);
      } else {
        addToast("Could not delete (must be a member of this group)", "error");
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Delete failed", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const addSocialRow = () => {
    setEditSocials((prev) => [...prev, { platform: "", url: "" }]);
  };

  const updateSocialRow = (i: number, field: keyof SocialLink, value: string) => {
    setEditSocials((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const removeSocialRow = (i: number) => {
    setEditSocials((prev) => prev.filter((_, j) => j !== i));
  };

  const picUrl =
    group?.profilePicturePath[0] && !removeProfilePic
      ? profileImagePublicUrl(group.profilePicturePath[0])
      : null;

  if (loading) return <p className="text-muted-foreground py-8">Loading...</p>;
  if (!group && groupId) return <p className="text-muted-foreground py-8">Group not found.</p>;
  if (!group && !groupId) return <p className="text-muted-foreground py-8">Select a group.</p>;

  const g = group!;

  return (
    <div className="w-full max-w-[1200px] mx-auto pb-10 space-y-8">
      <div className="rounded-[2rem] bg-muted/30 p-5 md:p-8 space-y-8">
        {isEditing ? (
          <ProfileSquiggle>
            <h2 className="text-lg font-bold text-foreground mb-4">Edit profile</h2>
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-sm font-semibold text-foreground/90 mb-1">Profile picture</label>
                <input
                  type="file"
                  accept="image/*"
                  className="text-sm w-full"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setPendingImageFile(f ?? null);
                    if (f) setRemoveProfilePic(false);
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">Max 300 KB. Stored on the asset canister.</p>
                {g.profilePicturePath[0] && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setRemoveProfilePic(true);
                      setPendingImageFile(null);
                    }}
                  >
                    Remove profile picture
                  </Button>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground/90 mb-1">Name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground/90 mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground/90 mb-1">Address</label>
                <input
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground/90 mb-1">Phone</label>
                <input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground/90 mb-1">Website</label>
                <input
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  placeholder="https://"
                  className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-foreground/90">Social links</label>
                  <Button type="button" variant="outline" size="sm" onClick={addSocialRow}>
                    Add link
                  </Button>
                </div>
                <div className="space-y-2">
                  {editSocials.map((row, i) => (
                    <div key={i} className="flex flex-wrap gap-2 items-center">
                      <input
                        placeholder="Platform (e.g. Instagram)"
                        value={row.platform}
                        onChange={(e) => updateSocialRow(i, "platform", e.target.value)}
                        className="flex-1 min-w-[120px] px-2 py-1.5 border rounded-md bg-background text-sm"
                      />
                      <input
                        placeholder="https://"
                        value={row.url}
                        onChange={(e) => updateSocialRow(i, "url", e.target.value)}
                        className="flex-[2] min-w-[160px] px-2 py-1.5 border rounded-md bg-background text-sm"
                      />
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeSocialRow(i)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSaveProfile} disabled={saveLoading}>
                  {saveLoading ? "Saving…" : "Save"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    if (g) {
                      setEditWebsite(g.website[0] ?? "");
                      setEditSocials(
                        g.socialLinks.length > 0
                          ? g.socialLinks.map((s) => ({ platform: s.platform, url: s.url }))
                          : []
                      );
                    }
                    setPendingImageFile(null);
                    setRemoveProfilePic(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </ProfileSquiggle>
        ) : (
          <ProfileSquiggle>
            <div className="flex flex-col sm:flex-row gap-6 items-start mb-6">
              <div className="shrink-0">
                {picUrl ? (
                  <img
                    src={picUrl}
                    alt=""
                    className="w-28 h-28 rounded-2xl object-cover border border-border/60 shadow-sm"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-2xl bg-muted border border-dashed border-border flex items-center justify-center text-muted-foreground text-sm text-center px-2">
                    No photo
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-foreground tracking-tight mb-4">{g.name}</h1>
                {isMember && (
                  <Button size="sm" onClick={() => setIsEditing(true)}>
                    Edit profile
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-0">
              <FieldRow label="Email:">{g.email}</FieldRow>
              <FieldRow label="Members:">
                {membersLoading ? (
                  <span className="text-muted-foreground">Loading…</span>
                ) : memberDisplayNames.length > 0 ? (
                  memberDisplayNames.join(", ")
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </FieldRow>
              <FieldRow label="Address:">
                {g.address[0] ? g.address[0] : <span className="text-muted-foreground">—</span>}
              </FieldRow>
              <FieldRow label="Phone:">
                {g.phone[0] ? g.phone[0] : <span className="text-muted-foreground">—</span>}
              </FieldRow>
              <FieldRow label="Website:">
                {g.website[0] ? (
                  <a
                    href={g.website[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1b5e20] font-medium hover:underline break-all"
                  >
                    {g.website[0]}
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </FieldRow>
              <FieldRow label="Social:">
                {g.socialLinks.length > 0 ? (
                  <ul className="space-y-1">
                    {g.socialLinks.map((s, i) => (
                      <li key={i}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#1b5e20] font-medium hover:underline"
                        >
                          {s.platform}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </FieldRow>
            </div>
          </ProfileSquiggle>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <ProfileSquiggle className="flex flex-col min-h-[220px]">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-bold text-[#8b1538]">Current needs</h2>
              <span className="inline-flex h-8 min-w-8 px-2 items-center justify-center rounded-full bg-[#2e7d32] text-white text-sm font-semibold tabular-nums">
                {groupNeeds.length}
              </span>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[min(400px,50vh)] pr-1">
              {groupNeeds.length === 0 ? (
                <p className="text-sm text-muted-foreground">No needs for this group.</p>
              ) : (
                groupNeeds.map((n) => (
                  <article
                    key={n.id}
                    className="rounded-2xl bg-muted/50 border border-border/40 p-4 space-y-2 shrink-0"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="inline-block rounded-full bg-[#c62828] text-white text-xs font-semibold px-3 py-0.5">
                        {formatCategory(n.category)}
                      </span>
                      {isMember && (
                        <button
                          type="button"
                          className="shrink-0 rounded-lg p-1.5 text-black hover:bg-muted hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`Delete need: ${n.title}`}
                          onClick={() =>
                            setPendingDelete({ kind: "need", id: n.id, title: n.title })
                          }
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                        </button>
                      )}
                    </div>
                    <h3 className="text-[15px] leading-snug font-bold text-foreground">{n.title}</h3>
                    <ExpandableDescription text={n.description} />
                  </article>
                ))
              )}
            </div>
          </ProfileSquiggle>

          <ProfileSquiggle className="flex flex-col min-h-[220px]">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-bold text-[#1b5e20]">Available resources</h2>
              <span className="inline-flex h-8 min-w-8 px-2 items-center justify-center rounded-full bg-[#2e7d32] text-white text-sm font-semibold tabular-nums">
                {groupResources.length}
              </span>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[min(400px,50vh)] pr-1">
              {groupResources.length === 0 ? (
                <p className="text-sm text-muted-foreground">No resources for this group.</p>
              ) : (
                groupResources.map((r) => (
                  <article
                    key={r.id}
                    className="rounded-2xl bg-muted/50 border border-border/40 p-4 space-y-2 shrink-0"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="inline-block rounded-full bg-[#2e7d32] text-white text-xs font-semibold px-3 py-0.5">
                        {formatCategory(r.category)}
                      </span>
                      {isMember && (
                        <button
                          type="button"
                          className="shrink-0 rounded-lg p-1.5 text-black hover:bg-muted hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`Delete resource: ${r.title}`}
                          onClick={() =>
                            setPendingDelete({ kind: "resource", id: r.id, title: r.title })
                          }
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                        </button>
                      )}
                    </div>
                    <h3 className="text-[15px] leading-snug font-bold text-foreground">{r.title}</h3>
                    <ExpandableDescription text={r.description} />
                  </article>
                ))
              )}
            </div>
          </ProfileSquiggle>
        </div>
      </div>

      {user && (
        <ProfileSquiggle>
          <h2 className="text-sm font-semibold text-foreground/90 mb-2">Active group</h2>
          <select
            value={user.activeGroupId[0] ?? ""}
            onChange={(e) => handleSetActive(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background text-foreground max-w-md w-full"
          >
            {groups
              .filter((gr) => user.groupIds.includes(gr.id))
              .map((gr) => (
                <option key={gr.id} value={gr.id}>
                  {gr.name}
                </option>
              ))}
          </select>
        </ProfileSquiggle>
      )}

      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-delete-dialog-title"
          onClick={() => !deleteLoading && setPendingDelete(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="profile-delete-dialog-title" className="text-lg font-bold text-foreground mb-2">
              Confirm delete
            </h2>
            <p className="text-sm text-muted-foreground mb-2">
              {pendingDelete.kind === "need"
                ? "This need will be permanently removed."
                : "This resource will be permanently removed."}
            </p>
            <p className="text-sm font-medium text-foreground break-words" title={pendingDelete.title}>
              {pendingDelete.title}
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPendingDelete(null)}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmDeleteNeedOrResource}
                disabled={deleteLoading || !actor}
              >
                {deleteLoading ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isMember && pendingRequests.length > 0 && (
        <ProfileSquiggle>
          <h2 className="text-sm font-semibold text-foreground/90 mb-3">Pending join requests</h2>
          <ul className="space-y-2">
            {pendingRequests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-border/60 bg-card"
              >
                <span className="text-sm text-foreground/80">User {r.userId}</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApprove(r.id)}>
                    Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeny(r.id)}>
                    Deny
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </ProfileSquiggle>
      )}
    </div>
  );
}
