// Shared types for A Seed canister

module {
  public type Category = {
    #FoodDrink;
    #StorageSpace;
    #KitchenSpace;
    #DistributionSpace;
    #Equipment;
    #Publicity;
    #EventSpace;
    #Other;
  };

  public type GroupRole = {
    #production;
    #processing;
    #distribution;
    #wasteManagement;
    #educationInformation;
    #equipmentSpace;
  };

  public type DateRange = {
    startNs : Int; // nanoseconds since epoch
    endNs : Int;
  };

  public type Resource = {
    id : Text;
    title : Text;
    description : Text;
    groupId : Text;
    category : Category;
    dateRange : ?DateRange;
    createdAtNs : Int;
  };

  public type Need = {
    id : Text;
    title : Text;
    description : Text;
    groupId : Text;
    category : Category;
    dateRange : ?DateRange;
    createdAtNs : Int;
  };

  public type User = {
    id : Text;
    principal : Principal;
    displayName : Text;
    groupIds : [Text];
    activeGroupId : ?Text;
    suspended : Bool;
  };

  public type Group = {
    id : Text;
    name : Text;
    email : Text;
    userIds : [Text];
    roles : [GroupRole];
    address : ?Text;
    phone : ?Text;
    createdAtNs : Int;
  };

  public type Event = {
    id : Text;
    groupId : Text;
    title : Text;
    dateRange : DateRange;
    timeRange : Text; // e.g. "09:00-17:00"
    createdAtNs : Int;
  };

  public type JoinRequest = {
    id : Text;
    userId : Text;
    groupId : Text;
    status : {
      #pending;
      #approved;
      #denied;
    };
    createdAtNs : Int;
    resolvedAtNs : ?Int;
  };
};
