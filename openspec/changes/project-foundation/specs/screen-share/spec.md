## ADDED Requirements

### Requirement: Start screen sharing
A participant SHALL share their screen with everyone in the room.

#### Scenario: Start sharing
- **WHEN** a participant clicks "Share Screen" and selects a screen, window, or tab
- **THEN** the capture SHALL be published as a separate LiveKit track with source `screen_share`, alongside their camera track rather than replacing it

#### Scenario: Camera track is retained
- **WHEN** a participant is screen sharing
- **THEN** their camera track SHALL remain published, and the grid SHALL show the screen share as the primary tile with the camera as a secondary tile

#### Scenario: Audio continues during sharing
- **WHEN** a participant starts screen sharing
- **THEN** their microphone track SHALL be unaffected

#### Scenario: Share cancelled in the picker
- **WHEN** a participant opens the browser picker and cancels it
- **THEN** the UI SHALL return to its previous state without an error message

#### Scenario: Screen share permission denied
- **WHEN** the browser denies display capture
- **THEN** the system SHALL show an explanatory message with guidance to enable the permission, and the meeting SHALL continue uninterrupted

#### Scenario: Only one share at a time
- **WHEN** a participant starts sharing while another participant is already sharing
- **THEN** the system SHALL reject the second share and explain that another participant is presenting

### Requirement: Stop screen sharing
A participant SHALL stop sharing at any time, and the system SHALL stop it for them when they cannot.

#### Scenario: Stop sharing from the app
- **WHEN** the presenting participant clicks "Stop Sharing"
- **THEN** the screen share track SHALL be unpublished and the grid SHALL return to its previous layout for all participants

#### Scenario: Stop sharing from the browser control
- **WHEN** the presenter uses the browser's native "Stop sharing" bar
- **THEN** the application SHALL detect the track's `ended` event and unpublish it, keeping application state consistent with the browser

#### Scenario: Stop sharing on disconnect
- **WHEN** a presenting participant disconnects
- **THEN** their screen share SHALL be removed for all viewers along with their other tracks

#### Scenario: Stop sharing when the host ends the meeting
- **WHEN** the host ends a meeting during an active screen share
- **THEN** the share SHALL be torn down as part of room cleanup

### Requirement: View a screen share
Participants SHALL view a shared screen in the grid.

#### Scenario: Auto-focus the screen share
- **WHEN** a participant starts sharing
- **THEN** the share SHALL become the primary focused tile for every participant, overriding active-speaker layout

#### Scenario: Pin the screen share
- **WHEN** a participant pins a screen share
- **THEN** it SHALL stay focused even when another participant speaks

#### Scenario: Manual unfocus
- **WHEN** a viewer chooses to unfocus the screen share
- **THEN** their own layout SHALL return to the participant grid without affecting anyone else's view

#### Scenario: Screen share quality
- **WHEN** a screen share track is published
- **THEN** it SHALL be configured for detail over frame rate, so that text remains legible

#### Scenario: Screen share is never unsubscribed by pagination
- **WHEN** grid pagination unsubscribes off-screen video tracks
- **THEN** an active screen share track SHALL remain subscribed regardless of page
