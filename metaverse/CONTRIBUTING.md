# Contributing

Thanks for considering a contribution. This project is a Gather-inspired open-source virtual office, and the goal is to build a useful spatial collaboration tool without copying proprietary branding or assets.

## Ground Rules

- Do not add Gather logos, names, proprietary artwork, or scraped private assets.
- Keep feature behavior practical and testable.
- Prefer small focused pull requests.
- Preserve existing API response shapes unless the change is intentionally documented.
- For UI work, test both desktop and mobile-sized screens.
- For media/realtime work, include notes about how you tested two-browser or two-device behavior.

## Local Development

```sh
npm install
npm run db:generate
npm run db:migrate
npm run seed:demo
```

Run services in separate terminals:

```sh
npm run dev --workspace apps/http
npm run dev --workspace apps/ws
npm run dev --workspace apps/web
```

## Useful Scripts

```sh
npm run build --workspace apps/http
npm run build --workspace apps/ws
npm run build --workspace apps/web
npm run seed:demo
npm run seed:avatars
npm run seed:decor
npm run seed:rooms
```

## Pull Request Checklist

- The app builds locally.
- You tested the affected workflow manually.
- You updated docs if behavior or setup changed.
- You did not commit secrets, generated logs, or local-only files.
- For realtime/media changes, you tested with two browser sessions or two devices.

## Good First Issues

- Add WebRTC stats UI for packet loss, jitter, bitrate, and ICE state.
- Improve map editor tooltips and shortcuts.
- Add tests for room entry, spot occupancy, and portal movement.
- Improve seed data naming and categories.
- Add deployment troubleshooting docs for AWS, Nginx, and mediasoup.

## Project Direction

The app should feel like a real workspace, not a demo page. Features should be usable from the map-first experience: moving around, joining rooms, meeting people, editing the office, and handling audio/video smoothly.
