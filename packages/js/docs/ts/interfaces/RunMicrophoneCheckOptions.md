Options for the `TelnyxRTC.runMicrophoneCheck()` public method.

This is a narrow version of `RunPreCallOptions` that only exposes
the microphone-relevant fields. When `runMicrophoneCheck` is called,
the other modules (ICE, network, media) are disabled.

The microphone module always runs inside `runMicrophoneCheck()` —
callers cannot opt out of it from the public API (VSDK-412 Gap 3).

Recording and playback are opt-in: both default to `false` so the
zero-argument path does not silently record the user without consent
(VSDK-412 review: "the zero-argument path still records before any
warning/consent"). Callers who want the "record and listen" flow must
explicitly set `record: true` and should pass `onRecordingConsent`
so a pre-recording warning is displayed before capture begins.

## Hierarchy

- [`RunPreCallOptions`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/RunPreCallOptions.md)

  ↳ **`RunMicrophoneCheckOptions`**

## Table of contents

### Properties

- [callSetupTimeoutMs](#callsetuptimeoutms)
- [destinationNumber](#destinationnumber)
- [durationMs](#durationms)
- [iceServers](#iceservers)
- [onRecordingConsent](#onrecordingconsent)
- [playback](#playback)
- [record](#record)

## Properties

### callSetupTimeoutMs

• `Optional` **callSetupTimeoutMs**: `number`

Hard upper bound in ms for the call to reach ICE + DTLS + media ready.
On expiry: hangup, return report with `verdict: 'inconclusive'` +
`reasons: [{code: 'call_setup_timeout'}]`, omit module sections.
Default: ~30000.

#### Inherited from

[RunPreCallOptions](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/RunPreCallOptions.md).[callSetupTimeoutMs](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/RunPreCallOptions.md#callsetuptimeoutms)

---

### destinationNumber

• `Optional` **destinationNumber**: `string`

The destination number to dial for the diagnostic call.
Optional; defaults to `'+1-872-231-5806'` when omitted.

#### Inherited from

[RunPreCallOptions](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/RunPreCallOptions.md).[destinationNumber](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/RunPreCallOptions.md#destinationnumber)

---

### durationMs

• `Optional` **durationMs**: `number`

Post-establishment sampling window in ms. The timer starts **only**
after the call reaches the established state. If establishment
never completes, this timer is never started. Default: ~5000.

#### Inherited from

[RunPreCallOptions](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/RunPreCallOptions.md).[durationMs](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/RunPreCallOptions.md#durationms)

---

### iceServers

• `Optional` **iceServers**: `RTCIceServer`[]

Custom ICE servers for the diagnostic call only (folded VSDK-308).

When provided, these ICE servers are used for the temporary
diagnostic call and do not mutate or override the client's
configured ICE servers. When omitted, the diagnostic call uses
the client's existing ICE server configuration, matching normal
call behavior. Takes precedence over the client's ICE servers but
not over an explicit `rtcConfig` override.

#### Inherited from

[RunPreCallOptions](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/RunPreCallOptions.md).[iceServers](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/RunPreCallOptions.md#iceservers)

---

### onRecordingConsent

• `Optional` **onRecordingConsent**: () => `Promise`\<`void`\>

#### Type declaration

▸ (): `Promise`\<`void`\>

Optional consent callback invoked BEFORE recording starts (when
`record: true`). The module awaits this callback before calling
`MediaRecorder.start()`. Rejecting the promise aborts recording
(but not the rest of the microphone check). See
`MICROPHONE_RECORDING_NOTICE` for the recommended notice string.

##### Returns

`Promise`\<`void`\>

---

### playback

• `Optional` **playback**: `boolean`

Whether to play back the recorded audio after capture. Only
applies when `record: true`. Defaults to `false`.

---

### record

• `Optional` **record**: `boolean`

Whether to record the microphone audio during the check so the
user can listen to it afterwards. Defaults to `false` — the
zero-argument path must not silently record without consent.
When set to `true`, pass `onRecordingConsent` so a warning is
displayed before `MediaRecorder.start()`.
