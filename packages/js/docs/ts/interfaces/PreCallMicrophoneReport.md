Report from the microphone diagnostic module.

Populated by T6 (VSDK-303) for passive permission/device checks and
T7 (VSDK-304, folded into VSDK-303) for active microphone capture
and audio-level detection.

## Table of contents

### Properties

- [activeCapturePerformed](#activecaptureperformed)
- [audioDetected](#audiodetected)
- [audioLevel](#audiolevel)
- [audioLevelStats](#audiolevelstats)
- [captureError](#captureerror)
- [captureErrorMessage](#captureerrormessage)
- [deviceAvailable](#deviceavailable)
- [deviceCount](#devicecount)
- [devices](#devices)
- [labelsAccessible](#labelsaccessible)
- [permissionGranted](#permissiongranted)
- [permissionState](#permissionstate)
- [playbackPerformed](#playbackperformed)
- [reasons](#reasons)
- [recordingDataUrl](#recordingdataurl)
- [recordingDurationMs](#recordingdurationms)
- [recordingMimeType](#recordingmimetype)
- [recordingNotice](#recordingnotice)
- [recordingPerformed](#recordingperformed)

## Properties

### activeCapturePerformed

• `Optional` **activeCapturePerformed**: `boolean`

Whether active microphone capture was performed.
Undefined when activeCapture is disabled or the module is skipped.

---

### audioDetected

• `Optional` **audioDetected**: `boolean`

Whether audio energy above the silence threshold was detected.
Undefined when activeCapture is disabled or capture failed.

---

### audioLevel

• `Optional` **audioLevel**: `number`

Peak RMS audio level observed during the sample window (0–1).
Undefined when activeCapture is disabled or capture failed.

---

### audioLevelStats

• `Optional` **audioLevelStats**: [`PreCallMicrophoneAudioLevelStats`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallMicrophoneAudioLevelStats.md)

Structured audio-level statistics from the sample window: peak,
average, and sample count. More detailed than `audioLevel` (which
is the peak only). Undefined when activeCapture is disabled or
capture failed.

---

### captureError

• `Optional` **captureError**: `"unknown"` \| `"permission_denied"` \| `"no_device"` \| `"not_supported"`

Structured capture error code, if active capture was requested but failed.

- 'permission_denied': getUserMedia was rejected (NotAllowedError, SecurityError).
- 'no_device': No microphone device found (NotFoundError, OverconstrainedError).
- 'not_supported': getUserMedia is not available in this environment.
- 'unknown': An unexpected error occurred during capture.

---

### captureErrorMessage

• `Optional` **captureErrorMessage**: `string`

Human-readable description of the capture error, if any.

---

### deviceAvailable

• `Optional` **deviceAvailable**: `boolean`

Whether at least one audio input device is available.
Undefined when device enumeration is not available.

---

### deviceCount

• `Optional` **deviceCount**: `number`

Number of audio input devices found via enumerateDevices.
Undefined when device enumeration is not available.

---

### devices

• `Optional` **devices**: [`PreCallAudioDevice`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallAudioDevice.md)[]

Full list of all available audio input devices, with label, deviceId,
and kind. Populated from enumerateDevices when permission is granted
(labels accessible). Undefined when device enumeration is not available.

This gives callers the complete device list so they can show the
user all microphones and let them choose — not just a count.

---

### labelsAccessible

• `Optional` **labelsAccessible**: `boolean`

Whether device labels are accessible (implies permission was granted).
When false, device labels may be empty strings.
Undefined when device enumeration is not available.

---

### permissionGranted

• `Optional` **permissionGranted**: `boolean`

Whether microphone permission was granted.
Convenience boolean: true when permissionState is 'granted', false otherwise.
Undefined when permission state could not be determined.

---

### permissionState

• `Optional` **permissionState**: [`MicrophonePermissionState`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/README.md#microphonepermissionstate)

Microphone permission state from the Permissions API (or best-effort inference).

---

### playbackPerformed

• `Optional` **playbackPerformed**: `boolean`

Whether the recording was played back to the user through the
speakers after capture. Only set when `playback: true` and
`record: true` and playback succeeded.

---

### reasons

• `Optional` **reasons**: [`PreCallDiagnosticReason`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallDiagnosticReason.md)[]

Reason codes for any issues found, suitable for verdict/reason module input.
E.g. 'microphone_permission_denied', 'microphone_no_device',
'microphone_capture_permission_denied', 'microphone_silent'.

---

### recordingDataUrl

• `Optional` **recordingDataUrl**: `string`

Recording as a data URL (base64-encoded audio/webm). Only populated
when `record: true`, capture succeeded, and a MediaRecorder was
available. Callers can set this as an `<audio>` `src` to play it
back to the user.

---

### recordingDurationMs

• `Optional` **recordingDurationMs**: `number`

Duration of the recording in milliseconds.

---

### recordingMimeType

• `Optional` **recordingMimeType**: `string`

MIME type of the recording (e.g. 'audio/webm;codecs=opus').

---

### recordingNotice

• `Optional` **recordingNotice**: `string`

A human-readable notice that audio is being recorded, for display to
the user BEFORE/DURING capture. Populated when `record: true` is set
so the caller can warn the user that their voice will be recorded
(VSDK-412 Review 18, point 2: "there is no warning that we will record
them"). The caller should surface this string in the UI before
calling `runMicrophoneCheck()`.

---

### recordingPerformed

• `Optional` **recordingPerformed**: `boolean`

Whether audio was recorded during the capture window.
Only set when `record: true` and capture succeeded.
