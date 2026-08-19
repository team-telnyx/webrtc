## Table of contents

### Enumerations

- [VertoModifyAction](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/enums/VertoModifyAction.md)

### Call Classes

- [Call](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/classes/Call.md)

### Client Classes

- [TelnyxRTC](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/classes/TelnyxRTC.md)

### Other Classes

- [CallRecorder](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/classes/CallRecorder.md)
- [PreCallDiagnosis](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/classes/PreCallDiagnosis.md)
- [TimingsCollector](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/classes/TimingsCollector.md)

### Notification Interfaces

- [INotification](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/INotification.md)

### Other Interfaces

- [ICallEstablishmentTimings](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/ICallEstablishmentTimings.md)
- [ICallOptions](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/ICallOptions.md)
- [ICallRecordingContext](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/ICallRecordingContext.md)
- [ICallRecordingEnvelope](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/ICallRecordingEnvelope.md)
- [ICallRecordingOptions](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/ICallRecordingOptions.md)
- [IClientOptions](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/IClientOptions.md)
- [IICECandidatePair](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/IICECandidatePair.md)
- [ILocalAudioSourceStats](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/ILocalAudioSourceStats.md)
- [ILocalAudioTrackSnapshot](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/ILocalAudioTrackSnapshot.md)
- [IRecordingPacket](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/IRecordingPacket.md)
- [ITransportStats](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/ITransportStats.md)
- [MinMaxAverage](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/MinMaxAverage.md)
- [PreCallDiagnosisOptions](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallDiagnosisOptions.md)
- [PreCallDiagnosticContext](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallDiagnosticContext.md)
- [RTCIceCandidateStats](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/RTCIceCandidateStats.md)
- [RTCIceCandidateStats](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/RTCIceCandidateStats-1.md)
- [Report](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/Report.md)
- [RunMicrophoneCheckOptions](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/RunMicrophoneCheckOptions.md)
- [RunPreCallOptions](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/RunPreCallOptions.md)
- [TargetParams](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/TargetParams.md)
- [TelnyxIDs](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/TelnyxIDs.md)
- [TimingsBuildOptions](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/TimingsBuildOptions.md)
- [TimingsCallLike](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/TimingsCallLike.md)

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
- [RecordingTrackKind](#recordingtrackkind)
- [ResponseAudioStreamSubscribeItem](#responseaudiostreamsubscribeitem)
- [RunNetworkCheckOptions](#runnetworkcheckoptions)

### Variables

- [DEFAULT_CALL_RECORDING_FLUSH_INTERVAL_MS](#default_call_recording_flush_interval_ms)
- [DEFAULT_CALL_RECORDING_MAX_BUFFER_BYTES](#default_call_recording_max_buffer_bytes)
- [DEFAULT_CALL_RECORDING_SAMPLE_RATE](#default_call_recording_sample_rate)
- [IceReasonCode](#icereasoncode)
- [MicrophoneReasonCode](#microphonereasoncode)
- [NetworkReasonCode](#networkreasoncode)
- [Region](#region)

### Functions

- [buildPreCallIceReport](#buildprecallicereport)
- [buildPreCallMicrophoneReport](#buildprecallmicrophonereport)
- [buildPreCallNetworkReport](#buildprecallnetworkreport)
- [buildVerdict](#buildverdict)
- [callMarkName](#callmarkname)
- [clearCallMarks](#clearcallmarks)
- [collectCallEstablishmentTimings](#collectcallestablishmenttimings)
- [compareIceServers](#compareiceservers)
- [createDiagnosticContext](#creatediagnosticcontext)
- [createTimingsCollector](#createtimingscollector)
- [flattenIceServersByUrl](#flatteniceserversbyurl)
- [getConstraintsWithoutDeviceId](#getconstraintswithoutdeviceid)
- [isDeviceNotFoundError](#isdevicenotfounderror)
- [isFunctionCallOutputParams](#isfunctioncalloutputparams)
- [isFunctionCallParams](#isfunctioncallparams)
- [isTurnIceServer](#isturniceserver)
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

### RecordingTrackKind

Ƭ **RecordingTrackKind**: `"local"` \| `"remote"`

Which audio track a packet belongs to.

---

### ResponseAudioStreamSubscribeItem

Ƭ **ResponseAudioStreamSubscribeItem**: `Object`

An outbound subscription item for ACA pre-playout assistant audio events.

#### Type declaration

| Name   | Type                                |
| :----- | :---------------------------------- |
| `type` | `"response.audio_stream.subscribe"` |

---

### RunNetworkCheckOptions

Ƭ **RunNetworkCheckOptions**: `Pick`\<[`RunPreCallOptions`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/RunPreCallOptions.md), `"iceServers"`\>

Options for the `TelnyxRTC.runNetworkCheck()` public method.

This is a narrow version of `RunPreCallOptions` that only exposes
the ICE/network-relevant fields. Per-call network quality is included in
each ICE server result; the microphone module is disabled.

The ICE module always runs inside `runNetworkCheck()` — callers cannot
opt out of it from the public API (VSDK-412 Gap 3).

## Variables

### DEFAULT_CALL_RECORDING_FLUSH_INTERVAL_MS

• `Const` **DEFAULT_CALL_RECORDING_FLUSH_INTERVAL_MS**: `15000`

Default interval (ms) between intermediate call-recording flushes.
The recorder POSTs buffered RTP packets to /call_recording on this cadence
so long calls do not buffer unbounded packet data in memory. A final flush
at end of call submits the tail.

This must stay well below the time it takes to fill
`DEFAULT_CALL_RECORDING_MAX_BUFFER_BYTES`, or every call long enough to fill
the buffer drops packets before the first flush ever runs. At 48 kHz the
capture rate is ~208 KB/s per track, so an 8 MB buffer fills in ~38s — the
previous 4-minute default meant no call over ~38s recorded cleanly.
`CallRecorder` additionally clamps this at runtime against the configured
buffer size and sample rate.

**`Default`**

```ts
15000 (15 seconds)
```

---

### DEFAULT_CALL_RECORDING_MAX_BUFFER_BYTES

• `Const` **DEFAULT_CALL_RECORDING_MAX_BUFFER_BYTES**: `8000000`

Default hard cap (bytes) on the in-memory call-recording packet buffer.
On overflow the recorder drops the oldest packets and emits a
RECORDING_BUFFER_OVERFLOW warning (once per flush window).

**`Default`**

```ts
8_000_000 (8 MB)
```

---

### DEFAULT_CALL_RECORDING_SAMPLE_RATE

• `Const` **DEFAULT_CALL_RECORDING_SAMPLE_RATE**: `48000`

Default sample rate (Hz) advertised in the recording envelope. The
captured Float32 PCM frames already carry the track's actual sample rate;
this is the value reported to voice-sdk-debug so it can interpret the
payload. 48 kHz is the typical WebRTC audio track rate.

**`Default`**

```ts
48000;
```

---

### IceReasonCode

• `Const` **IceReasonCode**: `Object`

ICE-related reason codes.

#### Type declaration

| Name                  | Type                          | Description                        |
| :-------------------- | :---------------------------- | :--------------------------------- |
| `GatheringTimeout`    | `"ice_gathering_timeout"`     | -                                  |
| `MultipleInterfaces`  | `"ice_multiple_interfaces"`   | -                                  |
| `NoCandidates`        | `"ice_no_candidates"`         | -                                  |
| `NoSelectedPair`      | `"ice_no_selected_pair"`      | -                                  |
| `OnlyHostCandidates`  | `"ice_only_host_candidates"`  | -                                  |
| `OnlyRelayCandidates` | `"ice_only_relay_candidates"` | **`Deprecated`** Use TurnRequired. |
| `ServerNoCandidates`  | `"ice_server_no_candidates"`  | -                                  |
| `StrictNetwork`       | `"ice_strict_network"`        | -                                  |
| `TurnRequired`        | `"ice_turn_required"`         | -                                  |
| `VpnDetected`         | `"ice_vpn_detected"`          | -                                  |

---

### MicrophoneReasonCode

• `Const` **MicrophoneReasonCode**: `Object`

Microphone-related reason codes.

#### Type declaration

| Name                      | Type                                     | Description                  |
| :------------------------ | :--------------------------------------- | :--------------------------- |
| `CaptureFailed`           | `"microphone_capture_failed"`            | -                            |
| `CaptureNoDevice`         | `"microphone_capture_no_device"`         | -                            |
| `CaptureNotSupported`     | `"microphone_capture_not_supported"`     | -                            |
| `CapturePermissionDenied` | `"microphone_capture_permission_denied"` | -                            |
| `NoDevice`                | `"microphone_no_device"`                 | -                            |
| `PermissionDenied`        | `"microphone_permission_denied"`         | -                            |
| `SilenceDetected`         | `"microphone_silence_detected"`          | **`Deprecated`** Use Silent. |
| `Silent`                  | `"microphone_silent"`                    | -                            |

---

### NetworkReasonCode

• `Const` **NetworkReasonCode**: `Object`

Network-related reason codes.

#### Type declaration

| Name             | Type                         | Description                      |
| :--------------- | :--------------------------- | :------------------------------- |
| `FairQuality`    | `"network_fair_quality"`     | -                                |
| `HighJitter`     | `"network_high_jitter"`      | -                                |
| `HighPacketLoss` | `"network_high_packet_loss"` | **`Deprecated`** Use PacketLoss. |
| `HighRtt`        | `"network_high_rtt"`         | -                                |
| `LowBitrate`     | `"network_low_bitrate"`      | -                                |
| `NoAudioFlow`    | `"network_no_audio_flow"`    | -                                |
| `OneWayAudio`    | `"network_one_way_audio"`    | -                                |
| `PacketLoss`     | `"network_packet_loss"`      | -                                |
| `PoorQuality`    | `"network_poor_quality"`     | -                                |

---

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

### buildPreCallIceReport

▸ **buildPreCallIceReport**(`context`): `PreCallIceReport` \| `undefined`

Build the ICE report section from the diagnostic context.

Returns undefined when:

- no call was established
- the call has no peer connection
- peerConnection.getStats() rejects or is unavailable

Also computes the ICE server comparison (configured ICE servers vs.
gathered candidates) when ICE servers are available in the context.

#### Parameters

| Name      | Type                                                                                                                                     |
| :-------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| `context` | [`PreCallDiagnosticContext`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallDiagnosticContext.md) |

#### Returns

`PreCallIceReport` \| `undefined`

---

### buildPreCallMicrophoneReport

▸ **buildPreCallMicrophoneReport**(`context`): `Promise`\<`PreCallMicrophoneReport` \| `undefined`\>

Run the microphone check and return its report section.

#### Parameters

| Name      | Type                                                                                                                                     |
| :-------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| `context` | [`PreCallDiagnosticContext`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallDiagnosticContext.md) |

#### Returns

`Promise`\<`PreCallMicrophoneReport` \| `undefined`\>

---

### buildPreCallNetworkReport

▸ **buildPreCallNetworkReport**(`context`): `PreCallNetworkReport` \| `undefined`

Build the network report section from the diagnostic context.

Reads stats samples from the context, normalizes RTT/jitter/packet-loss/bytes/bitrate,
classifies quality, and provides reason inputs for the verdict module.

Returns an unknown-quality report if no stats samples are available.

#### Parameters

| Name      | Type                                                                                                                                     |
| :-------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| `context` | [`PreCallDiagnosticContext`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallDiagnosticContext.md) |

#### Returns

`PreCallNetworkReport` \| `undefined`

---

### buildVerdict

▸ **buildVerdict**(`report`, `error?`, `options?`): `Object`

Build the overall verdict from current module reports.

Module reports own their detailed findings; this function only adds the few
cross-module/aggregate findings and applies the worst-verdict-wins policy.

#### Parameters

| Name      | Type             |
| :-------- | :--------------- |
| `report`  | `VerdictInput`   |
| `error?`  | `Error`          |
| `options` | `VerdictOptions` |

#### Returns

`Object`

| Name       | Type                         |
| :--------- | :--------------------------- |
| `reasons`  | `PreCallDiagnosticReason`[]  |
| `verdict`  | `Verdict`                    |
| `warnings` | `PreCallDiagnosticWarning`[] |

---

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

### compareIceServers

▸ **compareIceServers**(`iceServers`, `candidates`): `PreCallIceServerComparisonEntry`[] \| `undefined`

Compare configured ICE servers against the gathered candidates.

For each configured ICE server URL, determine which candidates it
produced (by matching the server's URL to the candidate's `url` field
with credential/transport-suffix normalization). Flag servers that
returned no candidates, and detect strict networks (configured
STUN/TURN UDP but only TURN TCP candidates gathered).

#### Parameters

| Name         | Type                                                                                                                                 | Description                               |
| :----------- | :----------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------- |
| `iceServers` | `RTCIceServer`[]                                                                                                                     | The configured ICE servers from rtcConfig |
| `candidates` | [`RTCIceCandidateStats`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/RTCIceCandidateStats-1.md)[] | The gathered local candidates             |

#### Returns

`PreCallIceServerComparisonEntry`[] \| `undefined`

Comparison result with per-server entries and warning flags

---

### createDiagnosticContext

▸ **createDiagnosticContext**(`options`): [`PreCallDiagnosticContext`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallDiagnosticContext.md)

Create an initial diagnostic context from options.

#### Parameters

| Name      | Type                       |
| :-------- | :------------------------- |
| `options` | `PreCallDiagnosticOptions` |

#### Returns

[`PreCallDiagnosticContext`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallDiagnosticContext.md)

---

### createTimingsCollector

▸ **createTimingsCollector**(): [`TimingsCollector`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/classes/TimingsCollector.md)

Create a timing collector and start measuring total diagnostic duration.

#### Returns

[`TimingsCollector`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/classes/TimingsCollector.md)

---

### flattenIceServersByUrl

▸ **flattenIceServersByUrl**(`servers`): `RTCIceServer`[]

Split multi-URL ICE entries so every endpoint gets an isolated call.

#### Parameters

| Name      | Type             |
| :-------- | :--------------- |
| `servers` | `RTCIceServer`[] |

#### Returns

`RTCIceServer`[]

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

### isTurnIceServer

▸ **isTurnIceServer**(`server`): `boolean`

Whether an isolated ICE server call must force relay policy.

#### Parameters

| Name     | Type           |
| :------- | :------------- |
| `server` | `RTCIceServer` |

#### Returns

`boolean`

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
