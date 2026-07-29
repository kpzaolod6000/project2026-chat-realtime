## Context

Himari is an AI agent that joins a LiveKit meeting as a participant. Users summon it from the meeting chat with `/himari getup` and dismiss it with `/himari sleep`. While active it converses in real time, can call tools, retrieves from a knowledge base, speaks with a cloned voice, and is displayed as an animated anime avatar whose gestures are driven by markers the LLM emits inline in its own responses.

Research was conducted in July 2026; provider pricing and model names must be re-verified before each milestone that depends on them.

## Incremental delivery

Himari is delivered across four milestones, v0.7 to v1.0, continuing the version ladder from `project-foundation`. Each is runnable and demonstrable on its own.

```
  v0.7  Himari speaks
        +-- worker joins the room on /himari getup
        +-- VAD -> STT -> LLM -> TTS, off-the-shelf voice
        +-- she answers out loud. Ugly voice, no memory, no face.
        |
        |   proves: lifecycle, room participation, the whole speech
        |           loop, and the real latency of a full turn
        v
  v0.8  Himari knows
        +-- function calling
        +-- RAG over a self-hosted vector store
        |
        |   proves: she says correct things, not just fluent things
        v
  v0.9  Himari's voice
        +-- swap TTSProvider for a cloned voice
        |
        |   proves: the Strategy interface was worth declaring.
        |           One implementation changes, nothing else does.
        v
  v1.0  Himari appears
        +-- avatar tile, lip sync
        +-- gesture markers parsed out of the LLM output
            proves: the complete product vision
```

**Why this order and not another.** Voice quality and a face are what make the agent feel alive, so the temptation is to build them first. That would be a mistake: a beautiful avatar lip-syncing to a broken conversation is worthless, and every latency problem would be hidden behind three layers of new machinery. The order above front-loads the parts that can fail structurally and defers the parts that are cosmetic replacements of something already working.

**Why v0.9 is cheap.** By the time the cloned voice arrives, `TTSProvider` has a working implementation and a measured latency baseline. Swapping it is one new class and one config change. If that turns out not to be true, the interface was wrong and v0.7 should be revisited.

## Goals / Non-Goals

**Goals:**
- Chat-driven lifecycle: `/himari getup`, `/himari sleep`
- Agent participates as a normal LiveKit participant, audible to everyone
- Realtime LLM with function calling and RAG
- Gesture markers in the LLM output drive avatar animation
- Cloned voice through a streaming TTS provider
- Every provider swappable behind the Strategy interfaces from `project-foundation`
- Each milestone ships its own tests and Spanish documentation

**Non-Goals for the first agent iteration:**
- Multiple simultaneous agents in one room
- Agent-initiated speech without being addressed
- Agent seeing participant video (audio and text only)
- Avatar reacting to participant emotion
- Persistent agent memory across meetings

## Architecture

```
   Meeting room                          Agent worker (separate process)
 +---------------------+               +-----------------------------------+
 | User types          |               |                                   |
 | /himari getup       |               |   +---------------------------+   |
 +----------+----------+               |   | State machine             |   |
            |                          |   | Sleeping -> Waking ->     |   |
            | data channel             |   | Active -> Dismissing      |   |
            v                          |   +---------------------------+   |
 +---------------------+   dispatch    |                                   |
 | apps/server         |-------------->|   +---------------------------+   |
 | command handler     |               |   | Pipeline                  |   |
 | verifies + allocates|               |   |  VAD                      |   |
 +---------------------+               |   |   -> STT                  |   |
                                       |   |   -> LLM (+tools, +RAG)   |   |
 +---------------------+               |   |   -> gesture parser       |   |
 | LiveKit room        |<==============|   |   -> TTS (cloned voice)   |   |
 |                     |  audio track  |   +---------------------------+   |
 |                     |<--------------|                                   |
 |                     |  data channel |                                   |
 |                     |  gesture cmds |                                   |
 +----------+----------+               +-----------------------------------+
            |
            | audio + gesture commands
            v
 +---------------------------------+
 | apps/web                        |
 |  +---------------------------+  |
 |  | Avatar canvas             |  |
 |  |  gesture queue -> motion  |  |
 |  |  audio amplitude -> mouth |  |
 |  +---------------------------+  |
 +---------------------------------+
```

The agent worker is a separate deployable. It is not part of apps/server, because a stuck inference call must never block HTTP request handling.

## Decisions

### Agent lifecycle as a State machine
**Chosen:** `Sleeping -> Waking -> Active -> Dismissing -> Sleeping`

| State | Meaning | Allowed transitions |
|---|---|---|
| Sleeping | No worker allocated. `/himari getup` is the only accepted command | Waking |
| Waking | Worker starting, connecting to the room, warming up TTS | Active, Sleeping on failure |
| Active | Connected and conversing | Dismissing |
| Dismissing | Finishing the current utterance, then disconnecting | Sleeping |

Open questions: whether `/himari sleep` interrupts mid-sentence or finishes it; whether the agent auto-sleeps after inactivity; who may summon or dismiss it, anyone or the host only.

**Note:** this is the state machine originally sketched for this project. `project-foundation` reuses the State pattern for the *meeting* lifecycle, which is a separate machine. They must not be conflated.

### Avatar technology
Researched July 2026. The licensing distinction matters given the project's open-source constraint.

| Option | License | Maturity | Notes |
|---|---|---|---|
| Live2D Cubism SDK | Proprietary, free under a usage license | Industry standard | What VTubers use. 2D rigging that reads as depth. Lightweight, no dedicated GPU. Native lip sync. The runtime core is not open source |
| pixi-live2d-display | MIT | Mature | Wrapper around the Cubism core, so it inherits the proprietary runtime dependency |
| Charivo | MIT | Production | Fully open wrapper, still Cubism-dependent |
| live2d-react / easy-live2d | MIT | Usable | React and Pixi bindings |
| Three.js + VRM | MIT | Mature | 3D. Genuinely open end to end. Heavier to render, larger asset pipeline, no built-in lip sync |
| DragonBones | MIT | Mature | 2D skeletal animation. Fully open, but no avatar-specific tooling |
| Iki | MIT | Early | Too immature to depend on |

**Recommendation, not yet decided:** Live2D Cubism if fluidity is the priority and a free-but-proprietary runtime is acceptable; Three.js + VRM if the open-source constraint is absolute. This tension has to be resolved by the user, since it is a values decision rather than a technical one.

### Voice cloning
Researched July 2026. Fish Audio S2.1 Pro:

| Property | Value |
|---|---|
| Time to first audio | ~90 ms |
| Streaming latency | Sub-300 ms |
| Cloning sample | 10 to 30 seconds, instant or persistent voice |
| Transport | Bidirectional WebSocket, MessagePack framing |
| SDKs | Official Python and TypeScript |
| Pricing | $15 per 1M characters; `s2.1-pro-free` tier available until August 2026 |
| Languages | 83 |

**Constraint conflict:** Fish Audio is a paid hosted service, which contradicts the project's free-and-open-source rule. Either the rule is relaxed for TTS specifically, or a self-hostable alternative is chosen. Because TTS sits behind `TTSProvider`, this decision can be deferred without blocking anything else — which is precisely why the interface is declared in v1.

**Consent requirement:** voice cloning must only use a voice whose owner has explicitly consented. This is a hard gate, not a nicety, and belongs in the specs when this change is scheduled.

### Gesture command protocol
**Chosen:** The LLM is instructed to emit inline bracketed markers. The parser splits them out before speech synthesis.

```
  LLM output
     "[waves] Hi there! [smiles] What can I do for you?"
              |
              v
  Gesture parser
     +-- speech text:  "Hi there! What can I do for you?"  --> TTS
     |
     +-- gesture timeline:
           t=0 ms       motion "wave"
           t=~900 ms    expression "smile"
              |
              v
  Data channel: { type: "gesture", motion, at }
              |
              v
  Avatar: gesture queue, blended transitions, never a hard cut
```

Design constraints:
- Gesture timing is derived from the character offset of the marker within the utterance, mapped onto the TTS duration. Exact synchronization requires TTS timestamp support.
- Unknown markers are dropped rather than rendered, so a hallucinated `[somersault]` is harmless.
- The marker vocabulary is a closed set shared between the LLM system prompt and the avatar's motion map.
- Command pattern: each marker resolves to a command object, matching the pattern already assigned in `project-foundation`.

### Agent runtime language
**Undecided.** LiveKit Agents has a mature Python framework with the richest plugin ecosystem, including realtime LLM integrations and RAG examples. A Node.js implementation would keep the stack in a single language and share `packages/shared` types directly.

Trade-off: Python buys ecosystem, Node buys type sharing and one less toolchain. Needs a decision before implementation.

### Latency budget
The agent is where latency actually hurts. Baseline for a vanilla LiveKit `AgentSession` is roughly 1.2 to 1.4 s at p95; roughly 500 to 650 ms is achievable.

Techniques documented by LiveKit, retained for implementation:

| # | Technique | Approximate saving |
|---|---|---|
| 1 | Streaming STT with preemptive generation | 200-400 ms |
| 2 | Partial LLM tokens streamed straight into TTS | 200-500 ms |
| 3 | Prompt prefix caching | 200-400 ms |
| 4 | Edge model routing, small model for short turns | varies |
| 5 | Tool call prefetch on turn completion | varies |
| 6 | Audio prebuffering and AEC warmup | perceived |
| 7 | Asynchronous evaluation off the critical path | varies |
| 8 | TTS warm-up during worker prewarm | 100-300 ms |
| 9 | Small model for short turns | varies |
| 10 | Semantic cache for common intents | large on hits |
| 11 | KV cache reuse between turns | varies |
| 12 | Regional routing for STT and TTS | network-dependent |

Perception context: below 150 ms is imperceptible, above 300 ms is detectable in collaborative tasks, and beyond 4 seconds the collaborative experience breaks down. Conversational fillers such as "let me think" paired with a thinking gesture measurably improve tolerance of a delay rather than hiding it.

### RAG
LiveKit Agents has a documented pattern with LlamaIndex and Qdrant. Undecided: the vector store, the embedding model, what the knowledge base actually contains, and how documents are ingested. Qdrant is self-hostable and open source, which fits the project constraint better than a hosted vector database.

## Seams required from project-foundation

These already exist in the v1 design specifically to make this change possible:

| Seam | Where | Why it matters here |
|---|---|---|
| `TTSProvider`, `STTProvider`, `LLMProvider` | packages/shared | Providers swap without touching agent logic |
| `RoomMessage` discriminated union | packages/shared | Gesture and agent-state variants extend it |
| Unknown message types ignored | chat-in-meeting spec | Older clients survive when agent message types appear |
| `/` command parser emitting events | chat-in-meeting spec | `/himari getup` routes to a real handler |
| Pipeline pattern reserved for `AgentProcessor` | design pattern map | VAD to STT to LLM to Tools to TTS to Avatar |
| Command pattern | design pattern map | Gesture markers resolve to command objects |

## Open questions

1. Avatar: accept a free-but-proprietary runtime (Live2D), or hold the open-source line (VRM)?
2. TTS: relax the free-tooling rule for Fish Audio, or find a self-hostable cloned-voice option?
3. Agent worker in Python or Node.js?
4. Who may summon and dismiss the agent — anyone in the room, or the host only?
5. Does `/himari sleep` cut off mid-sentence or finish the utterance?
6. Does the agent auto-sleep after a period of inactivity, and if so how long?
7. What is in the knowledge base, and who curates it?
8. Whose voice is cloned, and is documented consent on record?
