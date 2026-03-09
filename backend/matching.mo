// Matching logic: same category; date overlap only when both have dateRange

import Types "types";
import Time "mo:base/Time";

module {
  public func resourcesMatchNeed(resource : Types.Resource, need : Types.Need) : Bool {
    if (resource.groupId == need.groupId) { return false }; // same group, no match
    if (resource.category != need.category) { return false };

    switch (resource.dateRange, need.dateRange) {
      case (null, null) { true };
      case (?_, null) { true };
      case (null, ?_) { true };
      case (?drR, ?drN) {
        // Both have date ranges - check overlap
        drR.startNs <= drN.endNs and drR.endNs >= drN.startNs
      }
    }
  };

  public func needsMatchResource(need : Types.Need, resource : Types.Resource) : Bool {
    resourcesMatchNeed(resource, need)
  };
};
