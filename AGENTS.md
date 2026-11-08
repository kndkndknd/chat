# AGENTS.md

Real-time audiovisual chat: Node/Express + raw WebSocket backend and a
browser/Vite TypeScript frontend. pnpm monorepo (`packages/*`). `README.md` is
the detailed long-form reference (Japanese); some notes are stale, so verify
runtime details against the source.

## Commands

- Install: `pnpm install` (root).
- Backend dev: `pnpm -F backend dev` (`tsx src/app.ts`); watch: `pnpm -F backend watch`.
  Do **not** use the backend `backend` script (`ts-node` is not installed) or bare
  `pnpm backend` (the root alias only forwards to `pnpm -F backend` and needs a script).
- Frontend dev: `pnpm -F frontend dev` (Vite).
- Frontend build (emits into backend): `pnpm -F frontend build` ->
  `packages/backend/static` (`html/index.html`, `html/snowleopard.html`, worklets).
  For full-stack work build the frontend, then run the backend; the Vite dev proxy
  cannot reach the real `/ws`.
- Backend build/start: `pnpm -F backend build` then `pnpm -F backend start`
  (`tsc` + `scripts/copyJsonAssets.mjs` -> `dist/app.js`).
- No lint script. `pnpm -F backend build` is the typecheck; `pnpm -F frontend build`
  does **not** typecheck.
- Tests (vitest; Redis/browser mocked, no services needed):
  - watch: `pnpm -F backend test` / `pnpm -F frontend test`.
  - one-shot / single file: `pnpm -F <pkg> exec vitest run test/<path>.test.ts`.

Root aliases forward a script name: `pnpm backend dev` == `pnpm -F backend dev`.
Root `arduino`/`snowleopard` filters point to missing packages; frontend
`snow`/`snowleopard` scripts call webpack with no config/dependency. Use Vite.

## Architecture

- Backend entry `packages/backend/src/app.ts`: HTTPS server + `socket/wsServer.ts`
  mounting a raw `ws` server at `/ws`. There is no socket.io (root
  `socket.io-client` and the Vite `/socket.io` proxy are legacy). In-memory state
  under `state/` persists to Redis as `state:*`; `data/` defines default streams
  `PLAYBACK`, `TIMELAPSE`, `EMPTY` (plus `CHAT`).
- Frontend entry `packages/frontend/src/main.ts`; `snowleopardMain.ts` +
  `scriptProcessor/` is the Safari/legacy fallback. `socket/SocketFacade.ts`
  wraps WebSocket with ArrayBuffer-aware JSON (`__type: "ArrayBuffer"`, base64).
- The URL path is a feature flag used across the frontend (`main.ts`,
  `initialize.ts`, `textInput.ts`, ...) and `backend/src/clientSetting/connectFromClient.ts`.
  `/1` `/2` `/3` force fixed indexes (`/3` = hanged); README has the mode table.
- `types/` is a shared hand-written `.d.ts` package (`@types/chat`) imported by
  relative path from both sides (depth varies). Edit it directly; it is not published.
- Rust/wasm crates `crate/` (`tuner`) and `packages/frontend/crate/` (`simulate`)
  are built manually (wasm-pack is not wired into scripts). Generated glue
  `packages/frontend/src/wasm/simulate.js` is tracked.

## Environment / runtime

- `app.ts` loads `.env` from the repo root: `DB_HOST`, `LOCAL_SERVER_PORT`
  (default 8888). Other env: `REDIS_URL` (default `redis://localhost:6379`),
  `MONGO_URL`, `MONGO_DB`. `SCENARIO` is read but currently unused. HTTP control
  endpoints: `POST /api/scenario`, `/api/clear-buffer`, `/api/parameter/reset`.
- TLS keys are read from `<repo>/../keys/chat/` (`private.key` + `selfsigned.crt`,
  passphrase `chat`). Missing certs crash startup; they are outside the repo.
  CINEMA HLS is served from `<repo>/../hls`.
- Redis (ioredis) holds live state/buffers (`state:*`). Mongo helpers exist under
  `src/mongo/`, but the night-mode archive/restore path is absent/commented out.
  `docker/docker-compose.yml` runs Redis + an nginx TLS proxy to backend `:8888`.
- Frontend env lives in `packages/frontend/`; `VITE_CHAT_SYNC_URL` (default
  `wss://chat.knd.cloud/ws`) is baked at build time for `/webrtc`.

## Gotchas

- `.gitignore` ignores `*.js` (and `*.map`) repo-wide. Keep
  `packages/frontend/src/wasm/simulate.js` (wasm-bindgen glue imported by
  `audioWorklet/simulateWorklet.ts`) tracked; new JS assets need `git add -f`.
- `packages/backend/static` receives generated JS/HTML/worklets (gitignored);
  edit sources under `packages/frontend/{html,src,public}` instead.
- Tests target pure/state-read logic only. `test/setup.ts` mocks ioredis (backend)
  and stubs `window`/`WebSocket` (frontend); individual tests mock other I/O.
  Put tests under `<pkg>/test/`.
- `strict` is `false` in both tsconfigs; backend is Node16 modules, frontend
  bundler ESM.
- Backend `scripts/` are manual (`pnpm -F backend exec tsx scripts/<name>.ts`),
  not package scripts.
- Deep-dive docs in `document/` (e.g. `backend_test.md`, `frontend_test.md`,
  `redis.md`, `WebSocket.md`, `WebRTC.md`, `snowleopard.md`, `faceDetect.md`,
  `videoBuffer.md`, `cinema.md`); quantize notes in `document/frontend/`.
