# River

River is a poker learning and play app. It has a Next.js frontend, a pure TypeScript poker engine, a Bun WebSocket server, and shared protocol types.

## Packages

- `packages/web`: Next.js app.
- `packages/server`: Bun HTTP and WebSocket server.
- `packages/engine`: poker rules, state transitions, hand evaluation, pots, and tests.
- `packages/shared`: protocol types and shared helpers.

The monorepo uses pnpm workspaces and Turbo.

## Requirements

- Node.js
- pnpm
- Bun

## Install

```bash
pnpm install
```

## Development

Run the web app and server in separate terminals:

```bash
pnpm dev:web
pnpm dev:server
```

The web app runs at `http://localhost:3000`.
The game server runs at `http://localhost:8787`.

If the web app should connect to another server URL:

```bash
NEXT_PUBLIC_RIVER_SERVER_URL=http://localhost:8787 pnpm dev:web
```

## Checks

```bash
pnpm typecheck
pnpm test
pnpm build
```

React changes should also pass:

```bash
npx -y react-doctor@latest . --verbose --diff
```

## Persistence

The server uses SQLite through `bun:sqlite`.

By default it writes to `river.sqlite` in the server working directory. Set `RIVER_SQLITE_PATH` to choose another file:

```bash
RIVER_SQLITE_PATH=/path/to/river.sqlite pnpm dev:server
```

Saved data:

- users
- session tokens
- chip balances
- completed hand records
- hands played and won
- total profit
- VPIP and PFR counts
- biggest pot won

Live tables are in memory. If the server restarts, users and completed hands survive, but active tables, current hands, chat, presence, and disconnect timers are lost.

## Multiplayer Flow

1. Pick a username in the lobby.
2. Create a table or join one by code.
3. Choose blinds, buy-in range, seats, private/public status, and bot fill.
4. Start the table as host.
5. Play through the WebSocket connection.

The server is authoritative. Clients send actions, not state.

## Environment

Server:

- `PORT` or `RIVER_SERVER_PORT`: server port. Default: `8787`.
- `RIVER_SQLITE_PATH`: SQLite file path. Default: `river.sqlite`.
- `RIVER_WEB_ORIGIN`: CORS origin. Default: `*`.
- `OPENROUTER_API_KEY`: enables bot table talk.
- `OPENROUTER_MODEL`: bot table talk model.

Web:

- `NEXT_PUBLIC_RIVER_SERVER_URL`: HTTP URL for the Bun server.

## Notes

SQLite is enough for local work and a small single-server deploy with a persistent disk and backups. For a real hosted multiplayer setup, move account, chip, stats, and hand history data to Postgres, then add recovery for active table buy-ins.
