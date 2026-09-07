# AGENTS.md

This file contains essential information for working with this repository to avoid common mistakes and accelerate onboarding.

## Repository Structure

This is a monorepo with the following packages:
- `packages/backend` - Node.js/Express backend with WebSocket server
- `packages/frontend` - Frontend with TypeScript/Vite

## Key Commands

- `pnpm backend` - Start backend server
- `pnpm frontend` - Start frontend dev server
- `pnpm snowleopard` - Build frontend for snowleopard target

## Environment Setup

- Uses pnpm as package manager
- Requires `.env` file in root for configuration
- Backend requires SSL keys in `keys/chat/` directory

## Backend Details

- Uses ioredis for Redis integration
- Implements stream-based data handling with Redis buffers
- Features night mode functionality that pauses data collection during quiet hours
- Uses MongoDB for archival of stream data during night mode transitions
- Implements scenario execution system with `scenarioItsuki`

## Frontend Details

- Uses Web Audio API for audio processing
- Implements WebSocket communication with backend
- Supports various audio modes including CHAT, FEEDBACK, SINEWAVE, etc.
- Uses face-api.js for facial recognition features
- Implements WebRTC for media streaming

## Important Notes

- The system uses Redis for real-time state persistence and MongoDB for archival
- Night mode functionality affects stream handling and scenario execution
- Stream data is stored in Redis with specific key patterns
- Record index management prevents conflicts during restarts
- Backend requires HTTPS server with SSL certificate
- The scenario mode can be enabled via SCENARIO=true environment variable

## Testing

- Unit tests use Vitest
- Backend tests can be run with `pnpm test` in backend package
- Frontend tests can be run with `pnpm test` in frontend package