## Context

Real-time video conferencing platform (Google Meet-like) built on self-hosted LiveKit. Full-stack TypeScript monorepo: Next.js for the UI, Fastify for the JSON API, PostgreSQL for persistence, and the LiveKit SFU for WebRTC media routing. This is the foundation for the future AI agent (Himari), specified in the separate `himari-agent` change.

The project follows SOLID principles and uses the State, Command, Strategy, Observer, Repository, and Pipeline design patterns.

## Goals / Non-Goals

**Goals:**
- Monorepo with apps/web, apps/server, packages/shared, packages/database
- LiveKit self-hosted with Docker Compose (LiveKit Server + Redis + Coturn)
- Email/password auth, cross-origin sessions, LiveKit token issuance and refresh
- Room lifecycle: create, join by shareable link, leave, host-initiated end
- Real-time video/audio over WebRTC via LiveKit
- In-meeting chat over LiveKit data channels, with peer-relayed history for late joiners
- Ephemeral reactions and hand raise
- Host moderation: server-side mute and remove participant
- Screen sharing
- Dynamic participant grid with pin/spotlight, and a strategy for rooms larger than the grid
- Real-time UX optimization (optimistic UI, progressive reveal, adaptive quality, pre-connect audio)
- Automated tests and CI
- Code in English, docs in Spanish
- All open-source / free tools

**Non-Goals:**
- AI agent Himari (summon, realtime LLM, RAG, tools) - delivered incrementally from v0.7 in the `himari-agent` change, not in this one
- Anime avatar (Live2D / VRM) - delivered in v1.0 in the `himari-agent` change
- Voice cloning - delivered in v0.9 in the `himari-agent` change
- **Waiting room / lobby with host admission** - the only moderation feature deferred. Requires an admission queue, host notifications, waiting UI, timeouts, and a policy for a disconnected host. Cost is disproportionate to v1 value. Consequence: the meeting state machine below has no `Waiting` state.
- Meeting recording (LiveKit Egress)
- Persistent chat history in the database (chat is session-scoped, relayed peer to peer)
- Native mobile apps (responsive web only)
- End-to-end encryption beyond LiveKit's transport-level DTLS/SRTP
- Multi-node LiveKit clustering (single node in v1; Redis is already in place to allow it later)
- Grafana dashboards (Prometheus metrics are exposed, visualization deferred)

## Decisions

### Monorepo with Turborepo
**Chosen:** Turborepo with pnpm workspaces
**Rationale:** Single lint/type/test configs, shared packages, efficient caching. Mature, fast, free.
**Alternatives considered:** Nx (more complex), single package (no isolation)

### Two separate applications
**Chosen:** `apps/web` (Next.js UI, port 3000) and `apps/server` (Fastify JSON API, port 3001) as independent deployables
**Rationale:** UI and API scale, deploy, and fail independently. The API can later be consumed by other clients (native mobile, the Himari agent worker) without coupling to the web build.
**Alternatives considered:** Single Next.js app with colocated route handlers (simpler, same-origin cookies, no CORS) - rejected in favour of independent scaling.
**Cost accepted, and how it is paid:**

| Consequence | Mitigation |
|---|---|
| Cross-origin requests | Explicit CORS allowlist on `apps/server`, `credentials: true`, no wildcard origin |
| Cookies are cross-site | `SameSite=None; Secure; HttpOnly` - requires HTTPS even in local development |
| `SameSite=None` removes CSRF protection | Mandatory `Origin` header check plus double-submit CSRF token on all mutating routes |
| Two build/deploy pipelines | Turborepo task graph; CI builds both, deploys are separate |
| Shared types can drift | All request/response contracts live in `packages/shared` as zod schemas, imported by both sides |

### Fastify for the API, not Next.js
**Chosen:** Fastify for `apps/server`
**Rationale:** `apps/server` returns JSON and renders nothing. Next.js is a UI framework that also happens to route API requests; using it here would pull React, react-dom, and a frontend build pipeline into a service with no views. Fastify starts in milliseconds, has first-party plugins for exactly the concerns this API has (CORS, cookies, rate limiting, CSRF), and is MIT-licensed.
**Alternatives considered:**

| Option | Why not |
|---|---|
| Next.js API routes | Was the right answer while the plan was a single app. Once the UI and API became separate deployables, the UI framework stopped earning its place in the API |
| Hono | Genuinely appealing - tiny, Web Standards based, portable across runtimes. Rejected only because its plugin ecosystem for CSRF and rate limiting is younger than Fastify's, and both are needed here on day one |
| NestJS | Its dependency injection maps cleanly onto SOLID and the Repository pattern, but the decorator and module ceremony is a large learning cost for an API with roughly nine endpoints |

**Consequence:** two frameworks in the monorepo instead of one. Accepted, because the shared contracts live in `packages/shared` as zod schemas and the services are framework-free, so the boundary is narrow.

### Business logic isolated from the framework
**Chosen:** `apps/server/src/services/*` contains no Fastify imports; route handlers are thin adapters that parse, call a service, and serialize
**Rationale:** Enables unit testing with no HTTP server running, and keeps the framework replaceable - the same reason this decision was cheap to revisit when Next.js was swapped for Fastify. This is the Dependency Inversion principle applied at the framework boundary.

### LiveKit self-hosted with Docker Compose
**Chosen:** LiveKit Server (Go binary) + Redis + Coturn in Docker
**Rationale:** Full control, no per-minute costs, media stays in our infrastructure. Redis enables future multi-node room state. Coturn handles NAT traversal.
**Alternatives considered:** LiveKit Cloud (simpler, costs at scale), custom SFU (too complex)

### Port map
Documented explicitly because misconfigured ports are the most common self-hosting failure.

| Port | Protocol | Service | Purpose |
|---|---|---|---|
| 3000 | TCP | apps/web | UI |
| 3001 | TCP | apps/server | API |
| 7880 | TCP | LiveKit | HTTP API and WebSocket signalling |
| 7881 | TCP | LiveKit | ICE/TCP fallback for restrictive networks |
| 50000-60000 | UDP | LiveKit | WebRTC media (primary path) |
| 3478 | UDP/TCP | Coturn | STUN/TURN |
| 5349 | TCP/TLS | Coturn | TURN over TLS |
| 5432 | TCP | PostgreSQL | Database |
| 6379 | TCP | Redis | LiveKit room state |

**TURN on 443:** enterprise firewalls often allow only 443. Coturn TLS is on 5349 here because 443 is needed by the HTTPS reverse proxy. Moving TURN to 443 in production requires either a dedicated IP for Coturn or SNI-based routing at the proxy. Deferred, and recorded in Risks.

### PostgreSQL with Prisma ORM
**Chosen:** PostgreSQL + Prisma
**Rationale:** Type-safe queries, migrations, strong DX. PostgreSQL is reliable, free, and suited to relational data.
**Alternatives considered:** SQLite (not suited to concurrent writes at scale), Supabase (vendor lock-in), Drizzle (less mature ecosystem)

### Tailwind CSS + shadcn/ui
**Chosen:** Tailwind for styling, shadcn/ui for primitives
**Rationale:** shadcn/ui is copy-in source, not a dependency - fully ownable and MIT-licensed, which matches the open-source constraint. No runtime theme engine to fight when building a dense video UI.
**Alternatives considered:** MUI (heavy, opinionated), plain CSS Modules (slower iteration), `@livekit/components-react` styles alone (insufficient for a full product UI; the headless hooks are still used)

### Password hashing with argon2id
**Chosen:** argon2id, memory cost 19 MiB, iterations 2, parallelism 1 (OWASP baseline)
**Rationale:** Current recommended algorithm; resistant to GPU and side-channel attacks.
**Alternatives considered:** bcrypt (acceptable, but 72-byte input limit and weaker memory hardness), plain PBKDF2 (weakest of the three)

### Session as an HttpOnly cookie, not localStorage
**Chosen:** JWT session token in an `HttpOnly; Secure; SameSite=None` cookie
**Rationale:** `localStorage` is readable by any injected script, making XSS an immediate account takeover. `HttpOnly` removes that class of attack.
**Consequence:** `SameSite=None` is forced by the two-app split, so CSRF defence becomes mandatory rather than optional - see the CORS row above.

### Rate limiting on authentication routes
**Chosen:** Fixed-window limiter backed by Redis, applied per IP and per email
**Rationale:** Redis already exists for LiveKit, so this adds no new infrastructure. Per-email limiting is what actually stops credential stuffing; per-IP alone is trivially bypassed.

### Host role carried in the LiveKit token
**Chosen:** The room creator receives a token whose metadata declares `role: "host"`; the backend re-verifies host status against `rooms.host_id` on every moderation call
**Rationale:** The token lets the UI show host controls. The database check is what actually authorizes, because token metadata is only as trustworthy as the moment it was issued - host transfer or room end can invalidate it.
**Principle:** the client is told what it may attempt; the server decides what actually happens.

### LiveKit access token TTL of 1 hour with refresh
**Chosen:** 1-hour TTL, refreshable via `POST /api/token/refresh` while the session cookie is valid
**Rationale:** A LiveKit token is validated at connection time, so a short TTL does not protect an in-progress call - it only breaks reconnection. A 5-minute TTL would make any network drop longer than 5 minutes unrecoverable without a page reload.
**Alternatives considered:** 5 minutes (rejected, breaks reconnection), 24 hours (rejected, a leaked token grants a full day of room access)

### Two mechanisms for acting on a room
Every room feature must state which mechanism it uses. Confusing the two is how authorization bugs get written.

```
 VIA A - Server API (authoritative)      VIA B - Data channel (cosmetic)
 RoomServiceClient, backend only          publishData, peer to peer

   Browser                                  Browser
      | HTTP + session cookie                  | publishData({type:"reaction"})
      v                                        |
  +----------+                                 v
  | apps/    |  verifies host_id in DB    +---------+
  | server   |                            | LiveKit |--+ forwards verbatim,
  +----+-----+                            |  (SFU)  |  | never interprets
       | gRPC with LIVEKIT_API_SECRET     +---------+  v
       v                                          other participants
  +---------+
  | LiveKit |  applied server-side.
  |  (SFU)  |  The client cannot refuse.
  +---------+

  Use for: mute, remove participant,      Use for: chat, reactions, hand raise,
  permission updates.                     history relay.
  Cannot be forged.                       Any client can forge the payload.
                                          Never use for authorization.
```

| Feature | Mechanism | Call |
|---|---|---|
| Host mute | A | `RoomServiceClient.mutePublishedTrack` |
| Remove participant | A | `RoomServiceClient.removeParticipant` + ban record |
| Chat message | B | `publishData`, reliable |
| Reaction / hand raise | B | `publishData`, lossy |
| Chat history relay | B | `publishData`, reliable, targeted |

### Chat history via peer relay
**Chosen:** A late joiner broadcasts a history request; the longest-connected participant replies with up to 50 buffered messages, addressed only to the requester
**Rationale:** Gives newcomers context without a database, honouring the no-persistence Non-Goal. Every client already keeps the session's messages in memory.
**Alternatives considered:** No history at all (simplest, rejected - newcomers land in a conversation with no context), persisting to PostgreSQL (rejected, contradicts the Non-Goal and pulls in retention and privacy scope)
**Accepted weaknesses:** history is lost if every participant leaves; the responder sees only messages from its own join onward; a malicious peer can fabricate history. Acceptable because chat is explicitly non-authoritative in v1.

```
  C joins
     |
     |-- broadcast HISTORY_REQUEST { requesterId }
     |
     |   Each peer computes its own rank by connection time.
     |   Only rank 0 (longest connected) answers.
     |   Others start a 1500 ms timer and answer only if
     |   no HISTORY_RESPONSE for this requester was seen.
     |
     |<- HISTORY_RESPONSE { messages: [...max 50] }   (targeted at C only)
     |
     C merges by message id, sorts by timestamp, deduplicates against
     anything already received live during the handshake.

  No response within 3 s  ->  C shows "History unavailable" and continues.
```

### Single data channel with a typed envelope
**Chosen:** One LiveKit data channel carrying a discriminated union, validated with zod from `packages/shared`
**Rationale:** One transport, one parser, one place to add message types. The Himari agent will add its own variants later without a new channel.

```
type RoomMessage =
  | { type: "chat";             id, senderId, body, sentAt }
  | { type: "reaction";         id, senderId, emoji, sentAt }
  | { type: "hand";             senderId, raised: boolean }
  | { type: "history_request";  requesterId }
  | { type: "history_response"; requesterId, messages: ChatMessage[] }
```

Reliability per type: `chat` and `history_*` are sent reliably; `reaction` and `hand` are sent lossy, because a dropped emoji is preferable to head-of-line blocking on the chat stream.

### State pattern for meeting lifecycle
**Chosen:** State machine over meeting states, with the persisted `rooms.status` enum matching the machine exactly

```
   (no row)         Active            Ending            Ended
      |               |                 |                 |
  Creating -------->  |                 |                 |
  token issued,       |                 |                 |
  row inserted        |                 |                 |
                      |-- host ends --> |                 |
                      |                 |-- cleanup ----> |
                      |                                   |
                      |-- last participant leaves ------->|
```

- `Creating`: transient, in-process only. No database row exists yet, so it has no enum value.
- `Active`: participants may join, publish, and be moderated.
- `Ending`: cleanup started. New joins rejected, existing participants disconnected.
- `Ended`: terminal. `ended_at` set, all `room_participants.left_at` filled.

**Note:** an earlier draft included a `Waiting` state for a lobby. The lobby is a Non-Goal, so the state was removed rather than left unimplemented.

### Repository pattern for data access
**Chosen:** `UserRepository`, `RoomRepository`, `ParticipantRepository`, `RoomBanRepository` as interfaces in `packages/shared`, implemented in `packages/database`
**Rationale:** Abstracts persistence, enables in-memory fakes in tests, satisfies Dependency Inversion.

### Strategy pattern for media providers
**Chosen:** `TTSProvider`, `STTProvider`, `LLMProvider` interfaces defined in `packages/shared`, with no implementations in v1
**Rationale:** Future-proofing for the Himari agent. Interfaces are declared now so v1 code never hard-codes a provider assumption. Implementations land in the `himari-agent` change.

### Testing strategy
**Chosen:** Vitest for unit and integration tests, Playwright for end-to-end, in-memory repository fakes for service tests
**Rationale:** The Repository pattern is only worth its indirection if something actually substitutes the implementation - the fakes are that justification. Playwright is the only realistic way to test a two-participant WebRTC flow, since it can drive two browser contexts with fake media devices.
**Coverage targets:** services and repositories tested in isolation; one end-to-end path covering create room, join from a second context, exchange chat, share screen, and leave.

### CI with GitHub Actions
**Chosen:** GitHub Actions running lint, typecheck, unit tests, and build on every push
**Rationale:** Free for public repositories, no extra infrastructure. Turborepo caching keeps runs short. End-to-end tests run on pull requests only, since they need Docker services.

### Observability
**Chosen:** LiveKit's built-in Prometheus endpoint scraped by a Prometheus container in the Compose file; health endpoints on both apps
**Rationale:** Metrics must exist before load testing is meaningful. Dashboards are a Non-Goal for v1 - raw Prometheus queries suffice to answer "is the SFU saturated".

### Architecture overview

```
+--------------------------------------------------------------------------+
|                              MONOREPO                                     |
|                                                                           |
|  apps/web :3000 (Next.js)          apps/server :3001 (Fastify)            |
|  +---------------------------+    +----------------------------------+   |
|  | - Meet UI (grid, chat)    |    | POST /api/auth/register          |   |
|  | - LiveKit Client SDK      |    | POST /api/auth/login             |   |
|  | - Optimistic UI           |--->| POST /api/auth/logout            |   |
|  | - Data channel envelope   |CORS| POST /api/rooms                  |   |
|  | - Tailwind + shadcn/ui    |cred| POST /api/rooms/join             |   |
|  +-------------+-------------+    | POST /api/rooms/:code/end        |   |
|                |                  | POST /api/rooms/:code/mute       |   |
|                |                  | POST /api/rooms/:code/remove     |   |
|                |                  | POST /api/token/refresh          |   |
|                |                  +--------+-------------------------+   |
|                |                           |                             |
|                | WebSocket + WebRTC        | gRPC (RoomServiceClient)    |
|                | media + data channel      | LIVEKIT_API_SECRET          |
|                v                           v                             |
|  +---------------------------------------------------------------+       |
|  |                    LiveKit Server (SFU) :7880                  |       |
|  |  - WebRTC media routing        - Data channel forwarding       |       |
|  |  - Room and participant state  - Prometheus metrics            |       |
|  +----------------+------------------------+---------------------+       |
|                   |                        |                             |
|          +--------v--------+      +--------v---------+                   |
|          | Redis :6379     |      | Coturn :3478     |                   |
|          | room state      |      | NAT traversal    |                   |
|          | rate limiting   |      | TURN/TLS :5349   |                   |
|          +-----------------+      +------------------+                   |
|                                                                           |
|  +---------------------------------------------------------------+       |
|  |              PostgreSQL :5432 + Prisma                         |       |
|  |  Tables: users, rooms, room_participants, room_bans            |       |
|  +---------------------------------------------------------------+       |
|                                                                           |
|  packages/shared                    packages/database                     |
|  +---------------------------+     +------------------------------+      |
|  | - Types and zod schemas   |     | - Prisma schema              |      |
|  | - RoomMessage envelope    |     | - Migrations                 |      |
|  | - Repository interfaces   |     | - Repository implementations |      |
|  | - Provider interfaces     |     +------------------------------+      |
|  +---------------------------+                                           |
+--------------------------------------------------------------------------+
```

### Authentication and token flow

```
  Browser                    apps/server                 LiveKit
     |                            |                          |
     |-- POST /api/auth/login --->|                          |
     |   { email, password }      | argon2id verify          |
     |<-- Set-Cookie: session ----|                          |
     |    HttpOnly Secure         |                          |
     |    SameSite=None           |                          |
     |                            |                          |
     |-- POST /api/rooms -------->|                          |
     |   cookie + CSRF token      | insert room row          |
     |                            | sign LiveKit JWT         |
     |<-- { roomCode, lkToken } --|                          |
     |                            |                          |
     |-------------- connect(wsUrl, lkToken) --------------->|
     |<------------- media + data channel ------------------>|
     |                            |                          |
     |-- POST /api/token/refresh->|  before 1 h expiry       |
     |<-- { lkToken } ------------|                          |
```

LiveKit token payload:

| Claim | Value |
|---|---|
| `identity` | `user.id` |
| `name` | `user.name` |
| `metadata` | `{ "role": "host" \| "participant" }` |
| `video.room` | `room.code` |
| `video.roomJoin` | `true` |
| `video.canPublish` | `true` |
| `video.canSubscribe` | `true` |
| `video.canPublishData` | `true` |
| `ttl` | 1 hour |

The `role` claim drives UI affordances only. Every moderation endpoint independently re-checks `rooms.host_id === session.userId` before calling the Server API.

### Database schema

```
users
  id             UUID (PK)
  email          String (unique, citext)
  password_hash  String
  name           String
  created_at     DateTime
  updated_at     DateTime

rooms
  id             UUID (PK)
  code           String (unique, format xxx-xxxx-xxx)
  name           String
  host_id        UUID (FK -> users.id)
  status         Enum (active, ending, ended)
  created_at     DateTime
  ended_at       DateTime?

room_participants
  id             UUID (PK)
  room_id        UUID (FK -> rooms.id)
  user_id        UUID (FK -> users.id)
  joined_at      DateTime
  left_at        DateTime?
  INDEX (room_id, left_at)

room_bans
  id             UUID (PK)
  room_id        UUID (FK -> rooms.id)
  user_id        UUID (FK -> users.id)
  banned_by      UUID (FK -> users.id)
  banned_at      DateTime
  UNIQUE (room_id, user_id)
```

**Room code format:** `xxx-xxxx-xxx`, lowercase consonants and digits excluding visually ambiguous characters (no `l`, `1`, `0`, `o`). Ten significant characters. Generation retries on unique-constraint violation, up to 5 attempts, then fails loudly rather than looping.

**`room_bans`** exists because `removeParticipant` only disconnects; without a ban record the removed user rejoins immediately with the same code.

### Real-time UX budget

Human perception thresholds, used as the acceptance targets in the specs:

| Range | Perception | Source |
|---|---|---|
| < 150 ms | Imperceptible, natural conversation | ITU-T G.114 one-way delay recommendation |
| 150-300 ms | Acceptable for video calls | ITU-T G.114 |
| > 300 ms | Detectable in collaborative tasks | *Impact of Latency on Collaborative VR*, MDPI, 2024 |
| 300-600 ms | Noticeable but tolerable | Derived from the above |
| > 4 s | Collaborative experience breaks down | *LLM Response Delays in VR Agents*, 2025 |

The `sub-300 ms` target in `meeting-core` comes from the MDPI 2024 collaborative-task threshold.

Techniques applied in v1:

| Technique | Implementation | Impact |
|---|---|---|
| Optimistic UI | Chat message renders locally before the data channel confirms | Sub-200 ms perceived |
| Progressive reveal | Video tiles show a skeleton, then the stream | Hides join latency |
| Adaptive quality | LiveKit simulcast + adaptive bitrate + dynacast | Smooth under congestion |
| Pre-connect audio | Audio buffered before the SFU handshake completes | Faster first word |
| Connection state | Explicit connecting / reconnecting / poor-network indicators | User awareness |
| Audio-first | Audio prioritized over video in bandwidth estimation | Speech stays intelligible |
| Selective subscription | Off-screen tiles unsubscribed via adaptive stream | Bandwidth scales with visible tiles, not room size |

Further reading, retained for the agent work where latency budgets get much tighter:

- *ACE: Burstiness Control*, ACM SIGCOMM 2025 - 43% reduction in 95th-percentile latency by controlling encoder bursts
- *Adaptive SFU for WebRTC*, 2026 - freeze ratio from 40% to 5% with GCC, QP control, and keyframe caching
- *Douyin/RTM WebRTC Live Streaming*, 2025 - 54.5% latency reduction at billions of sessions per day
- *DELAY Framework*, CHI 2020 - design framework for systems with unavoidable latency
- *Interaction Snapshots*, NSF - loading results asynchronously while the user keeps interacting

### Design patterns mapping

| Pattern | Module | Purpose |
|---|---|---|
| State | `MeetingService` | Lifecycle: Creating -> Active -> Ending -> Ended |
| Command | `RoomActionCommand` | `MuteParticipantCommand`, `RemoveParticipantCommand`; later avatar gestures |
| Strategy | Provider interfaces | Future: TTS as FishAudio / OpenAI / ElevenLabs |
| Observer | `RoomEventBus` | `onParticipantJoin`, `onParticipantLeave`, `onRoomMessage` |
| Repository | Data layer | `UserRepository`, `RoomRepository`, `ParticipantRepository`, `RoomBanRepository` |
| Pipeline | `AgentProcessor` | Future: VAD -> STT -> LLM -> Tools -> TTS -> Avatar |

## Beyond v0.6: the scaling path

The platform at v0.6 is deliberately a single-node deployment. This section records how it grows, and — more importantly — **what signal justifies each step**. Scaling without a triggering measurement is how projects acquire complexity they never needed.

### Seams already in place at v0.6

None of these cost anything now; all of them are expensive to retrofit.

| Seam | Built by v0.6 because | Enables later |
|---|---|---|
| Redis holds room state | LiveKit requires it for distributed state | Adding SFU nodes is configuration, not rearchitecture |
| Services contain no framework imports | Testability | Re-hosting the API on a worker or a different runtime |
| Repository interfaces | Test doubles | Swapping the persistence layer, adding caching, read replicas |
| Session in a cookie, not server memory | Cross-origin requirement | API instances are stateless and horizontally scalable |
| Prometheus from day one | Load testing is meaningless without it | Every trigger below is a metric query |
| Provider Strategy interfaces | The Himari agent | Swapping LLM, STT, TTS without touching agent logic |
| Typed data channel envelope | One parser | New message types, including the agent's, without a new channel |

### Ordered growth, each step gated on a signal

```
   v0.6  single node
     |
     |  trigger: SFU CPU sustained above 70%, or participants
     |           reporting freezes while bandwidth is healthy
     v
   [1] Vertical: more cores on the SFU host
     |           cheapest possible step, buys real headroom
     |
     |  trigger: a single host can no longer absorb peak,
     |           or single-point-of-failure becomes unacceptable
     v
   [2] Multi-node LiveKit behind Redis
     |           Redis is already deployed. Add nodes, add a
     |           load balancer for signalling. Media routing
     |           between nodes is handled by LiveKit.
     |
     |  trigger: API p95 latency rises while the SFU is idle
     v
   [3] Horizontal API: several apps/server instances
     |           already stateless thanks to cookie sessions.
     |           Rate limiting already lives in Redis, so the
     |           counters are shared automatically.
     |
     |  trigger: database read load dominates, writes are fine
     v
   [4] PostgreSQL read replicas
     |           RoomRepository reads move to the replica,
     |           writes stay on the primary. The Repository
     |           interface is what makes this a one-file change.
     |
     |  trigger: participants in a distant region report
     |           consistently worse latency than local ones
     v
   [5] Regional SFU deployment
                 the largest step. Requires region-aware token
                 issuance and cross-region media relay.
```

### What is deliberately NOT prepared for

Preparing for these now would add complexity with no current beneficiary:

- **Sharding rooms across databases.** Room and user data is small; a single PostgreSQL instance handles it for a long time.
- **A message queue between the API and the SFU.** The Server API calls are synchronous and fast. A queue would add latency and a failure mode to solve a problem that does not exist.
- **Kubernetes.** Docker Compose is sufficient until step 2. Introducing an orchestrator before there is anything to orchestrate costs operational overhead with no benefit.
- **A CDN or edge layer.** The UI is small and the media never touches a CDN.

The rule this section encodes: **build the seam, defer the scaling.** A seam is cheap to add early and expensive to add late. The scaling itself is the opposite.

## Risks / Trade-offs

- **[Latency under load]** LiveKit benchmarks report roughly 150 participants per room on 16 cores. Prometheus metrics are in place from day one; load testing before any production claim.
- **[NAT traversal failures]** Coturn with TCP and TLS fallback. TURN is on 5349 rather than 443, so networks that permit only 443 will still fail. Accepted for v1; production needs a dedicated IP or SNI routing for Coturn.
- **[Cross-origin session complexity]** The two-app split forces `SameSite=None`, which removes the browser's built-in CSRF protection. Mitigated by mandatory Origin checks and double-submit tokens - but this is now a correctness requirement, not a hardening nicety. A single-app layout would not have this risk.
- **[HTTPS required in local development]** `Secure` cookies do not work over plain HTTP across origins. Local setup needs mkcert or a proxy with TLS, which adds onboarding friction. Documented in `docs/development-guide.md`.
- **[Peer-relayed chat history]** History vanishes if all participants leave, and a malicious peer can fabricate it. Acceptable while chat carries no authority. If chat ever gates a decision, this must move server-side.
- **[Grid beyond 6 participants]** Naive rendering of every tile saturates both CPU and bandwidth. Mitigated by paginating to a maximum of 9 visible tiles plus active-speaker promotion and adaptive stream unsubscription.
- **[Single LiveKit node]** No horizontal scale in v1. Redis is deployed so that adding nodes is configuration rather than rearchitecture.
- **[Monorepo complexity]** Turborepo caching with strict per-package ESLint and tsconfig. CI catches cross-package breakage.
- **[No E2E encryption]** LiveKit provides DTLS/SRTP transport encryption. End-to-end encryption is out of scope.
- **[Host disconnection]** If the host drops, the room stays `Active` and nobody can moderate. v1 accepts this; host transfer is deferred.
