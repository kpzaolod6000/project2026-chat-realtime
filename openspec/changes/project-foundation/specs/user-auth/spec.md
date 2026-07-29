## ADDED Requirements

### Requirement: User registration
Users SHALL register with email and password to create an account.

#### Scenario: Successful registration
- **WHEN** a user submits a valid email and a password of at least 12 characters
- **THEN** the system SHALL hash the password with argon2id, create the account, and establish a session

#### Scenario: Duplicate email
- **WHEN** a user submits an email that already exists
- **THEN** the system SHALL return a duplicate email error without revealing whether the existing account is active

#### Scenario: Weak password rejected
- **WHEN** a user submits a password shorter than 12 characters
- **THEN** the system SHALL reject the registration with a specific validation message and SHALL NOT create the account

#### Scenario: Password never stored in plaintext
- **WHEN** any account is created or updated
- **THEN** only the argon2id hash SHALL be persisted, and the plaintext password SHALL NOT appear in logs or error responses

### Requirement: User login
Users SHALL log in with email and password to establish a session.

#### Scenario: Successful login
- **WHEN** a user submits correct credentials
- **THEN** the system SHALL set a session cookie with `HttpOnly`, `Secure`, and `SameSite=None` attributes

#### Scenario: Invalid credentials
- **WHEN** a user submits an incorrect email or password
- **THEN** the system SHALL return an identical generic authentication error for both cases, so the response does not reveal whether the email exists

#### Scenario: Logout
- **WHEN** a user logs out
- **THEN** the system SHALL clear the session cookie and the session SHALL be rejected on subsequent requests

### Requirement: Authentication rate limiting
The system SHALL throttle repeated authentication attempts.

#### Scenario: Too many attempts from one address
- **WHEN** more than 10 failed login attempts originate from the same IP within 15 minutes
- **THEN** the system SHALL reject further attempts from that address with a rate-limit error until the window expires

#### Scenario: Too many attempts against one account
- **WHEN** more than 5 failed login attempts target the same email within 15 minutes
- **THEN** the system SHALL reject further attempts against that email regardless of source address

### Requirement: Cross-origin request protection
Because the UI and API are separate origins with `SameSite=None` cookies, the system SHALL defend mutating requests against cross-site forgery.

#### Scenario: Request from an unlisted origin
- **WHEN** a request arrives with an `Origin` header that is not in the configured allowlist
- **THEN** the system SHALL reject it before executing any handler logic

#### Scenario: Mutating request without a CSRF token
- **WHEN** a POST, PATCH, or DELETE request arrives without a valid double-submit CSRF token
- **THEN** the system SHALL reject it with an authorization error

#### Scenario: Preflight request
- **WHEN** the browser sends an OPTIONS preflight from an allowed origin
- **THEN** the system SHALL respond with the allowed methods, headers, and `Access-Control-Allow-Credentials: true`, and SHALL NOT respond with a wildcard origin

### Requirement: LiveKit token issuance
The backend SHALL issue LiveKit access tokens for authenticated users joining rooms.

#### Scenario: Generate token on room join
- **WHEN** an authenticated, non-banned user joins an active room
- **THEN** the backend SHALL issue a LiveKit token carrying the user's identity, display name, room code, and publish/subscribe/data grants, with a 1-hour TTL

#### Scenario: Host role in token metadata
- **WHEN** the requesting user is the room's host
- **THEN** the token metadata SHALL declare `role: "host"`, and SHALL declare `role: "participant"` otherwise

#### Scenario: Token metadata is not an authorization source
- **WHEN** any moderation endpoint is called
- **THEN** the backend SHALL verify host status against `rooms.host_id` in the database, and SHALL NOT rely on the role claim in the token

#### Scenario: API secret never reaches the client
- **WHEN** a token is issued
- **THEN** the signing occurs server-side and `LIVEKIT_API_SECRET` SHALL NOT be exposed in any response, client bundle, or public environment variable

### Requirement: LiveKit token refresh
Clients SHALL obtain a fresh LiveKit token without losing their session.

#### Scenario: Refresh before expiry
- **WHEN** a connected client's LiveKit token is within 5 minutes of expiry
- **THEN** the client SHALL request a new token and hold it ready for the next reconnection

#### Scenario: Refresh with a valid session
- **WHEN** a refresh is requested and the session cookie is valid and the room is still active
- **THEN** the backend SHALL issue a new token with the same grants and a fresh TTL

#### Scenario: Refresh after the room ended
- **WHEN** a refresh is requested for a room whose status is `ending` or `ended`
- **THEN** the backend SHALL refuse to issue a token

### Requirement: Room authorization
Only authenticated users SHALL create or join rooms.

#### Scenario: Unauthenticated access denied
- **WHEN** an unauthenticated user opens a room URL
- **THEN** the system SHALL redirect to the login page and return to the room URL after successful login

#### Scenario: Direct API call without a session
- **WHEN** an unauthenticated request reaches any room endpoint
- **THEN** the system SHALL return an authentication error and SHALL NOT disclose whether the room code exists
