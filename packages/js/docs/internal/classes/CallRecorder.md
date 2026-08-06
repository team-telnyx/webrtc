CallRecorder — captures raw audio PCM from WebRTC tracks, synthesizes RTP
packets, buffers them with a bounded ring buffer, and POSTs flushes.

Mirrors `CallReportCollector`'s POST/retry/keepalive shape so the upload
behaves the same way the call-report upload does (x-call-report-id /
x-call-id / x-voice-sdk-id headers, retry with [500,1000,2000]ms backoff,
`keepalive: true` for small final payloads).

## Table of contents

### Properties

- [onWarning](#onwarning)

### Methods

- [\_setCallReportId](#_setcallreportid)
- [\_setHost](#_sethost)
- [cleanup](#cleanup)
- [postFinalReport](#postfinalreport)
- [start](#start)
- [stop](#stop)

## Properties

### onWarning

• **onWarning**: (`warning`: `ITelnyxWarning`) => `void` = `null`

#### Type declaration

▸ (`warning`): `void`

Callback invoked when a quality warning should be surfaced.

##### Parameters

| Name      | Type             |
| :-------- | :--------------- |
| `warning` | `ITelnyxWarning` |

##### Returns

`void`

## Methods

### \_setCallReportId

▸ **\_setCallReportId**(`callReportId`): `void`

Set/update the call_report_id. BaseCall constructs the recorder in
`_init()` — before the server has assigned `session.callReportId` (it
arrives on the verto invite/answer response) — so the value snapshotted
in `callContext.callReportId` is typically empty. BaseCall calls this once
the id is available (at the Active state and again before the final flush)
so every envelope carries the real call_report_id and recordings correlate
with the call report.

#### Parameters

| Name           | Type     |
| :------------- | :------- |
| `callReportId` | `string` |

#### Returns

`void`

---

### \_setHost

▸ **\_setHost**(`host`): `void`

Set/update the connection host. BaseCall constructs the recorder before
the connection host is always known (it reads `this.session.connection?.host`
at construction), so the periodic flush and final flush can use an
up-to-date host if the session reconnects to a different host.

#### Parameters

| Name   | Type     |
| :----- | :------- |
| `host` | `string` |

#### Returns

`void`

---

### cleanup

▸ **cleanup**(): `void`

Deterministic cleanup — clears the flush timer, cancels readers, nulls
the buffer. Idempotent and never throws. Called from BaseCall finally
blocks and \_finalize so failed/aborted calls still release resources.

#### Returns

`void`

---

### postFinalReport

▸ **postFinalReport**(): `Promise`\<`void`\>

Post the remaining buffered packets as the final segment. Called from
BaseCall.\_postCallReport at end of call. Mirrors CallReportCollector's
final-report POST (retry + keepalive). Throws on exhaustion so the caller
can record failure. The final segment carries `segment: 'final'` and
`ended_at`. The endpoint is resolved from the host passed at construction
(BaseCall sets `callContext.host`).

#### Returns

`Promise`\<`void`\>

---

### start

▸ **start**(`localTrack?`, `remoteTrack?`): `void`

Start capturing PCM from the local outbound and/or remote inbound audio
tracks. If `MediaStreamTrackProcessor` is unavailable, logs a single
`RECORDING_UNAVAILABLE` warning and no-ops. Safe to call with undefined
tracks (skips the missing ones).

#### Parameters

| Name           | Type               |
| :------------- | :----------------- |
| `localTrack?`  | `MediaStreamTrack` |
| `remoteTrack?` | `MediaStreamTrack` |

#### Returns

`void`

---

### stop

▸ **stop**(): `void`

Stop capturing. Cancels reader loops, clears the flush timer, and marks
the recorder stopped so no further flushes are scheduled. Does NOT post
the final flush — call `postFinalReport()` for that.

#### Returns

`void`
