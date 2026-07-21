Options for the microphone diagnostic module.

## Table of contents

### Properties

- [activeCapture](#activecapture)
- [checkDeviceAvailability](#checkdeviceavailability)
- [checkPermission](#checkpermission)
- [onRecordingConsent](#onrecordingconsent)
- [playback](#playback)
- [record](#record)
- [sampleDurationMs](#sampledurationms)
- [silenceThreshold](#silencethreshold)

## Properties

### activeCapture

• `Optional` **activeCapture**: `boolean`

Whether to perform active microphone capture and audio-level detection.
When true, getUserMedia({ audio: true }) is called and the audio level
is measured during a short sample window. All tracks are stopped after
the sample completes.
Default: true (enabled for `runMicrophoneCheck()`).

---

### checkDeviceAvailability

• `Optional` **checkDeviceAvailability**: `boolean`

Whether to check device availability. Default: true.

---

### checkPermission

• `Optional` **checkPermission**: `boolean`

Whether to check microphone permission. Default: true.

---

### onRecordingConsent

• `Optional` **onRecordingConsent**: () => `Promise`\<`void`\>

#### Type declaration

▸ (): `Promise`\<`void`\>

Optional consent callback invoked BEFORE recording starts, when
`record: true`. The module awaits this callback before calling
`MediaRecorder.start()` — the caller can display a pre-recording
warning / consent dialog and only resolve the promise once the user
has acknowledged it. Rejecting the promise aborts recording (but
not the rest of the microphone check).

When omitted, the module proceeds with recording immediately. The
report still carries `recordingNotice` (the human-readable notice
string) so callers who do not use the callback can surface it
post-hoc, but the recommended pattern is to pass this callback so
the user is warned BEFORE capture (VSDK-412 review P43WG: "this
does not warn the user before recording").

##### Returns

`Promise`\<`void`\>

---

### playback

• `Optional` **playback**: `boolean`

Whether to play back the recorded audio after capture. Only applies
when `record` is true. When true, an `<audio>` element is created
and the recording is played through the speakers.
Default: true.

---

### record

• `Optional` **record**: `boolean`

Whether to record the microphone audio during the sample window
so the user can listen to it afterwards. When true, the captured
audio is recorded using a MediaRecorder and the resulting Blob is
available in the report as a data URL (`recordingDataUrl`).
Default: false.

---

### sampleDurationMs

• `Optional` **sampleDurationMs**: `number`

Duration in ms for the audio-level sample window during active capture.
Default: 2000.

---

### silenceThreshold

• `Optional` **silenceThreshold**: `number`

RMS threshold below which audio is considered silent.
Value between 0 and 1. Default: 0.01.
