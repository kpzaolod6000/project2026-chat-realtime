## ADDED Requirements

### Requirement: Host authorization
Moderation actions SHALL be restricted to the room host and enforced server-side.

#### Scenario: Host status verified against the database
- **WHEN** any moderation endpoint is called
- **THEN** the backend SHALL compare the session user id against `rooms.host_id` before acting, and SHALL NOT accept the role claim from the LiveKit token as proof

#### Scenario: Non-host attempts moderation
- **WHEN** a participant who is not the host calls a moderation endpoint directly
- **THEN** the system SHALL return an authorization error and SHALL NOT contact the LiveKit Server API

#### Scenario: Host controls hidden for participants
- **WHEN** a participant whose token metadata declares `role: "participant"` views the people panel
- **THEN** mute and remove controls SHALL NOT be rendered

#### Scenario: Moderation on an inactive room
- **WHEN** a moderation action targets a room whose status is not `active`
- **THEN** the system SHALL reject the request

### Requirement: Host mutes a participant
The host SHALL mute another participant's microphone with server-side enforcement.

#### Scenario: Mute a participant
- **WHEN** the host mutes a participant
- **THEN** the backend SHALL call `RoomServiceClient.mutePublishedTrack` for that participant's audio track, and the participant SHALL stop being audible to everyone within 1 second

#### Scenario: Mute cannot be bypassed by the client
- **WHEN** a muted participant's client attempts to re-enable its own microphone
- **THEN** the track SHALL remain muted, because the mute was applied at the SFU and not requested of the client

#### Scenario: Muted participant is informed
- **WHEN** a participant is muted by the host
- **THEN** their UI SHALL show that the host muted them, distinguishing it from a self-initiated mute

#### Scenario: Participant may unmute themselves afterwards
- **WHEN** a host-muted participant chooses to unmute
- **THEN** they SHALL be permitted to publish audio again, because v1 mute is a courtesy action and not a permission revocation

#### Scenario: Mute a participant with no audio track
- **WHEN** the host mutes a participant who is not publishing audio
- **THEN** the system SHALL treat the request as a no-op success and SHALL NOT return an error

#### Scenario: Host mutes everyone
- **WHEN** the host activates "Mute all"
- **THEN** every participant except the host SHALL be muted through individual Server API calls, and failures on individual participants SHALL NOT abort the remaining ones

### Requirement: Host removes a participant
The host SHALL remove a participant from the room and prevent immediate re-entry.

#### Scenario: Remove a participant
- **WHEN** the host removes a participant
- **THEN** the backend SHALL create a `room_bans` record and then call `RoomServiceClient.removeParticipant`, and the participant SHALL be disconnected within 1 second

#### Scenario: Ban recorded before disconnect
- **WHEN** a removal is processed
- **THEN** the ban record SHALL be written before the disconnect call, so the removed user cannot rejoin in the window between the two operations

#### Scenario: Removed participant cannot rejoin
- **WHEN** a removed user re-enters the same room code
- **THEN** the join SHALL be rejected and no LiveKit token SHALL be issued

#### Scenario: Removed participant is informed
- **WHEN** a participant is removed
- **THEN** their UI SHALL show that the host removed them from the meeting, rather than a generic connection error

#### Scenario: Ban scope is the room
- **WHEN** a user is banned from one room
- **THEN** they SHALL remain able to create and join other rooms

#### Scenario: Host cannot remove themselves
- **WHEN** the host targets their own identity for removal
- **THEN** the system SHALL reject the request and suggest ending the meeting instead

#### Scenario: Departure recorded
- **WHEN** a participant is removed
- **THEN** their `room_participants.left_at` SHALL be set, exactly as with a voluntary departure

### Requirement: Moderation actions are auditable
Every moderation action SHALL leave a durable record of who performed it.

#### Scenario: Removal attributes the actor
- **WHEN** a participant is removed
- **THEN** the `room_bans` record SHALL store `banned_by` and `banned_at`

#### Scenario: Actions logged
- **WHEN** any moderation endpoint succeeds or fails authorization
- **THEN** the backend SHALL emit a structured log entry containing the actor, target, room, action, and outcome
