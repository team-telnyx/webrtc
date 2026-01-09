Class representing the pre-call diagnosis.
The pre-call diagnosis is used to diagnose the call quality before the call is established.
It can be used to detect potential issues that may affect the call quality.

## Table of contents

### Methods

- [getTelnyxIds](#gettelnyxids)
- [run](#run)

## Methods

### getTelnyxIds

▸ **getTelnyxIds**(): [`TelnyxIDs`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/TelnyxIDs.md)

Gets the Telnyx identifiers for the pre-call diagnosis.

#### Returns

[`TelnyxIDs`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/TelnyxIDs.md)

{@type TelnyxIDs} The Telnyx identifiers for the pre-call diagnosis.

---

### run

▸ `Static` **run**(`options`): `Promise`\<[`Report`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/Report.md)\>

Executes the pre-call diagnosis and returns a report.

#### Parameters

| Name      | Type                                                                                                                                   | Description                                                             |
| :-------- | :------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------- |
| `options` | [`PreCallDiagnosisOptions`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallDiagnosisOptions.md) | {@type PreCallDiagnosisOptions} - The options to use for the diagnosis. |

#### Returns

`Promise`\<[`Report`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/Report.md)\>

A promise that resolves with the report.
