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
- [ICredentials](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/ICredentials.md)
- [IClientOptions](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/IClientOptions.md)
- [MinMaxAverage](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/MinMaxAverage.md)
- [PreCallDiagnosisOptions](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallDiagnosisOptions.md)
- [RTCIceCandidateStats](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/RTCIceCandidateStats.md)
- [Report](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/Report.md)
- [TargetParams](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/TargetParams.md)
- [TelnyxIDs](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/TelnyxIDs.md)

### Type Aliases

- [AIConversationFunctionCallOutputParams](#aiconversationfunctioncalloutputparams)
- [AIConversationFunctionCallParams](#aiconversationfunctioncallparams)
- [AIConversationOutboundItem](#aiconversationoutbounditem)
- [AIConversationOutboundParams](#aiconversationoutboundparams)
- [AIConversationParams](#aiconversationparams)
- [FunctionCallItem](#functioncallitem)
- [FunctionCallOutputItem](#functioncalloutputitem)
- [IAIConversationMessageEvent](#iaiconversationmessageevent)
- [ISendAIConversationMessageOptions](#isendaiconversationmessageoptions)
- [ResponseAudioStreamSubscribeItem](#responseaudiostreamsubscribeitem)

### Variables

- [Region](#region)

### Functions

- [isFunctionCallOutputParams](#isfunctioncalloutputparams)
- [isFunctionCallParams](#isfunctioncallparams)

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

### AIConversationOutboundItem

Ƭ **AIConversationOutboundItem**: [`FunctionCallOutputItem`](#functioncalloutputitem) \| [`ResponseAudioStreamSubscribeItem`](#responseaudiostreamsubscribeitem)

Outbound item accepted by `conversation.item.create` over `ai_conversation`.

---

### AIConversationOutboundParams

Ƭ **AIConversationOutboundParams**: `Object`

Params for an outbound `ai_conversation` message with `params.type = "conversation.item.create"`.
Contains any outbound item to send back to the backend.

#### Type declaration

| Name   | Type                                                        |
| :----- | :---------------------------------------------------------- |
| `item` | [`AIConversationOutboundItem`](#aiconversationoutbounditem) |
| `type` | `"conversation.item.create"`                                |

---

### AIConversationParams

Ƭ **AIConversationParams**: [`AIConversationFunctionCallParams`](#aiconversationfunctioncallparams) \| [`AIConversationOutboundParams`](#aiconversationoutboundparams) \| \{ `[key: string]`: `unknown`; `type`: `string` }

Generic params for any `ai_conversation` message.
Can be a function_call (inbound) or outbound conversation item,
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

Ƭ **ISendAIConversationMessageOptions**: [`AIConversationOutboundItem`](#aiconversationoutbounditem)

Argument accepted by `call.sendAIConversationMessage()`: the
outbound item to send back to the backend. Alias of
[AIConversationOutboundItem](#aiconversationoutbounditem), kept as a named export so callers can refer
to the method's parameter type directly.

---

---

### ResponseAudioStreamSubscribeItem

Ƭ **ResponseAudioStreamSubscribeItem**: `Object`

An outbound subscription item for ACA pre-playout assistant audio events.

#### Type declaration

| Name   | Type                                |
| :----- | :---------------------------------- |
| `type` | `"response.audio_stream.subscribe"` |

## Variables

### Region

• `Const` **Region**: `Object`

Supported WebRTC signaling regions.

Omit `IClientOptions.region` to use automatic routing.

#### Type declaration

| Name         | Type           |
| :----------- | :------------- |
| `APAC`       | `"apac"`       |
| `CA_CENTRAL` | `"ca-central"` |
| `EU`         | `"eu"`         |
| `SOUTH_ASIA` | `"south-asia"` |
| `US_CENTRAL` | `"us-central"` |
| `US_EAST`    | `"us-east"`    |
| `US_WEST`    | `"us-west"`    |

## Functions

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
