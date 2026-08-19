Options for the `TelnyxRTC.runMicrophoneCheck()` public method.

This is a narrow version of `RunPreCallOptions` that only exposes
the microphone-relevant fields. When `runMicrophoneCheck` is called,
the other modules (ICE and network) are disabled.

The microphone module always runs inside `runMicrophoneCheck()` —
callers cannot opt out of it from the public API (VSDK-412 Gap 3).

Recording is opt-in and defaults to `false` so the zero-argument path does
not silently record the user. Successful recordings are played back
automatically. Callers can pass `warnOnRecording` to display a warning
immediately before recording starts.

## Hierarchy

- `Pick`\<[`RunPreCallOptions`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/RunPreCallOptions.md), `"durationMs"`\>

  ↳ **`RunMicrophoneCheckOptions`**

## Table of contents

### Properties

- [durationMs](#durationms)
- [record](#record)
- [silenceThreshold](#silencethreshold)
- [warnOnRecording](#warnonrecording)

## Properties

### durationMs

• `Optional` **durationMs**: `number`

Post-establishment sampling window in ms. The timer starts **only**
after the call reaches the established state. If establishment
never completes, this timer is never started. Default: ~5000.

#### Inherited from

Pick.durationMs

---

### record

• `Optional` **record**: `boolean`

Whether to record the microphone audio during the check so the
user can listen to it afterwards. Defaults to `false`.

---

### silenceThreshold

• `Optional` **silenceThreshold**: `number`

Audio level at or above which the microphone is considered non-silent.
Clamped to the range 0–1. Default: `0.01`.

---

### warnOnRecording

• `Optional` **warnOnRecording**: (`notice`: `string`) => `void`

#### Type declaration

▸ (`notice`): `void`

Optional callback invoked immediately before recording starts. It
receives `MICROPHONE_RECORDING_NOTICE`, allowing the application to
display a warning to the user.

##### Parameters

| Name     | Type     |
| :------- | :------- |
| `notice` | `string` |

##### Returns

`void`
