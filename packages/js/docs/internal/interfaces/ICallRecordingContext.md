Per-call context passed to the CallRecorder constructor. Mirrors the
fields the call-report path already holds; BaseCall builds this from
`this.session` and `this.id`.

`host` may be omitted at construction and set later via `_setHost()` —
BaseCall constructs the recorder before the connection host is always
known, so the periodic and final flushes read whichever of
`callContext.host` / `_setHost(host)` is available.

## Table of contents

### Properties

- [callId](#callid)
- [callReportId](#callreportid)
- [host](#host)
- [recordingId](#recordingid)
- [sessionId](#sessionid)
- [voiceSdkId](#voicesdkid)

## Properties

### callId

• **callId**: `string`

The SDK call id (this.id).

---

### callReportId

• **callReportId**: `string`

The call_report_id (shared with the call report).

---

### host

• `Optional` **host**: `string`

Connection host (ws/wss/http/https or bare host) used to resolve the
/call_recording endpoint for intermediate + final flushes. May be
omitted here and set via `_setHost()`.

---

### recordingId

• `Optional` **recordingId**: `string`

Optional recording id override; defaults to `${callId}-${timestamp36}`.

---

### sessionId

• `Optional` **sessionId**: `string`

The SDK session id (this.session.sessionid). Optional, for logging.

---

### voiceSdkId

• `Optional` **voiceSdkId**: `string`

Optional voice_sdk_id header value (mirrors the call-report path).
