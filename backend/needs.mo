// Need helpers - expiry check
// State lives in main.mo

import Types "types";
import Time "mo:base/Time";

module {
  public func isExpired(n : Types.Need) : Bool {
    switch (n.dateRange) {
      case null { false };
      case (?dr) { dr.endNs < Time.now() }
    }
  };
};
