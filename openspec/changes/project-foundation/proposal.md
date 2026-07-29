## Why

Build a real-time video conferencing platform similar to Google Meet, powered by self-hosted LiveKit, with a modern full-stack TypeScript architecture. The platform will be the foundation for future AI agent features (Himari) including interactive anime avatars, voice cloning, RAG, and real-time LLM capabilities, specified separately in the `himari-agent` change.

## What Changes

- Scaffold monorepo with apps/web (Next.js UI, port 3000), apps/server (Fastify JSON API, port 3001), packages/shared, packages/database
- LiveKit self-hosted server setup with Docker Compose (LiveKit Server + Redis + Coturn)
- User authentication, session management, and LiveKit access token issuance with host role grants
- Room lifecycle: create, join via shareable link, leave, and host-initiated end
- Video conferencing UI with real-time audio/video, dynamic grid, pin, and spotlight
- In-meeting text chat over LiveKit data channels, with peer-relayed history for late joiners
- Ephemeral reactions and hand raise over the same data channel
- Host moderation: server-side mute and remove participant via LiveKit Server API
- Screen sharing with automatic focus
- Real-time UX optimized (optimistic UI, progressive reveal, adaptive quality, pre-connect audio)
- Automated tests and CI pipeline
- All code in English, end-user documentation in Spanish under docs/
- Design patterns: State, Command, Strategy, Observer, Repository, Pipeline
- SOLID principles throughout

## Capabilities

### New Capabilities
- `meeting-core`: Real-time video/audio conferencing with LiveKit WebRTC, room lifecycle, participant management, media device handling, grid layout
- `user-auth`: Authentication with email/password, session management, LiveKit access token issuance and refresh, host role grants
- `chat-in-meeting`: In-meeting text chat over LiveKit data channels, with peer-relayed history and command prefix detection
- `room-reactions`: Ephemeral emoji reactions and hand raise over the data channel
- `room-moderation`: Host-only authoritative actions via the LiveKit Server API (mute, remove participant)
- `screen-share`: Screen sharing with automatic focus and pin support

### Modified Capabilities
None - this is the initial project foundation.

## Impact

- New monorepo with packages for web frontend, API backend, shared types, and database
- LiveKit self-hosted infrastructure (Docker, Redis, Coturn TURN)
- PostgreSQL database for users, rooms, participants, and room bans
- Cross-origin session handling between apps/web and apps/server
- Real-time communication infrastructure (STUN/TURN, WebRTC, data channels)
- Future agent features (Himari, avatar, voice cloning, RAG) deferred to the `himari-agent` change
