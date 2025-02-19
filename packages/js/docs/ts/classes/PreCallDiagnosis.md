Class representing the pre-call diagnosis.
The pre-call diagnosis is used to diagnose the call quality before the call is established.
It can be used to detect potential issues that may affect the call quality.

## Table of contents

### Methods

- [getTelnyxIds](/docs/voice/webrtc/js-sdk/classes/PreCallDiagnosis.md#gettelnyxids)
- [run](/docs/voice/webrtc/js-sdk/classes/PreCallDiagnosis.md#run)

## Methods

### getTelnyxIds

▸ **getTelnyxIds**(): [`TelnyxIDs`](/docs/voice/webrtc/js-sdk/interfaces/TelnyxIDs.md)

Gets the Telnyx identifiers for the pre-call diagnosis.

#### Returns

[`TelnyxIDs`](/docs/voice/webrtc/js-sdk/interfaces/TelnyxIDs.md)

{@type TelnyxIDs} The Telnyx identifiers for the pre-call diagnosis.

___

### run

▸ `Static` **run**(`options`): `Promise`\<[`Report`](/docs/voice/webrtc/js-sdk/interfaces/Report.md)\>

Executes the pre-call diagnosis and returns a report.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `options` | [`PreCallDiagnosisOptions`](/docs/voice/webrtc/js-sdk/interfaces/PreCallDiagnosisOptions.md) | {@type PreCallDiagnosisOptions} - The options to use for the diagnosis. |

#### Returns

`Promise`\<[`Report`](/docs/voice/webrtc/js-sdk/interfaces/Report.md)\>

A promise that resolves with the report.
