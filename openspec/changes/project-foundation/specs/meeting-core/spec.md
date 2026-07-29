## ADDED Requirements

### Requirement: Create a video room
Authenticated users SHALL create video conference rooms identified by a unique, shareable room code.

#### Scenario: Create a new room
- **WHEN** an authenticated user clicks "New Meeting"
- **THEN** the system SHALL create a room with status `active`, assign the creator as host, and return a room code in the format `xxx-xxxx-xxx`

#### Scenario: Room code collision
- **WHEN** generated room code already exists in the database
- **THEN** the system SHALL retry generation up to 5 times, and SHALL return a server error if all attempts collide rather than retrying indefinitely

#### Scenario: Shareable link
- **WHEN** a host views an active room
- **THEN** the system SHALL expose a copyable join URL containing the room code

### Requirement: Join a video room
Users SHALL join an existing room using its code or shareable link.

#### Scenario: Join an existing room
- **WHEN** an authenticated user enters a valid code for a room with status `active`
- **THEN** the system SHALL create a `room_participants` record and connect the user to the LiveKit room

#### Scenario: Join with invalid room code
- **WHEN** a user enters a code that matches no room
- **THEN** the system SHALL show "Meeting code not found" and SHALL NOT attempt a LiveKit connection

#### Scenario: Join an ended room
- **WHEN** a user enters a code for a room whose status is `ending` or `ended`
- **THEN** the system SHALL show "This meeting has ended" and SHALL NOT issue a LiveKit token

#### Scenario: Join while banned
- **WHEN** a user with a `room_bans` record for that room attempts to join
- **THEN** the system SHALL reject the join and SHALL NOT issue a LiveKit token

### Requirement: Leave a room
Participants SHALL leave a room, and the system SHALL record their departure.

#### Scenario: Participant leaves deliberately
- **WHEN** a participant clicks "Leave"
- **THEN** the system SHALL disconnect from LiveKit, set `left_at` on their participant record, and return them to the lobby page

#### Scenario: Participant closes the tab
- **WHEN** a participant's connection drops without an explicit leave
- **THEN** the system SHALL set `left_at` from the LiveKit `participant_left` webhook within 10 seconds

#### Scenario: Last participant leaves
- **WHEN** the final participant leaves an active room
- **THEN** the system SHALL transition the room to `ended` and set `ended_at`

### Requirement: End a room
The host SHALL end a meeting for all participants.

#### Scenario: Host ends the meeting
- **WHEN** the host clicks "End meeting for all"
- **THEN** the system SHALL transition the room to `ending`, disconnect every participant, set `left_at` on all open participant records, and transition to `ended`

#### Scenario: Non-host attempts to end
- **WHEN** a non-host participant calls the end endpoint directly
- **THEN** the system SHALL return an authorization error and leave the room untouched

#### Scenario: Join attempt during ending
- **WHEN** a user attempts to join while the room status is `ending`
- **THEN** the system SHALL reject the join

### Requirement: Real-time audio and video streaming
The system SHALL transmit audio and video between participants via LiveKit WebRTC within the collaborative-task latency threshold of 300 ms.

#### Scenario: Participant publishes media
- **WHEN** a participant joins with camera and microphone enabled
- **THEN** their audio and video tracks SHALL be published within 2 seconds of connection

#### Scenario: Participant receives remote media
- **WHEN** a remote participant publishes tracks
- **THEN** other participants SHALL render them within 500 ms of the publish event

#### Scenario: Adaptive quality under congestion
- **WHEN** available bandwidth degrades
- **THEN** the system SHALL reduce video resolution or drop to audio-only before degrading audio quality

#### Scenario: Off-screen tiles unsubscribed
- **WHEN** a participant's tile is not visible in the current grid page
- **THEN** the client SHALL unsubscribe from that participant's video track while keeping their audio subscribed

### Requirement: Media device handling
The system SHALL handle missing devices and denied permissions without blocking room entry.

#### Scenario: Camera permission denied
- **WHEN** the browser denies camera access
- **THEN** the participant SHALL still join with audio only, and the UI SHALL show a disabled-camera indicator with a path to retry

#### Scenario: No microphone available
- **WHEN** no audio input device is present
- **THEN** the participant SHALL join in listen-only mode and other participants SHALL see a no-microphone indicator

#### Scenario: Device selection
- **WHEN** more than one camera or microphone is available
- **THEN** the participant SHALL choose between them before joining and while in the meeting, and the selection SHALL persist for subsequent sessions

#### Scenario: Device disconnected mid-meeting
- **WHEN** the active camera or microphone is unplugged during a meeting
- **THEN** the system SHALL fall back to the next available device, or to a disabled state if none exists, without dropping the room connection

### Requirement: Participant presence
The system SHALL track and broadcast participants entering and leaving rooms.

#### Scenario: Participant joins
- **WHEN** a new participant connects
- **THEN** all existing participants SHALL receive a join event and see the new tile within 1 second

#### Scenario: Participant leaves
- **WHEN** a participant disconnects for any reason
- **THEN** all remaining participants SHALL receive a leave event within 1 second and the tile SHALL be removed

#### Scenario: Participant list
- **WHEN** a participant opens the people panel
- **THEN** the system SHALL list every connected participant with their name, mute state, and host badge

### Requirement: Connection resilience
The system SHALL recover from transient network failures without requiring a page reload.

#### Scenario: Temporary disconnection
- **WHEN** the WebRTC connection drops
- **THEN** the client SHALL show a "Reconnecting" indicator and retry automatically using LiveKit's reconnection logic

#### Scenario: Reconnection after token expiry
- **WHEN** reconnection is attempted with an expired LiveKit token
- **THEN** the client SHALL request a fresh token from the backend and retry the connection with it

#### Scenario: Unrecoverable disconnection
- **WHEN** reconnection fails for more than 30 seconds
- **THEN** the client SHALL surface an explicit failure state with a manual rejoin action, and SHALL NOT retry silently forever

### Requirement: Grid layout
The system SHALL display participants in a grid that adapts to the number of active participants.

#### Scenario: Single participant
- **WHEN** only one participant is in the room
- **THEN** their video SHALL fill the main display area

#### Scenario: Two to nine participants
- **WHEN** between 2 and 9 participants are active
- **THEN** the grid SHALL auto-arrange all tiles to maximize visible area with a consistent aspect ratio

#### Scenario: More than nine participants
- **WHEN** more than 9 participants are active
- **THEN** the grid SHALL show at most 9 tiles per page with pagination controls, and SHALL promote the active speaker into the visible page automatically

#### Scenario: Pin participant
- **WHEN** a user pins a participant
- **THEN** that participant SHALL remain in the spotlight position regardless of who is speaking, and SHALL NOT be paged out

#### Scenario: Active speaker indication
- **WHEN** a participant is speaking
- **THEN** their tile SHALL show a speaking indicator within 300 ms of speech onset

### Requirement: Progressive tile rendering
Video tiles SHALL communicate their loading state rather than appearing blank.

#### Scenario: Tile awaiting stream
- **WHEN** a participant has joined but their video track has not yet arrived
- **THEN** the tile SHALL show a skeleton placeholder with the participant's name and avatar initials
