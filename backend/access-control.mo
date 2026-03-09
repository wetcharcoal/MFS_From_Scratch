// Access control - admin role checks
// State lives in main.mo

import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";

module {
  public type AdminSet = HashMap.HashMap<Principal, ()>;

  public func createAdminSet() : AdminSet {
    HashMap.HashMap<Principal, ()>(10, Principal.equal, Principal.hash)
  };

  public func addAdmin(admins : AdminSet, principal : Principal) : () {
    admins.put(principal, ())
  };

  public func isAdmin(admins : AdminSet, principal : Principal) : Bool {
    switch (admins.get(principal)) { case (?_) true; case null false }
  };
};
