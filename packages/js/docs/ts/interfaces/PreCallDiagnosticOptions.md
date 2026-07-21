Options for the PreCallDiagnostic constructor.

Internal-only fields (`mode`, `ice`/`network`/`media`/`microphone` module
toggles, `callerName`/`callerNumber`/`audio`, `statsSampleIntervalMs`,
`autoHangup`, `rtcConfig`) are NOT part of the public API surface — see
`RunPreCallOptions` in `TelnyxRTC.ts` for the trimmed 4-field public
surface (`destinationNumber`, `callSetupTimeoutMs`, `durationMs`,
`iceServers`).

## Table of contents

### Properties

- [audio](#audio)
- [autoHangup](#autohangup)
- [callSetupTimeoutMs](#callsetuptimeoutms)
- [callerName](#callername)
- [callerNumber](#callernumber)
- [client](#client)
- [debug](#debug)
- [destinationNumber](#destinationnumber)
- [durationMs](#durationms)
- [ice](#ice)
- [media](#media)
- [microphone](#microphone)
- [mode](#mode)
- [network](#network)
- [rtcConfig](#rtcconfig)
- [statsSampleIntervalMs](#statssampleintervalms)

## Properties

### audio

• `Optional` **audio**: `boolean` \| `MediaTrackConstraints`

Audio constraints for the diagnostic call (internal — not public surface).

---

### autoHangup

• `Optional` **autoHangup**: `boolean`

Whether to automatically hang up the diagnostic call on completion. Default: true.

---

### callSetupTimeoutMs

• `Optional` **callSetupTimeoutMs**: `number`

Timeout in ms for the call setup phase. Default: 30000.

---

### callerName

• `Optional` **callerName**: `string`

Caller name for the diagnostic call (internal — not public surface).

---

### callerNumber

• `Optional` **callerNumber**: `string`

Caller number for the diagnostic call (internal — not public surface).

---

### client

• **client**: [`TelnyxRTC`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/classes/TelnyxRTC.md)

Required runtime dependency for creating diagnostic calls.

---

### debug

• `Optional` **debug**: `boolean`

Whether to enable SDK debug logging for the diagnostic call.
Default: false. When true, the diagnostic call is created with
`debug: true` (enables the SDK's full debug-log path). Callers must
opt in explicitly — diagnostic calls should not silently opt the
caller into verbose logging.

---

### destinationNumber

• `Optional` **destinationNumber**: `string`

The destination number to dial for the diagnostic call.

Optional: only required for `'full'` mode (a real diagnostic call).
`'network-only'` and `'microphone-only'` modes do not place a call, so
`destinationNumber` is irrelevant for them and may be omitted.

---

### durationMs

• `Optional` **durationMs**: `number`

Duration in ms to keep the diagnostic call active for sampling. Default: 5000.

---

### ice

• `Optional` **ice**: `boolean` \| [`PreCallIceOptions`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallIceOptions.md)

Whether to run the ICE diagnostic module. Default: true (if true, uses defaults).

---

### media

• `Optional` **media**: `boolean` \| [`PreCallMediaOptions`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallMediaOptions.md)

Whether to run the media diagnostic module. Default: true (if true, uses defaults).

---

### microphone

• `Optional` **microphone**: `boolean` \| [`PreCallMicrophoneOptions`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallMicrophoneOptions.md)

Whether to run the microphone diagnostic module. Default: true (if true, uses defaults).

---

### mode

• `Optional` **mode**: `"full"` \| `"network-only"` \| `"microphone-only"`

Diagnostic run mode — controls which path `PreCallDiagnostic.run()`
takes. Set internally by the public API methods:

- `runPreCall()` → `'full'` (establishes a diagnostic call, runs all modules)
- `runNetworkCheck()` → `'network-only'` (raw RTCPeerConnection, ICE only)
- `runMicrophoneCheck()` → `'microphone-only'` (getUserMedia + Web Audio)

Not part of the public surface; module toggles (`ice`/`network`/`media`/
`microphone`) are NOT exposed to callers. Defaults to `'full'` when
omitted so a bare `new PreCallDiagnostic(options).run()` runs the
complete pipeline.

---

### network

• `Optional` **network**: `boolean` \| [`PreCallNetworkOptions`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallNetworkOptions.md)

Whether to run the network diagnostic module. Default: true (if true, uses defaults).

---

### rtcConfig

• `Optional` **rtcConfig**: `RTCConfiguration`

Optional RTC configuration override for the diagnostic call.

---

### statsSampleIntervalMs

• `Optional` **statsSampleIntervalMs**: `number`

Interval in ms between stats samples. Default: 1000.
