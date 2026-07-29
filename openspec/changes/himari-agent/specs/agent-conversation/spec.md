## ADDED Requirements

> Speech pipeline delivered in v0.7; tools and RAG in v0.8.

### Requirement: Spoken conversation
The agent SHALL hold a spoken conversation with participants in the room.

#### Scenario: Participant speaks, agent answers
- **WHEN** a participant speaks while the agent is `Active`
- **THEN** the agent SHALL transcribe the speech, generate a response, and publish it as audio to the room

#### Scenario: Response begins within budget
- **WHEN** a participant finishes speaking
- **THEN** the agent's first audible word SHALL begin within 2 seconds at p95, measured from end of speech

#### Scenario: Speech is not directed at the agent
- **WHEN** two participants talk to each other without addressing the agent
- **THEN** the agent SHALL NOT respond, because v0.7 responds only when addressed

#### Scenario: Silence produces no response
- **WHEN** the agent detects only background noise
- **THEN** voice activity detection SHALL suppress it and no turn SHALL be started

#### Scenario: Transcription fails
- **WHEN** speech-to-text returns an error or empty text
- **THEN** the agent SHALL stay silent rather than responding to nothing, and SHALL log the failure

### Requirement: Turn-taking and interruption
The agent SHALL yield when a human speaks over it.

#### Scenario: Participant interrupts mid-response
- **WHEN** a participant starts speaking while the agent is talking
- **THEN** the agent SHALL stop its audio output within 300 ms and process the new input

#### Scenario: Interrupted response is discarded
- **WHEN** the agent is interrupted
- **THEN** the remainder of the interrupted response SHALL NOT be spoken later

#### Scenario: Two participants speak at once
- **WHEN** more than one participant speaks simultaneously
- **THEN** the agent SHALL process the combined audio as a single turn rather than attempting to answer both separately

### Requirement: Thinking state is visible
Participants SHALL be able to tell the difference between an agent that is working and one that has failed.

#### Scenario: Processing indicator
- **WHEN** the agent has received input and has not yet begun speaking
- **THEN** a thinking indicator SHALL be shown to every participant within 500 ms

#### Scenario: Response takes unusually long
- **WHEN** a turn exceeds 4 seconds without audio output
- **THEN** the agent SHALL emit a conversational filler so the delay is heard as thinking rather than as a fault

#### Scenario: Turn fails entirely
- **WHEN** a turn fails at any pipeline stage
- **THEN** the agent SHALL say that it could not answer, and SHALL NOT fail silently

### Requirement: Function calling
The agent SHALL invoke registered tools when the conversation requires them.

#### Scenario: Tool invoked
- **WHEN** the model determines a registered tool is needed
- **THEN** the agent SHALL execute it and incorporate the result into its spoken response

#### Scenario: Tool fails
- **WHEN** a tool raises an error or times out
- **THEN** the agent SHALL tell the participant it could not complete the action, and SHALL NOT fabricate a result

#### Scenario: Tool execution is bounded
- **WHEN** a tool runs longer than its configured timeout
- **THEN** it SHALL be cancelled and treated as a failure, so a hanging tool cannot freeze the conversation

#### Scenario: Unknown tool requested
- **WHEN** the model requests a tool that is not registered
- **THEN** the request SHALL be rejected and the model SHALL be informed, rather than the agent crashing

### Requirement: Retrieval-augmented answers
The agent SHALL ground answers in a knowledge base rather than only in model parameters.

#### Scenario: Answer from the knowledge base
- **WHEN** a participant asks something covered by the knowledge base
- **THEN** the agent SHALL retrieve the relevant passages and base its answer on them

#### Scenario: Nothing relevant retrieved
- **WHEN** retrieval returns no sufficiently relevant passage
- **THEN** the agent SHALL say it does not know rather than answering from general model knowledge and presenting it as sourced

#### Scenario: Retrieval is unavailable
- **WHEN** the vector store is unreachable
- **THEN** the agent SHALL continue conversing without retrieval and SHALL indicate that its knowledge base is unavailable

#### Scenario: Retrieval latency bounded
- **WHEN** retrieval exceeds its timeout
- **THEN** the turn SHALL proceed without the retrieved context rather than delaying the response indefinitely

### Requirement: Agent latency is measured
Every milestone SHALL record the agent's end-to-end turn latency.

#### Scenario: Baseline recorded at v0.7
- **WHEN** the speech pipeline is first working
- **THEN** end-of-speech to first-audio SHALL be measured at p50 and p95 and recorded in documentation

#### Scenario: Regression detected
- **WHEN** a later milestone increases p95 turn latency by more than 20% over the recorded baseline
- **THEN** the regression SHALL be investigated before that milestone is tagged
