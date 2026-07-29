## ADDED Requirements

> Off-the-shelf voice in v0.7; cloned voice in v0.9.

### Requirement: Speech synthesis behind a provider interface
The agent's voice SHALL be produced through the `TTSProvider` interface, never through a directly imported vendor SDK.

#### Scenario: Provider selected by configuration
- **WHEN** the agent worker starts
- **THEN** the TTS implementation SHALL be resolved from configuration, and agent logic SHALL contain no reference to a specific vendor

#### Scenario: Provider swapped without touching agent logic
- **WHEN** the v0.7 off-the-shelf voice is replaced by the v0.9 cloned voice
- **THEN** only the provider implementation and its configuration SHALL change; no file in the conversation pipeline SHALL be modified

#### Scenario: Provider unavailable at startup
- **WHEN** the configured TTS provider cannot be reached during worker warm-up
- **THEN** the worker SHALL fail to reach `Active` and report the reason, rather than joining a room mute

### Requirement: Streaming synthesis
Audio SHALL begin playing before the full response has been synthesized.

#### Scenario: First audio before full text
- **WHEN** the language model has produced its first complete clause
- **THEN** synthesis SHALL start on that clause rather than waiting for the whole response

#### Scenario: Time to first audio
- **WHEN** synthesis begins
- **THEN** the first audio chunk SHALL be published to the room within 500 ms at p95

#### Scenario: Synthesis fails mid-utterance
- **WHEN** the provider drops the connection partway through an utterance
- **THEN** the agent SHALL stop cleanly and state that it could not finish speaking, rather than emitting truncated noise

#### Scenario: Synthesis is cancellable
- **WHEN** the agent is interrupted by a participant
- **THEN** in-flight synthesis SHALL be cancelled and its remaining audio discarded

### Requirement: Voice cloning requires recorded consent
A cloned voice SHALL only be used when the voice owner's consent is on record.

#### Scenario: Consent recorded before cloning
- **WHEN** a voice model is created from a sample
- **THEN** the identity of the voice owner and the date of their consent SHALL be recorded, and the sample SHALL NOT be submitted for cloning without it

#### Scenario: Synthesis blocked without consent
- **WHEN** the agent is configured with a cloned voice that has no consent record
- **THEN** the worker SHALL refuse to start and SHALL report the missing consent

#### Scenario: Consent withdrawn
- **WHEN** a voice owner withdraws consent
- **THEN** the voice SHALL be removed from the provider and from configuration, and any worker using it SHALL be restarted with the fallback voice

#### Scenario: Cloned voice is disclosed
- **WHEN** the agent speaks with a cloned voice
- **THEN** participants SHALL be able to see, in the agent's participant entry, that the voice is synthetic

### Requirement: Fallback voice
The agent SHALL remain able to speak when the cloned voice is unavailable.

#### Scenario: Cloned provider degraded
- **WHEN** the cloned-voice provider is unreachable or rate-limited
- **THEN** the agent SHALL fall back to the v0.7 off-the-shelf voice and continue the conversation

#### Scenario: Fallback is announced in logs, not mid-conversation
- **WHEN** a fallback occurs
- **THEN** it SHALL be logged with the reason, and the agent SHALL NOT interrupt the conversation to explain the change
