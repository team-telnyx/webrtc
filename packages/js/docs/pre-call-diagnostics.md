# Pre-Call Diagnostics (`PreCallDiagnostic`)

> **Availability note.** The `PreCallDiagnostic` family described here
> (`runPreCall`, `runNetworkCheck`, `runMicrophoneCheck`, and the
> `PreCallDiagnosticReport` shape) is part of the consolidated pre-call
> diagnostics work tracked in [VSDK-412](https://github.com/team-telnyx/webrtc/pull/733).
> Until that work merges and is released, these symbols are **not yet
> available in a published `@telnyx/webrtc` package**. This guide documents
> the contract as it lands so integrators can prepare. Confirm the
> installed package version before relying on any symbol below.
>
> The legacy [`PreCallDiagnosis`](#relationship-to-the-legacy-precalldiagnosis-api)
> API remains available and unchanged.

The `@telnyx/webrtc` SDK exposes three client-level methods that assess
call readiness **before** you place a real call:

| Method                                                               | Places a real call?                  | What it checks                                                                | Typical use                                                    |
| -------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [`client.runPreCall()`](#runprecall-full-diagnostic)                 | Yes (temporary diagnostic call)      | ICE, network quality, media flow, microphone                                  | Full pre-call readiness check before enabling the call button  |
| [`client.runNetworkCheck()`](#runnetworkcheck-network-only)          | No (raw `RTCPeerConnection`s only)   | ICE per configured server + aggregate                                         | "Is my network/WebRTC connectivity OK?" without authentication |
| [`client.runMicrophoneCheck()`](#runmicrophonecheck-microphone-only) | No (`getUserMedia` + Web Audio only) | Microphone permission, device availability, capture level, optional recording | "Is my mic working?" before joining a call                     |

All three return a [`PreCallDiagnosticReport`](#report-interpretation)
whose top-level `verdict`, `reasons`, and `warnings` let you branch on
**stable machine-readable codes** rather than human-readable text.

## Table of Contents

- [Quick start](#quick-start)
- [Prerequisites](#prerequisites)
- [The three checks at a glance](#the-three-checks-at-a-glance)
- [`runPreCall()` — full diagnostic](#runprecall-full-diagnostic)
- [`runNetworkCheck()` — network-only](#runnetworkcheck-network-only)
- [`runMicrophoneCheck()` — microphone-only](#runmicrophonecheck-microphone-only)
- [Report interpretation](#report-interpretation)
  - [Verdict precedence](#verdict-precedence)
  - [Reasons vs. warnings](#reasons-vs-warnings)
  - [Reason and warning code reference](#reason-and-warning-code-reference)
  - [Timings](#timings)
  - [ICE report](#ice-report)
  - [Network report](#network-report)
  - [Media report](#media-report)
  - [Microphone report](#microphone-report)
  - [Call identifier](#call-identifier)
  - [Raw troubleshooting data](#raw-troubleshooting-data)
- [Handling common outcomes](#handling-common-outcomes)
- [Privacy and safe report sharing](#privacy-and-safe-report-sharing)
- [Relationship to the legacy `PreCallDiagnosis` API](#relationship-to-the-legacy-precalldiagnosis-api)
- [Imports reference](#imports-reference)

## Quick start

```js
import { TelnyxRTC } from '@telnyx/webrtc';

const client = new TelnyxRTC({
  // JWT (recommended) or SIP Connection credentials
  login_token: '<your-jwt>',
});

// runPreCall() requires an authenticated client — wait for telnyx.ready
client.on('telnyx.ready', async () => {
  const report = await client.runPreCall();
  console.log(report.verdict); // 'ready' | 'degraded' | 'blocked' | 'permission_denied' | 'inconclusive'
  for (const reason of report.reasons ?? []) {
    console.log(reason.code, '-', reason.message);
  }
});
client.connect();
```

`runNetworkCheck()` and `runMicrophoneCheck()` do not require an
authenticated/connected client because they do not place a call.

## Prerequisites

- **Browser environment.** All three methods use browser WebRTC and media
  APIs (`RTCPeerConnection`, `getUserMedia`, `enumerateDevices`, Web Audio
  `AnalyserNode`, `MediaRecorder`). They run in any browser the SDK
  supports; they are not Node.js APIs.
- **`runPreCall()` requires a connected, authenticated client.** The method
  places a temporary diagnostic call through `client.newCall()`, so the
  client must have reached `telnyx.ready` (authenticated and registered)
  before you call it. Calling it on an unconnected client will fail when it
  tries to dial.
- **`runNetworkCheck()` and `runMicrophoneCheck()` do not require a
  connected client.** They build raw `RTCPeerConnection`s / call
  `getUserMedia` directly and never touch SIP signaling.
- **ICE servers.** `runPreCall()` and `runNetworkCheck()` use the client's
  configured ICE servers by default. You can override them per-call with the
  `iceServers` option (diagnostic-only — the client's own ICE server
  configuration is never mutated). `runMicrophoneCheck()` does not use ICE
  servers.
- **Microphone permission.** `runMicrophoneCheck()` and the microphone phase
  of `runPreCall()` call `getUserMedia({ audio: true })`. The browser will
  prompt the user for microphone permission if it has not already been
  granted. You do not need to request permission separately.

## The three checks at a glance

| Concern                                   |       `runPreCall()`       |     `runNetworkCheck()`     |    `runMicrophoneCheck()`     |
| ----------------------------------------- | :------------------------: | :-------------------------: | :---------------------------: |
| Places a real diagnostic call             |             ✅             |             ❌              |              ❌               |
| Requires authenticated client             |             ✅             |             ❌              |              ❌               |
| ICE candidate gathering                   |             ✅             | ✅ (per-server + aggregate) |              ❌               |
| Network quality (RTT/jitter/loss/bitrate) |             ✅             |             ❌              |              ❌               |
| Media (RTP) flow                          |             ✅             |             ❌              |              ❌               |
| Microphone permission + devices           |             ✅             |             ❌              |              ✅               |
| Microphone capture level                  |             ✅             |             ❌              |              ✅               |
| Optional recording + playback             |    ❌ (no consent flow)    |             ❌              |          ✅ (opt-in)          |
| Modules you can disable                   | none (all four always run) |   none (ICE always runs)    | none (microphone always runs) |

> The public methods intentionally expose a narrow option surface. You
> cannot toggle individual modules on or off from these methods — each
> method runs the modules that match its purpose. The internal
> `PreCallDiagnostic` constructor accepts module toggles, but that wider
> option surface is **not** a supported customer entry point; use the
> client-level methods instead.

## runPreCall: full diagnostic

`client.runPreCall(options?)` establishes a temporary diagnostic call,
samples WebRTC stats for a short window, then hangs up and returns a report
covering ICE, network, media, and microphone.

### Options

```ts
import { TelnyxRTC } from '@telnyx/webrtc';

const report = await client.runPreCall({
  // Destination number to dial for the diagnostic call.
  // Optional. Defaults to '+1-872-231-5806' when omitted.
  destinationNumber: '+155****4567',

  // Hard upper bound (ms) for the call to reach ICE + DTLS + media ready.
  // On expiry the call is hung up and the report returns
  // verdict: 'inconclusive' with a 'call_setup_timeout' reason,
  // and no module sections are populated.
  // Default: ~30000.
  callSetupTimeoutMs: 20000,

  // Post-establishment sampling window (ms). The timer starts ONLY after
  // the call reaches the established state, so call-setup time does not
  // eat into the diagnostic sampling budget.
  // Default: ~5000.
  durationMs: 3000,

  // Custom ICE servers for the diagnostic call only. Does NOT mutate or
  // override the client's configured ICE servers. When omitted, the
  // diagnostic call uses the client's existing ICE server configuration
  // (matching normal call behavior).
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
});
```

All four fields are optional — `client.runPreCall()` with no arguments runs
with all defaults.

### What it does

1. Places a temporary diagnostic call to `destinationNumber` (or the
   default) via `client.newCall()`.
2. Waits up to `callSetupTimeoutMs` for the call to reach the established
   (`active`) state. If establishment times out, the report returns
   `verdict: 'inconclusive'` with a `call_setup_timeout` reason and **no**
   module sections.
3. Once established, samples WebRTC stats for `durationMs` and runs all
   four modules: ICE, network quality, media flow, and microphone (active
   capture, no recording).
4. Hangs up the diagnostic call and releases resources (tracked in
   `timings.cleanupMs`).
5. Returns the `PreCallDiagnosticReport`.

### Timer semantics

The total wall-clock budget is **not** `callSetupTimeoutMs + durationMs`
presented as a single budget — the two timers are sequential and
non-overlapping:

- `callSetupTimeoutMs` bounds call establishment (ICE + DTLS + media
  ready).
- `durationMs` starts **only after** establishment completes. If
  establishment never completes, the `durationMs` timer is never started.

Do not present `callSetupTimeoutMs + durationMs` as a guaranteed total
runtime — establishment may finish well under the timeout, in which case
the total is `actualSetupTime + durationMs + cleanupMs`.

### Side effects

- Places a real (billable-path) call to `destinationNumber` that is
  automatically hung up on completion. Ensure `destinationNumber` is a
  number your account is permitted to call for diagnostics.
- Calls `getUserMedia({ audio: true })` for the microphone phase — the
  browser may prompt the user for microphone permission.
- Does **not** record audio. `runPreCall()` enables active microphone
  capture for level measurement only. Recording is an opt-in feature of
  [`runMicrophoneCheck()`](#runmicrophonecheck-microphone-only) and
  requires an explicit consent flow; `runPreCall()` does not expose it.

### Example: verdict-driven handling

```js
const report = await client.runPreCall();

switch (report.verdict) {
  case 'ready':
    enableCallButton();
    break;
  case 'degraded':
    showWarning('Call quality may be reduced.', report.reasons);
    enableCallButton(); // still allow the call
    break;
  case 'blocked':
    showError('Cannot place a call right now.', report.reasons);
    break;
  case 'permission_denied':
    showMicPermissionPrompt();
    break;
  case 'inconclusive':
  default:
    showRetryOption(report.reasons);
    break;
}

// Warnings are non-fatal — present them without blocking the call.
for (const warning of report.warnings ?? []) {
  console.warn(warning.code, '-', warning.message);
}
```

## runNetworkCheck: network-only

`client.runNetworkCheck(options?)` tests each configured ICE server
**independently** (one `RTCPeerConnection` per server, all run
simultaneously) so you can see exactly which servers produce candidates,
how long gathering takes, and which servers are not working. It also runs
a combined gathering pass for the aggregate ICE report.

### Options

`runNetworkCheck()` accepts the same `RunPreCallOptions` shape as
`runPreCall()`:

```ts
const report = await client.runNetworkCheck({
  // Custom ICE servers to test (diagnostic-only, does not mutate client config).
  // When omitted, tests the client's configured ICE servers.
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'turn:turn.example.com:3478', username: '...', credential: '...' },
  ],
  // Sampling/gathering window (ms). Default: ~5000.
  durationMs: 5000,
});
```

`destinationNumber` and `callSetupTimeoutMs` are accepted for option-shape
compatibility but are not used (no call is placed).

### What it does

1. Builds one raw `RTCPeerConnection` per configured ICE server and starts
   ICE gathering on each, **simultaneously**.
2. Also runs a combined gathering pass that uses all servers at once
   (mirroring normal call behavior) for the aggregate ICE report.
3. After `durationMs`, closes all peers and returns the report.

### Wall-clock cost

All ICE servers are tested simultaneously, so the total wall-clock is
approximately `durationMs` **regardless of how many ICE servers are
configured**. Do not assume the runtime scales with the server count.

### What it does NOT do

- Does **not** dial (`client.newCall()` is not called).
- Does **not** require SIP signaling, authentication, or a
  `destinationNumber`.
- Does **not** measure network quality (RTT/jitter/loss), media flow, or
  microphone — those come from a real call's stats, which this check does
  not place. Use `runPreCall()` for those.

### Example: inspect per-server results

```js
const report = await client.runNetworkCheck();

for (const result of report.ice?.perServerResults ?? []) {
  console.log(
    result.gatheredAny ? 'OK ' : 'FAIL ',
    result.server.urls,
    `(${result.candidateTypes.join(', ') || 'no candidates'})`
  );
  if (result.error) {
    console.log('  error:', result.error);
  }
}

if (report.ice?.serverCandidateComparison?.hasServerWithNoCandidates) {
  warnUser('One or more ICE servers returned no candidates.');
}
```

## runMicrophoneCheck: microphone-only

`client.runMicrophoneCheck(options?)` verifies microphone permission,
enumerates audio input devices, performs active capture and audio-level
detection, and optionally records the audio so the user can listen to it
afterwards.

### Options

```ts
import { MICROPHONE_RECORDING_NOTICE } from '@telnyx/webrtc';

const report = await client.runMicrophoneCheck({
  // Sampling window (ms) for active capture / audio-level measurement.
  // Default: ~2000. Mapped to the microphone module's sampleDurationMs.
  durationMs: 5000,

  // Whether to record the captured audio so the user can listen to it.
  // Default: false — the zero-argument path must not silently record.
  record: true,

  // Whether to play back the recording through the speakers after capture.
  // Only applies when record: true. Default: true.
  playback: true,

  // Optional consent callback invoked BEFORE recording starts (when
  // record: true). The module awaits this promise before calling
  // MediaRecorder.start(). Rejecting it aborts recording but NOT the rest
  // of the microphone check. Pass this so a pre-recording warning is shown
  // BEFORE capture begins.
  onRecordingConsent: async () => {
    // Display MICROPHONE_RECORDING_NOTICE and wait for user acknowledgment.
    alert(MICROPHONE_RECORDING_NOTICE);
    // Resolve to proceed with recording; reject to abort it.
  },

  // iceServers / callSetupTimeoutMs / destinationNumber are accepted for
  // option-shape compatibility but are not used (no peer connection).
});
```

### Recording, consent, and playback

Recording is **opt-in** and defaults to `false`. The zero-argument
`client.runMicrophoneCheck()` performs active capture and level
measurement **without** recording.

When you set `record: true`:

- Pass `onRecordingConsent` so a pre-recording warning is displayed
  **before** `MediaRecorder.start()`. The
  [`MICROPHONE_RECORDING_NOTICE`](#imports-reference) constant is the
  recommended notice string — surface it in your UI before calling
  `runMicrophoneCheck({ record: true })`.
- `onRecordingConsent` is a **consent gate for recording only**, not for
  the microphone check itself. If the user declines consent, recording is
  skipped but the rest of the check (permission, device enumeration, audio
  level) still runs.
- When `playback: true` (the default when `record: true`), the SDK plays
  the recording back through the speakers after capture. If you do not want
  automatic playback, set `playback: false`.

> `onRecordingConsent` is a synchronous notice/acknowledgment callback, not
> a consent enforcement mechanism. **You must obtain the user's consent
> before opting into recording** — the callback lets you display a warning
> and gate recording on the user's acknowledgment, but it does not replace
> your own consent flow. Do not present `onRecordingConsent` as a consent
> mechanism; it is a hook for surfacing the notice.

### What it does

1. Checks microphone permission via the Permissions API (with best-effort
   inference where the API is unavailable).
2. Enumerates audio input devices with `enumerateDevices` (labels are only
   accessible after permission is granted).
3. Calls `getUserMedia({ audio: true })` for active capture.
4. Measures audio level (peak + average RMS, 0–1) over the `durationMs`
   sample window using a Web Audio `AnalyserNode`.
5. Stops all tracks after the sample completes.
6. When `record: true`, records the captured audio with `MediaRecorder` and
   (when `playback: true`) plays it back.

### Example: silent-microphone detection

```js
const report = await client.runMicrophoneCheck();

if (report.microphone?.permissionState === 'denied') {
  showMicPermissionPrompt();
} else if (report.microphone?.deviceAvailable === false) {
  showError('No microphone found.');
} else if (report.microphone?.audioDetected === false) {
  showWarning('No audio detected. Is your microphone muted?');
} else {
  console.log('Mic level:', report.microphone?.audioLevelStats);
}
```

## Report interpretation

All three methods return a `PreCallDiagnosticReport`. Which sections are
populated depends on the mode you ran — interpret the report **in terms of
the mode**, not as if every section is always present.

| Section                          |   `runPreCall()`    |     `runNetworkCheck()`      | `runMicrophoneCheck()` |
| -------------------------------- | :-----------------: | :--------------------------: | :--------------------: |
| `verdict`, `reasons`, `warnings` |         ✅          |       ✅ (ICE-driven)        | ✅ (microphone-driven) |
| `timings`                        |         ✅          |              ✅              |           ✅           |
| `ice`                            |         ✅          | ✅ (with `perServerResults`) |           ❌           |
| `network`                        |         ✅          |              ❌              |           ❌           |
| `media`                          |         ✅          |              ❌              |           ❌           |
| `microphone`                     |         ✅          |              ❌              |           ✅           |
| `callId`                         |         ✅          |              ❌              |           ❌           |
| `raw`                            | ✅ (when available) |     ✅ (when available)      |           ❌           |

Sections that did not run are **omitted** (undefined), not empty
placeholders. Always check for a section's presence before reading it
(`if (report.ice) { ... }`).

### Verdict precedence

The `verdict` field is the single overall result of the diagnostic. Values
and their precedence (highest to lowest):

1. `permission_denied` — microphone permission was explicitly denied.
2. `blocked` — a module reports a blocking condition (no ICE candidates
   that connected, no media flow, etc.).
3. `degraded` — a module reports degraded but functional conditions (e.g.
   only-relay candidates, high jitter).
4. `ready` — all available module reports indicate healthy conditions.
5. `inconclusive` — insufficient data to determine a verdict (e.g.
   call-setup timed out, or all modules returned no data).

When multiple modules produce verdicts, the **highest-precedence** verdict
wins. `permission_denied` therefore dominates everything else; `ready`
only wins when no module produced a higher-precedence verdict.

Branch on the `verdict` string and on `reasons[].code`, not on human-readable
`message` text — messages may change; codes are stable.

### Reasons vs. warnings

The report distinguishes two kinds of findings:

- **`reasons`** drive the verdict. Each entry has a stable `code`, a
  human-readable `message`, and a `source` module (`'ice'`, `'network'`,
  `'media'`, `'microphone'`, or `'diagnostic'` for cross-cutting findings
  like call-setup timeout). Reasons are why the verdict is what it is.
- **`warnings`** are non-fatal, advisory findings that do **not** flip the
  verdict. They describe degraded-but-functional signals — e.g. only-host
  ICE candidates while connectivity still succeeded, or high jitter while
  the call still works. `warnings` can accompany a `ready` verdict.

Treat `warnings` as advisory UI/telemetry, not as failure conditions. Do
not block the call on a warning; surface it and proceed.

### Reason and warning code reference

Codes are grouped by the module that produces them.

#### ICE (`source: 'ice'`)

| Code                        | Severity                                                  | Meaning                                                                                               |
| --------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `ice_no_candidates`         | reason → `inconclusive`                                   | No ICE candidates were gathered at all. Cannot make a definitive connectivity claim.                  |
| `ice_no_selected_pair`      | reason → `blocked`                                        | Candidates were gathered but no candidate pair was selected (connectivity failure).                   |
| `ice_only_relay_candidates` | reason → `degraded`                                       | Only relay (TURN) candidates — no direct media path. Still functional but suboptimal.                 |
| `ice_gathering_timeout`     | reason → `degraded`                                       | ICE gathering did not complete within the timeout (partial data).                                     |
| `ice_only_host_candidates`  | warning (when connected) / reason → `degraded` (when not) | Only host candidates. When connectivity succeeded, advisory; otherwise degraded.                      |
| `ice_server_no_candidates`  | warning                                                   | A configured ICE server returned no candidates. Server may be unreachable, blocked, or misconfigured. |
| `ice_strict_network`        | warning                                                   | Network appears to restrict UDP (STUN/TURN UDP configured but only TURN TCP candidates gathered).     |
| `ice_multiple_interfaces`   | warning                                                   | Multiple network interfaces detected (may indicate VPN or complex NAT).                               |
| `ice_vpn_detected`          | warning                                                   | A VPN appears active on the host (Chromium `networkType === 'vpn'`).                                  |

#### Network (`source: 'network'`)

| Code                       | Severity            | Meaning                           |
| -------------------------- | ------------------- | --------------------------------- |
| `network_high_jitter`      | reason → `degraded` | High jitter detected.             |
| `network_high_rtt`         | reason → `degraded` | High round-trip time detected.    |
| `network_high_packet_loss` | reason → `degraded` | High packet loss detected.        |
| `network_poor_quality`     | reason → `blocked`  | Network quality assessed as poor. |
| `network_fair_quality`     | reason → `degraded` | Network quality assessed as fair. |

#### Media (`source: 'media'`)

| Code                  | Severity            | Meaning                                 |
| --------------------- | ------------------- | --------------------------------------- |
| `media_no_audio_flow` | reason → `blocked`  | No audio media is flowing.              |
| `media_one_way_audio` | reason → `degraded` | Audio is flowing in only one direction. |

#### Microphone (`source: 'microphone'`)

| Code                                   | Severity                     | Meaning                                                                |
| -------------------------------------- | ---------------------------- | ---------------------------------------------------------------------- |
| `microphone_permission_denied`         | reason → `permission_denied` | Microphone permission was denied by the user.                          |
| `microphone_no_device`                 | reason → `blocked`           | No microphone device is available.                                     |
| `microphone_capture_permission_denied` | reason → `permission_denied` | Active capture was rejected (NotAllowedError/SecurityError).           |
| `microphone_silence_detected`          | reason → `degraded`          | Capture produced silence (no audio level above the silence threshold). |
| `microphone_capture_failed`            | reason → `blocked`           | Microphone capture failed with an unknown error.                       |

#### Diagnostic (`source: 'diagnostic'`)

| Code                 | Severity                | Meaning                                                                                                           |
| -------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `call_setup_timeout` | reason → `inconclusive` | The diagnostic call did not reach the established state within `callSetupTimeoutMs`. Module sections are omitted. |

### Timings

`report.timings` (`PreCallTimingsReport`) holds timing measurements in
**milliseconds**. All duration fields are `ms`. Missing sources result in
**omitted** (undefined) fields, not zero placeholders — always check for
presence before reading.

| Field                                                                                                                   | Meaning                                                       |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `startedAt` / `completedAt`                                                                                             | Epoch timestamps (`Date.now()`) of diagnostic start/complete. |
| `totalMs`                                                                                                               | Total duration of the diagnostic run (monotonic).             |
| `clientReadyMs`                                                                                                         | Time from start to client ready/connect, if observable.       |
| `callCreateMs`                                                                                                          | Time from start to call creation.                             |
| `callSetupMs`                                                                                                           | Time from call creation to call active.                       |
| `callAnsweredMs`                                                                                                        | Time from call creation to call answered.                     |
| `iceConnectedMs` / `dtlsConnectedMs`                                                                                    | Time to ICE / DTLS connected, if observable.                  |
| `ringingMs`                                                                                                             | Time to ringing, if observable.                               |
| `firstMediaStatsMs`                                                                                                     | Time to first media stats.                                    |
| `iceGatheringStartedMs` / `firstCandidateMs` / `firstNonHostCandidateMs` / `iceGatheringCompletedMs` / `iceGatheringMs` | ICE gathering lifecycle timings.                              |
| `firstStatsMs` / `statsSamplingMs`                                                                                      | Diagnostic stats sampling phase.                              |
| `cleanupMs`                                                                                                             | Duration of hangup + resource release.                        |

`runNetworkCheck()` and `runMicrophoneCheck()` populate only the fields
relevant to their mode (e.g. no `callCreateMs`/`callSetupMs` when no call is
placed).

### ICE report

`report.ice` (`PreCallIceReport`) covers ICE candidate gathering and the
selected pair.

- `candidateGatheringCompleted` (and its `gatheringComplete` alias) —
  whether ICE gathering completed. Both fields are always populated with
  the same boolean.
- `candidateCounts` — counts of local candidates by type (`total`, `host`,
  `srflx`, `prflx`, `relay`, `unknown`).
- `candidateTypes` — unique local candidate types, sorted alphabetically.
- `candidates` — full per-candidate metadata (`PreCallIceCandidateInfo`):
  `address`, `port`, `candidateType`, `protocol`, `networkType`,
  `relayProtocol`, `url`. Empty array when no candidates were gathered.
- `hasRelayCandidate`, `onlyHostCandidates` — quick flags.
- `isTurnRequired` — whether the selected pair required a TURN relay.
  `true`/`false` when the pair is known; `undefined` when no pair was
  selected.
- `hasMultipleNetworkInterfaces` — true when ≥2 distinct host candidate
  addresses; `undefined` when unavailable.
- `vpnDetected` — true when a candidate reports `networkType === 'vpn'`
  (Chromium); `undefined` when no candidates were gathered.
- `hasSelectedPair`, `selectedPair` (`PreCallIceSelectedPairReport`) —
  the selected candidate pair, with local/remote candidate metadata and
  `currentRoundTripTime` **in seconds** (as reported by the browser).
- `selectedPairFailed` — whether the selected/fallback pair is in a failed
  state.
- `iceGatheringState`, `iceConnectionState` — raw `RTCPeerConnection`
  states.
- `perServerResults` (`PreCallIceServerResult[]`) — **only populated in
  `runNetworkCheck()`** (`network-only` mode). Each entry shows the ICE
  server tested, whether it produced candidates, the candidates, counts,
  types, gathering duration, and any error. Omitted in `runPreCall()`
  (`full` mode uses all servers at once).
- `serverCandidateComparison` (`PreCallIceServerComparison`) — comparison
  of configured ICE servers against gathered candidates, with
  `hasServerWithNoCandidates` and `appearsStrictNetwork` flags.

> `serverTests[].server` (i.e. `perServerResults[].server`) may contain
> TURN `username`/`credential` values. See
> [Privacy and safe report sharing](#privacy-and-safe-report-sharing).

### Network report

`report.network` (`PreCallNetworkReport`) holds network quality metrics
derived from the diagnostic call's WebRTC stats. Only populated by
`runPreCall()` (which places a real call).

- `quality` — `'good' | 'fair' | 'poor' | 'unknown'`.
- `rtt` (`NetworkMinMaxAverage`) — round-trip time statistics in
  **milliseconds** (`min`/`max`/`average`).
- `jitter` (`NetworkMinMaxAverage`) — jitter statistics in
  **milliseconds**.
- `packets` (`NetworkPacketCounters`) — `packetsSent`, `packetsReceived`,
  `packetsLost`, and `packetLossFraction` (0–1, computed as
  `packetsLost / (packetsReceived + packetsLost)`).
- `bytes` (`NetworkByteCounters`) — `bytesSent`, `bytesReceived`.
- `bitrate` (`NetworkBitrate`) — estimated audio bitrate in **bits per
  second** (`outbound`/`inbound`), computed from byte deltas between
  samples.
- `reasons` — reason inputs from this module (namespaced `network_*`).

### Media report

`report.media` (`PreCallMediaReport`) describes whether audio RTP is
flowing in both directions during the diagnostic call. Only populated by
`runPreCall()`.

- `audioFlowing` — whether audio is flowing in both directions (derived
  from inbound + outbound).
- `outboundAudioFlowing` / `inboundAudioFlowing` — per-direction flags.
- `rtp` (`MediaRtpDetails`) — per-direction (`outbound`/`inbound`) RTP
  packet/byte counters and deltas (`MediaAudioDirection`):
  `flowing`, `packets`, `bytes`, `packetsDelta`, `bytesDelta`.
- `sampleCount` — number of stats samples the report was built from.
- `reasons` — reason inputs (namespaced `media_*`).

### Microphone report

`report.microphone` (`PreCallMicrophoneReport`) covers permission,
devices, and active capture. Populated by `runPreCall()` and
`runMicrophoneCheck()`.

- `permissionState` — `'granted' | 'denied' | 'prompt' | 'unknown'` (mirrors
  the browser Permissions API where supported).
- `permissionGranted` — convenience boolean; `true` when `permissionState`
  is `'granted'`, `false` otherwise; `undefined` when undeterminable.
- `deviceAvailable`, `deviceCount`, `devices` (`PreCallAudioDevice[]`),
  `labelsAccessible` — device enumeration results. `devices` gives the
  full list (label, deviceId, kind) so you can show the user all
  microphones; `undefined` when enumeration is unavailable.
- `activeCapturePerformed` — whether active capture was performed.
- `audioLevel` — peak RMS level (0–1) during the sample window;
  `undefined` when active capture is disabled or failed.
- `audioLevelStats` (`PreCallMicrophoneAudioLevelStats`) — structured
  `peak`/`average`/`samples` (0–1 for levels; count for samples).
- `audioDetected` — whether audio energy above the silence threshold was
  detected.
- `captureError` — `'permission_denied' | 'no_device' | 'not_supported' | 'unknown'`
  when active capture was requested but failed; `captureErrorMessage` is
  the human-readable description.
- `recordingPerformed`, `recordingDataUrl`, `recordingMimeType`,
  `recordingDurationMs` — recording results (only when `record: true` and
  capture succeeded). `recordingDataUrl` is a base64-encoded
  `audio/webm` data URL.
- `recordingNotice` — the human-readable recording notice string (the
  value of `MICROPHONE_RECORDING_NOTICE`). Populated when `record: true` so
  callers who do not use `onRecordingConsent` can surface the notice
  post-hoc — but the recommended pattern is to pass `onRecordingConsent`
  and warn the user **before** capture.
- `playbackPerformed` — whether the recording was played back.
- `reasons` — reason inputs (namespaced `microphone_*`).

> `recordingDataUrl` contains recorded audio. See
> [Privacy and safe report sharing](#privacy-and-safe-report-sharing).

### Call identifier

`report.callId` is the diagnostic call's internal ID, populated **only** by
`runPreCall()` (`full` mode). Omitted by `runNetworkCheck()` and
`runMicrophoneCheck()` (no call is made). Use it to correlate the
diagnostic with downstream call reports.

### Raw troubleshooting data

`report.raw` holds advanced troubleshooting evidence:

- `stats` — the raw `RTCStatsReport` (or `unknown` when unavailable).
- `samples` — the collected stats samples over the diagnostic duration.

`raw` is **browser-dependent** troubleshooting evidence, not a stable
application interface. Browser stats schemas vary across Chrome/Firefox/
Safari and across versions; do not build product logic on `raw` fields.
`raw.samples` may be large and may not serialize meaningfully with plain
JSON — do not present it as a stable or routinely persisted payload.

## Handling common outcomes

```js
const report = await client.runPreCall();

// Permission denied — the user blocked the microphone.
if (report.verdict === 'permission_denied') {
  showMicPermissionPrompt();
  return;
}

// Blocked — cannot place a call right now.
if (report.verdict === 'blocked') {
  const blockedReasons = (report.reasons ?? []).filter(
    (r) =>
      r.code === 'ice_no_selected_pair' ||
      r.code === 'media_no_audio_flow' ||
      r.code === 'network_poor_quality' ||
      r.code === 'microphone_no_device'
  );
  showError('Cannot place a call right now.', blockedReasons);
  return;
}

// Degraded — call is possible but quality may be reduced.
if (report.verdict === 'degraded') {
  showWarning('Call quality may be reduced.', report.reasons);
}

// Inconclusive — not enough data (e.g. call-setup timed out).
if (report.verdict === 'inconclusive') {
  showRetryOption(report.reasons);
  return;
}

// Warnings are advisory — present them without blocking.
for (const w of report.warnings ?? []) {
  telemetry.record(w.code, w.message);
}

if (report.verdict === 'ready' || report.verdict === 'degraded') {
  enableCallButton();
}
```

## Privacy and safe report sharing

Diagnostic reports can contain **sensitive** data. Before exporting,
logging, or sharing a report, redact or omit the following:

| Field                                                                        | Sensitivity | What it contains                                                                                                             |
| ---------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `ice.perServerResults[].server` / `ice.serverCandidateComparison.servers`    | **High**    | TURN `username` and `credential` values from configured ICE servers.                                                         |
| `ice.candidates[].address` / `selectedPair.local.address` / `remote.address` | Medium      | Local/remote IP addresses and ports.                                                                                         |
| `ice.candidates[].url`                                                       | Medium      | TURN server URLs.                                                                                                            |
| `microphone.recordingDataUrl`                                                | **High**    | Base64-encoded recorded audio (only when `record: true`).                                                                    |
| `microphone.devices[].label` / `deviceId`                                    | Medium      | Device labels and IDs (labels imply granted permission).                                                                     |
| `callId`                                                                     | Medium      | Internal call identifier — useful for correlation but should not be exposed to end users.                                    |
| `raw.stats` / `raw.samples`                                                  | Medium      | Raw browser WebRTC stats, including candidate addresses and detailed counters. Browser-dependent; may not serialize cleanly. |

Guidance:

- **Do not export the full report verbatim.** Build a redacted view that
  omits `raw`, `recordingDataUrl`, TURN credentials, and device IDs unless
  the recipient needs them for support.
- **Recording requires consent.** Obtain the user's consent before setting
  `record: true` on `runMicrophoneCheck()`, and surface
  `MICROPHONE_RECORDING_NOTICE` before capture. `onRecordingConsent` is a
  notice/acknowledgment hook, not a consent enforcement mechanism — your
  application is responsible for obtaining and recording consent.
- **Do not persist `raw.samples`.** It may be large and is not a stable
  serialization format. Use the structured report fields for any persisted
  telemetry.
- **Do not log TURN credentials.** `iceServers[].username`/`credential`
  are credentials; treat them like any other secret.
- **Do not expose `callId` in user-facing UI.** It is for correlating with
  backend call reports, not for display.

## Relationship to the legacy `PreCallDiagnosis` API

The SDK has **two** pre-call APIs with easily confused names. They are
distinct and neither replaces the other without a separate compatibility
decision.

|                          | `PreCallDiagnostic` (new)                                                                          | `PreCallDiagnosis` (legacy)                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Entry point              | `client.runPreCall()` / `runNetworkCheck()` / `runMicrophoneCheck()`                               | `PreCallDiagnosis.run(options)` (static)                                          |
| Requires existing client | Yes (for `runPreCall()`); no for network/mic checks                                                | No — creates its own `TelnyxRTC` from `credentials`                               |
| Modes                    | full / network-only / microphone-only                                                              | single full diagnostic                                                            |
| Report                   | `PreCallDiagnosticReport` (verdict, reasons, warnings, ICE/network/media/microphone, timings, raw) | `Report` (ICE candidate stats, selected pair, summary MOS/quality, session stats) |
| Microphone check         | ✅ (permission, devices, capture level, optional recording)                                        | ❌                                                                                |
| Network-only check       | ✅ (per-ICE-server)                                                                                | ❌                                                                                |
| Verdict + reason codes   | ✅ (stable machine-readable codes)                                                                 | ❌ (numeric MOS + quality string)                                                 |
| Status                   | **Unreleased** (see [VSDK-412](https://github.com/team-telnyx/webrtc/pull/733))                    | Available in published packages                                                   |

### Which should you use?

- For **new integrations** that can target the unreleased contract, prefer
  the `PreCallDiagnostic` family (`client.runPreCall()` etc.) for its
  structured verdicts, per-server ICE testing, and microphone checks.
- For **existing integrations** on a released package, continue using
  `PreCallDiagnosis.run()` until the new API is released. The legacy API is
  not removed by this work.
- **Do not mix the names.** `PreCallDiagnostic` (the new class/report) and
  `PreCallDiagnosis` (the legacy class) are different exports. Note also
  that the ticket title's spelling "PreCalDiagnostic" is a typo and does
  not match any exported symbol — use the exact names above.

Migration from `PreCallDiagnosis` to `PreCallDiagnostic` is not provided as
a drop-in mapping in this guide because the two report shapes are not
structurally equivalent. When the new API is released, consult the
generated API reference for the full `PreCallDiagnosticReport` shape and
adapt call sites field-by-field.

## Imports reference

Only the following symbols are exported from the package root
(`@telnyx/webrtc`) and are safe to import in consumer code. The option
interfaces for the three methods (`RunPreCallOptions`,
`RunNetworkCheckOptions`, `RunMicrophoneCheckOptions`) are **not** named
exports from the package root — pass option objects inline as shown in
the examples above; the methods accept structurally-compatible plain
objects.

### Runtime values (classes, constants)

```ts
// Client class (entry point for all three methods)
import { TelnyxRTC } from '@telnyx/webrtc';

// Recording notice constant (for runMicrophoneCheck consent UI)
import { MICROPHONE_RECORDING_NOTICE } from '@telnyx/webrtc';

// Reason-code constants (grouped by module) — use these instead of
// string literals so your code stays stable if a code value is renamed.
import {
  IceReasonCode,
  NetworkReasonCode,
  MediaReasonCode,
  MicrophoneReasonCode,
} from '@telnyx/webrtc';
```

### Type-only imports (report and related types)

These are types, not runtime values — import them with `import type`:

```ts
import type {
  PreCallDiagnosticReport,
  PreCallDiagnosticReason,
  PreCallTimingsReport,
  PreCallIceReport,
  PreCallNetworkReport,
  PreCallMediaReport,
  PreCallMicrophoneReport,
  PreCallIceCandidateInfo,
  PreCallIceCandidateCounts,
  PreCallIceSelectedPairReport,
  NetworkMinMaxAverage,
  NetworkPacketCounters,
  NetworkByteCounters,
  NetworkBitrate,
  MediaAudioDirection,
  MediaRtpDetails,
  MicrophonePermissionState,
} from '@telnyx/webrtc';
```

### Types that are NOT package-root exports

The following types appear in the report shape (as the types of fields on
`PreCallDiagnosticReport` and its sub-reports) but are **not** re-exported
from the package root. You can read and use the fields (e.g.
`report.ice.perServerResults`, `report.warnings`, `report.microphone.devices`,
`report.microphone.audioLevelStats`) — you just cannot name these types in
an `import type` statement. Use structural typing / inline types or
`import type` from the deep path **only if** you accept the stability risk
of a non-public path:

- `PreCallDiagnosticWarning` (the type of `report.warnings[]` entries)
- `PreCallIceServerResult` (the type of `report.ice.perServerResults[]` entries)
- `PreCallIceServerComparison` (the type of `report.ice.serverCandidateComparison`)
- `PreCallIceServerComparisonEntry`
- `PreCallAudioDevice` (the type of `report.microphone.devices[]` entries)
- `PreCallMicrophoneAudioLevelStats` (the type of `report.microphone.audioLevelStats`)
- `RunPreCallOptions`, `RunNetworkCheckOptions`, `RunMicrophoneCheckOptions`
  (the option interfaces for the three methods — pass options inline)

> `RunNetworkCheckOptions` is an alias of `RunPreCallOptions`.
>
> The `PreCallDiagnostic` class itself is exported, but its constructor
> accepts a wider, internal-looking option surface
> (`PreCallDiagnosticOptions`) that is **not** the supported customer entry
> point. Prefer the client-level methods (`runPreCall` /
> `runNetworkCheck` / `runMicrophoneCheck`); only construct
> `PreCallDiagnostic` directly if you have a confirmed need that the public
> methods do not cover.
