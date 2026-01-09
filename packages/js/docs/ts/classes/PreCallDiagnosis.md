Class representing the pre-call diagnosis.
The pre-call diagnosis is used to diagnose the call quality before the call is established.
It can be used to detect potential issues that may affect the call quality.

## Table of contents

### Methods

- [getTelnyxIds](/development/webrtc/js-sdk/classes/precalldiagnosis#gettelnyxids)
- [run](/development/webrtc/js-sdk/classes/precalldiagnosis#run)

## Methods

### getTelnyxIds

▸ **getTelnyxIds**(): [`TelnyxIDs`](/development/webrtc/js-sdk/interfaces/telnyxids)

Gets the Telnyx identifiers for the pre-call diagnosis.

#### Returns

[`TelnyxIDs`](/development/webrtc/js-sdk/interfaces/telnyxids)

{@type TelnyxIDs} The Telnyx identifiers for the pre-call diagnosis.

---

### run

▸ `Static` **run**(`options`): `Promise`\<[`Report`](/development/webrtc/js-sdk/interfaces/report)\>

Executes the pre-call diagnosis and returns a report.

#### Parameters

| Name      | Type                                                                                       | Description                                                             |
| :-------- | :----------------------------------------------------------------------------------------- | :---------------------------------------------------------------------- |
| `options` | [`PreCallDiagnosisOptions`](/development/webrtc/js-sdk/interfaces/precalldiagnosisoptions) | {@type PreCallDiagnosisOptions} - The options to use for the diagnosis. |

#### Returns

`Promise`\<[`Report`](/development/webrtc/js-sdk/interfaces/report)\>

A promise that resolves with the report.
