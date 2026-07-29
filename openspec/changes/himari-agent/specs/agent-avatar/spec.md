## ADDED Requirements

> Delivered in v1.0. Depends on the speech pipeline (v0.7) and benefits from the cloned voice (v0.9), but is independent of both in code.

### Requirement: Avatar rendered in the participant grid
The agent SHALL be represented by an animated avatar rather than a camera feed.

#### Scenario: Avatar tile
- **WHEN** the agent is `Active`
- **THEN** its participant tile SHALL render the avatar, and SHALL obey the same pin, spotlight, and pagination rules as human tiles

#### Scenario: Avatar assets fail to load
- **WHEN** the avatar assets cannot be loaded by a client
- **THEN** that client SHALL fall back to a static image tile and the agent SHALL remain audible

#### Scenario: Rendering is per client
- **WHEN** the avatar animates
- **THEN** the animation SHALL be computed on each client from commands and audio, and SHALL NOT be published as a video track

#### Scenario: Constrained device
- **WHEN** a client cannot sustain the avatar's frame rate
- **THEN** the avatar SHALL degrade to reduced animation rather than dropping the audio or freezing the page

### Requirement: Lip sync
The avatar's mouth SHALL move in time with the agent's speech.

#### Scenario: Mouth follows audio
- **WHEN** the agent publishes audio
- **THEN** the avatar's mouth SHALL animate from that audio's amplitude envelope, within 100 ms of the sound

#### Scenario: Mouth closes on silence
- **WHEN** the agent stops speaking
- **THEN** the mouth SHALL return to a neutral closed position rather than freezing mid-shape

#### Scenario: Interruption stops lip sync
- **WHEN** the agent is interrupted and its audio is cancelled
- **THEN** lip sync SHALL stop immediately along with the audio

### Requirement: Gesture command protocol
The agent's animation SHALL be driven by markers the language model emits inline in its response.

#### Scenario: Marker parsed and stripped
- **WHEN** the model emits a response containing a marker such as `[smile]`
- **THEN** the marker SHALL be removed from the text sent to synthesis, and a gesture command SHALL be published on the data channel

#### Scenario: Marker is never spoken
- **WHEN** any marker appears in model output
- **THEN** its literal text SHALL NOT be audible under any circumstance, including when parsing fails

#### Scenario: Gesture timed to the utterance
- **WHEN** a marker appears partway through a response
- **THEN** its gesture SHALL fire at the corresponding point in the spoken audio, not at the start of the utterance

#### Scenario: Unknown marker discarded
- **WHEN** the model emits a marker outside the defined vocabulary
- **THEN** it SHALL be stripped from the text and discarded without rendering, so a hallucinated gesture is harmless

#### Scenario: Malformed marker
- **WHEN** output contains an unclosed or nested bracket sequence
- **THEN** the parser SHALL recover, emit no gesture, and still produce clean speech text

#### Scenario: Gesture vocabulary is shared
- **WHEN** the marker vocabulary changes
- **THEN** the language model's system prompt and the avatar's motion map SHALL be updated from a single shared definition, so they cannot drift apart

### Requirement: Gesture playback is smooth
Gestures SHALL blend rather than cut.

#### Scenario: Overlapping gestures
- **WHEN** a second gesture arrives while the first is still playing
- **THEN** the avatar SHALL blend the transition rather than snapping to the new pose

#### Scenario: Gesture burst
- **WHEN** more gestures arrive than can be played at natural speed
- **THEN** the queue SHALL drop the oldest unplayed gestures rather than accumulating unbounded lag behind the speech

#### Scenario: Idle animation
- **WHEN** the agent is `Active` and not speaking
- **THEN** the avatar SHALL play a subtle idle animation, because a perfectly still avatar reads as frozen
