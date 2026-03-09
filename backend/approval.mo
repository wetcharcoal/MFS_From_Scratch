// Approval helpers - join request validation
// State lives in main.mo

import Types "types";

module {
  public type JoinRequestStatus = Types.JoinRequest;

  public func createJoinRequest(id : Text, userId : Text, groupId : Text, nowNs : Int) : Types.JoinRequest {
    {
      id = id;
      userId = userId;
      groupId = groupId;
      status = #pending;
      createdAtNs = nowNs;
      resolvedAtNs = null
    }
  };
};
