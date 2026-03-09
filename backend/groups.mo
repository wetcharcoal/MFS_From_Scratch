// Group helpers - validation
// State lives in main.mo

import Types "types";

module {
  public func validateGroup(name : Text, email : Text) : ?Text {
    if (name == "") { return ?"Name required" };
    if (email == "") { return ?"Email required" };
    null
  };
};
