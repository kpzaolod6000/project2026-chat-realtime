## ADDED Requirements

### Requirement: Send emoji reactions
Participants SHALL send ephemeral emoji reactions visible to everyone in the room.

#### Scenario: Send a reaction
- **WHEN** a participant picks an emoji from the reaction control
- **THEN** a `reaction` message SHALL be published on the data channel and the emoji SHALL animate over the sender's tile for all participants

#### Scenario: Reaction animation expires
- **WHEN** a reaction has been displayed for 3 seconds
- **THEN** it SHALL disappear automatically without user action

#### Scenario: Reactions use lossy delivery
- **WHEN** a reaction is published
- **THEN** it SHALL use the data channel's lossy mode, so a dropped reaction never blocks chat delivery

#### Scenario: Reaction burst throttled
- **WHEN** a participant sends more than 5 reactions within 3 seconds
- **THEN** the client SHALL throttle further sends until the window clears, preventing a single participant from flooding the room

#### Scenario: Unsupported emoji rejected
- **WHEN** a received reaction carries an emoji outside the allowed set
- **THEN** the client SHALL discard the message and render nothing

#### Scenario: Reactions are not persisted
- **WHEN** any reaction is sent
- **THEN** no database write SHALL occur and reactions SHALL NOT appear in relayed chat history

### Requirement: Raise and lower hand
Participants SHALL signal that they want to speak, with a state that persists until cleared.

#### Scenario: Raise hand
- **WHEN** a participant activates "Raise hand"
- **THEN** a `hand` message with `raised: true` SHALL be published, and every participant SHALL see a hand indicator on that participant's tile and in the people panel

#### Scenario: Lower hand
- **WHEN** a participant deactivates "Raise hand"
- **THEN** a `hand` message with `raised: false` SHALL be published and the indicator SHALL clear for everyone

#### Scenario: Hand state for late joiners
- **WHEN** a participant joins a room where hands are already raised
- **THEN** participants with a raised hand SHALL re-broadcast their state within 2 seconds of the join event, so the newcomer's view converges

#### Scenario: Hand cleared on leave
- **WHEN** a participant with a raised hand disconnects
- **THEN** the indicator SHALL be removed along with their tile

#### Scenario: Raised hands ordered
- **WHEN** more than one participant has a raised hand
- **THEN** the people panel SHALL list them in the order the hands were raised

### Requirement: Reactions are non-authoritative
Reaction and hand messages SHALL NOT influence any server-side state or permission.

#### Scenario: Forged reaction has no privileged effect
- **WHEN** a client publishes a reaction or hand message impersonating another participant
- **THEN** the receiving clients SHALL attribute it to the actual LiveKit sender identity, and no backend state SHALL change as a result
