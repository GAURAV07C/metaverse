# Metaverse Architecture

This project is a spatial office app with three main surfaces:

- Arena: the live map where people move, meet, chat, share audio/video, and enter rooms.
- Studio: the editor where maps, rooms, desks, spawn points, portals, and interactive objects are arranged.
- Admin/Dashboard: space creation, settings, invites, and management.

The product should feel like a real workplace tool: clear controls, predictable state, and no placeholder copy in the user-facing UI.

## Apps

### Web (`apps/web`)

The web app owns the browser experience.

- `Arena.tsx` is the live space shell. It coordinates map state, socket state, media state, room state, and panels.
- `components/arena/*` contains smaller Arena pieces such as media overlays, map canvas, side rails, notifications, and shortcuts.
- `stores/arenaStore.ts` keeps local UI/session state in Zustand.
- `components/arena/queries.ts` keeps API-backed server state in TanStack Query.
- `utils/ws.ts` wraps the realtime WebSocket client.
- `utils/mediasoupClient.ts` wraps mediasoup-client transport, producer, and consumer behavior.

Keep browser-only concerns in the web app. Do not move API, auth, database, or SFU ownership logic here.

### HTTP API (`apps/http`)

The HTTP app owns authenticated request/response APIs.

- User profile and metadata.
- Spaces, maps, rooms, elements, invites, and settings.
- Studio persistence.
- Data validation before writing to the database.

Main module boundaries:

- `routes/v1/*`: request validation, permission checks, and response status codes.
- `services/officeAccess.ts`: shared office role cleanup, role lookup, and editor/manager permission helpers.
- `services/officePreferences.ts`: public settings and notification preference shaping.
- `services/officePublishService.ts`: publish draft maps into live elements, rooms, portals, spawn points, and map versions.
- `services/portalValidation.ts`: portal target validation rules.
- `services/spaceCreationService.ts`: blank-space and map-template creation.
- `services/spaceDimensions.ts`: dimension parsing and limits.
- `services/spacePresenter.ts`: API response shaping for space lists and live space detail.

HTTP signs the same JWT secret that the realtime server validates. If HTTP and WS use different `JWT_SECRET` values, users can log in but realtime join will fail with `invalid-token`.

### Realtime + SFU (`apps/ws`)

The WS app owns live presence and mediasoup signaling.

- WebSocket join, movement, chat, room enter/leave, proximity groups, and moderation messages.
- Mediasoup worker, router, transports, producers, and consumers.
- Optional Redis pub/sub for multi-instance presence forwarding.
- Optional SFU space affinity for later multi-server routing.

Main module boundaries:

- `User.ts`: one connected socket, identity, lifecycle, and message dispatch.
- `handlers/JoinHandler.ts`: token validation, profile loading, space validation, spawn selection, join response.
- `handlers/MovementHandler.ts`: move and teleport validation.
- `handlers/ChatHandler.ts`: chat routing and chat history persistence.
- `handlers/WebRTCHandler.ts`: mediasoup signaling messages.
- `handlers/CollaborationHandler.ts`: room invites, moderation requests/responses, reactions, and user status.
- `RoomManager.ts`: local room membership, broadcast fan-out, remote presence bridge, dynamic room/seat entry checks, proximity notifications.
- `services/SpaceBoundsService.ts`: static collision bounds loaded from map elements.
- `services/spatialRules.ts`: pure room, seat, spotlight, and proximity geometry helpers.
- `RealtimeBus.ts`: optional Redis/Upstash bridge and SFU owner affinity.

For the current single-server AWS setup, keep SFU affinity off:

```env
SFU_SPACE_AFFINITY="off"
MEDIASOUP_LISTEN_IP="0.0.0.0"
MEDIASOUP_ANNOUNCED_IP="<EC2_PUBLIC_IP>"
MEDIASOUP_RTC_MIN_PORT="40000"
MEDIASOUP_RTC_MAX_PORT="49999"
```

Redis/Upstash is useful when multiple WS processes or servers are introduced. On one server, the app should work without Redis.

## Live Media Flow

1. User joins the Arena over WebSocket with `spaceId` and JWT.
2. WS validates the token and space access.
3. Browser asks mediasoup for router capabilities.
4. Browser creates send/receive transports.
5. Mic, camera, and screen tracks are produced only after the browser confirms tracks are available.
6. Remote users consume producers that belong to their room/proximity media group.
7. UI shows media tiles only when there is a useful group or active local media.

Room media is not distance-only. If users are inside the same room, they should be part of the same audio/video group even when their map positions are not close.

## Room, Spot, Spawn, Portal

- Spawn point: where a user appears when they enter the space or when no saved position is available.
- Public area: regular map area outside rooms.
- Room: a named audio/video area. Users inside the same room share media as a group.
- Spot: a seat or focus point inside a room.
- Portal: a map object that moves a user to another room/space/location.

Rooms should be managed as room entities, not drawn as generic public-area decorations.

## Frontend Structure Rules

Large Arena files should be split by responsibility:

- Container: reads state and wires callbacks.
- Hook: owns one behavior family, such as media, sockets, rooms, chat, or keyboard shortcuts.
- Component: renders one visible UI area.
- Utility: pure functions only.

Avoid mixing these in one file:

- WebRTC stream binding.
- Room banner layout.
- Meeting grid layout.
- Audio level detection.
- Fullscreen modal.
- Host controls.

`VideoOverlay.tsx` now follows this pattern: it builds participants and passes them to smaller media components.

## Scaling Notes

The current deployment is one AWS server. The code allows a future multi-server path, but it should not make local or single-server production harder.

When scaling later:

- Use Redis/Upstash for cross-instance presence pub/sub.
- Use Nginx or load balancer affinity so a space lands on the same SFU owner.
- Keep mediasoup RTC ports open for UDP and TCP.
- Add observability for ICE, DTLS, producer, consumer, and reconnect events.

## Human-Quality UI Checklist

- No clone/reference names in production copy.
- No emoji placeholders for core identity states.
- Buttons use familiar icons and short labels.
- Empty states should explain the current state, not advertise the feature.
- Toolbars should stay stable while state changes.
- Meeting UI should prioritize the active media and leave the map one click away.
- Studio should expose map objects in predictable panels, not long mixed forms.

## Still Worth Splitting

These files remain larger than ideal and should be handled in later passes:

- `apps/web/src/components/Arena.tsx`: split into socket, media, room, chat, map, and moderation hooks.
- `apps/web/src/components/arena/MapCanvas.tsx`: split drawing, input handling, minimap, portals, and labels.
- `apps/web/src/components/studio/StudioCanvas.tsx`: split selection, drag/drop, rendering, and persistence.
- `apps/ws/src/User.ts`: split message handlers by domain.
- `apps/ws/src/RoomManager.ts`: split presence, room membership, proximity, and Redis bridge logic.
