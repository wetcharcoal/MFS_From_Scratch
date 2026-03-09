export const idlFactory = ({ IDL }) => {
  const DateRange = IDL.Record({ 'startNs' : IDL.Int, 'endNs' : IDL.Int });
  const Event = IDL.Record({
    'id' : IDL.Text,
    'title' : IDL.Text,
    'createdAtNs' : IDL.Int,
    'groupId' : IDL.Text,
    'timeRange' : IDL.Text,
    'dateRange' : DateRange,
  });
  const GroupRole = IDL.Variant({
    'production' : IDL.Null,
    'educationInformation' : IDL.Null,
    'equipmentSpace' : IDL.Null,
    'wasteManagement' : IDL.Null,
    'processing' : IDL.Null,
    'distribution' : IDL.Null,
  });
  const Group = IDL.Record({
    'id' : IDL.Text,
    'name' : IDL.Text,
    'createdAtNs' : IDL.Int,
    'userIds' : IDL.Vec(IDL.Text),
    'email' : IDL.Text,
    'address' : IDL.Opt(IDL.Text),
    'phone' : IDL.Opt(IDL.Text),
    'roles' : IDL.Vec(GroupRole),
  });
  const Category = IDL.Variant({
    'DistributionSpace' : IDL.Null,
    'KitchenSpace' : IDL.Null,
    'Other' : IDL.Null,
    'Equipment' : IDL.Null,
    'Publicity' : IDL.Null,
    'StorageSpace' : IDL.Null,
    'FoodDrink' : IDL.Null,
    'EventSpace' : IDL.Null,
  });
  const Need = IDL.Record({
    'id' : IDL.Text,
    'title' : IDL.Text,
    'createdAtNs' : IDL.Int,
    'description' : IDL.Text,
    'groupId' : IDL.Text,
    'category' : Category,
    'dateRange' : IDL.Opt(DateRange),
  });
  const Resource = IDL.Record({
    'id' : IDL.Text,
    'title' : IDL.Text,
    'createdAtNs' : IDL.Int,
    'description' : IDL.Text,
    'groupId' : IDL.Text,
    'category' : Category,
    'dateRange' : IDL.Opt(DateRange),
  });
  const User = IDL.Record({
    'id' : IDL.Text,
    'principal' : IDL.Principal,
    'displayName' : IDL.Text,
    'activeGroupId' : IDL.Opt(IDL.Text),
    'groupIds' : IDL.Vec(IDL.Text),
    'suspended' : IDL.Bool,
  });
  const JoinRequest = IDL.Record({
    'id' : IDL.Text,
    'status' : IDL.Variant({
      'pending' : IDL.Null,
      'denied' : IDL.Null,
      'approved' : IDL.Null,
    }),
    'userId' : IDL.Text,
    'createdAtNs' : IDL.Int,
    'resolvedAtNs' : IDL.Opt(IDL.Int),
    'groupId' : IDL.Text,
  });
  return IDL.Service({
    'admin_remove_group' : IDL.Func([IDL.Text], [IDL.Bool], []),
    'admin_update_group' : IDL.Func(
        [
          IDL.Text,
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
        ],
        [IDL.Bool],
        [],
      ),
    'approve_join_request' : IDL.Func([IDL.Text], [IDL.Bool], []),
    'assign_role' : IDL.Func([IDL.Principal], [IDL.Bool], []),
    'create_event' : IDL.Func(
        [IDL.Text, DateRange, IDL.Text],
        [IDL.Opt(Event)],
        [],
      ),
    'create_group' : IDL.Func(
        [
          IDL.Text,
          IDL.Text,
          IDL.Vec(GroupRole),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
        ],
        [IDL.Opt(Group)],
        [],
      ),
    'create_need' : IDL.Func(
        [IDL.Text, IDL.Text, Category, IDL.Opt(DateRange)],
        [IDL.Opt(Need)],
        [],
      ),
    'create_resource' : IDL.Func(
        [IDL.Text, IDL.Text, Category, IDL.Opt(DateRange)],
        [IDL.Opt(Resource)],
        [],
      ),
    'create_user' : IDL.Func([IDL.Text], [IDL.Opt(User)], []),
    'delete_event' : IDL.Func([IDL.Text], [IDL.Bool], []),
    'delete_me' : IDL.Func([], [IDL.Bool], []),
    'delete_need' : IDL.Func([IDL.Text], [IDL.Bool], []),
    'delete_resource' : IDL.Func([IDL.Text], [IDL.Bool], []),
    'deny_join_request' : IDL.Func([IDL.Text], [IDL.Bool], []),
    'get_global_matches' : IDL.Func(
        [],
        [IDL.Vec(IDL.Record({ 'resource' : Resource, 'need' : Need }))],
        ['query'],
      ),
    'get_group' : IDL.Func([IDL.Text], [IDL.Opt(Group)], ['query']),
    'get_matches_for_my_group' : IDL.Func(
        [],
        [
          IDL.Record({
            'needMatches' : IDL.Vec(
              IDL.Record({
                'need' : Need,
                'matchingResources' : IDL.Vec(Resource),
              })
            ),
            'resourceMatches' : IDL.Vec(
              IDL.Record({
                'resource' : Resource,
                'matchingNeeds' : IDL.Vec(Need),
              })
            ),
          }),
        ],
        ['query'],
      ),
    'get_me' : IDL.Func([], [IDL.Opt(User)], ['query']),
    'get_my_join_requests' : IDL.Func([], [IDL.Vec(JoinRequest)], ['query']),
    'get_pending_join_requests' : IDL.Func(
        [IDL.Text],
        [IDL.Vec(JoinRequest)],
        ['query'],
      ),
    'get_user' : IDL.Func([IDL.Text], [IDL.Opt(User)], ['query']),
    'health' : IDL.Func([], [IDL.Text], ['query']),
    'list_all_users' : IDL.Func([], [IDL.Vec(User)], ['query']),
    'list_events' : IDL.Func([], [IDL.Vec(Event)], ['query']),
    'list_groups' : IDL.Func([], [IDL.Vec(Group)], ['query']),
    'list_needs' : IDL.Func([], [IDL.Vec(Need)], ['query']),
    'list_resources' : IDL.Func([], [IDL.Vec(Resource)], ['query']),
    'remove_group' : IDL.Func([IDL.Text], [IDL.Bool], []),
    'request_join_group' : IDL.Func([IDL.Text], [IDL.Opt(JoinRequest)], []),
    'set_active_group' : IDL.Func([IDL.Opt(IDL.Text)], [IDL.Bool], []),
    'suspend_user' : IDL.Func([IDL.Text], [IDL.Bool], []),
    'unsuspend_user' : IDL.Func([IDL.Text], [IDL.Bool], []),
    'update_display_name' : IDL.Func([IDL.Text], [IDL.Bool], []),
    'update_event' : IDL.Func(
        [IDL.Text, IDL.Opt(IDL.Text), IDL.Opt(DateRange), IDL.Opt(IDL.Text)],
        [IDL.Bool],
        [],
      ),
    'update_group' : IDL.Func(
        [
          IDL.Text,
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
        ],
        [IDL.Bool],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
