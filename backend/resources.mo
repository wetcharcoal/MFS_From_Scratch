// Resource helpers - category, expiry
// State lives in main.mo

import Types "types";
import Time "mo:base/Time";

module {
  public func isExpired(r : Types.Resource) : Bool {
    switch (r.dateRange) {
      case null { false };
      case (?dr) { dr.endNs < Time.now() }
    }
  };

  public func categoryToText(c : Types.Category) : Text {
    switch c {
      case (#FoodDrink) "Food/drink";
      case (#StorageSpace) "Storage space";
      case (#KitchenSpace) "Kitchen space";
      case (#DistributionSpace) "Distribution space";
      case (#Equipment) "Equipment";
      case (#Publicity) "Publicity";
      case (#EventSpace) "Event Space";
      case (#Other) "Other"
    }
  };
};
