// User helpers - type conversions and validation
// State lives in main.mo

import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Types "types";

module {
  public func userFromPrincipal(principal : Principal, displayName : Text, userId : Text) : Types.User {
    {
      id = userId;
      principal = principal;
      displayName = displayName;
      groupIds = [];
      activeGroupId = null;
      suspended = false
    }
  };
};
