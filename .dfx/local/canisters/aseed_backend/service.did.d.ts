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
  'socialLinks' : Array<SocialLink>,
  'name' : string,
  'createdAtNs' : bigint,
  'userIds' : Array<string>,
  'email' : string,
  'website' : [] | [string],
  'address' : [] | [string],
  'phone' : [] | [string],
  'profilePicturePath' : [] | [string],
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
export type ProfileAssetResult = { 'ok' : string } |
  { 'err' : string };
export interface Resource {
  'id' : string,
  'title' : string,
  'createdAtNs' : bigint,
  'description' : string,
  'groupId' : string,
  'category' : Category,
  'dateRange' : [] | [DateRange],
}
export interface SocialLink { 'url' : string, 'platform' : string }
export interface User {
  'id' : string,
  'principal' : Principal,
  'displayName' : string,
  'activeGroupId' : [] | [string],
  'groupIds' : Array<string>,
  'suspended' : boolean,
}
export interface _SERVICE {
  'admin_get_asset_storage_canister' : ActorMethod<[], [] | [Principal]>,
  'admin_remove_group' : ActorMethod<[string], boolean>,
  /**
   * / Optional: override asset canister principal (defaults to `canister:aseed_frontend` from dfx).
   * / One-time local setup (controllers alone do not grant Commit on modern asset canisters):
   * / - dfx canister update-settings aseed_frontend --add-controller "$(dfx canister id aseed_backend)"
   * / - dfx canister call aseed_frontend authorize "(principal \"$(dfx canister id aseed_backend)\")"
   */
  'admin_set_asset_storage_canister' : ActorMethod<[Principal], boolean>,
  'admin_update_group' : ActorMethod<
    [
      string,
      [] | [string],
      [] | [string],
      [] | [string],
      [] | [string],
      [] | [string],
      [] | [Array<SocialLink>],
      [] | [string],
    ],
    boolean
  >,
  'approve_join_request' : ActorMethod<[string], boolean>,
  'assign_role' : ActorMethod<[Principal], boolean>,
  'create_event' : ActorMethod<[string, DateRange, string], [] | [Event]>,
  'create_group' : ActorMethod<
    [
      string,
      string,
      Array<GroupRole>,
      [] | [string],
      [] | [string],
      [] | [string],
      Array<SocialLink>,
      [] | [string],
    ],
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
  'delete_group_profile_asset' : ActorMethod<[string], ProfileAssetResult>,
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
  'is_admin' : ActorMethod<[], boolean>,
  'list_all_users' : ActorMethod<[], Array<User>>,
  'list_events' : ActorMethod<[], Array<Event>>,
  'list_groups' : ActorMethod<[], Array<Group>>,
  'list_needs' : ActorMethod<[], Array<Need>>,
  'list_resources' : ActorMethod<[], Array<Resource>>,
  'remove_group' : ActorMethod<[string], boolean>,
  'request_join_group' : ActorMethod<[string], [] | [JoinRequest]>,
  'set_active_group' : ActorMethod<[[] | [string]], boolean>,
  /**
   * / Group members upload profile images via the backend so the asset canister sees the backend as caller (controller).
   */
  'store_group_profile_asset' : ActorMethod<
    [string, string, Uint8Array | number[], string, Uint8Array | number[]],
    ProfileAssetResult
  >,
  'suspend_user' : ActorMethod<[string], boolean>,
  'unsuspend_user' : ActorMethod<[string], boolean>,
  'update_display_name' : ActorMethod<[string], boolean>,
  'update_event' : ActorMethod<
    [string, [] | [string], [] | [DateRange], [] | [string]],
    boolean
  >,
  'update_group' : ActorMethod<
    [
      string,
      [] | [string],
      [] | [string],
      [] | [string],
      [] | [string],
      [] | [string],
      [] | [Array<SocialLink>],
      [] | [string],
    ],
    boolean
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
