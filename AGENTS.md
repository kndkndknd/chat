# AGENTS.md

Real-time audiovisual chat: Node/Express + raw WebSocket backend and a
browser/Vite TypeScript frontend. pnpm monorepo (`packages/*`).

## Commands

- Install: `pnpm install` (root).
- Backend dev: `pnpm -F backend dev` (runs `tsx src/app.ts`). Do **not** use the
  backend `backend` script (`ts-node` is not installed) or bare `pnpm backend`
  (the root alias `backend` is just `pnpm -F "backend"` and needs a script name).
- Frontend dev: `pnpm -F frontend dev` (Vite).
- Frontend build (emits into the backend): `pnpm -F frontend build`.
  `vite.config.ts` outputs to `packages/backend/static`, building
  `html/index.html`, `html/snowleopard.html`, and the audio worklets.
- Backend build/start: `pnpm -F backend build` then `pnpm -F backend start`
  (`tsc` + copy assets -> `dist/app.js`).
- Tests (vitest; Redis/browser are mocked, no services needed):
  - `pnpm -F backend test` / `pnpm -F frontend test` (watch mode).
  - One-shot / single file: `pnpm -F backend exec vitest run <test/path.test.ts>`.

Root aliases forward a script name: `pnpm backend dev` == `pnpm -F backend dev`.
Root `arduino`/`snowleopard` filters point to packages that do not exist (stale);
snowleopard is only a Vite HTML entry, and the frontend `snow`/`snowleopard`
webpack scripts have no webpack config or dependency.

## Architecture

- Backend entry `packages/backend/src/app.ts`: HTTPS server + `socket/wsServer.ts`
  mounting a `ws` WebSocket server at path `/ws`. There is **no socket.io**
  (the README is outdated). In-memory state under `state/` is persisted to Redis
  under `state:*`; `data/` defines the default streams `PLAYBACK`, `TIMELAPSE`,
  `EMPTY` (plus `CHAT`).
- Frontend entry `packages/frontend/src/main.ts` (`snowleopardMain.ts` + `scriptProcessor/`
  for legacy browsers). `socket/SocketFacade.ts` wraps WebSocket with
  ArrayBuffer-aware JSON (`__type: "ArrayBuffer"`).
- `types/` is a shared, hand-written `.d.ts` package (`@types/chat`) imported by
  both sides via relative path (`../../../../types` backend, `../../../types`
  frontend). Edit it directly; it is not published.
- Client behavior depends on the URL path (`clientSetting/connectFromClient.ts`):
  `/1` `/2` `/3` fixed index (`/3` = hanged), `snowleopard`, `project`, `face`,
  `hanged`, `pi` (sets arduino host), `exc` (excluded from cmd/stream lists),
  `webrtc` (SyncClient), `relay` (RelayReceiver), `noStream`, `nosound`.

## Environment / runtime

- `.env` at repo root: `DB_HOST`, `LOCAL_SERVER_PORT` (default 8888).
- Other env: `REDIS_URL` (default `redis://localhost:6379`), `MONGO_URL`,
  `SCENARIO=true`. HTTP control endpoints: `POST /api/scenario`,
  `POST /api/clear-buffer`.
- TLS keys are read from `<repo>/../keys/chat/` (e.g.
  `/mnt/sda1/chat/keys/chat/private.key` + `selfsigned.crt`, passphrase `chat`).
  They live **outside** the repo.
- Redis (ioredis) holds live state/buffers; MongoDB archives PLAYBACK/TIMELAPSE
  during the night-mode (quiet) transition, restored by `scenarioItsuki`.
  `docker/docker-compose.yml` runs Redis + an nginx TLS proxy to backend `:8888`.
- Vite dev proxy only covers `/socket.io` (target `:8000`), which does not match
  the real API or `/ws` path; the backend serves the built frontend from
  `packages/backend/static`.

## Gotchas

- `.gitignore` ignores `*.js` repo-wide, but
  `packages/frontend/src/wasm/simulate.js` (wasm-bindgen glue imported by
  `audioWorklet/simulateWorklet.ts`) is force-tracked. Do not untrack/delete it.
- Tests cover only pure / state-read logic; `vitest.config.ts` scans
  `test/**/*.test.ts` and `test/setup.ts` globally mocks ioredis (backend) and
  stubs `window`/`WebSocket` (frontend). Put tests under `test/`.
- `strict` is `false` in both tsconfigs; backend uses Node16 modules, frontend
  bundler ESM.
- Deep-dive docs in `document/`: `backend_test.md`, `frontend_test.md`,
  `redis.md`, `WebSocket.md`, `WebRTC.md`, `snowleopard.md`.
