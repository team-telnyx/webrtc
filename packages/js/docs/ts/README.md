## Table of contents

### Enumerations

- [VertoModifyAction](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/enums/VertoModifyAction.md)

### Call Classes

- [Call](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/classes/Call.md)

### Client Classes

- [TelnyxRTC](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/classes/TelnyxRTC.md)

### Other Classes

- [PreCallDiagnosis](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/classes/PreCallDiagnosis.md)

### Notification Interfaces

- [INotification](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/INotification.md)

### Other Interfaces

- [ICallEstablishmentTimings](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/ICallEstablishmentTimings.md)
- [ICallOptions](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/ICallOptions.md)
- [IClientOptions](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/IClientOptions.md)
- [IICECandidatePair](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/IICECandidatePair.md)
- [ILocalAudioSourceStats](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/ILocalAudioSourceStats.md)
- [ILocalAudioTrackSnapshot](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/ILocalAudioTrackSnapshot.md)
- [ITransportStats](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/ITransportStats.md)
- [MinMaxAverage](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/MinMaxAverage.md)
- [PreCallDiagnosisOptions](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallDiagnosisOptions.md)
- [RTCIceCandidateStats](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/RTCIceCandidateStats.md)
- [Report](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/Report.md)
- [TargetParams](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/TargetParams.md)
- [TelnyxIDs](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/TelnyxIDs.md)

### Type Aliases

- [AIConversationFunctionCallOutputParams](#aiconversationfunctioncalloutputparams)
- [AIConversationFunctionCallParams](#aiconversationfunctioncallparams)
- [AIConversationParams](#aiconversationparams)
- [FunctionCallItem](#functioncallitem)
- [FunctionCallOutputItem](#functioncalloutputitem)
- [IAIConversationMessageEvent](#iaiconversationmessageevent)
- [ISendAIConversationMessageOptions](#isendaiconversationmessageoptions)

### Functions

- [callMarkName](#callmarkname)
- [clearCallMarks](#clearcallmarks)
- [collectCallEstablishmentTimings](#collectcallestablishmenttimings)
- [getConstraintsWithoutDeviceId](#getconstraintswithoutdeviceid)
- [isDeviceNotFoundError](#isdevicenotfounderror)
- [isFunctionCallOutputParams](#isfunctioncalloutputparams)
- [isFunctionCallParams](#isfunctioncallparams)
- [logCallEstablishmentTimings](#logcallestablishmenttimings)

## Type Aliases

### AIConversationFunctionCallOutputParams

Ƭ **AIConversationFunctionCallOutputParams**: `Object`

Params for an outbound `ai_conversation` message with `params.type = "conversation.item.create"`.
Contains a function_call_output item to send back to the backend.

#### Type declaration

| Name   | Type                                                |
| :----- | :-------------------------------------------------- |
| `item` | [`FunctionCallOutputItem`](#functioncalloutputitem) |
| `type` | `"conversation.item.create"`                        |

---

### AIConversationFunctionCallParams

Ƭ **AIConversationFunctionCallParams**: `Object`

Params for an inbound `ai_conversation` message with `params.type = "conversation.item.created"`.
Contains a function_call item from the backend.

#### Type declaration

| Name   | Type                                    |
| :----- | :-------------------------------------- |
| `item` | [`FunctionCallItem`](#functioncallitem) |
| `type` | `"conversation.item.created"`           |

---

### AIConversationParams

Ƭ **AIConversationParams**: [`AIConversationFunctionCallParams`](#aiconversationfunctioncallparams) \| [`AIConversationFunctionCallOutputParams`](#aiconversationfunctioncalloutputparams) \| \{ `[key: string]`: `unknown`; `type`: `string` }

Generic params for any `ai_conversation` message.
Can be a function_call (inbound) or function_call_output (outbound),
as well as other `ai_conversation` message types (transcript, etc.).

---

### FunctionCallItem

Ƭ **FunctionCallItem**: `Object`

An inbound function_call item from the backend (ACA).
Represents a request to execute a client-side tool.

#### Type declaration

| Name        | Type              | Description                                                                            |
| :---------- | :---------------- | :------------------------------------------------------------------------------------- |
| `arguments` | `string`          | JSON-encoded string of the tool arguments.                                             |
| `call_id`   | `string`          | Unique identifier for this function call. Used to correlate with function_call_output. |
| `name`      | `string`          | Name of the client-side tool to execute.                                               |
| `type`      | `"function_call"` | -                                                                                      |

---

### FunctionCallOutputItem

Ƭ **FunctionCallOutputItem**: `Object`

An outbound function_call_output item to send to the backend.
Represents the result of executing a client-side tool.

#### Type declaration

| Name      | Type                     | Description                                                                |
| :-------- | :----------------------- | :------------------------------------------------------------------------- |
| `call_id` | `string`                 | Must match the call_id of the corresponding function_call.                 |
| `output`  | `string`                 | The output/result of the tool execution (typically a JSON-encoded string). |
| `type`    | `"function_call_output"` | -                                                                          |

---

### IAIConversationMessageEvent

Ƭ **IAIConversationMessageEvent**: `Object`

Event payload emitted on `SwEvent.AIConversationMessage`.
Represents an inbound `ai_conversation` JSON-RPC message from the backend.

#### Type declaration

| Name            | Type                                            | Description                                                    |
| :-------------- | :---------------------------------------------- | :------------------------------------------------------------- |
| `method`        | `"ai_conversation"`                             | The method of the JSON-RPC message (always "ai_conversation"). |
| `params`        | [`AIConversationParams`](#aiconversationparams) | The params of the ai_conversation message.                     |
| `voice_sdk_id?` | `string`                                        | Voice SDK ID for correlation, if present.                      |

---

### ISendAIConversationMessageOptions

Ƭ **ISendAIConversationMessageOptions**: `Object`

Options for `sendAIConversationMessage()`.
Used to send a `function_call_output` back to the backend.

#### Type declaration

| Name   | Type                                                | Description                       |
| :----- | :-------------------------------------------------- | :-------------------------------- |
| `item` | [`FunctionCallOutputItem`](#functioncalloutputitem) | The function call output to send. |

## Functions

### callMarkName

▸ **callMarkName**(`callId`, `suffix`): `string`

Build a call-scoped performance mark name.
Format: `telnyx:call:{callId}:{suffix}`

Scoping marks by call_id prevents stale marks from a previous call
from being picked up by a subsequent call's timing collection.

#### Parameters

| Name     | Type     |
| :------- | :------- |
| `callId` | `string` |
| `suffix` | `string` |

#### Returns

`string`

---

### clearCallMarks

▸ **clearCallMarks**(`callId`): `void`

Clear all call establishment performance marks for a given call.
Marks are scoped by call_id, so only marks belonging to this call are removed.

#### Parameters

| Name     | Type     |
| :------- | :------- |
| `callId` | `string` |

#### Returns

`void`

---

### collectCallEstablishmentTimings

▸ **collectCallEstablishmentTimings**(`callId`, `mode`, `direction`): [`ICallEstablishmentTimings`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/ICallEstablishmentTimings.md)

Collect all call establishment timings from performance marks.
All times are measured from the 'new-call-start' mark.

#### Parameters

| Name        | Type                           | Description                          |
| :---------- | :----------------------------- | :----------------------------------- |
| `callId`    | `string`                       | The call ID to scope mark lookups to |
| `mode`      | `"trickle"` \| `"non-trickle"` | 'trickle' or 'non-trickle' ICE mode  |
| `direction` | `"inbound"` \| `"outbound"`    | 'outbound' or 'inbound'              |

#### Returns

[`ICallEstablishmentTimings`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/ICallEstablishmentTimings.md)

---

### getConstraintsWithoutDeviceId

▸ **getConstraintsWithoutDeviceId**(`constraints`): `MediaStreamConstraints`

Remove deviceId constraints from constraints to fallback to default device
Returns null if no deviceId was specified (no fallback possible)

#### Parameters

| Name          | Type                     |
| :------------ | :----------------------- |
| `constraints` | `MediaStreamConstraints` |

#### Returns

`MediaStreamConstraints`

---

### isDeviceNotFoundError

▸ **isDeviceNotFoundError**(`error`): `boolean`

Check if error is related to a specific device being unavailable

#### Parameters

| Name    | Type    |
| :------ | :------ |
| `error` | `Error` |

#### Returns

`boolean`

---

### isFunctionCallOutputParams

▸ **isFunctionCallOutputParams**(`params`): params is AIConversationFunctionCallOutputParams

Type guard: checks if an `ai_conversation` message contains a `function_call_output` item.

#### Parameters

| Name     | Type                                            |
| :------- | :---------------------------------------------- |
| `params` | [`AIConversationParams`](#aiconversationparams) |

#### Returns

params is AIConversationFunctionCallOutputParams

---

### isFunctionCallParams

▸ **isFunctionCallParams**(`params`): params is AIConversationFunctionCallParams

Type guard: checks if an `ai_conversation` message contains a `function_call` item.

#### Parameters

| Name     | Type                                            |
| :------- | :---------------------------------------------- |
| `params` | [`AIConversationParams`](#aiconversationparams) |

#### Returns

params is AIConversationFunctionCallParams

---

### logCallEstablishmentTimings

▸ **logCallEstablishmentTimings**(`timings`): `void`

Log call establishment timings as a readable table.

#### Parameters

| Name      | Type                                                                                                                                       |
| :-------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| `timings` | [`ICallEstablishmentTimings`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/ICallEstablishmentTimings.md) |

#### Returns

`void`
