## ADDED Requirements

### Requirement: Typed data channel envelope
All data channel traffic SHALL use a single validated message envelope.

#### Scenario: Outgoing message shape
- **WHEN** any client publishes on the data channel
- **THEN** the payload SHALL be a `RoomMessage` discriminated union member defined in `packages/shared`, serialized as JSON

#### Scenario: Malformed incoming payload
- **WHEN** a received payload fails schema validation
- **THEN** the client SHALL discard it silently and SHALL NOT crash, throw to the UI, or disconnect

#### Scenario: Unknown message type
- **WHEN** a payload carries a `type` the client does not recognize
- **THEN** the client SHALL ignore it, so that newer message types do not break older clients

### Requirement: Send chat messages
Participants SHALL send text messages during a meeting over the LiveKit data channel.

#### Scenario: Send a message
- **WHEN** a participant types a message and presses Enter
- **THEN** the message SHALL render locally within 200 ms in a pending state, before any delivery confirmation

#### Scenario: Delivery confirmed
- **WHEN** the data channel publish resolves successfully
- **THEN** the pending state SHALL clear and the message SHALL render as sent

#### Scenario: Message delivery failure
- **WHEN** the data channel publish fails
- **THEN** the message SHALL render with a delivery error indicator and a retry action, and SHALL NOT be silently dropped

#### Scenario: Empty or whitespace-only message
- **WHEN** a participant submits an empty or whitespace-only message
- **THEN** the system SHALL ignore the submission and SHALL NOT publish anything

#### Scenario: Oversized message
- **WHEN** a message exceeds 2000 characters
- **THEN** the input SHALL prevent submission and show a character-limit warning

#### Scenario: Chat messages are sent reliably
- **WHEN** a chat message is published
- **THEN** it SHALL use the data channel's reliable delivery mode

### Requirement: Receive chat messages
Participants SHALL receive messages from other participants in real time.

#### Scenario: Receive remote message
- **WHEN** another participant sends a message
- **THEN** it SHALL appear in the chat panel within 500 ms, attributed to the sender's display name

#### Scenario: Unread indicator
- **WHEN** a message arrives while the chat panel is closed
- **THEN** the chat control SHALL show an unread count that clears when the panel is opened

#### Scenario: Sender identity is not trusted for authorization
- **WHEN** a message declares a `senderId`
- **THEN** the client SHALL display it using the LiveKit participant identity of the actual sender, not the value inside the payload

### Requirement: Chat is session-scoped
Chat messages SHALL NOT be persisted to the database.

#### Scenario: Messages are not stored
- **WHEN** any chat message is sent
- **THEN** no database write SHALL occur for its content

#### Scenario: History lost when the room empties
- **WHEN** every participant has left a room
- **THEN** all chat content for that room SHALL be gone, and this SHALL be stated in the UI when the meeting ends

### Requirement: Peer-relayed history for late joiners
A participant joining an active meeting SHALL receive recent chat context from an existing peer, without server-side storage.

#### Scenario: Request history on join
- **WHEN** a participant connects to a room that already has at least one other participant
- **THEN** the client SHALL broadcast a `history_request` message carrying its own identity

#### Scenario: Longest-connected peer responds
- **WHEN** a `history_request` is received
- **THEN** only the participant with the earliest connection time SHALL respond, sending up to the last 50 messages addressed to the requester alone

#### Scenario: Fallback responder
- **WHEN** the designated responder does not answer within 1500 ms
- **THEN** the next-longest-connected participant SHALL respond instead, so a stalled peer does not deny history

#### Scenario: No response at all
- **WHEN** no `history_response` arrives within 3 seconds
- **THEN** the requester SHALL show "History unavailable" and continue with live messages only

#### Scenario: First participant in the room
- **WHEN** a participant joins an empty room
- **THEN** no history request SHALL be sent and the chat SHALL start empty without an error

#### Scenario: Deduplication against live messages
- **WHEN** history arrives after live messages have already been received during the handshake
- **THEN** the client SHALL merge by message id, sort by timestamp, and render no duplicates

#### Scenario: Oversized history rejected
- **WHEN** a `history_response` contains more than 50 messages or exceeds the payload size limit
- **THEN** the requester SHALL truncate to the 50 most recent and SHALL NOT render the excess

### Requirement: Command prefix detection
The chat SHALL recognize messages beginning with `/` as commands, reserved for the future agent integration.

#### Scenario: Command prefix detected
- **WHEN** a participant sends a message starting with `/`
- **THEN** the system SHALL emit a local command event carrying the parsed command name and arguments

#### Scenario: Unknown command in v1
- **WHEN** a command is emitted and no handler is registered, which is every command in v1
- **THEN** the system SHALL render a local-only system message reading "Unknown command", visible solely to the sender, and SHALL NOT broadcast it to the room

#### Scenario: Escaped slash
- **WHEN** a message begins with `//`
- **THEN** it SHALL be sent as ordinary chat text with a single leading slash, and SHALL NOT be parsed as a command
