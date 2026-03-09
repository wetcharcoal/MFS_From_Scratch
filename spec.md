# A Seed - ICP Exchange Platform Specification

## Overview
Platform for food groups to exchange resources and needs. Hosted on ICP (Internet Computer Protocol).

## Key Objects
- **Resources**: title, description, groupId, category, optional dateRange; auto-deleted when expired
- **Needs**: title, description, groupId, category, optional dateRange; auto-deleted when expired
- **Groups**: groupId, name, email (required), userIds, roles, address, phone (optional)
- **Users**: userId, II principal, displayName, groupIds, activeGroupId
- **Events**: groupId, title, dateRange, timeRange
- **Categories**: Food/drink, Storage space, Kitchen space, Distribution space, Equipment, Publicity, Event Space, Other

## Business Rules
- Request approval: Any group member approves new users; new groups need no approval
- Matching: Same category; date overlap only when both resource and need have dateRange
- Events: Group members create; admins edit/delete any event
- Rate limit: 100 new groups per day

## Stack
- Backend: Motoko (ICP canister)
- Frontend: React + TypeScript + Tailwind CSS + shadcn/ui
- Auth: Internet Identity 2.0 (id.ai)
- Deployment: ICP WebAssembly canister
