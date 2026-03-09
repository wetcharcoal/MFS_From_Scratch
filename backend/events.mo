// Event helpers - validation
// State lives in main.mo

import Types "types";

module {
  public func validateEvent(title : Text) : ?Text {
    if (title == "") { return ?"Title required" };
    null
  };
};
