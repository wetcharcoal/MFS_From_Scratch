// Access control - admin role checks
// State lives in main.mo (stable OrderedMap for upgrade persistence).

import OrderedMap "mo:base/OrderedMap";
import Principal "mo:base/Principal";

module {
  public type AdminSet = OrderedMap.Map<Principal, Bool>;

  func ops() : OrderedMap.Operations<Principal> {
    OrderedMap.Make<Principal>(Principal.compare)
  };

  public func createAdminSet() : AdminSet {
    ops().empty<Bool>()
  };

  public func addAdmin(admins : AdminSet, principal : Principal) : AdminSet {
    ops().put(admins, principal, true)
  };

  public func isAdmin(admins : AdminSet, principal : Principal) : Bool {
    switch (ops().get(admins, principal)) { case (?true) true; case _ false }
  };
};
