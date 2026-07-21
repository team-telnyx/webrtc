Timing measurements for the diagnostic run.

All duration fields are milliseconds. Missing sources result in omitted
fields (undefined), not zero placeholders.

Lifecycle fields (`callCreateMs`, `callSetupMs`, `callAnsweredMs`,
`iceConnectedMs`, `dtlsConnectedMs`, `ringingMs`, `firstMediaStatsMs`) are
measured from the start of the call (the SDK `new-call-start` performance
mark) via the existing `CallEstablishmentTimings` system. Diagnostic-only
fields (`firstStatsMs`, `statsSamplingMs`, `cleanupMs`, `totalMs`) are
measured by the `TimingsCollector` inside the PreCallDiagnostic runner.

## Table of contents

### Properties

- [callAnsweredMs](#callansweredms)
- [callCreateMs](#callcreatems)
- [callSetupMs](#callsetupms)
- [cleanupMs](#cleanupms)
- [clientReadyMs](#clientreadyms)
- [completedAt](#completedat)
- [dtlsConnectedMs](#dtlsconnectedms)
- [firstCandidateMs](#firstcandidatems)
- [firstMediaStatsMs](#firstmediastatsms)
- [firstNonHostCandidateMs](#firstnonhostcandidatems)
- [firstStatsMs](#firststatsms)
- [iceConnectedMs](#iceconnectedms)
- [iceGatheringCompletedMs](#icegatheringcompletedms)
- [iceGatheringMs](#icegatheringms)
- [iceGatheringStartedMs](#icegatheringstartedms)
- [ringingMs](#ringingms)
- [startedAt](#startedat)
- [statsSamplingMs](#statssamplingms)
- [totalMs](#totalms)

## Properties

### callAnsweredMs

• `Optional` **callAnsweredMs**: `number`

Time from call creation to call answered (telnyx-rtc-answer mark).

---

### callCreateMs

• `Optional` **callCreateMs**: `number`

Time from start to call creation (new-call-start mark).

---

### callSetupMs

• `Optional` **callSetupMs**: `number`

Time from call creation to call active.

---

### cleanupMs

• `Optional` **cleanupMs**: `number`

Duration of cleanup (hangup + resource release).

---

### clientReadyMs

• `Optional` **clientReadyMs**: `number`

Time from diagnostic start to client ready/connect, if observable.

---

### completedAt

• `Optional` **completedAt**: `number`

Epoch timestamp (Date.now()) when the diagnostic completed.

---

### dtlsConnectedMs

• `Optional` **dtlsConnectedMs**: `number`

Time from start to DTLS connected, if observable.

---

### firstCandidateMs

• `Optional` **firstCandidateMs**: `number`

Time from call start to the first ICE candidate gathered.

---

### firstMediaStatsMs

• `Optional` **firstMediaStatsMs**: `number`

Time from start to first media stats (first-remote-media-track mark).

---

### firstNonHostCandidateMs

• `Optional` **firstNonHostCandidateMs**: `number`

Time from call start to the first non-host (srflx/relay) candidate.

---

### firstStatsMs

• `Optional` **firstStatsMs**: `number`

Time from start to first stats sample received inside collectSamples.

---

### iceConnectedMs

• `Optional` **iceConnectedMs**: `number`

Time from call creation to ICE connected.

---

### iceGatheringCompletedMs

• `Optional` **iceGatheringCompletedMs**: `number`

Time from call start to all ICE candidates gathered (gathering complete).

---

### iceGatheringMs

• `Optional` **iceGatheringMs**: `number`

Duration of ICE candidate gathering (complete - started).

---

### iceGatheringStartedMs

• `Optional` **iceGatheringStartedMs**: `number`

Time from call start to ICE candidate gathering started.

---

### ringingMs

• `Optional` **ringingMs**: `number`

Time from start to ringing, if observable.

---

### startedAt

• `Optional` **startedAt**: `number`

Epoch timestamp (Date.now()) when the diagnostic started.

---

### statsSamplingMs

• `Optional` **statsSamplingMs**: `number`

Duration of the stats sampling phase.

---

### totalMs

• `Optional` **totalMs**: `number`

Total duration of the diagnostic run in ms (monotonic).
