PreCallDiagnostic executes a temporary diagnostic call and collects
reports from registered module builders.

Implements the PreCallDiagnosticRunner interface so it can be used
polymorphically with future alternative runners.

## Implements

- [`PreCallDiagnosticRunner`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallDiagnosticRunner.md)

## Table of contents

### Methods

- [run](#run)

## Methods

### run

▸ **run**(): `Promise`\<[`PreCallDiagnosticReport`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallDiagnosticReport.md)\>

Execute the diagnostic and return the report.

Dispatches on `options.mode`:

- `'full'` (default): establish a real diagnostic call via
  `client.newCall()`, wait for it to reach the `active` state (enforced
  by `callSetupTimeoutMs`), then sample stats for `durationMs` and run
  all four modules.
- `'network-only'`: build a raw `RTCPeerConnection` from the client's
  ICE servers, gather candidates for `durationMs`, then close. No call
  is placed. Only the ICE module runs.
- `'microphone-only'`: run `getUserMedia` + Web Audio level analysis for
  `durationMs`, then stop tracks. No call is placed. Only the
  microphone module runs.

#### Returns

`Promise`\<[`PreCallDiagnosticReport`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallDiagnosticReport.md)\>

#### Implementation of

[PreCallDiagnosticRunner](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallDiagnosticRunner.md).[run](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallDiagnosticRunner.md#run)
