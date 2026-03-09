// A Seed ICP Exchange Platform - Main canister

import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";

import AccessControl "access-control";
import Approval "approval";
import Groups "groups";
import Matching "matching";
import Needs "needs";
import Resources "resources";
import Types "types";
import Users "users";

persistent actor Main {
  type Category = Types.Category;
  type DateRange = Types.DateRange;
  type Event = Types.Event;
  type Group = Types.Group;
  type GroupRole = Types.GroupRole;
  type JoinRequest = Types.JoinRequest;
  type Need = Types.Need;
  type Resource = Types.Resource;
  type User = Types.User;

  // Stable storage (simplified - full upgrade in Phase 5)
  private stable var _nextUserId : Nat = 0;
  private stable var _nextGroupId : Nat = 0;
  private stable var _nextResourceId : Nat = 0;
  private stable var _nextNeedId : Nat = 0;
  private stable var _nextEventId : Nat = 0;
  private stable var _nextJoinRequestId : Nat = 0;
  private stable var _groupCreationDay : Int = 0;
  private stable var _groupsCreatedToday : Nat = 0;

  private transient let admins = AccessControl.createAdminSet();

  private transient let users = HashMap.HashMap<Text, User>(50, Text.equal, Text.hash);
  private transient let principalToUserId = HashMap.HashMap<Principal, Text>(50, Principal.equal, Principal.hash);
  private transient let groups = HashMap.HashMap<Text, Group>(50, Text.equal, Text.hash);
  private transient let resources = HashMap.HashMap<Text, Resource>(100, Text.equal, Text.hash);
  private transient let needs = HashMap.HashMap<Text, Need>(100, Text.equal, Text.hash);
  private transient let events = HashMap.HashMap<Text, Event>(50, Text.equal, Text.hash);
  private transient let joinRequests = HashMap.HashMap<Text, JoinRequest>(50, Text.equal, Text.hash);
  private transient let userJoinRequests = HashMap.HashMap<Text, [Text]>(50, Text.equal, Text.hash); // userId -> [requestIds]

  // Admin: assign role. Callable by: (1) existing admins, or (2) when admins empty, by any authenticated user (first-caller becomes admin - deployer should call this immediately after deploy)
  public shared (msg) func assign_role(principal : Principal) : async Bool {
    let caller = msg.caller;
    if (Principal.isAnonymous(caller)) { return false };
    if (AccessControl.isAdmin(admins, caller)) {
      AccessControl.addAdmin(admins, principal);
      return true
    };
    // When no admins yet: first caller adds themselves (principal must equal caller)
    if (admins.size() == 0 and principal == caller) {
      AccessControl.addAdmin(admins, principal);
      return true
    };
    false
  };

  public query func health() : async Text { "ok" };

  // --- Users ---
  public shared (msg) func create_user(displayName : Text) : async ?User {
    let principal = msg.caller;
    if (Principal.isAnonymous(principal)) { return null };
    switch (principalToUserId.get(principal)) {
      case (?_) { return null }; // already exists
      case null {
        let userId = "u" # Nat.toText(_nextUserId);
        _nextUserId += 1;
        let user = Users.userFromPrincipal(principal, displayName, userId);
        users.put(userId, user);
        principalToUserId.put(principal, userId);
        ?user
      }
    }
  };

  public shared query (msg) func get_me() : async ?User {
    switch (principalToUserId.get(msg.caller)) {
      case (?userId) { users.get(userId) };
      case null { null }
    }
  };

  public shared query (msg) func get_user(userId : Text) : async ?User {
    users.get(userId)
  };

  public shared (msg) func update_display_name(displayName : Text) : async Bool {
    switch (principalToUserId.get(msg.caller)) {
      case (?userId) {
        switch (users.get(userId)) {
          case (?u) {
            let updated = { u with displayName = displayName };
            users.put(userId, updated);
            true
          };
          case null { false }
        }
      };
      case null { false }
    }
  };

  public shared (msg) func set_active_group(groupId : ?Text) : async Bool {
    switch (principalToUserId.get(msg.caller)) {
      case (?userId) {
        switch (users.get(userId)) {
          case (?u) {
            switch (groupId) {
              case (?gid) {
                if (Array.find<Text>(u.groupIds, func(x) = x == gid) == null) { return false }
              };
              case null { }
            };
            let updated = { u with activeGroupId = groupId };
            users.put(userId, updated);
            true
          };
          case null { false }
        }
      };
      case null { false }
    }
  };

  public shared (msg) func delete_me() : async Bool {
    switch (principalToUserId.get(msg.caller)) {
      case (?userId) {
        users.delete(userId);
        principalToUserId.delete(msg.caller);
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

  public shared (msg) func create_group(name : Text, email : Text, roles : [GroupRole], address : ?Text, phone : ?Text) : async ?Group {
    switch (Groups.validateGroup(name, email)) {
      case (?err) { return null };
      case null { }
    };
    if (not checkGroupRateLimit()) { return null };

    switch (principalToUserId.get(msg.caller)) {
      case (?userId) {
        let groupId = "g" # Nat.toText(_nextGroupId);
        _nextGroupId += 1;
        _groupsCreatedToday += 1;

        let group : Group = {
          id = groupId;
          name = name;
          email = email;
          userIds = [userId];
          roles = roles;
          address = address;
          phone = phone;
          createdAtNs = Time.now()
        };
        groups.put(groupId, group);

        // Add group to user
        switch (users.get(userId)) {
          case (?u) {
            let newGroupIds = Array.append(u.groupIds, [groupId]);
            let newActive = if (u.activeGroupId == null) { ?groupId } else { u.activeGroupId };
            users.put(userId, { u with groupIds = newGroupIds; activeGroupId = newActive })
          };
          case null { }
        };
        ?group
      };
      case null { null }
    }
  };

  public shared query (msg) func get_group(groupId : Text) : async ?Group {
    groups.get(groupId)
  };

  public query func list_groups() : async [Group] {
    Iter.toArray(groups.vals())
  };

  public shared (msg) func update_group(groupId : Text, name : ?Text, email : ?Text, address : ?Text, phone : ?Text) : async Bool {
    if (not isGroupMember(msg.caller, groupId)) { return false };
    switch (groups.get(groupId)) {
      case (?g) {
        let updated = {
          g with
          name = switch (name) { case (?n) n; case null g.name };
          email = switch (email) { case (?e) e; case null g.email };
          address = switch (address) { case (?a) ?a; case null g.address };
          phone = switch (phone) { case (?p) ?p; case null g.phone }
        };
        groups.put(groupId, updated);
        true
      };
      case null { false }
    }
  };

  public shared (msg) func remove_group(groupId : Text) : async Bool {
    if (not isGroupMember(msg.caller, groupId)) { return false };
    groups.delete(groupId);
    true
  };

  func isGroupMember(principal : Principal, groupId : Text) : Bool {
    switch (principalToUserId.get(principal), groups.get(groupId)) {
      case (?userId, ?g) {
        Array.find<Text>(g.userIds, func(x) = x == userId) != null
      };
      case (_, _) { false }
    }
  };

  // --- Resources ---
  public shared (msg) func create_resource(title : Text, description : Text, category : Category, dateRange : ?DateRange) : async ?Resource {
    switch (principalToUserId.get(msg.caller)) {
      case (?userId) {
        switch (users.get(userId)) {
          case (?u) {
            let groupId = switch (u.activeGroupId) {
              case (?gid) gid;
              case null { return null }
            };
            if (not isGroupMember(msg.caller, groupId)) { return null };

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
            resources.put(id, r);
            ?r
          };
          case null { null }
        }
      };
      case null { null }
    }
  };

  public query func list_resources() : async [Resource] {
    let all = Iter.toArray(resources.vals());
    Array.filter(all, func(r : Resource) : Bool { not Resources.isExpired(r) })
  };

  public shared (msg) func delete_resource(resourceId : Text) : async Bool {
    switch (resources.get(resourceId)) {
      case (?r) {
        if (not isGroupMember(msg.caller, r.groupId)) { return false };
        resources.delete(resourceId);
        true
      };
      case null { false }
    }
  };

  // --- Needs ---
  public shared (msg) func create_need(title : Text, description : Text, category : Category, dateRange : ?DateRange) : async ?Need {
    switch (principalToUserId.get(msg.caller)) {
      case (?userId) {
        switch (users.get(userId)) {
          case (?u) {
            let groupId = switch (u.activeGroupId) {
              case (?gid) gid;
              case null { return null }
            };
            if (not isGroupMember(msg.caller, groupId)) { return null };

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
            needs.put(id, n);
            ?n
          };
          case null { null }
        }
      };
      case null { null }
    }
  };

  public query func list_needs() : async [Need] {
    let all = Iter.toArray(needs.vals());
    Array.filter(all, func(n : Need) : Bool { not Needs.isExpired(n) })
  };

  public shared (msg) func delete_need(needId : Text) : async Bool {
    switch (needs.get(needId)) {
      case (?n) {
        if (not isGroupMember(msg.caller, n.groupId)) { return false };
        needs.delete(needId);
        true
      };
      case null { false }
    }
  };

  // --- Events ---
  public shared (msg) func create_event(title : Text, dateRange : DateRange, timeRange : Text) : async ?Event {
    switch (principalToUserId.get(msg.caller)) {
      case (?userId) {
        switch (users.get(userId)) {
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
            events.put(id, e);
            ?e
          };
          case null { null }
        }
      };
      case null { null }
    }
  };

  public query func list_events() : async [Event] {
    Iter.toArray(events.vals())
  };

  public shared (msg) func update_event(eventId : Text, title : ?Text, dateRange : ?DateRange, timeRange : ?Text) : async Bool {
    switch (events.get(eventId)) {
      case (?e) {
        if (AccessControl.isAdmin(admins, msg.caller)) {
          let updated = {
            e with
            title = switch (title) { case (?t) t; case null e.title };
            dateRange = switch (dateRange) { case (?d) d; case null e.dateRange };
            timeRange = switch (timeRange) { case (?t) t; case null e.timeRange }
          };
          events.put(eventId, updated);
          true
        } else if (isGroupMember(msg.caller, e.groupId)) {
          let updated = {
            e with
            title = switch (title) { case (?t) t; case null e.title };
            dateRange = switch (dateRange) { case (?d) d; case null e.dateRange };
            timeRange = switch (timeRange) { case (?t) t; case null e.timeRange }
          };
          events.put(eventId, updated);
          true
        } else { false }
      };
      case null { false }
    }
  };

  public shared (msg) func delete_event(eventId : Text) : async Bool {
    switch (events.get(eventId)) {
      case (?e) {
        AccessControl.isAdmin(admins, msg.caller) or isGroupMember(msg.caller, e.groupId)
      };
      case null { false }
    }
  };

  // --- Join requests ---
  public shared (msg) func request_join_group(groupId : Text) : async ?JoinRequest {
    switch (groups.get(groupId), principalToUserId.get(msg.caller)) {
      case (?g, ?userId) {
        if (Array.find<Text>(g.userIds, func(x) = x == userId) != null) { return null }; // already member

        let id = "j" # Nat.toText(_nextJoinRequestId);
        _nextJoinRequestId += 1;
        let jr = Approval.createJoinRequest(id, userId, groupId, Time.now());
        joinRequests.put(id, jr);

        switch (userJoinRequests.get(userId)) {
          case (?ids) {
            userJoinRequests.put(userId, Array.append(ids, [id]))
          };
          case null {
            userJoinRequests.put(userId, [id])
          }
        };
        ?jr
      };
      case (_, _) { null }
    }
  };

  public shared (msg) func approve_join_request(requestId : Text) : async Bool {
    switch (joinRequests.get(requestId), principalToUserId.get(msg.caller)) {
      case (?jr, ?approverId) {
        if (jr.status != #pending) { return false };
        if (not isGroupMember(msg.caller, jr.groupId)) { return false };

        switch (groups.get(jr.groupId)) {
          case (?g) {
            let newUserIds = Array.append(g.userIds, [jr.userId]);
            groups.put(jr.groupId, { g with userIds = newUserIds });

            switch (users.get(jr.userId)) {
              case (?u) {
                let newGroupIds = Array.append(u.groupIds, [jr.groupId]);
                let newActive = if (u.activeGroupId == null) { ?jr.groupId } else { u.activeGroupId };
                users.put(jr.userId, { u with groupIds = newGroupIds; activeGroupId = newActive })
              };
              case null { }
            };

            joinRequests.put(requestId, { jr with status = #approved; resolvedAtNs = ?Time.now() });
            true
          };
          case null { false }
        }
      };
      case (_, _) { false }
    }
  };

  public shared (msg) func deny_join_request(requestId : Text) : async Bool {
    switch (joinRequests.get(requestId), principalToUserId.get(msg.caller)) {
      case (?jr, ?approverId) {
        if (jr.status != #pending) { return false };
        if (not isGroupMember(msg.caller, jr.groupId)) { return false };
        joinRequests.put(requestId, { jr with status = #denied; resolvedAtNs = ?Time.now() });
        true
      };
      case (_, _) { false }
    }
  };

  public shared query (msg) func get_my_join_requests() : async [JoinRequest] {
    switch (principalToUserId.get(msg.caller)) {
      case (?userId) {
        switch (userJoinRequests.get(userId)) {
          case (?ids) {
            let reqs = Array.mapFilter<Text, JoinRequest>(ids, func(id) = joinRequests.get(id));
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
    let all = Iter.toArray(joinRequests.vals());
    Array.filter(all, func(jr : JoinRequest) : Bool {
      jr.groupId == groupId and jr.status == #pending
    })
  };

  // --- Matching ---
  public shared query (msg) func get_matches_for_my_group() : async {
    resourceMatches : [{ resource : Resource; matchingNeeds : [Need] }];
    needMatches : [{ need : Need; matchingResources : [Resource] }]
  } {
    let resourcesList = Array.filter(Iter.toArray(resources.vals()), func(r : Resource) : Bool { not Resources.isExpired(r) });
    let needsList = Array.filter(Iter.toArray(needs.vals()), func(n : Need) : Bool { not Needs.isExpired(n) });

    switch (principalToUserId.get(msg.caller)) {
      case (?userId) {
        switch (users.get(userId)) {
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
    let resourcesList = Array.filter(Iter.toArray(resources.vals()), func(r : Resource) : Bool { not Resources.isExpired(r) });
    let needsList = Array.filter(Iter.toArray(needs.vals()), func(n : Need) : Bool { not Needs.isExpired(n) });

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
  public shared (msg) func suspend_user(userId : Text) : async Bool {
    if (not AccessControl.isAdmin(admins, msg.caller)) { return false };
    switch (users.get(userId)) {
      case (?u) {
        users.put(userId, { u with suspended = true });
        true
      };
      case null { false }
    }
  };

  public shared (msg) func unsuspend_user(userId : Text) : async Bool {
    if (not AccessControl.isAdmin(admins, msg.caller)) { return false };
    switch (users.get(userId)) {
      case (?u) {
        users.put(userId, { u with suspended = false });
        true
      };
      case null { false }
    }
  };

  public shared query (msg) func list_all_users() : async [User] {
    if (not AccessControl.isAdmin(admins, msg.caller)) { return [] };
    Iter.toArray(users.vals())
  };

  public shared (msg) func admin_remove_group(groupId : Text) : async Bool {
    if (not AccessControl.isAdmin(admins, msg.caller)) { return false };
    groups.delete(groupId);
    true
  };

  public shared (msg) func admin_update_group(groupId : Text, name : ?Text, email : ?Text, address : ?Text, phone : ?Text) : async Bool {
    if (not AccessControl.isAdmin(admins, msg.caller)) { return false };
    switch (groups.get(groupId)) {
      case (?g) {
        let updated = {
          g with
          name = switch (name) { case (?n) n; case null g.name };
          email = switch (email) { case (?e) e; case null g.email };
          address = switch (address) { case (?a) ?a; case null g.address };
          phone = switch (phone) { case (?p) ?p; case null g.phone }
        };
        groups.put(groupId, updated);
        true
      };
      case null { false }
    }
  };
};
