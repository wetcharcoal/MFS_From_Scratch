// A Seed ICP Exchange Platform - Main canister
//
// --- Stable storage layout (upgrade-safe) ---
// - `_schemaVersion` (Nat): bump and run migration logic in postupgrade when record shapes change.
// - Counters and rate-limit fields: unchanged, stable vars.
// - Entity maps: `OrderedMap.Map` from base (red-black tree; stable when K/V are stable). Updates are
//   O(log n) persistent structure updates, not a full rewrite of the whole map each time.
// - Limits: map size is bounded by subnet memory; very large maps increase upgrade deserialization cost.
// - Admins: `OrderedMap.Map<Principal, Bool>` with the same persistence model.
// - No preupgrade/postupgrade hooks: maps are stable types; avoid serializing the entire heap on upgrade.
// - First deploy after this change: heap-only maps from older Wasm were already empty on upgrade;
//   persisted data starts from stable memory from this version onward.
//
// Verify locally (dfx): deploy → create user/group → `dfx deploy aseed_backend` (same id) →
// query `get_me` / `list_groups` and confirm data still present.

import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Buffer "mo:base/Buffer";
import Error "mo:base/Error";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";
import OrderedMap "mo:base/OrderedMap";

import AccessControl "access-control";
import Approval "approval";
import Groups "groups";
import Matching "matching";
import Needs "needs";
import Resources "resources";
import Types "types";
import Users "users";

/// Asset canister for this app (dfx injects principal via --actor-alias). Backend must be a controller of it to `store`.
import AseedFrontend "canister:aseed_frontend";

persistent actor Main {
  type Category = Types.Category;
  type DateRange = Types.DateRange;
  type Event = Types.Event;
  type Group = Types.Group;
  type GroupRole = Types.GroupRole;
  type SocialLink = Types.SocialLink;
  type JoinRequest = Types.JoinRequest;
  type Need = Types.Need;
  type Resource = Types.Resource;
  type User = Types.User;

  /// Bump when persisted types or map layout change; use postupgrade to migrate `_schemaVersion` N → N+1.
  private stable var _schemaVersion : Nat = 1;

  private stable var _nextUserId : Nat = 0;
  private stable var _nextGroupId : Nat = 0;
  private stable var _nextResourceId : Nat = 0;
  private stable var _nextNeedId : Nat = 0;
  private stable var _nextEventId : Nat = 0;
  private stable var _nextJoinRequestId : Nat = 0;
  private stable var _groupCreationDay : Int = 0;
  private stable var _groupsCreatedToday : Nat = 0;
  /// Optional override for the asset canister principal; if null, `Principal.fromActor(AseedFrontend)` is used.
  private stable var _assetStorageCanisterId : ?Principal = null;

  private stable var admins = AccessControl.createAdminSet();

  /// Text-keyed maps (shared `Operations` instance for all Text-key tables).
  /// Transient: only the `Map` values below are persisted; `Operations` is a pure helper.
  private transient let txt = OrderedMap.Make<Text>(Text.compare);
  private transient let pr = OrderedMap.Make<Principal>(Principal.compare);
  private stable var users = txt.empty<User>();
  private stable var principalToUserId = pr.empty<Text>();
  private stable var groups = txt.empty<Group>();
  private stable var resources = txt.empty<Resource>();
  private stable var needs = txt.empty<Need>();
  private stable var events = txt.empty<Event>();
  private stable var joinRequests = txt.empty<JoinRequest>();
  private stable var userJoinRequests = txt.empty<[Text]>();

  type AssetStorage = actor {
    store : shared ({
      key : Text;
      content : Blob;
      sha256 : ?Blob;
      content_type : Text;
      content_encoding : Text;
    }) -> async ();
    delete_asset : shared { key : Text } -> async ();
  };

  public type ProfileAssetResult = { #ok : Text; #err : Text };

  // Admin: assign role. Callable by: (1) existing admins, or (2) when admins empty, by any authenticated user (first-caller becomes admin - deployer should call this immediately after deploy)
  public shared (msg) func assign_role(principal : Principal) : async Bool {
    let caller = msg.caller;
    if (Principal.isAnonymous(caller)) { return false };
    if (AccessControl.isAdmin(admins, caller)) {
      admins := AccessControl.addAdmin(admins, principal);
      return true
    };
    // When no admins yet: first caller adds themselves (principal must equal caller)
    if (admins.size == 0 and principal == caller) {
      admins := AccessControl.addAdmin(admins, principal);
      return true
    };
    false
  };

  /// Optional: override asset canister principal (defaults to `canister:aseed_frontend` from dfx).
  /// One-time local setup (controllers alone do not grant Commit on modern asset canisters):
  /// - dfx canister update-settings aseed_frontend --add-controller "$(dfx canister id aseed_backend)"
  /// - dfx canister call aseed_frontend authorize "(principal \"$(dfx canister id aseed_backend)\")"
  public shared (msg) func admin_set_asset_storage_canister(p : Principal) : async Bool {
    if (not AccessControl.isAdmin(admins, msg.caller)) { return false };
    _assetStorageCanisterId := ?p;
    true
  };

  public query func admin_get_asset_storage_canister() : async ?Principal {
    _assetStorageCanisterId
  };

  func resolvedAssetStoragePid() : Principal {
    switch (_assetStorageCanisterId) {
      case (?p) p;
      case null { Principal.fromActor(AseedFrontend) }
    }
  };

  func stripLeadingSlashes(t : Text) : Text {
    var s = t;
    label L loop {
      if (not Text.startsWith(s, #text "/")) { break L };
      switch (Text.stripStart(s, #char '/')) {
        case (?rest) { s := rest; continue L };
        case null { break L }
      }
    };
    s
  };

  func isProfileKeyForGroup(groupId : Text, key : Text) : Bool {
    let k = stripLeadingSlashes(key);
    let prefix = "groups/" # groupId # "/";
    if (not Text.startsWith(k, #text prefix)) { return false };
    if (Text.contains(k, #text "..")) { return false };
    if (k.size() <= prefix.size()) { return false };
    true
  };

  func groupIdFromProfileAssetKey(key : Text) : ?Text {
    let k = stripLeadingSlashes(key);
    let segs = Iter.toArray(Text.split(k, #char '/'));
    if (segs.size() < 3) { return null };
    if (segs[0] != "groups") { return null };
    if (segs[1] == "") { return null };
    ?segs[1]
  };

  /// Group members upload profile images via the backend so the asset canister sees the backend as caller (controller).
  public shared (msg) func store_group_profile_asset(
    groupId : Text,
    key : Text,
    content : Blob,
    contentType : Text,
    contentSha256 : [Nat8],
  ) : async ProfileAssetResult {
    if (Principal.isAnonymous(msg.caller)) { return #err("Anonymous caller") };
    if (not isGroupMember(msg.caller, groupId)) { return #err("Not a group member") };
    if (not isProfileKeyForGroup(groupId, key)) { return #err("Invalid asset key") };
    if (not Text.startsWith(contentType, #text "image/")) { return #err("Not an image content type") };
    let maxBytes : Nat = 300 * 1024;
    if (content.size() > maxBytes) { return #err("Image too large") };
    if (contentSha256.size() != 32) { return #err("Invalid sha256 length") };
    let assetPid = resolvedAssetStoragePid();
    let assets : AssetStorage = actor (Principal.toText(assetPid));
    let storeKey = if (Text.startsWith(key, #text "/")) { key } else { "/" # key };
    try {
      await assets.store({
        key = storeKey;
        content = content;
        sha256 = ?Blob.fromArray(contentSha256);
        content_type = contentType;
        content_encoding = "identity";
      });
      #ok(stripLeadingSlashes(key))
    } catch (e) {
      #err("Asset canister store failed: " # Error.message(e))
    }
  };

  public shared (msg) func delete_group_profile_asset(key : Text) : async ProfileAssetResult {
    if (Principal.isAnonymous(msg.caller)) { return #err("Anonymous caller") };
    if (Text.contains(key, #text "..")) { return #err("Invalid asset key") };
    let gid = switch (groupIdFromProfileAssetKey(key)) {
      case null { return #err("Invalid asset key") };
      case (?g) g
    };
    if (not isGroupMember(msg.caller, gid)) { return #err("Not a group member") };
    let assetPid = resolvedAssetStoragePid();
    let assets : AssetStorage = actor (Principal.toText(assetPid));
    let delKey = if (Text.startsWith(key, #text "/")) { key } else { "/" # key };
    try {
      await assets.delete_asset({ key = delKey });
      #ok("")
    } catch (e) {
      #err("Asset canister delete failed: " # Error.message(e))
    }
  };

  public query func health() : async Text { "ok" };

  // --- Users ---
  public shared (msg) func create_user(displayName : Text) : async ?User {
    let principal = msg.caller;
    if (Principal.isAnonymous(principal)) { return null };
    switch (pr.get(principalToUserId,principal)) {
      case (?_) { return null }; // already exists
      case null {
        let userId = "u" # Nat.toText(_nextUserId);
        _nextUserId += 1;
        let user = Users.userFromPrincipal(principal, displayName, userId);
        users := txt.put(users,userId, user);
        principalToUserId := pr.put(principalToUserId,principal, userId);
        ?user
      }
    }
  };

  public shared query (msg) func get_me() : async ?User {
    switch (pr.get(principalToUserId,msg.caller)) {
      case (?userId) { txt.get(users,userId) };
      case null { null }
    }
  };

  public shared query (msg) func get_user(userId : Text) : async ?User {
    txt.get(users,userId)
  };

  public shared (msg) func update_display_name(displayName : Text) : async Bool {
    switch (pr.get(principalToUserId,msg.caller)) {
      case (?userId) {
        switch (txt.get(users,userId)) {
          case (?u) {
            let updated = { u with displayName = displayName };
            users := txt.put(users,userId, updated);
            true
          };
          case null { false }
        }
      };
      case null { false }
    }
  };

  public shared (msg) func set_active_group(groupId : ?Text) : async Bool {
    switch (pr.get(principalToUserId,msg.caller)) {
      case (?userId) {
        switch (txt.get(users,userId)) {
          case (?u) {
            switch (groupId) {
              case (?gid) {
                if (Array.find<Text>(u.groupIds, func(x) = x == gid) == null) { return false }
              };
              case null { }
            };
            let updated = { u with activeGroupId = groupId };
            users := txt.put(users,userId, updated);
            true
          };
          case null { false }
        }
      };
      case null { false }
    }
  };

  public shared (msg) func delete_me() : async Bool {
    switch (pr.get(principalToUserId,msg.caller)) {
      case (?userId) {
        users := txt.remove(users, userId).0;
        principalToUserId := pr.remove(principalToUserId, msg.caller).0;
        true
      };
      case null { false }
    }
  };

  // --- Groups ---
  func checkGroupRateLimit() : Bool {
    let now = Time.now();
    let dayNs = 86_400_000_000_000; // nanoseconds per day
    let today = now / dayNs;
    if (today != _groupCreationDay) {
      _groupCreationDay := today;
      _groupsCreatedToday := 0
    };
    _groupsCreatedToday < 100
  };

  public shared (msg) func create_group(
    name : Text,
    email : Text,
    roles : [GroupRole],
    address : ?Text,
    phone : ?Text,
    website : ?Text,
    socialLinks : [SocialLink],
    profilePicturePath : ?Text,
  ) : async ?Group {
    switch (Groups.validateGroup(name, email)) {
      case (?err) { return null };
      case null { }
    };
    switch (website) {
      case (?w) {
        switch (Groups.validateOptionalWebsite(w)) {
          case (?_) { return null };
          case null { };
        }
      };
      case null { };
    };
    switch (Groups.validateSocialLinks(socialLinks)) {
      case (?_) { return null };
      case null { };
    };
    if (not checkGroupRateLimit()) { return null };

    switch (pr.get(principalToUserId,msg.caller)) {
      case (?userId) {
        let groupId = "g" # Nat.toText(_nextGroupId);
        _nextGroupId += 1;
        _groupsCreatedToday += 1;

        let site = switch (website) {
          case (?w) { Groups.normalizeOptionalWebsite(w) };
          case null { null };
        };
        let pic = switch (profilePicturePath) {
          case (?p) { Groups.normalizeOptionalPicturePath(p) };
          case null { null };
        };

        let group : Group = {
          id = groupId;
          name = name;
          email = email;
          userIds = [userId];
          roles = roles;
          address = address;
          phone = phone;
          website = site;
          socialLinks = socialLinks;
          profilePicturePath = pic;
          createdAtNs = Time.now()
        };
        groups := txt.put(groups,groupId, group);

        // Add group to user
        switch (txt.get(users,userId)) {
          case (?u) {
            let newGroupIds = Array.append(u.groupIds, [groupId]);
            let newActive = if (u.activeGroupId == null) { ?groupId } else { u.activeGroupId };
            users := txt.put(users,userId, { u with groupIds = newGroupIds; activeGroupId = newActive })
          };
          case null { }
        };
        ?group
      };
      case null { null }
    }
  };

  public shared query (msg) func get_group(groupId : Text) : async ?Group {
    txt.get(groups,groupId)
  };

  public query func list_groups() : async [Group] {
    Iter.toArray(txt.vals(groups))
  };

  public shared (msg) func update_group(
    groupId : Text,
    name : ?Text,
    email : ?Text,
    address : ?Text,
    phone : ?Text,
    website : ?Text,
    socialLinks : ?[SocialLink],
    profilePicturePath : ?Text,
  ) : async Bool {
    if (not isGroupMember(msg.caller, groupId)) { return false };
    switch (website) {
      case (?w) {
        switch (Groups.validateOptionalWebsite(w)) {
          case (?_) { return false };
          case null { };
        }
      };
      case null { };
    };
    switch (socialLinks) {
      case (?links) {
        switch (Groups.validateSocialLinks(links)) {
          case (?_) { return false };
          case null { };
        }
      };
      case null { };
    };
    switch (txt.get(groups,groupId)) {
      case (?g) {
        let newWebsite = switch (website) {
          case (?w) { Groups.normalizeOptionalWebsite(w) };
          case null { g.website };
        };
        let newSocial = switch (socialLinks) {
          case (?links) { links };
          case null { g.socialLinks };
        };
        let newPic = switch (profilePicturePath) {
          case (?p) { Groups.normalizeOptionalPicturePath(p) };
          case null { g.profilePicturePath };
        };
        let updated = {
          g with
          name = switch (name) { case (?n) n; case null g.name };
          email = switch (email) { case (?e) e; case null g.email };
          address = switch (address) { case (?a) ?a; case null g.address };
          phone = switch (phone) { case (?p) ?p; case null g.phone };
          website = newWebsite;
          socialLinks = newSocial;
          profilePicturePath = newPic;
        };
        groups := txt.put(groups,groupId, updated);
        true
      };
      case null { false }
    }
  };

  public shared (msg) func remove_group(groupId : Text) : async Bool {
    if (not isGroupMember(msg.caller, groupId)) { return false };
    groups := txt.remove(groups, groupId).0;
    true
  };

  func isGroupMember(principal : Principal, groupId : Text) : Bool {
    switch (pr.get(principalToUserId,principal), txt.get(groups,groupId)) {
      case (?userId, ?g) {
        Array.find<Text>(g.userIds, func(x) = x == userId) != null
      };
      case (_, _) { false }
    }
  };

  // --- Resources ---
  public shared (msg) func create_resource(title : Text, description : Text, category : Category, dateRange : ?DateRange) : async ?Resource {
    switch (pr.get(principalToUserId,msg.caller)) {
      case (?userId) {
        switch (txt.get(users,userId)) {
          case (?u) {
            let groupId = switch (u.activeGroupId) {
              case (?gid) gid;
              case null { return null }
            };
            if (not isGroupMember(msg.caller, groupId)) { return null };
            if (Text.size(title) > 80 or Text.size(description) > 500) { return null };

            let id = "r" # Nat.toText(_nextResourceId);
            _nextResourceId += 1;
            let r : Resource = {
              id = id;
              title = title;
              description = description;
              groupId = groupId;
              category = category;
              dateRange = dateRange;
              createdAtNs = Time.now()
            };
            resources := txt.put(resources,id, r);
            ?r
          };
          case null { null }
        }
      };
      case null { null }
    }
  };

  public query func list_resources() : async [Resource] {
    let all = Iter.toArray(txt.vals(resources));
    Array.filter(all, func(r : Resource) : Bool { not Resources.isExpired(r) })
  };

  public shared (msg) func delete_resource(resourceId : Text) : async Bool {
    switch (txt.get(resources,resourceId)) {
      case (?r) {
        if (not isGroupMember(msg.caller, r.groupId)) { return false };
        resources := txt.remove(resources, resourceId).0;
        true
      };
      case null { false }
    }
  };

  // --- Needs ---
  public shared (msg) func create_need(title : Text, description : Text, category : Category, dateRange : ?DateRange) : async ?Need {
    switch (pr.get(principalToUserId,msg.caller)) {
      case (?userId) {
        switch (txt.get(users,userId)) {
          case (?u) {
            let groupId = switch (u.activeGroupId) {
              case (?gid) gid;
              case null { return null }
            };
            if (not isGroupMember(msg.caller, groupId)) { return null };
            if (Text.size(title) > 80 or Text.size(description) > 500) { return null };

            let id = "n" # Nat.toText(_nextNeedId);
            _nextNeedId += 1;
            let n : Need = {
              id = id;
              title = title;
              description = description;
              groupId = groupId;
              category = category;
              dateRange = dateRange;
              createdAtNs = Time.now()
            };
            needs := txt.put(needs,id, n);
            ?n
          };
          case null { null }
        }
      };
      case null { null }
    }
  };

  public query func list_needs() : async [Need] {
    let all = Iter.toArray(txt.vals(needs));
    Array.filter(all, func(n : Need) : Bool { not Needs.isExpired(n) })
  };

  public shared (msg) func delete_need(needId : Text) : async Bool {
    switch (txt.get(needs,needId)) {
      case (?n) {
        if (not isGroupMember(msg.caller, n.groupId)) { return false };
        needs := txt.remove(needs, needId).0;
        true
      };
      case null { false }
    }
  };

  // --- Events ---
  public shared (msg) func create_event(title : Text, dateRange : DateRange, timeRange : Text) : async ?Event {
    switch (pr.get(principalToUserId,msg.caller)) {
      case (?userId) {
        switch (txt.get(users,userId)) {
          case (?u) {
            let groupId = switch (u.activeGroupId) {
              case (?gid) gid;
              case null { return null }
            };
            if (not isGroupMember(msg.caller, groupId)) { return null };

            let id = "e" # Nat.toText(_nextEventId);
            _nextEventId += 1;
            let e : Event = {
              id = id;
              groupId = groupId;
              title = title;
              dateRange = dateRange;
              timeRange = timeRange;
              createdAtNs = Time.now()
            };
            events := txt.put(events,id, e);
            ?e
          };
          case null { null }
        }
      };
      case null { null }
    }
  };

  public query func list_events() : async [Event] {
    Iter.toArray(txt.vals(events))
  };

  public shared (msg) func update_event(eventId : Text, title : ?Text, dateRange : ?DateRange, timeRange : ?Text) : async Bool {
    switch (txt.get(events,eventId)) {
      case (?e) {
        if (AccessControl.isAdmin(admins, msg.caller)) {
          let updated = {
            e with
            title = switch (title) { case (?t) t; case null e.title };
            dateRange = switch (dateRange) { case (?d) d; case null e.dateRange };
            timeRange = switch (timeRange) { case (?t) t; case null e.timeRange }
          };
          events := txt.put(events,eventId, updated);
          true
        } else if (isGroupMember(msg.caller, e.groupId)) {
          let updated = {
            e with
            title = switch (title) { case (?t) t; case null e.title };
            dateRange = switch (dateRange) { case (?d) d; case null e.dateRange };
            timeRange = switch (timeRange) { case (?t) t; case null e.timeRange }
          };
          events := txt.put(events,eventId, updated);
          true
        } else { false }
      };
      case null { false }
    }
  };

  public shared (msg) func delete_event(eventId : Text) : async Bool {
    switch (txt.get(events,eventId)) {
      case (?e) {
        if (AccessControl.isAdmin(admins, msg.caller) or isGroupMember(msg.caller, e.groupId)) {
          events := txt.remove(events, eventId).0;
          true
        } else { false }
      };
      case null { false }
    }
  };

  // --- Join requests ---
  public shared (msg) func request_join_group(groupId : Text) : async ?JoinRequest {
    switch (txt.get(groups,groupId), pr.get(principalToUserId,msg.caller)) {
      case (?g, ?userId) {
        if (Array.find<Text>(g.userIds, func(x) = x == userId) != null) { return null }; // already member

        let id = "j" # Nat.toText(_nextJoinRequestId);
        _nextJoinRequestId += 1;
        let jr = Approval.createJoinRequest(id, userId, groupId, Time.now());
        joinRequests := txt.put(joinRequests,id, jr);

        switch (txt.get(userJoinRequests,userId)) {
          case (?ids) {
            userJoinRequests := txt.put(userJoinRequests,userId, Array.append(ids, [id]))
          };
          case null {
            userJoinRequests := txt.put(userJoinRequests,userId, [id])
          }
        };
        ?jr
      };
      case (_, _) { null }
    }
  };

  public shared (msg) func approve_join_request(requestId : Text) : async Bool {
    switch (txt.get(joinRequests,requestId), pr.get(principalToUserId,msg.caller)) {
      case (?jr, ?approverId) {
        if (jr.status != #pending) { return false };
        if (not isGroupMember(msg.caller, jr.groupId)) { return false };

        switch (txt.get(groups,jr.groupId)) {
          case (?g) {
            let newUserIds = Array.append(g.userIds, [jr.userId]);
            groups := txt.put(groups,jr.groupId, { g with userIds = newUserIds });

            switch (txt.get(users,jr.userId)) {
              case (?u) {
                let newGroupIds = Array.append(u.groupIds, [jr.groupId]);
                let newActive = if (u.activeGroupId == null) { ?jr.groupId } else { u.activeGroupId };
                users := txt.put(users,jr.userId, { u with groupIds = newGroupIds; activeGroupId = newActive })
              };
              case null { }
            };

            joinRequests := txt.put(joinRequests,requestId, { jr with status = #approved; resolvedAtNs = ?Time.now() });
            true
          };
          case null { false }
        }
      };
      case (_, _) { false }
    }
  };

  public shared (msg) func deny_join_request(requestId : Text) : async Bool {
    switch (txt.get(joinRequests,requestId), pr.get(principalToUserId,msg.caller)) {
      case (?jr, ?approverId) {
        if (jr.status != #pending) { return false };
        if (not isGroupMember(msg.caller, jr.groupId)) { return false };
        joinRequests := txt.put(joinRequests,requestId, { jr with status = #denied; resolvedAtNs = ?Time.now() });
        true
      };
      case (_, _) { false }
    }
  };

  public shared query (msg) func get_my_join_requests() : async [JoinRequest] {
    switch (pr.get(principalToUserId,msg.caller)) {
      case (?userId) {
        switch (txt.get(userJoinRequests,userId)) {
          case (?ids) {
            let reqs = Array.mapFilter<Text, JoinRequest>(ids, func(id) = txt.get(joinRequests,id));
            reqs
          };
          case null { [] }
        }
      };
      case null { [] }
    }
  };

  public shared query (msg) func get_pending_join_requests(groupId : Text) : async [JoinRequest] {
    if (not isGroupMember(msg.caller, groupId)) { return [] };
    let all = Iter.toArray(txt.vals(joinRequests));
    Array.filter(all, func(jr : JoinRequest) : Bool {
      jr.groupId == groupId and jr.status == #pending
    })
  };

  // --- Matching ---
  public shared query (msg) func get_matches_for_my_group() : async {
    resourceMatches : [{ resource : Resource; matchingNeeds : [Need] }];
    needMatches : [{ need : Need; matchingResources : [Resource] }]
  } {
    let resourcesList = Array.filter(Iter.toArray(txt.vals(resources)), func(r : Resource) : Bool { not Resources.isExpired(r) });
    let needsList = Array.filter(Iter.toArray(txt.vals(needs)), func(n : Need) : Bool { not Needs.isExpired(n) });

    switch (pr.get(principalToUserId,msg.caller)) {
      case (?userId) {
        switch (txt.get(users,userId)) {
          case (?u) {
            let groupId = switch (u.activeGroupId) {
              case (?gid) gid;
              case null { return { resourceMatches = []; needMatches = [] } };
            };

            let myResources = Array.filter(resourcesList, func(r) = r.groupId == groupId);
            let myNeeds = Array.filter(needsList, func(n) = n.groupId == groupId);

            let resourceMatches = Array.map<Resource, { resource : Resource; matchingNeeds : [Need] }>(myResources, func(r) {
              let matching = Array.filter(needsList, func(n) = Matching.resourcesMatchNeed(r, n));
              { resource = r; matchingNeeds = matching }
            });

            let needMatches = Array.map<Need, { need : Need; matchingResources : [Resource] }>(myNeeds, func(n) {
              let matching = Array.filter(resourcesList, func(r) = Matching.resourcesMatchNeed(r, n));
              { need = n; matchingResources = matching }
            });

            { resourceMatches; needMatches }
          };
          case null { { resourceMatches = []; needMatches = [] } }
        }
      };
      case null { { resourceMatches = []; needMatches = [] } }
    }
  };

  public query func get_global_matches() : async [{ resource : Resource; need : Need }] {
    let resourcesList = Array.filter(Iter.toArray(txt.vals(resources)), func(r : Resource) : Bool { not Resources.isExpired(r) });
    let needsList = Array.filter(Iter.toArray(txt.vals(needs)), func(n : Need) : Bool { not Needs.isExpired(n) });

    let buf = Buffer.Buffer<{ resource : Resource; need : Need }>(50);
    for (r in resourcesList.vals()) {
      for (n in needsList.vals()) {
        if (Matching.resourcesMatchNeed(r, n)) {
          buf.add({ resource = r; need = n })
        }
      }
    };
    Buffer.toArray(buf)
  };

  // --- Admin ---
  public shared query (msg) func is_admin() : async Bool {
    AccessControl.isAdmin(admins, msg.caller)
  };

  public shared (msg) func suspend_user(userId : Text) : async Bool {
    if (not AccessControl.isAdmin(admins, msg.caller)) { return false };
    switch (txt.get(users,userId)) {
      case (?u) {
        users := txt.put(users,userId, { u with suspended = true });
        true
      };
      case null { false }
    }
  };

  public shared (msg) func unsuspend_user(userId : Text) : async Bool {
    if (not AccessControl.isAdmin(admins, msg.caller)) { return false };
    switch (txt.get(users,userId)) {
      case (?u) {
        users := txt.put(users,userId, { u with suspended = false });
        true
      };
      case null { false }
    }
  };

  public shared query (msg) func list_all_users() : async [User] {
    if (not AccessControl.isAdmin(admins, msg.caller)) { return [] };
    Iter.toArray(txt.vals(users))
  };

  public shared (msg) func admin_remove_group(groupId : Text) : async Bool {
    if (not AccessControl.isAdmin(admins, msg.caller)) { return false };
    groups := txt.remove(groups, groupId).0;
    true
  };

  public shared (msg) func admin_update_group(
    groupId : Text,
    name : ?Text,
    email : ?Text,
    address : ?Text,
    phone : ?Text,
    website : ?Text,
    socialLinks : ?[SocialLink],
    profilePicturePath : ?Text,
  ) : async Bool {
    if (not AccessControl.isAdmin(admins, msg.caller)) { return false };
    switch (website) {
      case (?w) {
        switch (Groups.validateOptionalWebsite(w)) {
          case (?_) { return false };
          case null { };
        }
      };
      case null { };
    };
    switch (socialLinks) {
      case (?links) {
        switch (Groups.validateSocialLinks(links)) {
          case (?_) { return false };
          case null { };
        }
      };
      case null { };
    };
    switch (txt.get(groups,groupId)) {
      case (?g) {
        let newWebsite = switch (website) {
          case (?w) { Groups.normalizeOptionalWebsite(w) };
          case null { g.website };
        };
        let newSocial = switch (socialLinks) {
          case (?links) { links };
          case null { g.socialLinks };
        };
        let newPic = switch (profilePicturePath) {
          case (?p) { Groups.normalizeOptionalPicturePath(p) };
          case null { g.profilePicturePath };
        };
        let updated = {
          g with
          name = switch (name) { case (?n) n; case null g.name };
          email = switch (email) { case (?e) e; case null g.email };
          address = switch (address) { case (?a) ?a; case null g.address };
          phone = switch (phone) { case (?p) ?p; case null g.phone };
          website = newWebsite;
          socialLinks = newSocial;
          profilePicturePath = newPic;
        };
        groups := txt.put(groups,groupId, updated);
        true
      };
      case null { false }
    }
  };
};
