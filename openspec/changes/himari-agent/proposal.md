## Why

The meeting platform delivered by `project-foundation` exists to host Himari: an AI agent that joins a meeting on request, converses in real time with a cloned voice, and presents itself as an interactive anime avatar visible to everyone in the room.

Himari is built incrementally. Each milestone adds one capability and produces a version you can run and demonstrate, rather than arriving as a single large drop at the end.

## Release ladder

Version numbers continue from `project-foundation`, because both changes describe one product.

| Version | Name | Groups | Demonstrable result |
|---|---|---|---|
| v0.7 | Himari speaks | 16, 17 | Say `/himari getup`, talk to her, she answers out loud in a default voice |
| v0.8 | Himari knows | 18 | She answers from a knowledge base and can call tools |
| v0.9 | Himari's voice | 19 | The same conversation, now in a cloned voice |
| v1.0 | Himari appears | 20, 21 | An animated avatar that lip-syncs and gestures as she speaks |

**Prerequisite:** `project-foundation` must reach v0.6. The agent joins a real LiveKit room (v0.3), is summoned through the data channel command parser (v0.4), depends on the host role for permissions (v0.5), and inherits the platform's measured latency baseline (v0.6). Starting earlier would mean building against a simulated room and rewriting afterwards.

Each milestone ships its own tests and its own Spanish documentation under `docs/`. There is no trailing "polish" phase — polish is part of every increment.

## What Changes

**v0.7 — Himari speaks**
- Agent worker as a separate deployable process, joining the room as a LiveKit participant
- Lifecycle state machine: Sleeping, Waking, Active, Dismissing
- `/himari getup` and `/himari sleep` wired to the existing command parser
- Speech pipeline: VAD, STT, LLM, TTS with an off-the-shelf voice
- Turn-taking and interruption handling
- Agent latency baseline measured and recorded

**v0.8 — Himari knows**
- Function calling with a first set of tools
- RAG over a self-hosted vector store
- Knowledge base ingestion pipeline
- Tool and retrieval latency kept off the critical response path where possible

**v0.9 — Himari's voice**
- Cloned voice through the `TTSProvider` interface, swapping the v0.7 implementation
- Explicit recorded consent for the cloned voice, enforced before any synthesis
- Streaming synthesis to keep time-to-first-audio within budget

**v1.0 — Himari appears**
- Avatar rendered client-side in a participant tile
- Lip sync driven by the agent's audio
- Gesture protocol: the LLM emits inline markers such as `[smile]`, which are stripped from spoken text and forwarded over the data channel
- Gesture queue with blended transitions

## Capabilities

### New Capabilities
- `agent-lifecycle`: Summon and dismiss, agent state machine, worker allocation, room participation
- `agent-conversation`: Realtime speech pipeline, turn-taking, function calling, RAG retrieval
- `agent-voice`: Streaming TTS behind a swappable provider, cloned voice with consent enforcement
- `agent-avatar`: Client-side avatar rendering, gesture command protocol, lip sync

### Modified Capabilities
- `chat-in-meeting`: the `/` command handler gains real handlers instead of always answering "Unknown command"
- `user-auth`: token issuance learns to mint an identity for a non-human participant
- `meeting-core`: the grid learns to render a participant whose tile is an avatar rather than a camera feed

## Impact

- New agent worker process, deployed separately from apps/web and apps/server
- New provider integrations behind the Strategy interfaces already declared in packages/shared
- Self-hosted vector store for RAG
- Additional `RoomMessage` variants for agent state and gesture commands
- Avatar assets shipped to the client, with the licensing consequences analysed in the design

## Decisions required before starting

These block specific milestones and are recorded as open questions in `design.md`:

| Decision | Blocks |
|---|---|
| Agent runtime: Python or Node.js | v0.7 |
| STT and LLM providers, self-hosted or hosted | v0.7 |
| Vector store and embedding model | v0.8 |
| Cloned-voice provider, and whether the free-tooling rule bends for it | v0.9 |
| Avatar technology: Live2D or VRM, proprietary runtime or fully open | v1.0 |

None of them block v0.7 planning, because every provider sits behind an interface. They block the moment their milestone starts.
