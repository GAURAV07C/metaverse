# Metaverse Virtual Office

An open-source Gather-inspired virtual office built with React, Canvas, WebSocket realtime presence, and mediasoup SFU media.

This project is not affiliated with Gather, and it does not copy Gather branding, logos, or proprietary assets. The goal is to build a useful spatial collaboration product with familiar virtual-office behavior: walk around a map, meet near people, join rooms, chat, screen share, and edit the office.

## What Works Today

- Canvas-based office map with keyboard movement, click-to-move, pan, zoom, and spatial UI.
- Realtime WebSocket presence, movement, status, chat, reactions, room invites, and moderation events.
- Room and spot model:
  - public areas are open space,
  - rooms create audio/video groups,
  - spots/seats define where people sit inside rooms.
- Mediasoup-based audio, video, and screen sharing.
- Meeting mode with grid/speaker-style video layout.
- Studio/map editor for rooms, areas, seats/spots, portals, spawn points, objects, and decorations.
- Invite links, room links, room auto-join, portals, user follow/locate, and selected-user actions.
- Zustand for UI state and TanStack Query for API-backed client state.
- Single-server AWS mode and optional Redis/Upstash pub/sub path for future multi-instance scaling.

## Apps

- `apps/web` - React/Vite frontend.
- `apps/http` - Express HTTP API.
- `apps/ws` - WebSocket realtime server and mediasoup signaling.
- `packages/db` - Prisma schema and generated DB client package.

## Local Setup

### 1. Install

```sh
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and set the values for your machine.

For local single-server development:

```env
DATABASE_URL="postgresql://metaverse:metaverse@localhost:5432/metaverse?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_PASSWORD="replace-with-a-long-random-secret"
CORS_ORIGIN="http://localhost:5173,http://localhost:3000"

VITE_APP_API_URL="http://localhost:3000/api/v1"
VITE_APP_WS_URL="ws://localhost:3001"

SFU_SPACE_AFFINITY="off"
REALTIME_BUS_ENABLED="false"
MEDIASOUP_LISTEN_IP="0.0.0.0"
MEDIASOUP_ANNOUNCED_IP="127.0.0.1"
MEDIASOUP_RTC_MIN_PORT="40000"
MEDIASOUP_RTC_MAX_PORT="49999"
```

For AWS production, set `MEDIASOUP_ANNOUNCED_IP` to the EC2 public IPv4 or Elastic IP, and open UDP/TCP `40000-49999`.

### 3. Start Postgres

```sh
docker compose -f docker-compose.local.yml up -d
```

### 4. Prepare Database

```sh
npm run db:generate
npm run db:migrate
```

### 5. Seed Demo Data

```sh
npm run seed:demo
```

Optional extra seeds:

```sh
npm run seed:avatars
npm run seed:decor
npm run seed:rooms
```

### 6. Run Locally

Use three terminals:

```sh
npm run dev --workspace apps/http
npm run dev --workspace apps/ws
npm run dev --workspace apps/web
```

Open:

```txt
http://localhost:5173
```

## Build And Verify

```sh
npm run build --workspace apps/http
npm run build --workspace apps/ws
npm run build --workspace apps/web
```

The web build may show non-blocking warnings for Tailwind at-rules and bundle size.

## Realtime And Media Notes

For one server, keep Redis pub/sub disabled:

```env
SFU_SPACE_AFFINITY="off"
REALTIME_BUS_ENABLED="false"
```

For multiple WS/SFU servers, Redis pub/sub can be enabled with `REDIS_URL` or `UPSTASH_REDIS_URL`, but sticky routing/space ownership must be configured carefully.

For mediasoup on AWS:

- `MEDIASOUP_ANNOUNCED_IP` must be the public IP.
- UDP/TCP `40000-49999` must be open.
- HTTPS/WSS must terminate correctly at your proxy.
- If remote video is black or delayed with only two users, check ICE candidates, packet loss, CPU steal, and `chrome://webrtc-internals`.

## Open Source Contributions

Contributions are welcome. Good first areas:

- improve mediasoup diagnostics and WebRTC stats overlays,
- harden map editor UX,
- improve minimap and room visual quality,
- add tests for movement/room rules,
- improve docs and deployment guides,
- polish accessibility and keyboard controls.

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

## Current Parity Status

This is a Gather-inspired clone, not a proven 1:1 Gather Town replacement yet.

Implemented product depth is strong for a prototype: map, rooms, spots, chat, realtime presence, media, meeting mode, Studio editing, portals, invites, and moderation are present. Still missing for true 1:1 parity: production-scale reliability, richer object interactions, full admin workflows, deeper permissions, analytics, stronger test coverage, and extensive browser/device QA.

See [GATHER_TOWN_1_TO_1_PARITY.md](./GATHER_TOWN_1_TO_1_PARITY.md) for the detailed roadmap.
