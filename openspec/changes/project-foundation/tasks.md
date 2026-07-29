Everything lives in a **single git repository**. `apps/web` and `apps/server` are separate deployables inside it, not separate repos.

Each numbered group maps to one branch, named `feat/<group-slug>`. The user performs every git operation — init, branch, commit, push, pull, merge, tag. Assistant work stops at the file changes.

## Release ladder

Every milestone is a runnable, demonstrable state. Do not start the next milestone until the acceptance check of the current one passes on real hardware, not in theory. The user tags each milestone.

The ladder spans two changes. `project-foundation` delivers v0.1 through v0.6; `himari-agent` continues from v0.7 to v1.0. Version numbers are continuous across both, because they describe one product.

| Version | Name | Change | Groups | What it proves |
|---|---|---|---|---|
| v0.1 | Infra alive | foundation | 0, 1, 2 | The stack boots and WebRTC actually traverses the network |
| v0.2 | Accounts | foundation | 3, 4 | A user can register, log in, and the session survives cross-origin |
| **v0.3** | **First call** | foundation | 5, 6, 7 | **Two people see and hear each other in a room they created** |
| v0.4 | Full room | foundation | 8, 9, 10 | Chat, history relay, reactions |
| v0.5 | Control | foundation | 11, 12 | Moderation and screen sharing |
| v0.6 | Platform hardened | foundation | 13, 14, 15 | Measured, tested, documented — a shippable meeting platform |
| v0.7 | Himari speaks | himari-agent | 16, 17 | The agent joins on command and holds a spoken conversation |
| v0.8 | Himari knows | himari-agent | 18 | Tools and RAG |
| v0.9 | Himari's voice | himari-agent | 19 | Cloned voice |
| v1.0 | Himari appears | himari-agent | 20, 21 | Animated avatar with gesture control |

v0.3 is the milestone that matters most. Every architectural assumption in this design — the two-app split, cross-origin cookies, token issuance, the SFU configuration — is either validated or refuted there. Reaching it before building chat, reactions, or moderation is deliberate: a flaw found at v0.3 costs one refactor, the same flaw found at v0.6 costs six.

**Why the agent cannot start earlier.** Himari joins a LiveKit room as a participant, so a working room is a hard prerequisite (v0.3). It is summoned with `/himari getup`, so the data channel and command parser are prerequisites (v0.4). Its permissions depend on the host role, so moderation is a prerequisite (v0.5). Building the agent before these exist would mean building it against a simulated room and rewriting it afterwards.

**Why v0.6 comes before the agent.** The agent multiplies every latency and reliability problem the platform already has. Tuning and testing the platform first means that when the agent responds slowly, you know it is the agent — not the SFU, not the network, not the reconnection logic.

---

# v0.1 — Infra alive

**Deliverable:** `make up` brings up the whole stack; both apps answer their health endpoint; two browsers exchange video through the self-hosted SFU.

**Acceptance check:** open two browsers on different machines, or one on a mobile network, and confirm media flows. Same-machine testing hides every NAT problem.

## 0. Repository setup — done by the user, before anything else

- [ ] 0.1 `git init` in the project root
- [ ] 0.2 Create the GitHub repository and add it as `origin`
- [ ] 0.3 Commit the current `openspec/` planning artifacts as the first commit on `main`
- [ ] 0.4 Protect `main` so feature branches merge through pull requests

## 1. Monorepo scaffold — `feat/monorepo-scaffold`

- [ ] 1.1 Initialize pnpm workspace with turbo.json task graph (build, lint, typecheck, test)
- [ ] 1.2 Create apps/web with Next.js App Router + TypeScript, port 3000
- [ ] 1.3 Create apps/server with Fastify + TypeScript, port 3001, no React dependencies
- [ ] 1.4 Create packages/shared with types, zod schemas, and constants
- [ ] 1.5 Create packages/database with the Prisma workspace
- [ ] 1.6 Configure shared ESLint, TypeScript, and Prettier presets consumed by every package
- [ ] 1.7 Add Tailwind CSS and shadcn/ui to apps/web with base theme tokens
- [ ] 1.8 Add .gitignore, .env.example with every required variable documented, and README.md
- [ ] 1.9 Add env var validation at startup in both apps, failing fast on missing values
- [ ] 1.10 Set up local HTTPS with mkcert for both apps, required by `Secure` cross-site cookies

## 2. LiveKit self-hosted infrastructure — `feat/livekit-infra`

Brought up in layers. Each layer ends in a checkpoint that must pass before the next one starts. Turning everything on at once means a media failure has six simultaneous suspects — ports, Redis, Coturn, firewall, SFU config, client network. Layered bring-up leaves exactly one suspect at a time.

**Layer A — SFU alone, loopback**
- [ ] 2.1 Add LiveKit Server to docker-compose.yml with dev keys, no Redis, no TURN
- [ ] 2.2 Configure livekit.yaml with the documented port map: 7880 TCP API, 7881 TCP ICE, 50000-60000 UDP media
- [ ] 2.3 **Checkpoint A:** two tabs on the same machine exchange video. Proves the SFU and the port map. Fails here means the container or the port mapping is wrong, nothing else.

**Layer B — Room state in Redis**
- [ ] 2.4 Add Redis to the Compose file and point LiveKit at it
- [ ] 2.5 **Checkpoint B:** restart the LiveKit container mid-call and confirm room state is reconstructed from Redis rather than lost. Proves the state backend and unblocks multi-node later.

**Layer C — Real network, no TURN**
- [ ] 2.6 Expose the UDP media range on the host and document the firewall rules
- [ ] 2.7 **Checkpoint C:** two devices on the same LAN, different machines, exchange video. Proves host networking and the UDP range. Still no NAT traversal involved.

**Layer D — NAT traversal**
- [ ] 2.8 Add Coturn to the Compose file on 3478 UDP/TCP with shared-secret auth
- [ ] 2.9 **Checkpoint D:** one device on mobile data, one on wifi, exchange video. Proves STUN and TURN over UDP. This is the layer that most self-hosted deployments get wrong.

**Layer E — Restrictive network fallback**
- [ ] 2.10 Configure Coturn TLS on 5349 and LiveKit ICE/TCP on 7881
- [ ] 2.11 **Checkpoint E:** block UDP outbound on one client and confirm the call still connects over TCP/TLS. Proves the fallback path that corporate networks force.

**Layer F — Operability**
- [ ] 2.12 Add PostgreSQL and Prometheus to the Compose file
- [ ] 2.13 Configure the Prometheus scrape job against the LiveKit metrics endpoint
- [ ] 2.14 Add health endpoints to apps/web and apps/server, and healthchecks to every Compose service
- [ ] 2.15 Add Makefile targets for up, down, logs, reset
- [ ] 2.16 **Checkpoint F:** `make down && make up` reaches a fully healthy stack unattended, and Prometheus is scraping SFU metrics
- [ ] 2.17 Record which checkpoint each configuration decision came from, in docs/livekit-setup.md

**Tag `v0.1` when the acceptance check passes.**

---

# v0.2 — Accounts

**Deliverable:** a user can register, log in, and stay authenticated across the two origins.

**Acceptance check:** log in on apps/web, confirm the session cookie reaches apps/server on a subsequent request, then confirm a request forged from a different origin is rejected.

## 3. Database and repositories — `feat/database`

- [ ] 3.1 Define the Prisma schema for users, rooms, room_participants, room_bans
- [ ] 3.2 Add the `rooms.status` enum (active, ending, ended) and the (room_id, left_at) index
- [ ] 3.3 Declare repository interfaces in packages/shared: User, Room, Participant, RoomBan
- [ ] 3.4 Implement UserRepository over Prisma: findById, findByEmail, create
- [ ] 3.5 Implement RoomRepository: create, findByCode, updateStatus, endRoom
- [ ] 3.6 Implement ParticipantRepository: join, markLeft, markAllLeft, listActive
- [ ] 3.7 Implement RoomBanRepository: ban, isBanned
- [ ] 3.8 Implement in-memory fakes of all four repositories for use in service tests
- [ ] 3.9 Create the initial migration and a seed script with two test users
- [ ] 3.10 Unit-test every repository against a disposable PostgreSQL instance

## 4. Authentication — `feat/auth`

- [ ] 4.1 Implement argon2id hashing helper with the OWASP baseline parameters
- [ ] 4.2 Implement AuthService with register, login, and logout, containing no Fastify imports
- [ ] 4.3 Implement POST /api/auth/register with a minimum 12-character password rule
- [ ] 4.4 Implement POST /api/auth/login issuing an HttpOnly, Secure, SameSite=None session cookie
- [ ] 4.5 Implement POST /api/auth/logout clearing the session
- [ ] 4.6 Return an identical generic error for unknown email and wrong password
- [ ] 4.7 Implement a Redis-backed rate limiter, applied per IP and per email
- [ ] 4.8 Implement the CORS layer with an explicit origin allowlist and credentials enabled
- [ ] 4.9 Implement Origin verification plus double-submit CSRF tokens on all mutating routes
- [ ] 4.10 Implement the session middleware for protected routes
- [ ] 4.11 Build the login page UI
- [ ] 4.12 Build the registration page UI with inline validation
- [ ] 4.13 Unit-test AuthService against the in-memory user repository
- [ ] 4.14 Test that CSRF rejection and rate limiting actually trigger

**Tag `v0.2` when the acceptance check passes.**

---

# v0.3 — First call

**Deliverable:** a user creates a room, shares the link, a second user joins, and they see and hear each other.

**Acceptance check:** two people on different networks complete a call, then one leaves and `left_at` is recorded. This is the milestone that validates the architecture. If cross-origin tokens, TURN traversal, or the two-app split are wrong, they fail here.

## 5. LiveKit tokens — `feat/livekit-tokens`

- [ ] 5.1 Implement TokenService signing LiveKit JWTs with a 1-hour TTL
- [ ] 5.2 Include identity, display name, room grants, and `role` metadata in the payload
- [ ] 5.3 Implement POST /api/token/refresh, rejecting rooms that are not active
- [ ] 5.4 Implement client-side scheduled refresh at 5 minutes before expiry
- [ ] 5.5 Verify LIVEKIT_API_SECRET is absent from the client bundle
- [ ] 5.6 Unit-test token claims and TTL, including the host and participant role branches

## 6. Room lifecycle — `feat/room-lifecycle`

- [ ] 6.1 Implement the room code generator in the `xxx-xxxx-xxx` format, excluding ambiguous characters
- [ ] 6.2 Implement collision retry, capped at 5 attempts, failing loudly afterwards
- [ ] 6.3 Implement MeetingService as a state machine over Creating, Active, Ending, Ended
- [ ] 6.4 Implement POST /api/rooms create, returning roomCode, join URL, and lkToken
- [ ] 6.5 Implement POST /api/rooms/join with validation of status and ban list
- [ ] 6.6 Implement POST /api/rooms/:code/end, host-only, disconnecting every participant
- [ ] 6.7 Implement the LiveKit webhook receiver for participant_joined and participant_left
- [ ] 6.8 Set `left_at` from the webhook, and end the room when the last participant leaves
- [ ] 6.9 Build the lobby page with create and join actions plus copyable link
- [ ] 6.10 Build the meeting page shell and route
- [ ] 6.11 Unit-test every state transition, including rejected ones

## 7. Meeting UI and media — `feat/meeting-ui`

- [ ] 7.1 Create the useLiveKitRoom hook for connect, disconnect, tracks, and participants
- [ ] 7.2 Implement RoomEventBus applying the Observer pattern over LiveKit room events
- [ ] 7.3 Build the pre-join screen with camera preview and device selection
- [ ] 7.4 Persist the selected devices across sessions
- [ ] 7.5 Handle denied camera permission by joining audio-only with a retry path
- [ ] 7.6 Handle absent microphone by joining in listen-only mode
- [ ] 7.7 Handle mid-meeting device disconnection with fallback to the next device
- [ ] 7.8 Build ParticipantTile with video, audio indicator, name, and host badge
- [ ] 7.9 Build GridLayout with auto-arrangement for 1 to 9 participants
- [ ] 7.10 Implement pagination beyond 9 participants with active-speaker promotion
- [ ] 7.11 Implement adaptive stream so off-screen video tracks are unsubscribed
- [ ] 7.12 Build the media controls bar: mute, camera, leave
- [ ] 7.13 Implement pin and spotlight, excluding pinned participants from pagination
- [ ] 7.14 Implement the active speaker indicator
- [ ] 7.15 Build the people panel listing participants, mute state, and host badge
- [ ] 7.16 Implement the leave flow with `left_at` recording

**Tag `v0.3` when the acceptance check passes. Stop and reassess the design before continuing.**

---

# v0.4 — Full room

**Deliverable:** participants chat, late joiners receive history, and reactions work.

**Acceptance check:** three participants; the third joins mid-conversation and sees prior messages; the peer that answered the history request then leaves and a fourth participant still receives history from someone else.

## 8. Data channel foundation — `feat/data-channel`

- [ ] 8.1 Define the RoomMessage discriminated union and zod schemas in packages/shared
- [ ] 8.2 Implement the publish helper with per-type reliable and lossy modes
- [ ] 8.3 Implement the receive handler that validates and silently discards malformed payloads
- [ ] 8.4 Ignore unrecognized message types so older clients survive newer senders
- [ ] 8.5 Attribute every message to the LiveKit sender identity rather than the payload field
- [ ] 8.6 Unit-test the envelope with valid, malformed, and unknown-type payloads

## 9. In-meeting chat — `feat/chat`

- [ ] 9.1 Implement chat send with optimistic rendering in a pending state
- [ ] 9.2 Implement delivery confirmation and the failure indicator with retry
- [ ] 9.3 Reject empty messages and enforce the 2000-character limit
- [ ] 9.4 Implement chat receive with real-time rendering
- [ ] 9.5 Implement the in-memory session buffer capped at 50 messages
- [ ] 9.6 Implement history_request broadcast on join, skipped when the room is empty
- [ ] 9.7 Implement responder election by connection time, with a 1500 ms fallback timer
- [ ] 9.8 Implement the targeted history_response, truncated to 50 messages
- [ ] 9.9 Implement merge by id with timestamp sorting and deduplication
- [ ] 9.10 Implement the 3-second timeout showing "History unavailable"
- [ ] 9.11 Implement `/` command parsing, `//` escaping, and the local-only "Unknown command" reply
- [ ] 9.12 Build ChatPanel with message list, input, and unread badge
- [ ] 9.13 Test the history relay with three simulated peers, including responder failure

## 10. Reactions and hand raise — `feat/reactions`

- [ ] 10.1 Define the allowed emoji set in packages/shared
- [ ] 10.2 Implement reaction send in lossy mode with a 5-per-3-seconds throttle
- [ ] 10.3 Implement the 3-second reaction animation over the sender's tile
- [ ] 10.4 Discard reactions carrying emoji outside the allowed set
- [ ] 10.5 Implement raise and lower hand with persistent state
- [ ] 10.6 Re-broadcast raised-hand state when a new participant joins
- [ ] 10.7 Clear hand state when a participant disconnects
- [ ] 10.8 Order raised hands by raise time in the people panel
- [ ] 10.9 Build the reaction picker and hand-raise controls

**Tag `v0.4` when the acceptance check passes.**

---

# v0.5 — Control

**Deliverable:** the host can moderate, and anyone can present.

**Acceptance check:** the host mutes a participant who then cannot unmute themselves from the SFU's perspective; the host removes a participant who then fails to rejoin with the same link; a screen share is legible to a viewer on a constrained connection.

## 11. Host moderation — `feat/moderation`

- [ ] 11.1 Implement the host authorization guard checking `rooms.host_id` on every moderation route
- [ ] 11.2 Implement the RoomServiceClient wrapper, server-side only
- [ ] 11.3 Implement MuteParticipantCommand applying the Command pattern
- [ ] 11.4 Implement POST /api/rooms/:code/mute, treating a missing audio track as a no-op success
- [ ] 11.5 Implement mute-all, tolerating individual failures without aborting the batch
- [ ] 11.6 Show the muted participant that the host muted them, distinct from self-mute
- [ ] 11.7 Implement RemoveParticipantCommand writing the ban record before disconnecting
- [ ] 11.8 Implement POST /api/rooms/:code/remove, rejecting self-removal by the host
- [ ] 11.9 Enforce the ban check on the join path
- [ ] 11.10 Show the removed participant an explicit removal message rather than a connection error
- [ ] 11.11 Render host-only controls in the people panel, gated on the role claim
- [ ] 11.12 Emit structured audit logs for every moderation attempt, successful or not
- [ ] 11.13 Test that a non-host calling the endpoints directly is rejected before any LiveKit call

## 12. Screen sharing — `feat/screen-share`

- [ ] 12.1 Implement screen share publish via getDisplayMedia as a separate `screen_share` track
- [ ] 12.2 Keep the camera track published alongside the share
- [ ] 12.3 Configure the encoding for detail over frame rate
- [ ] 12.4 Handle picker cancellation without an error state
- [ ] 12.5 Handle denied display-capture permission with guidance
- [ ] 12.6 Reject a second concurrent share with an explanatory message
- [ ] 12.7 Implement stop from the app control
- [ ] 12.8 Detect the browser's native stop bar via the track `ended` event
- [ ] 12.9 Auto-focus the share as the primary tile for all participants
- [ ] 12.10 Implement pin and per-viewer manual unfocus
- [ ] 12.11 Exempt the screen share track from pagination unsubscription

**Tag `v0.5` when the acceptance check passes.**

---

# v0.6 — Platform hardened

**Deliverable:** the platform is resilient, measured, tested, documented, and ready to host the Himari agent.

This is the last milestone in `project-foundation`. From v0.7 onward the work continues in the `himari-agent` change, which builds on everything below.

**Acceptance check:** CI is green; the end-to-end suite passes; measured join-to-first-frame is within the documented budget; a newcomer can set up the project from `docs/development-guide.md` alone.

## 13. Real-time UX — `feat/realtime-ux`

Measure first, then tune one knob at a time, then measure again. Applying nine optimizations at once tells you the result but never which change produced it — and never which one made things worse.

**Baseline before tuning**
- [ ] 13.1 Build a repeatable measurement harness recording join-to-first-frame, publish-to-render, and reconnect duration
- [ ] 13.2 Record the untuned baseline under three conditions: good network, throttled bandwidth, and 5% packet loss
- [ ] 13.3 Review the LiveKit release notes for the version in use and list which realtime features are available; do not assume from memory, verify against current documentation

**Resilience — correctness before speed**
- [ ] 13.4 Implement connection state indicators: connecting, reconnecting, poor network
- [ ] 13.5 Implement automatic reconnection with token refresh on expiry
- [ ] 13.6 Surface an explicit failure state with manual rejoin after 30 seconds of failed reconnection
- [ ] 13.7 Add error boundaries around media components
- [ ] 13.8 Re-measure reconnect duration and confirm no regression in join time

**One knob at a time, re-measuring after each**
- [ ] 13.9 Enable simulcast. Measure. Keep only if it improves the throttled and lossy conditions
- [ ] 13.10 Enable dynacast. Measure. Confirm it reduces upstream bandwidth with off-screen subscribers
- [ ] 13.11 Enable adaptive stream for off-screen tiles. Measure with 12 participants
- [ ] 13.12 Prioritize audio over video in bandwidth estimation. Measure audio continuity under packet loss
- [ ] 13.13 Implement pre-connect audio buffering. Measure time to first audible word
- [ ] 13.14 Apply any additional realtime features identified in 13.3, one at a time, measuring each

**Perceived latency, which measurement will not capture**
- [ ] 13.15 Add loading skeletons to video tiles awaiting a stream
- [ ] 13.16 Verify perceived join feels immediate even when measured join time is unchanged

**Result**
- [ ] 13.17 Publish the before-and-after table in docs/realtime-ux.md, naming which knob produced which gain and which produced nothing

## 14. Testing and CI — `feat/testing-ci`

- [ ] 14.1 Configure Vitest across all packages with shared setup
- [ ] 14.2 Configure Playwright with fake media devices and two browser contexts
- [ ] 14.3 Write the end-to-end path: create room, join from a second context, chat, screen share, leave
- [ ] 14.4 Write the end-to-end moderation path: host mutes, host removes, removed user cannot rejoin
- [ ] 14.5 Add the GitHub Actions workflow for lint, typecheck, unit tests, and build
- [ ] 14.6 Add the pull-request workflow running end-to-end tests with Docker services
- [ ] 14.7 Enable Turborepo remote-independent caching in CI

## 15. Documentation — `feat/docs`

- [ ] 15.1 Write docs/architecture.md in Spanish, covering the two-app split and its consequences
- [ ] 15.2 Write docs/livekit-setup.md in Spanish, covering the port map, Coturn, and the TURN-on-443 limitation
- [ ] 15.3 Write docs/development-guide.md in Spanish, including the mkcert HTTPS requirement
- [ ] 15.4 Write docs/realtime-ux.md in Spanish, documenting the latency budgets and their sources
- [ ] 15.5 Write docs/moderation.md in Spanish, explaining Server API versus data channel
- [ ] 15.6 Add JSDoc to public interfaces and exported services, in English

**Tag `v0.6` when the acceptance check passes. The platform is now shippable on its own; `himari-agent` continues from v0.7.**
