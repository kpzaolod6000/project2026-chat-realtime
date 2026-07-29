## ADDED Requirements

> Delivered in milestone v0.7. Requires `project-foundation` at v0.6. Open questions are tracked in `design.md`.

### Requirement: Summon the agent from chat
Participants SHALL summon the agent by issuing a chat command.

#### Scenario: Summon an absent agent
- **WHEN** a participant sends `/himari getup` in a room where the agent is `Sleeping`
- **THEN** the system SHALL allocate an agent worker, transition to `Waking`, and post a local system message indicating the agent is joining

#### Scenario: Agent becomes available
- **WHEN** the worker has connected to the LiveKit room and warmed up its speech pipeline
- **THEN** the agent SHALL transition to `Active` and appear as a participant with its avatar tile for everyone in the room

#### Scenario: Summon an already-present agent
- **WHEN** a participant sends `/himari getup` while the agent is `Waking` or `Active`
- **THEN** the system SHALL ignore the command and reply with a local-only message stating the agent is already present

#### Scenario: Worker allocation fails
- **WHEN** no agent worker can be allocated within 10 seconds
- **THEN** the agent SHALL return to `Sleeping` and the requester SHALL see an explicit failure message rather than an indefinite waiting state

### Requirement: Dismiss the agent from chat
Participants SHALL dismiss the agent by issuing a chat command.

#### Scenario: Dismiss an active agent
- **WHEN** a participant sends `/himari sleep` while the agent is `Active`
- **THEN** the agent SHALL transition to `Dismissing`, stop accepting new turns, disconnect from the room, and transition to `Sleeping`

#### Scenario: Dismiss an absent agent
- **WHEN** a participant sends `/himari sleep` while the agent is `Sleeping`
- **THEN** the system SHALL reply with a local-only message stating there is no agent present, and SHALL NOT allocate or release any worker

#### Scenario: Agent removed when the meeting ends
- **WHEN** a room transitions to `ending` while the agent is `Active`
- **THEN** the agent worker SHALL be released as part of room cleanup, without requiring an explicit dismiss command

#### Scenario: Worker released on dismissal
- **WHEN** the agent reaches `Sleeping`
- **THEN** its worker resources SHALL be released, so an idle room consumes no inference capacity

### Requirement: Agent participates as a normal LiveKit participant
The agent SHALL join the room through the same mechanisms as human participants.

#### Scenario: Agent identity
- **WHEN** the agent connects
- **THEN** it SHALL use a dedicated LiveKit identity distinguishable from any human user id, and its token SHALL grant publish, subscribe, and data permissions

#### Scenario: Agent rendered in the grid
- **WHEN** the agent is `Active`
- **THEN** it SHALL occupy a participant tile rendering its avatar rather than a camera feed, and SHALL be subject to the same pin and pagination rules as human participants

#### Scenario: Agent is not moderatable by the standard controls
- **WHEN** the host opens the people panel
- **THEN** the agent entry SHALL offer a dismiss action instead of the mute and remove controls used for human participants

### Requirement: Agent state is observable by every participant
The agent's current state SHALL be visible to everyone in the room.

#### Scenario: State broadcast
- **WHEN** the agent changes state
- **THEN** an agent-state message SHALL be published on the data channel and every client SHALL update its indicator

#### Scenario: State for late joiners
- **WHEN** a participant joins a room with an `Active` agent
- **THEN** the agent SHALL broadcast its current state within 2 seconds so the newcomer's view converges

#### Scenario: Thinking state surfaced
- **WHEN** the agent is processing a turn and has not yet begun speaking
- **THEN** participants SHALL see a thinking indicator, because a silent agent is otherwise indistinguishable from a broken one
