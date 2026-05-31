# MKS Document Hub

MKS Document Hub is a Replit-exported React Native / Expo workspace for managing documents across mobile and web, with supporting API, database, and generated client packages.

## Project Layout

- `artifacts/mks-app` — Expo app
- `artifacts/api-server` — backend API server
- `lib/*` — shared API schema, client, and database packages
- `scripts/` — workspace helper scripts

## Getting Started

```bash
pnpm install
pnpm run typecheck
pnpm run build
```

## Useful Commands

- `pnpm --filter @workspace/mks-app run dev` — start the Expo app
- `pnpm --filter @workspace/api-server run dev` — start the API server
- `pnpm run typecheck` — run TypeScript checks across the workspace
- `pnpm run build` — typecheck and build all packages

## License

MIT
