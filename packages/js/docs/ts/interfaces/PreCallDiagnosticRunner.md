Runner interface for the diagnostic. PreCallDiagnostic implements this.
Future alternative runners can implement the same interface.

## Implemented by

- [`PreCallDiagnostic`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/classes/PreCallDiagnostic.md)

## Table of contents

### Methods

- [run](#run)

## Methods

### run

▸ **run**(): `Promise`\<[`PreCallDiagnosticReport`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallDiagnosticReport.md)\>

Execute the diagnostic and return the report.

#### Returns

`Promise`\<[`PreCallDiagnosticReport`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallDiagnosticReport.md)\>
