# Gather Town 1:1 Parity Plan

This document tracks what the metaverse app already has, what is still missing, and what must be built to make the product feel like a Gather Town style 1:1 experience.

Important note: the goal is to match Gather-like behavior, interaction quality, layout logic, and product depth. Do not copy Gather branding, logos, proprietary artwork, or protected assets.

## Purpose For The Next AI

This repo is a Gather Town style metaverse/virtual office clone. The user wants the product to feel 1:1 with Gather Town in day-to-day behavior:

- Pixel-map office where users walk around.
- Proximity and room-based audio/video.
- Rooms with seats/spots.
- Meeting mode that feels like a normal video call.
- Real map editor / Studio.
- Real minimap, participants, chat, object interactions, reactions, statuses, room links, and collaborative controls.

If another AI continues this project, do not treat the current UI as final. Treat it as a working prototype that must be progressively upgraded toward Gather-level product depth.

## Repository Map

Important files:

- `apps/web/src/components/Arena.tsx`
  - Main live space shell.
  - Owns WebSocket, media, room state, chat, reactions, follow mode, room deep links, selected user card, and toolbar/sidebar wiring.
- `apps/web/src/components/arena/MapCanvas.tsx`
  - Canvas map renderer.
  - Draws floor, zones, elements, users, reactions, dotted AV room bindings.
  - Handles click-to-move, drag pan, builder brush/eraser, and user selection.
- `apps/web/src/components/arena/Sidebar.tsx`
  - Participants, rooms directory, active areas, chat scopes.
- `apps/web/src/components/arena/ActionToolbar.tsx`
  - Bottom toolbar controls: status, mic, camera, meeting mode, screen share, reactions, build, shortcuts, leave.
- `apps/web/src/components/arena/VideoOverlay.tsx`
  - Video tiles, meeting/grid mode, fullscreen video/screen share.
- `apps/web/src/components/arena/MediaDiagnosticsPanel.tsx`
  - In-space mediasoup/WebRTC diagnostics panel for producers, consumers, track state, packet loss, jitter, and RTP counters.
- `apps/web/src/components/arena/MiniMap.tsx`
  - Real canvas minimap.
- `apps/web/src/components/arena/InteractionLayer.tsx`
  - Object interaction prompt and modal.
- `apps/web/src/components/Studio.tsx`
  - Studio/map editor shell.
- `apps/web/src/components/studio/StudioCanvas.tsx`
  - Editor canvas and room/area/seat/spawn/portal/spotlight tools.
- `apps/web/src/components/studio/StudioRail.tsx`
  - Studio left tool rail.
- `apps/web/src/utils/ws.ts`
  - WebSocket client and typed messages.
- `apps/web/src/utils/mediasoupClient.ts`
  - Media client.
- `apps/ws/src/User.ts`
  - WS user session, join, move, teleport, status, reaction, media message routing.
- `apps/ws/src/RoomManager.ts`
  - Room users, zones, collision bounds, proximity checks.
- `apps/ws/src/handlers/MovementHandler.ts`
  - Move and teleport validation.
- `apps/ws/src/handlers/ChatHandler.ts`
  - Everyone/nearby/DM/room chat routing.
- `apps/ws/src/handlers/WebRTCHandler.ts`
  - Media signaling.
- `GATHER_TOWN_1_TO_1_PARITY.md`
  - This handoff and parity roadmap.

## Current Product Philosophy

Keep the app as a usable workspace, not a marketing landing page.

- The first screen inside a space should be the actual office.
- Buttons should be icons where familiar.
- Avoid fake UI. If a control exists, it should do something real or be clearly disabled.
- Rooms and spots are core concepts:
  - Area is public.
  - Room is audio/video boundary.
  - Spot is a seat/place inside a room.
- Map and Studio must agree visually and behaviorally.
- Browser verification is required after UI changes.

## Current State

### Live Space

Implemented:

- Live `/space/:spaceId` arena route.
- Canvas-based map renderer with pan, zoom, click-to-move, keyboard movement, and overview mode.
- Player avatar rendering on the canvas.
- Other users rendered on the map with name tags.
- Real minimap canvas showing rooms, elements, users, and audio radius.
- Left rail with people, chat, edit, more, leave, and settings controls.
- Top-left office title and invite controls.
- Top-right presence/status chips.
- Bottom action toolbar with profile, status, mic, camera, meeting mode, screen share, reactions, build, and leave.
- WebSocket connection and reconnect behavior.
- User presence count and participant sidebar.
- Participant actions: message, follow, locate.
- Map-user profile card when clicking another avatar: avatar preview, room/location status, message, follow, locate, and invite-to-current-room action.
- Follow mode with top-right following chip and camera target tracking.
- Locate mode as one-time camera pan.
- Presence status: available, busy, focus, away.
- Live reactions over avatars.
- Keyboard shortcut overlay from the bottom toolbar and `?`.
- Chat scopes: everyone, nearby, DM, room.
- Unread chat badge on the left rail when chat is closed.
- Sidebar chat title badge.
- Toast notifications for join, leave, DM, incoming chat, and room invites.
- Real-time room invite event over WebSocket with join action toast.
- Room invite card with Accept, Decline, 30-second expiry, and short ring sound.
- Sender-side room invite accepted/declined acknowledgement toast.
- Local persisted room invite history with incoming, outgoing, accepted, declined, and expired states.
- Server-backed room invite event history through `RoomInviteEvent` and `/office/:spaceId/invite-events`.
- Chat sidebar Invites view for recent room invite activity.
- Room URL deep links using `?room=<roomId>`.
- Room auto-join from URL.
- Copy room link.
- Portal URL spawn/deep-link coordinates use server teleport, not normal movement.
- In-space portals can jump to explicit target coordinates or fall back to the paired portal.
- Portal prompt supports keyboard `X` and a clickable Use button.
- Join spawn selection uses the Studio default spawn when one is set.
- Room directory in sidebar with online count and vacant spot count.
- Room join moves to a walkable available spot.
- Leave room clears room URL param.

### Rooms, Spots, And Audio Groups

Implemented:

- Public areas and audio rooms are separated.
- Room zones use `room` and legacy `private` support.
- Room spots use `seat` zones.
- Entering a room connects the room group.
- Room members are visually bound with green dotted lines/box.
- Room leave action is visible.
- Spot picker is available inside rooms.
- Server rejects movement/teleport into an occupied spot.
- Server rejects entering a room when all room spots are already occupied.
- User does not see self video tile when alone with camera off.
- Video tiles appear in meeting/group context.
- Meeting mode switches into grid-style overlay.
- Meeting mode has speaker/grid layout controls.
- Screen share is prioritized as the meeting stage when active.
- Meeting mode detects active speakers from audio levels and highlights/promotes the active tile.
- Owner host controls can spotlight active speaker, clear spotlight, mute self, and stop presenting.
- Owner host controls can send remote moderation requests to mute the active speaker, stop the active camera, or stop the active screen share.
- Owner host controls can bulk mute remote participants in the current audio/video group.
- Recent host moderation actions are stored locally and shown in the host menu.
- Server-backed moderation audit events through `ModerationAuditEvent` and `/office/:spaceId/moderation-audit`.
- Meeting mode has a local raise-hand control and badge.
- Map mode returns to map.
- Explicit in-memory room session state is emitted by the realtime server through `room-session-updated`.
- Room directory counts and room media grouping use room session state when available, with coordinate fallback.
- Busy/focus mode suppresses interruptive rings and room invite popups when notification preferences respect focus.

Missing or incomplete:

- Room session state is in-memory; it is not persisted and does not yet have lifecycle analytics storage.
- Audio/video group signaling is proximity/room based, but not yet full production-grade room media routing.
- Spotlight areas are visual/status only; they do not yet prioritize audio/video streams.

### Media

Implemented:

- Mic toggle.
- Camera toggle.
- Prejoin camera/mic preview.
- Prejoin microphone, camera, and speaker dropdowns.
- Selected input/output devices persist in local storage.
- Arena mic/camera toggles use the selected device IDs.
- In-call Audio/Video settings show device dropdowns and mic/camera toggles.
- Active in-call microphone/camera device changes replace the live mediasoup track without toggling media off/on.
- Screen share toggle.
- Screen share tile and fullscreen view.
- Screen share can publish browser/system audio as a separate `screen-audio` producer when the browser provides an audio track.
- Fullscreen video tile view.
- Mediasoup fallback/init cleanup improvements.
- Media diagnostics panel from the bottom toolbar shows live send/receive transports, producers, consumers, track state, queued producers, bytes, packets, packet loss, jitter, RTT, FPS, decoded frames, and client-side quality warnings.
- Media diagnostics also show server-side mediasoup lifecycle counters for transports, producers, and consumers.

Missing or incomplete:

- Screen share system audio depends on browser/OS capture support and needs multi-browser QA.
- Remote moderation signaling is implemented for active speaker/screen actions and bulk mute in the current AV group; moderation audit is persisted server-side.
- No production TURN/STUN quality checks.
- Media quality warnings are client-side and include server network config warnings; persisted call quality history is still missing.
- Settings > Video includes adaptive quality presets that update capture constraints and mediasoup camera bitrate.

### Chat

Implemented:

- Everyone chat.
- Nearby chat.
- DM by `@username`.
- Room chat.
- Local echo for sender.
- Sidebar chat tabs.
- Unread badges on rail and chat panel title.
- Notification toasts for joins, leaves, DMs, and incoming messages.
- Persisted notification preferences for joins/leaves, chat/DMs, room invites, invite sounds, reconnect banner, and focus/busy filtering.
- Server-backed notification preferences through `NotificationPreference` and `/office/:spaceId/notification-preferences`.
- Reconnect/offline banner with browser online/offline awareness.
- Selected-user room invite sends a WebSocket invite when the current user is inside a room.
- Space membership roles are persisted through `SpaceMember`.
- Owner/Admin can manage members in Settings.
- Admin/Builder roles can edit maps and use office edit APIs.
- Member/Guest roles can be listed and enforced by role-aware space APIs.

Missing or incomplete:

- Message delivery receipts are missing.
- Server errors for failed DM targets are not surfaced.
- Threaded object/room chat history is not persisted.
- Room invites are client-accepted/declined with expiry and sender acknowledgement; invite event history is persisted server-side.
- Notification preferences are server-backed with local browser fallback.
- Notification sound coverage is currently limited to room invite ringing.
- No markdown/link previews.

### Discoverability And Help

Implemented:

- Keyboard shortcuts overlay.
- `?` toggles shortcuts when focus is not in an input.
- Bottom toolbar help button opens shortcuts.

Missing or incomplete:

- Contextual onboarding for first-time users.
- Tooltips are present in many places but not comprehensive.
- Shortcut overlay should later include media shortcuts after those are implemented.

### Studio / Mapmaker

Implemented:

- Studio canvas.
- Drag/pan/zoom editor.
- Object interaction editor for selected objects.
- Configurable object actions: URL, embed, whiteboard, info card, video, game.
- Room tool.
- Seat/spot tool.
- Area tool.
- Spawn, portal, spotlight tools.
- Spawn areas can be marked as the default join location.
- Portal target editor for URL, space, room, and coordinate destinations.
- Portal quick target picker and client/server publish validation.
- Portal target metadata is persisted on published map zones.
- Room generator with spots.
- Room directory search/filter in the space sidebar.
- Studio walkability overlay shows walkable/blocked areas and uses runtime-like blocking rules for floors/seats.
- Publish flow.
- Publish creates map version snapshots.
- Studio can restore a published map version back into draft.
- Legacy private zones normalized toward rooms in behavior.

Missing or incomplete:

- Layer panel is missing.
- Multi-select and group movement are limited.
- Object inspector has interaction controls; broader property panels still need polish.
- Undo/redo exists visually but needs deeper coverage across all edits.
- Portal targets are configurable; cross-map picker UX still needs polish.
- Tile effects need a polished visual editing UI.
- Collision preview exists; publish-time walkability validation still needs deeper checks.
- Version history exists; diff preview and version naming are still missing.
- Map templates and room template browser need better production organization.

### Permissions

Implemented:

- Non-owner edit buttons are disabled/hidden in several places.
- `/space/:id` returns `currentUserRole` and `canEdit` capabilities.
- Studio direct access is blocked for non-editors.
- Office draft, publish, invite, desk, and settings write endpoints enforce owner-only edit permission.

Missing or incomplete:

- Membership roles now cover owner, admin, builder, member, and guest for core space/office editing.
- Backend permission enforcement now covers core office edit APIs and space APIs; organization/team and future membership-scoped writes still need role-aware enforcement.
- Moderator-specific policy remains separate from builder/admin permissions.
- Room-level moderator controls are missing.
- Guest access and invite permission policies are incomplete.
- Space privacy controls need owner/admin UI.

## Gather-Style UI Target

### Left Rail

Should include:

- Space menu / office logo.
- Search.
- People/map panel.
- Chat.
- Calendar or meetings entry if meetings exist.
- Build/edit, visible only to allowed users.
- More menu.
- Bottom settings and leave.

Current status:

- Most items exist.
- Calendar/meetings entry is not fully implemented.
- More menu needs richer options.

### Top Left

Should include:

- Space name.
- Live/office status.
- Invite.
- Edit map for allowed users.

Current status:

- Mostly implemented.

### Top Right

Should include:

- Online count.
- Current zone/room.
- Following chip.
- Meeting mode.
- Connection state.
- Optional active event/meeting indicators.

Current status:

- Mostly implemented.
- Event/meeting scheduling indicators are missing.

### Bottom Toolbar

Should include:

- Profile/avatar.
- Status.
- Mic.
- Camera.
- Meeting/map toggle.
- Screen share.
- Reactions.
- Build.
- Leave.
- Optional settings/device dropdowns.

Current status:

- Core toolbar is implemented.
- Device dropdowns are missing.
- More polished keyboard shortcut hints are missing.

### Right / Floating Panels

Should include:

- Minimap.
- Room controls.
- Object interaction prompts.
- User profile card when clicking avatars.
- Optional event/session panel.

Current status:

- Minimap, room controls, prompts, and user card are implemented.
- Event/session panel is missing.

## Feature Checklist For 1:1 Quality

### Priority 1: Core Daily Use

- Prejoin screen with camera/mic preview, device selection, avatar/name confirmation.
- Persist selected mic/camera/speaker.
- Remote mute-all and meeting moderation signaling.
- Click avatar profile card polish with avatar preview, status, DM, follow, locate, invite to room.
- Unread chat badges on rail.
- Notification toasts for join/leave, DM, room invite.
- Keyboard shortcuts overlay.
- Better reconnect UI and offline banner.

### Priority 2: Gather-like Space Mechanics

- Private areas and room audio boundaries.
- Spotlight behavior that boosts speaker/video.
- Portals between rooms/spaces.
- Advanced spawn rules, such as guest/member-specific spawns.
- Follow / request lead / lead group mode.
- Ring / call user / invite user to current room.
- Do-not-disturb and focus behavior.

### Priority 3: Studio / Mapmaker

- Inspector panel for selected object/area.
- Layer list with lock/hide.
- Object search and categorized library.
- Better room templates.
- Tile effects palette with live preview.
- Publish-time collision/walkability validation.
- Version diff preview and version naming.
- Role-aware edit mode.
- Custom object interaction editor.

### Priority 4: Admin / Production

- Full permissions.
- Audit logs.
- Invite links with scopes.
- Space privacy.
- Moderation tools.
- Analytics for active users/rooms.
- Load testing for WebSocket and media.
- TURN server setup and persisted call quality history.
- Error reporting and structured logs.

## Backend Gaps

Need to add:

- Persisted room session lifecycle analytics.
- Role model and middleware for all write APIs.
- Chat persistence and delivery metadata.
- Room invite events.
- User status persistence if needed.
- Object interaction persistence and validation.
- Portal target validation.
- Organization-wide notification defaults and policy controls if needed.
- Persisted media room lifecycle and cleanup metrics.

## Frontend Gaps

Need to add:

- Prejoin polish.
- Device settings modal.
- Organization-wide notification policy defaults if required.
- Meeting host controls.
- Screen share controls.
- Better mobile layout.
- Accessibility pass on canvas-adjacent controls.

## Suggested Implementation Order

1. Persist room session/media lifecycle analytics beyond the in-memory realtime server.
2. Add persisted call quality history and deeper TURN/STUN deployment checks.
3. Expand notification sounds and organization-wide notification policy controls if needed.
4. Add version diff preview and stronger publish validation.
5. Add onboarding and contextual help polish.
6. Add advanced spawn rules and follow-leader mode.

## Exact Missing Feature Backlog

Use this as the task queue. Do not assume everything is already done because the UI looks close.

### Current Completed Batch

- [x] Remove stale temp artifacts from the repo workspace.
- [x] Add room directory search/filter.
- [x] Add client WebRTC/media diagnostics.
- [x] Add client-side media quality warnings.
- [x] Add in-memory realtime room session state.
- [x] Use room session state for room counts and room media grouping.
- [x] Add server mediasoup lifecycle counters in diagnostics.
- [x] Improve Studio walkability/collision overlay.
- [x] Suppress interruptive rings/invite popups in busy/focus mode.

### Next Implementation Queue

- [ ] Persist room session lifecycle analytics beyond the current realtime process.
- [x] Add adaptive media quality controls based on diagnostics.
- [x] Add baseline TURN/STUN deployment self-checks in media diagnostics.
- [x] Add WebSocket movement/chat load-test script.
- [ ] Add persisted call quality history.
- [ ] Add deeper TURN/STUN deployment probes against deployed AWS networking.
- [ ] Add spotlight stream priority behavior.
- [ ] Add follow-leader/request-lead group mode.
- [ ] Add map version diff preview and named releases.
- [ ] Add invite links with role/scope.
- [ ] Add private/public space controls.
- [ ] Add audit log for map edits.
- [x] Add load testing scripts for WebSocket.
- [ ] Add mediasoup/browser media load test automation.

### P0: Must-Have For Gather-Like Daily Use


### P1: Must-Have For Map/Space Authenticity

- Cross-room/cross-space portal QA with real linked maps.
- Portal destination picker polish for browsing other spaces.
- Advanced spawn rules for guest/member/event-specific entry points.
- Spotlight stream priority behavior.
- Follow leader / request lead mode.

### P2: Must-Have For Admin/Production

- Organization/team membership model beyond single-space roles.
- Moderator role policy and moderation-specific permissions.
- Role-aware enforcement audit for every future write endpoint.
- Invite links with role/scope.
- Private/public space controls.
- Audit log for map edits.
- Map version diff preview and named releases.
- TURN server deployment config.
- Load testing for WS and media.

### P3: Polish

- Mobile layout pass.
- Accessibility pass for canvas controls.
- Tooltip coverage.
- Visual density tuning.
- Empty states and error states.
- Avatar/profile polish.
- Meeting reactions/raise hand.
- Persisted chat history.
- Link previews.

## How To Continue Safely

Before editing:

- Read the relevant component and existing styles.
- Check whether `index.css` has later duplicate selectors overriding earlier ones.
- Preserve current working behavior:
  - Avatar visible on map.
  - Map drag/pan works.
  - Room join works.
  - Room URL auto-join works.
  - WebSocket reconnect works.
  - Browser console clean after reload.

After editing:

- Run `npm run build --workspace apps/web`.
- Run `npm run build --workspace apps/ws` if `apps/ws` changed.
- Run `git diff --check`.
- Browser reload the known space route.
- Verify console is clean.
- Verify the actual changed UI, not just build success.

## Verification Requirements

For each feature batch:

- Run `npm run build --workspace apps/web`.
- Run `npm run build --workspace apps/ws` when WS/server code changes.
- Run `git diff --check`.
- Open `/space/<spaceId>` in browser.
- Verify console has no errors/warnings.
- Verify the actual UI state using browser snapshot/screenshot.
- For room/media features, test with at least two users when possible.

## Current Known Test Space

- Current browser route used during testing:
  - `/space/cmulz765d007jmj1usbrnm5l4`
- Current visible room flow:
  - Sidebar rooms list.
  - Join room.
  - URL updates with `?room=<roomId>`.
  - Reload auto-joins the room.
  - Leave room clears the room query.

