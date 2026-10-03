# Metaverse Virtual Office

Welcome to the Metaverse Virtual Office repository! 

This is a monorepo containing a Gather-inspired open-source virtual office.

## Project Structure

- [`metaverse/`](./metaverse) - The main Turborepo containing the applications and packages.
  - `apps/web` - React/Vite frontend.
  - `apps/http` - Express HTTP API.
  - `apps/ws` - WebSocket realtime server and mediasoup signaling.
  - `packages/db` - Prisma schema and generated DB client package.
- [`tests/`](./tests) - Additional test suites.

## Documentation

- [Main Application README](./metaverse/README.md)
- [Contribution Guidelines](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Security Policy](./SECURITY.md)
