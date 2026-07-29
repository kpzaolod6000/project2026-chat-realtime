Continues the release ladder from `project-foundation`. Same rules: one branch per group, named `feat/<group-slug>`; the user performs every git operation; each milestone is runnable and demonstrable before it is tagged.

**Hard prerequisite: `project-foundation` tagged at v0.6.** See its `tasks.md` for why the agent cannot start earlier.

## Release ladder

| Version | Name | Groups | Demonstrable result |
|---|---|---|---|
| v0.7 | Himari speaks | 16, 17 | `/himari getup`, talk to her, she answers out loud |
| v0.8 | Himari knows | 18 | She answers from a knowledge base and calls tools |
| v0.9 | Himari's voice | 19 | The same conversation, in a cloned voice |
| v1.0 | Himari appears | 20, 21 | Animated avatar, lip sync, gestures |

---

# v0.7 — Himari speaks

**Deliverable:** a participant types `/himari getup`, the agent joins, they have a spoken conversation, and `/himari sleep` dismisses her. The voice is off-the-shelf, she has no knowledge base and no face.

**Acceptance check:** a full conversational turn completes end to end, p95 latency from end-of-speech to first-audio is recorded, and interrupting her mid-sentence stops her within 300 ms.

## 16. Agent worker and lifecycle — `feat/agent-worker`

**Decide before starting**
- [ ] 16.1 Decide the agent runtime, Python or Node.js, and record the decision with its rationale in design.md
- [ ] 16.2 Decide the STT and LLM providers, preferring self-hostable options, and record why
- [ ] 16.3 Verify the current LiveKit Agents documentation for the chosen runtime; do not build from remembered APIs

**Worker foundation**
- [ ] 16.4 Declare the `STTProvider`, `LLMProvider`, and `TTSProvider` Strategy interfaces in packages/shared, shaped by the providers chosen in 16.2
- [ ] 16.5 Scaffold the agent worker as a separate deployable with its own Dockerfile and Compose service
- [ ] 16.6 Implement the agent LiveKit identity and token minting in apps/server, distinguishable from any human user id
- [ ] 16.7 Implement worker connection to a room, publishing an audio track and subscribing to participant audio
- [ ] 16.8 **Checkpoint:** the worker joins a room and appears as a participant, silent. Proves identity, token, and connection in isolation from the speech pipeline

**Lifecycle**
- [ ] 16.9 Implement the state machine: Sleeping, Waking, Active, Dismissing
- [ ] 16.10 Extend the `RoomMessage` union in packages/shared with agent-state variants
- [ ] 16.11 Wire `/himari getup` to worker allocation through the existing command parser
- [ ] 16.12 Wire `/himari sleep` to dismissal and worker release
- [ ] 16.13 Reject `getup` when already present and `sleep` when absent, with local-only replies
- [ ] 16.14 Fail to `Sleeping` with an explicit message when allocation exceeds 10 seconds
- [ ] 16.15 Release the worker when the room transitions to `ending`
- [ ] 16.16 Broadcast agent state on change, and re-broadcast for late joiners within 2 seconds
- [ ] 16.17 Render the agent participant entry with a dismiss action instead of mute and remove
- [ ] 16.18 Unit-test every state transition, including the rejected ones
- [ ] 16.19 **Checkpoint:** summon and dismiss repeatedly without leaking workers

## 17. Speech pipeline — `feat/agent-speech`

- [ ] 17.1 Implement the Pipeline pattern skeleton: VAD, STT, LLM, TTS as composable stages
- [ ] 17.2 Implement voice activity detection to suppress background noise
- [ ] 17.3 Implement streaming speech-to-text behind `STTProvider`
- [ ] 17.4 Implement the language model stage behind `LLMProvider` with the Himari system prompt
- [ ] 17.5 Implement text-to-speech behind `TTSProvider` using an off-the-shelf voice
- [ ] 17.6 Stream partial model output into synthesis rather than waiting for the full response
- [ ] 17.7 Publish synthesized audio to the room as the agent's track
- [ ] 17.8 Implement addressed-only responding, so the agent stays out of human-to-human conversation
- [ ] 17.9 Implement interruption: stop audio within 300 ms and discard the remainder
- [ ] 17.10 Implement the thinking indicator, shown within 500 ms of receiving input
- [ ] 17.11 Emit a conversational filler when a turn exceeds 4 seconds without audio
- [ ] 17.12 Handle failure at each stage with an audible "I could not answer", never silence
- [ ] 17.13 Build the measurement harness for end-of-speech to first-audio, p50 and p95
- [ ] 17.14 Record the latency baseline in docs/himari-latencia.md
- [ ] 17.15 End-to-end test: summon, one full turn, interrupt, dismiss
- [ ] 17.16 Write docs/himari-agente.md in Spanish covering the lifecycle and pipeline

**Tag `v0.7` when the acceptance check passes.**

---

# v0.8 — Himari knows

**Deliverable:** she answers from a curated knowledge base and can perform actions through tools.

**Acceptance check:** ask something answerable only from the knowledge base and get a correct grounded answer; ask something outside it and get an honest "I don't know"; trigger a tool and confirm the result reaches the spoken response.

## 18. Tools and RAG — `feat/agent-knowledge`

**Decide before starting**
- [ ] 18.1 Decide the vector store and embedding model, preferring self-hostable, and record why
- [ ] 18.2 Decide what the knowledge base contains and who curates it

**Tools**
- [ ] 18.3 Implement the tool registry with schema-validated arguments
- [ ] 18.4 Implement a first set of tools, scoped to the meeting context
- [ ] 18.5 Enforce per-tool timeouts, cancelling and reporting failure rather than hanging
- [ ] 18.6 Reject unregistered tool requests and inform the model instead of crashing
- [ ] 18.7 Ensure a failed tool produces an honest response, never a fabricated result

**Retrieval**
- [ ] 18.8 Add the vector store to the Compose stack with a healthcheck
- [ ] 18.9 Implement the ingestion pipeline: chunking, embedding, upsert
- [ ] 18.10 Implement retrieval with a relevance threshold
- [ ] 18.11 Answer "I don't know" when nothing clears the threshold, rather than falling back to model knowledge presented as sourced
- [ ] 18.12 Continue conversing with an explicit notice when the vector store is unreachable
- [ ] 18.13 Bound retrieval latency, proceeding without context on timeout
- [ ] 18.14 Prefetch tool calls on turn completion where the intent is unambiguous

**Verify**
- [ ] 18.15 Re-measure turn latency and compare against the v0.7 baseline
- [ ] 18.16 Investigate before tagging if p95 regressed by more than 20%
- [ ] 18.17 Test grounded answers, threshold misses, tool failures, and store unavailability
- [ ] 18.18 Write docs/himari-conocimiento.md in Spanish covering ingestion and curation

**Tag `v0.8` when the acceptance check passes.**

---

# v0.9 — Himari's voice

**Deliverable:** the same conversation as v0.8, now in a cloned voice.

**Acceptance check:** only the provider implementation and its configuration changed; no file in the conversation pipeline was touched. If that is not true, the `TTSProvider` interface was wrong and v0.7 needs revisiting.

## 19. Cloned voice — `feat/agent-voice`

**Decide before starting**
- [ ] 19.1 Decide the cloned-voice provider, and record explicitly whether the free-and-open-source rule is being relaxed for it and why
- [ ] 19.2 Identify whose voice is cloned and obtain documented consent before any sample is uploaded

**Consent, before implementation**
- [ ] 19.3 Implement the consent record: voice owner identity and consent date
- [ ] 19.4 Refuse worker startup when a configured cloned voice has no consent record
- [ ] 19.5 Implement consent withdrawal: remove the voice from the provider and from configuration, restart affected workers on the fallback
- [ ] 19.6 Disclose the synthetic voice in the agent's participant entry

**Implementation**
- [ ] 19.7 Implement the cloned-voice `TTSProvider` with streaming synthesis
- [ ] 19.8 Select the provider from configuration, with no vendor reference in agent logic
- [ ] 19.9 Implement cancellation of in-flight synthesis on interruption
- [ ] 19.10 Handle mid-utterance provider failure by stopping cleanly and saying so
- [ ] 19.11 Implement fallback to the v0.7 voice when the cloned provider is degraded, logged with the reason and without interrupting the conversation
- [ ] 19.12 Fail worker warm-up loudly when the provider is unreachable, rather than joining mute

**Verify**
- [ ] 19.13 Measure time to first audio and confirm it stays within 500 ms p95
- [ ] 19.14 Re-measure full turn latency against the v0.7 baseline
- [ ] 19.15 Confirm by diff that the conversation pipeline was not modified
- [ ] 19.16 Test consent enforcement, withdrawal, and fallback
- [ ] 19.17 Write docs/himari-voz.md in Spanish, including the consent policy

**Tag `v0.9` when the acceptance check passes.**

---

# v1.0 — Himari appears

**Deliverable:** the complete vision. An animated avatar in the grid, lip-syncing to her speech and gesturing according to markers the model emits.

**Acceptance check:** the avatar animates in time with speech on a mid-range laptop; a marker never becomes audible; an unknown marker renders nothing and breaks nothing.

## 20. Avatar rendering — `feat/agent-avatar`

**Decide before starting**
- [ ] 20.1 Decide the avatar technology, Live2D or VRM, recording explicitly whether the open-source rule bends for a proprietary runtime
- [ ] 20.2 Obtain or commission the Himari character assets under a license compatible with that decision

**Rendering**
- [ ] 20.3 Implement the avatar canvas component rendering client-side, publishing no video track
- [ ] 20.4 Render the avatar in the agent's participant tile, obeying pin, spotlight, and pagination
- [ ] 20.5 Implement lip sync from the agent audio amplitude envelope, within 100 ms
- [ ] 20.6 Return the mouth to neutral on silence
- [ ] 20.7 Stop lip sync immediately when audio is cancelled by interruption
- [ ] 20.8 Implement the idle animation for when the agent is active and silent
- [ ] 20.9 Fall back to a static image tile when assets fail to load, keeping audio working
- [ ] 20.10 Degrade animation rather than dropping audio on constrained devices
- [ ] 20.11 **Checkpoint:** the avatar lip-syncs to recorded audio before any gesture work begins

## 21. Gesture protocol — `feat/agent-gestures`

- [ ] 21.1 Define the gesture vocabulary once in packages/shared, consumed by both the system prompt and the motion map
- [ ] 21.2 Extend the `RoomMessage` union with the gesture command variant
- [ ] 21.3 Implement the marker parser splitting speech text from a gesture timeline
- [ ] 21.4 Guarantee markers are never audible, including on parse failure
- [ ] 21.5 Map marker character offsets onto synthesis duration so gestures fire at the right moment
- [ ] 21.6 Discard markers outside the vocabulary without rendering
- [ ] 21.7 Recover from malformed or nested brackets, still producing clean speech
- [ ] 21.8 Resolve each marker to a command object, applying the Command pattern
- [ ] 21.9 Implement the gesture queue with blended transitions, never hard cuts
- [ ] 21.10 Drop oldest unplayed gestures on burst rather than accumulating lag
- [ ] 21.11 Fuzz-test the parser with malformed, nested, and hallucinated markers
- [ ] 21.12 Re-measure turn latency and confirm gesture parsing added no meaningful cost
- [ ] 21.13 Write docs/himari-avatar.md in Spanish covering the gesture vocabulary and how to extend it

**Tag `v1.0` when the acceptance check passes.**
