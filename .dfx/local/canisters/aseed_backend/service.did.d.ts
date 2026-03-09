import type { Principal } from '@icp-sdk/core/principal';
import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';

export type Category = { 'DistributionSpace' : null } |
  { 'KitchenSpace' : null } |
  { 'Other' : null } |
  { 'Equipment' : null } |
  { 'Publicity' : null } |
  { 'StorageSpace' : null } |
  { 'FoodDrink' : null } |
  { 'EventSpace' : null };
export interface DateRange { 'startNs' : bigint, 'endNs' : bigint }
export interface Event {
  'id' : string,
  'title' : string,
  'createdAtNs' : bigint,
  'groupId' : string,
  'timeRange' : string,
  'dateRange' : DateRange,
}
export interface Group {
  'id' : string,
  'name' : string,
  'createdAtNs' : bigint,
  'userIds' : Array<string>,
  'email' : string,
  'address' : [] | [string],
  'phone' : [] | [string],
  'roles' : Array<GroupRole>,
}
export type GroupRole = { 'production' : null } |
  { 'educationInformation' : null } |
  { 'equipmentSpace' : null } |
  { 'wasteManagement' : null } |
  { 'processing' : null } |
  { 'distribution' : null };
export interface JoinRequest {
  'id' : string,
  'status' : { 'pending' : null } |
    { 'denied' : null } |
    { 'approved' : null },
  'userId' : string,
  'createdAtNs' : bigint,
  'resolvedAtNs' : [] | [bigint],
  'groupId' : string,
}
export interface Need {
  'id' : string,
  'title' : string,
  'createdAtNs' : bigint,
  'description' : string,
  'groupId' : string,
  'category' : Category,
  'dateRange' : [] | [DateRange],
}
export interface Resource {
  'id' : string,
  'title' : string,
  'createdAtNs' : bigint,
  'description' : string,
  'groupId' : string,
  'category' : Category,
  'dateRange' : [] | [DateRange],
}
export interface User {
  'id' : string,
  'principal' : Principal,
  'displayName' : string,
  'activeGroupId' : [] | [string],
  'groupIds' : Array<string>,
  'suspended' : boolean,
}
export interface _SERVICE {
  'admin_remove_group' : ActorMethod<[string], boolean>,
  'admin_update_group' : ActorMethod<
    [string, [] | [string], [] | [string], [] | [string], [] | [string]],
    boolean
  >,
  'approve_join_request' : ActorMethod<[string], boolean>,
  'assign_role' : ActorMethod<[Principal], boolean>,
  'create_event' : ActorMethod<[string, DateRange, string], [] | [Event]>,
  'create_group' : ActorMethod<
    [string, string, Array<GroupRole>, [] | [string], [] | [string]],
    [] | [Group]
  >,
  'create_need' : ActorMethod<
    [string, string, Category, [] | [DateRange]],
    [] | [Need]
  >,
  'create_resource' : ActorMethod<
    [string, string, Category, [] | [DateRange]],
    [] | [Resource]
  >,
  'create_user' : ActorMethod<[string], [] | [User]>,
  'delete_event' : ActorMethod<[string], boolean>,
  'delete_me' : ActorMethod<[], boolean>,
  'delete_need' : ActorMethod<[string], boolean>,
  'delete_resource' : ActorMethod<[string], boolean>,
  'deny_join_request' : ActorMethod<[string], boolean>,
  'get_global_matches' : ActorMethod<
    [],
    Array<{ 'resource' : Resource, 'need' : Need }>
  >,
  'get_group' : ActorMethod<[string], [] | [Group]>,
  'get_matches_for_my_group' : ActorMethod<
    [],
    {
      'needMatches' : Array<
        { 'need' : Need, 'matchingResources' : Array<Resource> }
      >,
      'resourceMatches' : Array<
        { 'resource' : Resource, 'matchingNeeds' : Array<Need> }
      >,
    }
  >,
  'get_me' : ActorMethod<[], [] | [User]>,
  'get_my_join_requests' : ActorMethod<[], Array<JoinRequest>>,
  'get_pending_join_requests' : ActorMethod<[string], Array<JoinRequest>>,
  'get_user' : ActorMethod<[string], [] | [User]>,
  'health' : ActorMethod<[], string>,
  'list_all_users' : ActorMethod<[], Array<User>>,
  'list_events' : ActorMethod<[], Array<Event>>,
  'list_groups' : ActorMethod<[], Array<Group>>,
  'list_needs' : ActorMethod<[], Array<Need>>,
  'list_resources' : ActorMethod<[], Array<Resource>>,
  'remove_group' : ActorMethod<[string], boolean>,
  'request_join_group' : ActorMethod<[string], [] | [JoinRequest]>,
  'set_active_group' : ActorMethod<[[] | [string]], boolean>,
  'suspend_user' : ActorMethod<[string], boolean>,
  'unsuspend_user' : ActorMethod<[string], boolean>,
  'update_display_name' : ActorMethod<[string], boolean>,
  'update_event' : ActorMethod<
    [string, [] | [string], [] | [DateRange], [] | [string]],
    boolean
  >,
  'update_group' : ActorMethod<
    [string, [] | [string], [] | [string], [] | [string], [] | [string]],
    boolean
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
