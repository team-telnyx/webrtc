Collector of monotonic timestamps for the diagnostic-only lifecycle phases
that the SDK call path does not already mark (stats sampling, cleanup).

Internal mark state is held in private fields; the collector itself is
opaque to callers. `PreCallDiagnostic.run()` records marks via the
one-line methods, then `build()` merges them with the SDK establishment
timings to produce the final `PreCallTimingsReport`.

## Table of contents

### Methods

- [build](#build)
- [finalizeTimings](#finalizetimings)
- [markCleanupCompleted](#markcleanupcompleted)
- [markCleanupStarted](#markcleanupstarted)
- [markCompleted](#markcompleted)
- [markFirstStats](#markfirststats)
- [markStatsSamplingCompleted](#markstatssamplingcompleted)
- [markStatsSamplingStarted](#markstatssamplingstarted)

## Methods

### build

▸ **build**(`options?`): [`PreCallTimingsReport`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallTimingsReport.md)

Build the final `PreCallTimingsReport`.

Merges:

1.  Diagnostic-only phase durations from this collector's internal marks
    (firstStatsMs, statsSamplingMs, cleanupMs, totalMs).
2.  SDK call-establishment timings from `call.getEstablishmentTimings?.()`,
    mapped into named report fields via `ESTABLISHMENT_LABEL_TO_FIELD`.

Call this BEFORE the cleanup `finally` block runs `call.hangup()` and
`clearCallMarks()` — establishment timings are read from the call's
performance marks, which are cleared during `_finalize()`.

Never throws: every read is guarded. Missing sources result in omitted
fields, not zero placeholders.

#### Parameters

| Name      | Type                                                                                                                           |
| :-------- | :----------------------------------------------------------------------------------------------------------------------------- |
| `options` | [`TimingsBuildOptions`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/TimingsBuildOptions.md) |

#### Returns

[`PreCallTimingsReport`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallTimingsReport.md)

---

### finalizeTimings

▸ **finalizeTimings**(`report`): `void`

Merge cleanup-duration and a recomputed totalMs into an already-built
`PreCallTimingsReport`.

`build()` is called BEFORE the cleanup `finally` block runs
`call.hangup()`, because establishment timings are read from the call's
performance marks, which are cleared during `_finalize()`. At that point
`cleanupMs` is absent and `totalMs` excludes hangup/resource release.

This method is called AFTER the finally block records cleanup
start/end marks. It patches the already-built report in place so:

- `cleanupMs` = cleanupCompleted - cleanupStarted (the hangup duration)
- `totalMs` = cleanupCompleted - startedAtMono (full run, including cleanup)

Establishment-timing fields set by `build()` are preserved — only the
cleanup-related fields and totalMs are overwritten (VSDK-412 round-10).

Safe to call when cleanup marks are missing (no-op for those fields).

#### Parameters

| Name     | Type                                                                                                                             |
| :------- | :------------------------------------------------------------------------------------------------------------------------------- |
| `report` | [`PreCallTimingsReport`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallTimingsReport.md) |

#### Returns

`void`

---

### markCleanupCompleted

▸ **markCleanupCompleted**(): `void`

Record the end of the cleanup phase. Idempotent.

#### Returns

`void`

---

### markCleanupStarted

▸ **markCleanupStarted**(): `void`

Record the start of the cleanup phase. Idempotent.

#### Returns

`void`

---

### markCompleted

▸ **markCompleted**(): `void`

Record diagnostic completion. Also records the epoch completion timestamp.
Idempotent.

#### Returns

`void`

---

### markFirstStats

▸ **markFirstStats**(): `void`

Record the moment the first stats sample was received. Idempotent.

#### Returns

`void`

---

### markStatsSamplingCompleted

▸ **markStatsSamplingCompleted**(): `void`

Record the end of the stats sampling phase. Idempotent.

#### Returns

`void`

---

### markStatsSamplingStarted

▸ **markStatsSamplingStarted**(): `void`

Record the start of the stats sampling phase. Idempotent.

#### Returns

`void`
