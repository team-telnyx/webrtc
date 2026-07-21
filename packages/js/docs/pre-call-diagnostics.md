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

| Method                                                               | Places a real call?                             | What it checks                                                                | Typical use                                                   |
| -------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [`client.runPreCall()`](#runprecall-full-diagnostic)                 | Yes (one temporary diagnostic call)             | ICE, network quality, microphone                                              | Full pre-call readiness check before enabling the call button |
| [`client.runNetworkCheck()`](#runnetworkcheck-network-only)          | Yes (one short diagnostic call **per ICE URL**) | Per-server ICE establishment + per-call network quality                       | "Which of my ICE servers actually work?" before a real call   |
| [`client.runMicrophoneCheck()`](#runmicrophonecheck-microphone-only) | No (`getUserMedia` + Web Audio only)            | Microphone permission, device availability, capture level, optional recording | "Is my mic working?" before joining a call                    |

All three return a [`PreCallDiagnosticReport`](#report-interpretation)
whose top-level `verdict`, `reasons`, and `warnings` let you branch on
**stable machine-readable codes** rather than human-readable text.

> Both `runPreCall()` and `runNetworkCheck()` place real (billable-path)
> diagnostic calls and require an authenticated, connected client. Only
> `runMicrophoneCheck()` is purely local. See each method's section for
> the exact prerequisites and side effects.

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
  - [Server tests (`serverTests`)](#server-tests-servertests)
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

`runMicrophoneCheck()` does not place a call and does not require an
authenticated client, but it still needs a browser environment with
`getUserMedia` support. `runNetworkCheck()` **does** place real
diagnostic calls and requires an authenticated client.

## Prerequisites

- **Browser environment.** All three methods use browser WebRTC and media
  APIs (`RTCPeerConnection`, `getUserMedia`, `enumerateDevices`, Web Audio
  `AnalyserNode`, `MediaRecorder`). They run in any browser the SDK
  supports; they are not Node.js APIs.
- **`runPreCall()` and `runNetworkCheck()` require a connected,
  authenticated client.** Both methods place temporary diagnostic calls
  through `client.newCall()`, so the client must have reached
  `telnyx.ready` (authenticated and registered) before you call them.
  Calling them on an unconnected client will fail when they try to dial.
- **`runMicrophoneCheck()` does not require a connected client.** It
  calls `getUserMedia({ audio: true })` directly and never touches SIP
  signaling or `client.newCall()`.
- **ICE servers.** `runPreCall()` and `runNetworkCheck()` use the client's
  configured ICE servers by default. You can override them per-call with
  the `iceServers` option (diagnostic-only — the client's own ICE server
  configuration is never mutated). `runMicrophoneCheck()` does not use ICE
  servers.
- **Microphone permission.** `runMicrophoneCheck()` and the microphone
  phase of `runPreCall()` call `getUserMedia({ audio: true })`. The
  browser will prompt the user for microphone permission if it has not
  already been granted. You do not need to request permission separately.
  `runNetworkCheck()` does not touch the microphone.

## The three checks at a glance

| Concern                                   |    `runPreCall()`     |       `runNetworkCheck()`        |    `runMicrophoneCheck()`     |
| ----------------------------------------- | :-------------------: | :------------------------------: | :---------------------------: |
| Places a real diagnostic call             |       ✅ (one)        | ✅ (one per ICE URL, concurrent) |              ❌               |
| Requires authenticated client             |          ✅           |                ✅                |              ❌               |
| ICE candidate gathering                   |          ✅           |    ✅ (per-server, isolated)     |              ❌               |
| Network quality (RTT/jitter/loss/bitrate) |          ✅           |   ✅ (per-call, short window)    |              ❌               |
| Microphone permission + devices           |          ✅           |                ❌                |              ✅               |
| Microphone capture level                  |          ✅           |                ❌                |              ✅               |
| Optional recording + auto-playback        |          ❌           |                ❌                |          ✅ (opt-in)          |
| Modules you can disable                   | none (all always run) |  none (ICE+network always run)   | none (microphone always runs) |

> The public methods intentionally expose a narrow option surface. You
> cannot toggle individual modules on or off from these methods — each
> method runs the modules that match its purpose. The internal
> `PreCallDiagnostic` constructor accepts module toggles, but that wider
> option surface is **not** a supported customer entry point; use the
> client-level methods instead.

## runPreCall: full diagnostic

`client.runPreCall(options?)` establishes a single temporary diagnostic
call, samples WebRTC stats for a short post-establishment window, then
hangs up and returns a report covering ICE, network quality, and
microphone.

### Options

`RunPreCallOptions` exposes exactly three optional fields:

```ts
import { TelnyxRTC } from '@telnyx/webrtc';

const report = await client.runPreCall({
  // Destination number to dial for the diagnostic call.
  // Optional. Defaults to '+1-872-231-5806' when omitted.
  destinationNumber: '+155****4567',

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

All three fields are optional — `client.runPreCall()` with no arguments
runs with all defaults. There is no public option to configure the call
setup timeout, disable auto-hangup, or toggle modules; those are
internal to the diagnostic framework.

### What it does

1. Places a temporary diagnostic call to `destinationNumber` (or the
   default) via `client.newCall()`.
2. Waits for the call to reach the established (`active`) state. Call
   establishment is bounded by an internal timeout (not exposed on
   `RunPreCallOptions`). If establishment does not complete in time, the
   run aborts and the report reflects the failure (see error handling
   below).
3. Once established, samples WebRTC stats for `durationMs` and runs all
   modules: ICE candidate analysis, network quality, and microphone
   (active capture, no recording).
4. Hangs up the diagnostic call and releases resources.
5. Returns the `PreCallDiagnosticReport`.

### Timer semantics

`durationMs` is the post-establishment sampling window — it starts
**only after** the call reaches the established state. Call
establishment itself is bounded by a separate internal timeout. Do not
treat the total runtime as `durationMs` alone: the actual wall-clock is
roughly `actualSetupTime + durationMs + cleanupTime`, and setup may
finish well under its internal bound.

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
    // 'permission_denied' covers both an explicit denial AND capture
    // failures (no_device / not_supported / unknown). Inspect
    // captureError to distinguish them before prompting.
    if (
      report.microphone?.captureError &&
      report.microphone.captureError !== 'permission_denied'
    ) {
      showError(
        `Microphone unavailable: ${report.microphone.captureError}`,
        report.reasons
      );
    } else {
      showMicPermissionPrompt();
    }
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
**independently** by placing one short diagnostic call per ICE URL. All
calls run concurrently so the total check duration stays bounded. Each
call stays active for three seconds. TURN URLs force a relay policy to
verify that the relay is actually usable.

> Unlike the legacy description of this method, **`runNetworkCheck()`
> places real diagnostic calls** — it does not open raw
> `RTCPeerConnection`s without signaling. It requires an
> authenticated, connected client, just like `runPreCall()`.

### Options

`RunNetworkCheckOptions` is a narrow type that exposes only:

```ts
const report = await client.runNetworkCheck({
  // Custom ICE servers to test (diagnostic-only, does not mutate client config).
  // When omitted, tests the client's configured ICE servers.
  // Each ICE URL entry becomes one isolated diagnostic call.
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'turn:turn.example.com:3478', username: '...', credential: '...' },
  ],
});
```

`destinationNumber`, `durationMs`, and other `RunPreCallOptions` fields
are **not** accepted by `runNetworkCheck()`. The per-call duration is
fixed at three seconds (an internal constant) and is not configurable
from the public API.

### What it does

1. Flattens the configured (or overridden) ICE server list into one entry
   per ICE URL.
2. For each ICE URL, places one isolated three-second diagnostic call
   using **only that server** (TURN URLs additionally force a relay
   candidate policy).
3. While each call is established, samples WebRTC stats and builds a
   per-call ICE report and network report.
4. After all calls complete, returns a report whose top-level
   [`serverTests`](#server-tests-servertests) array holds the per-server
   results, and whose top-level `verdict`/`reasons`/`warnings` summarize
   whether **at least one** ICE path is usable.

### Wall-clock cost

All per-ICE-URL calls run concurrently, so the total wall-clock is
approximately the three-second per-call duration **regardless of how
many ICE servers are configured** (plus connection setup). Do not
assume the runtime scales with the server count.

### Verdict semantics for network-only

The top-level `verdict` describes whether there is at least one usable
ICE path:

- **`ready`** — at least one server established a diagnostic call with
  healthy conditions.
- **`degraded`** — at least one server succeeded, but at least one
  failed or produced degraded conditions.
- **`blocked`** — every configured server failed to establish a
  diagnostic call (pre-establishment failures included). Each failed
  server still has a `serverTests[]` entry with `established: false` and
  an `error` string, so the failure is not hidden.
- **`inconclusive`** — no per-server test data was produced at all
  (e.g. an exception aborted the run before any test executed, or no
  ICE servers were configured so `serverTests` is empty). This is
  distinct from "all servers failed" — when servers were configured and
  every one failed, the verdict is `blocked`, not `inconclusive`.

Per-server failure details are retained in `serverTests[].error` and
in the per-server `ice`/`network` reason codes — a single failing server
does not hide a successful one, and vice versa.

### What it does NOT do

- Does **not** test the microphone (the microphone module is disabled in
  network-only mode).
- Does **not** expose a per-call `durationMs` option — the window is
  fixed at three seconds.

### Example: inspect per-server results

```js
const report = await client.runNetworkCheck();

for (const test of report.serverTests ?? []) {
  const urls = Array.isArray(test.server.urls)
    ? test.server.urls.join(', ')
    : test.server.urls;
  console.log(
    test.established ? 'OK   ' : 'FAIL ',
    urls,
    test.error ? `(error: ${test.error})` : ''
  );
  if (test.network) {
    console.log('  quality:', test.network.quality);
    console.log('  rtt avg:', test.network.rtt?.average, 'ms');
  }
}

if (report.verdict === 'blocked') {
  showError(
    'None of your ICE servers produced a usable connection.',
    report.reasons
  );
}
```

## runMicrophoneCheck: microphone-only

`client.runMicrophoneCheck(options?)` verifies microphone permission,
enumerates audio input devices, performs active capture and audio-level
detection, and optionally records the audio so the user can listen to
it afterwards. It does **not** dial.

### Options

`RunMicrophoneCheckOptions` exposes:

```ts
import { MICROPHONE_RECORDING_NOTICE } from '@telnyx/webrtc';

const report = await client.runMicrophoneCheck({
  // Sampling window (ms) for active capture / audio-level measurement.
  // Default: ~2000. Mapped to the microphone module's sampleDurationMs.
  durationMs: 5000,

  // Audio level (0-1) at or above which the microphone is considered
  // non-silent. Clamped to the range 0-1. Default: 0.01.
  silenceThreshold: 0.02,

  // Whether to record the captured audio so the user can listen to it.
  // Default: false — the zero-argument path must not silently record.
  record: true,

  // Optional callback invoked immediately before recording starts
  // (when record: true). It receives the MICROPHONE_RECORDING_NOTICE
  // string so you can surface a pre-recording warning to the user.
  warnOnRecording: (notice) => {
    showRecordingWarning(notice);
  },
});
```

`iceServers`, `destinationNumber`, and other call-related options are
**not** accepted by `runMicrophoneCheck()` (no call is placed).

### Recording, consent, and playback

Recording is **opt-in** and defaults to `false`. The zero-argument
`client.runMicrophoneCheck()` performs active capture and level
measurement **without** recording.

When you set `record: true`:

- Pass `warnOnRecording` so a pre-recording warning is displayed
  **before** `MediaRecorder.start()`. The
  [`MICROPHONE_RECORDING_NOTICE`](#imports-reference) constant is the
  recommended notice string — surface it in your UI before calling
  `runMicrophoneCheck({ record: true })`.
- `warnOnRecording` is a **synchronous notice callback**, not a consent
  gate. The module invokes it immediately before recording starts, then
  proceeds with recording. It does not return a promise and is not
  awaited.
- When recording succeeds, the SDK **plays the recording back through
  the speakers automatically**. There is no `playback` option to disable
  this on the public `RunMicrophoneCheckOptions` surface; if you need to
  avoid automatic playback, do not set `record: true`.

> `warnOnRecording` is a notice/acknowledgment hook, **not** a consent
> enforcement mechanism. **You must obtain the user's consent before
> opting into recording** — the callback lets you display a warning
> before capture begins, but it does not replace your own consent flow.
> Do not present `warnOnRecording` as a consent mechanism; it is a hook
> for surfacing the notice.

### What it does

1. Checks microphone permission via the Permissions API (with best-effort
   inference where the API is unavailable).
2. Enumerates audio input devices with `enumerateDevices` (labels are
   only accessible after permission is granted).
3. Calls `getUserMedia({ audio: true })` for active capture.
4. Measures audio level (peak + average RMS, 0–1) over the `durationMs`
   sample window using a Web Audio `AnalyserNode`.
5. Stops all tracks after the sample completes.
6. When `record: true`, records the captured audio with `MediaRecorder`,
   invokes `warnOnRecording` immediately before starting, and (on
   successful recording) plays it back automatically.

### Example: silent-microphone detection

```js
const report = await client.runMicrophoneCheck();

if (report.microphone?.currentPermissionState === 'denied') {
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
populated depends on the mode you ran — interpret the report **in terms
of the mode**, not as if every section is always present.

| Section                          |     `runPreCall()`      |         `runNetworkCheck()`         | `runMicrophoneCheck()` |
| -------------------------------- | :---------------------: | :---------------------------------: | :--------------------: |
| `verdict`, `reasons`, `warnings` |           ✅            |                 ✅                  | ✅ (microphone-driven) |
| `timings`                        |           ✅            |                 ✅                  |           ✅           |
| `ice`                            |           ✅            |   per-entry (`serverTests[].ice`)   |           ❌           |
| `network`                        |           ✅            | per-entry (`serverTests[].network`) |           ❌           |
| `microphone`                     |           ✅            |                 ❌                  |           ✅           |
| `serverTests`                    |           ❌            |                 ✅                  |           ❌           |
| `callId`                         |           ✅            | per-entry (`serverTests[].callId`)  |           ❌           |
| `raw`                            | ✅ (`raw.samples` only) |                 ❌                  |           ❌           |

> There is **no `media` section** on `PreCallDiagnosticReport`. Audio
> flow findings (one-way audio, no audio flow) are reported by the
> network module under `report.network.reasons` with `network_*` codes,
> not under a separate `media` section.

Sections that did not run are **omitted** (undefined), not empty
placeholders. Always check for a section's presence before reading it
(`if (report.ice) { ... }`, `if (test.network) { ... }`).

### Verdict precedence

The `verdict` field is the single overall result of the diagnostic.
Values and their precedence (highest to lowest):

1. `permission_denied` — microphone permission was denied **or** no
   microphone stream could be obtained. The microphone module sets
   `isPermissionGrantedCurrently = false` whenever `getUserMedia()` does
   not yield a stream, so an explicit denial, a missing device
   (`no_device`), an unsupported environment (`not_supported`), and a
   generic capture failure (`unknown`) **all** produce `permission_denied`
   — they are **not** reported as `blocked`. Inspect
   `report.microphone.captureError` and `report.microphone.reasons` to
   distinguish the underlying cause. (The `permission_denied` vs `blocked`
   ordering reflects the current implementation; if a future change
   reclassifies capture failures as `blocked`, this guide must be updated
   to match.)
2. `blocked` — a module reports a blocking condition with a usable
   microphone (no ICE candidates that connected, no selected pair, no
   usable ICE server, poor network quality, no audio flow). Note: a
   missing device or capture failure is **not** in this category — see
   `permission_denied` above.
3. `degraded` — a module reports degraded but functional conditions
   (e.g. only-relay candidates, high jitter, a partially-failing set of
   ICE servers, silent microphone).
4. `ready` — all available module reports indicate healthy conditions.
5. `inconclusive` — insufficient data to determine a verdict (e.g.
   no candidates gathered in a full run, a call-setup timeout with no
   captured error, or an empty `serverTests` array in network-only
   mode). When servers were configured and every one failed, the
   network-only aggregate is `blocked`, not `inconclusive`.

When multiple modules produce verdicts, the **highest-precedence**
verdict wins. `permission_denied` therefore dominates everything else;
`ready` only wins when no module produced a higher-precedence verdict.

Branch on the `verdict` string and on `reasons[].code`, not on
human-readable `message` text — messages may change; codes are stable.

### Reasons vs. warnings

The report distinguishes two kinds of findings:

- **`reasons`** drive the verdict. Each entry has a stable `code`, a
  human-readable `message`, and a `source` module (`'ice'`, `'network'`,
  `'microphone'`, or `'diagnostic'` for cross-cutting findings like a
  diagnostic run error). Reasons are why the verdict is what it is.
- **`warnings`** are non-fatal, advisory findings that do **not** flip
  the verdict. They describe degraded-but-functional signals — e.g.
  only-host ICE candidates while connectivity still succeeded, high
  jitter while the call still works, or an ICE server that returned no
  candidates while another server succeeded. `warnings` can accompany a
  `ready` verdict.

Treat `warnings` as advisory UI/telemetry, not as failure conditions. Do
not block the call on a warning; surface it and proceed.

### Reason and warning code reference

Codes are grouped by the module that produces them. The package exports
constant objects (`IceReasonCode`, `NetworkReasonCode`,
`MicrophoneReasonCode`) so you can avoid string literals — see
[Imports reference](#imports-reference).

Some codes have deprecated aliases kept for compatibility; prefer the
non-deprecated form. Codes marked _reason_ affect the verdict; codes
marked _warning_ do not.

#### ICE (`source: 'ice'`)

| Code                       | Severity                                                  | Meaning                                                                                                                                                                                              |
| -------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ice_no_candidates`        | reason → `inconclusive`                                   | No ICE candidates were gathered at all. Cannot make a definitive connectivity claim.                                                                                                                 |
| `ice_no_selected_pair`     | reason → `blocked`                                        | Candidates were gathered but no candidate pair was selected (connectivity failure).                                                                                                                  |
| `ice_turn_required`        | reason → `degraded`                                       | The selected candidate pair requires a TURN relay. Still functional but suboptimal. (Deprecated alias: `ice_only_relay_candidates`.)                                                                 |
| `ice_gathering_timeout`    | reason → `degraded`                                       | ICE gathering did not complete within the timeout (partial data).                                                                                                                                    |
| `ice_only_host_candidates` | warning (when connected) / reason → `degraded` (when not) | Only host candidates. When connectivity succeeded, advisory; otherwise degraded.                                                                                                                     |
| `ice_server_no_candidates` | warning                                                   | One or more configured ICE servers returned no candidates. Server may be unreachable, blocked, or misconfigured.                                                                                     |
| `ice_strict_network`       | _(reserved, not currently emitted)_                       | Defined as `IceReasonCode.StrictNetwork` but no verdict path emits this code in the current implementation. Listed for completeness; do not branch on it until a future release starts producing it. |
| `ice_multiple_interfaces`  | warning                                                   | Multiple network interfaces detected (may indicate VPN or complex NAT).                                                                                                                              |
| `ice_vpn_detected`         | warning                                                   | A VPN appears active on the host (Chromium `networkType === 'vpn'`).                                                                                                                                 |
| `ice_server_failed`        | reason → `degraded` (per-server, network-only)            | A per-server diagnostic call in `runNetworkCheck()` failed to establish or returned an error. Per-server detail in `serverTests[].error`.                                                            |

#### Network (`source: 'network'`)

| Code                    | Severity            | Meaning                                                                                                                       |
| ----------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `network_high_jitter`   | reason → `degraded` | High jitter detected (average at or above the degraded/poor threshold).                                                       |
| `network_high_rtt`      | reason → `degraded` | High round-trip time detected (average at or above the degraded/poor threshold).                                              |
| `network_packet_loss`   | reason → `degraded` | High packet loss detected (fraction at or above the degraded/poor threshold). (Deprecated alias: `network_high_packet_loss`.) |
| `network_low_bitrate`   | reason → `degraded` | Measured audio bitrate fell below the configured floor in one or both directions.                                             |
| `network_poor_quality`  | reason → `blocked`  | Overall network quality assessed as `poor`.                                                                                   |
| `network_fair_quality`  | warning             | Overall network quality assessed as `fair`.                                                                                   |
| `network_no_audio_flow` | reason → `blocked`  | No inbound or outbound audio RTP is flowing.                                                                                  |
| `network_one_way_audio` | reason → `blocked`  | Audio RTP is flowing in only one direction.                                                                                   |

> Audio-flow findings (`network_no_audio_flow`, `network_one_way_audio`)
> are produced by the **network** module, not a separate `media` module.
> There is no `media` source and no `media_*` reason codes.

#### Microphone (`source: 'microphone'`)

| Code                                   | Severity                      | Meaning                                                                                                                                        |
| -------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `microphone_permission_denied`         | reason → `permission_denied`  | Microphone permission was denied by the user (Permissions API state `denied`).                                                                 |
| `microphone_no_device`                 | reason → `permission_denied`† | No microphone device is available. †See note below on precedence — `permission_denied` can result when `getUserMedia` fails to yield a stream. |
| `microphone_capture_permission_denied` | reason → `permission_denied`  | Active capture was rejected (NotAllowedError/SecurityError).                                                                                   |
| `microphone_capture_no_device`         | reason → `permission_denied`† | Active capture found no microphone device. †See note below on precedence.                                                                      |
| `microphone_capture_not_supported`     | reason → `permission_denied`† | The browser/environment does not support `getUserMedia`. †See note below on precedence.                                                        |
| `microphone_capture_failed`            | reason → `permission_denied`† | Microphone capture failed with an unknown error. †See note below on precedence.                                                                |
| `microphone_silent`                    | reason → `degraded`           | Capture produced silence (no audio level above the silence threshold). (Deprecated alias: `microphone_silence_detected`.)                      |

> **†Precedence note — capture failures can produce `permission_denied`.**
> The microphone verdict is derived from `isPermissionGrantedCurrently`,
> which is `true` only when `getUserMedia({ audio: true })` yields a
> stream. Any capture failure (`no_device`, `not_supported`, `unknown`)
> leaves `isPermissionGrantedCurrently === false`, and the verdict logic
> treats `isPermissionGrantedCurrently === false` as permission denial
> (precedence over the `blocked` path). As a result, a missing device,
> unsupported environment, or generic capture failure can surface as
> `verdict: 'permission_denied'` even when the user never explicitly
> denied permission. Applications that need to distinguish "no device"
> from "permission denied" should inspect
> `report.microphone.captureError` (`'no_device'` / `'not_supported'` /
> `'unknown'` vs `'permission_denied'`) and
> `report.microphone.currentPermissionState` rather than relying solely
> on the top-level verdict. This matches the shipped implementation in
> dependency PR [#733](https://github.com/team-telnyx/webrtc/pull/733); if
> this precedence is considered a defect, it is a #733 behavior change,
> not a documentation fix.

#### Diagnostic (`source: 'diagnostic'`)

| Code                   | Severity                | Meaning                                                                                                                                                                                                                                                                                   |
| ---------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `call_setup_timeout`   | reason → `inconclusive` | The diagnostic call did not reach the established state within the internal setup timeout and no explicit call error was captured. Emitted by `runPreCall()` (full mode) when establishment times out. Retryable — the failure is usually transient (network reachability, backend load). |
| `diagnostic_run_error` | reason → `blocked`      | The diagnostic run encountered an unexpected error. The error message is included in the reason `message`.                                                                                                                                                                                |

> `call_setup_timeout` is produced only by `runPreCall()` (full mode).
> `runNetworkCheck()` reports per-server establishment failures as
> `ice_server_failed` (source `'ice'`) in each `serverTests[]` entry with
> `established: false`, and the aggregate verdict is `blocked` when every
> server fails — not `inconclusive`. See [Verdict semantics for
> network-only](#verdict-semantics-for-network-only).

### Timings

`report.timings` (`PreCallTimingsReport`) holds timing measurements in
**milliseconds**. All duration fields are `ms`. Missing sources result
in **omitted** (undefined) fields, not zero placeholders — always check
for presence before reading.

| Field                     | Meaning                                                                                                                                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `totalMs`                 | Total duration of the diagnostic run, including cleanup (monotonic).                                                                                                                                                                    |
| `iceGatheringMs`          | Total ICE candidate gathering duration, from gathering start to completion.                                                                                                                                                             |
| `firstNonHostCandidateMs` | Time from ICE gathering start until the first server-derived (non-host) candidate.                                                                                                                                                      |
| `callEstablishment`       | Unmodified call-establishment timeline collected by the SDK (`PreCallEstablishmentTimings`): `mode` (`'trickle'` / `'non-trickle'`), `direction` (`'outbound'` / `'inbound'`), and `steps[]` (each with `label`, `fromStart`, `delta`). |

`runNetworkCheck()` populates `timings` at the top level (across the
concurrent run) and each `serverTests[].timings` carries the per-call
timing. `runMicrophoneCheck()` populates only the fields relevant to its
mode (no `callEstablishment` since no call is placed).

### ICE report

`report.ice` (`PreCallIceReport`) covers ICE candidate gathering and the
selected pair. In `runNetworkCheck()`, each `serverTests[].ice` entry
holds the per-call ICE report.

- `candidateGatheringCompleted` (and its `gatheringComplete` alias) —
  whether ICE gathering completed. Both fields are populated with the
  same boolean.
- `candidateCounts` — `Record<RTCIceCandidateType, number>` counts of
  local candidates by type (`host`, `srflx`, `prflx`, `relay`, etc.).
- `candidates` — full per-candidate metadata
  (`RTCIceCandidateStats[]`): `address`, `port`, `candidateType`,
  `protocol`, `networkType`, `url`, `priority`, etc. Empty array when
  no candidates were gathered.
- `hasRelayCandidate`, `onlyHostCandidates` — quick flags.
- `isTurnRequired` — whether the selected pair required a TURN relay.
  `true`/`false` when the pair is known; `undefined` when no pair was
  selected.
- `hasMultipleNetworkInterfaces` — true when ≥2 distinct host candidate
  addresses; `undefined` when unavailable.
- `vpnDetected` — true when a candidate reports `networkType === 'vpn'`
  (Chromium); `undefined` when no candidates were gathered.
- `hasSelectedPair`, `selectedPair` (`NominatedPair`, extends
  `RTCIceCandidatePairStats` with `localCandidate`/`remoteCandidate`
  `RTCIceCandidateStats`) — the selected candidate pair, with local and
  remote candidate metadata. `selectedPair.currentRoundTripTime` is in
  **seconds** (as reported by the browser).
- `iceGatheringState`, `iceConnectionState` — raw `RTCPeerConnection`
  states.
- `serverCandidateComparison` (`PreCallIceServerComparisonEntry[]`) —
  comparison of each configured ICE server against the candidates it
  produced. Each entry has `urls`, `hasCandidates`, `candidateType`,
  `candidates`, `candidateCount`. Use this to see which servers returned
  no candidates. (This is an array of entries, not a nested object.)

> There is **no `perServerResults` field** on `PreCallIceReport`.
> Per-server results live only in the top-level `serverTests` array
> produced by `runNetworkCheck()`. `runPreCall()` uses all configured
> ICE servers at once and does not isolate per-server results.

> `serverCandidateComparison[].urls` (and `serverTests[].server.urls`)
> may contain TURN `username`/`credential` values. See
> [Privacy and safe report sharing](#privacy-and-safe-report-sharing).

### Network report

`report.network` (`PreCallNetworkReport`) holds network quality metrics
derived from a diagnostic call's WebRTC stats. Populated by
`runPreCall()` (top-level) and by `runNetworkCheck()`
(`serverTests[].network`, per call). It also carries audio-flow
findings.

- `quality` — `'good' | 'fair' | 'poor' | 'unknown'`.
- `rtt` (`NetworkMinMaxAverage`) — round-trip time statistics in
  **milliseconds** (`min`/`max`/`average`).
- `jitter` (`NetworkMinMaxAverage`) — jitter statistics in
  **milliseconds**.
- `packets` (`NetworkPacketCounters`) — `packetsSent`, `packetsReceived`,
  `packetsLost`, and `packetLossFraction` (0–1).
- `bytes` (`NetworkByteCounters`) — `bytesSent`, `bytesReceived`.
- `bitrate` (`NetworkBitrate`) — estimated audio bitrate in **bits per
  second** (`outbound`/`inbound`), computed from byte deltas between
  samples.
- `inbound` / `outbound` (`NetworkAudioDirection`) — per-direction audio
  flow: `flowing`, `packets`, `bytes`, `packetsDelta`, `bytesDelta`.
- `reasons` — reason inputs from this module (namespaced `network_*`).

Audio-flow verdicts (`network_no_audio_flow`, `network_one_way_audio`)
are derived from the `inbound`/`outbound` direction counters when both
directions are available. In `runNetworkCheck()` the per-call window is
short (three seconds), so low-bitrate findings are filtered out of the
aggregate network-only verdict to avoid false positives from
short-lived counters.

### Server tests (`serverTests`)

`report.serverTests` (`PreCallServerTestReport[]`) is populated **only**
by `runNetworkCheck()`. Each entry describes one isolated per-ICE-URL
diagnostic call:

- `server` (`RTCIceServer`) — the ICE server that was tested (may
  contain TURN `username`/`credential`).
- `established` — whether this isolated test produced candidates and
  selected a pair (no `error`).
- `callId` — the diagnostic call's internal ID for this server test.
- `ice` (`PreCallIceReport`) — the per-call ICE report.
- `network` (`PreCallNetworkReport`) — the per-call network report.
- `timings` (`PreCallTimingsReport`) — the per-call timing report.
- `error` — a short error string when the test failed to establish or
  returned an error; `undefined` when the test succeeded.

### Microphone report

`report.microphone` (`PreCallMicrophoneReport`) covers permission,
devices, and active capture. Populated by `runPreCall()` and
`runMicrophoneCheck()`.

- `currentPermissionState` — `'granted' | 'denied' | 'prompt' | 'unknown'`
  (mirrors the browser Permissions API where supported).
- `isPermissionGrantedCurrently` — convenience boolean; `true` when
  `currentPermissionState` is `'granted'`, `false` otherwise.
- `isGetUserMediaFailed` — whether `getUserMedia` failed during the
  check.
- `deviceAvailable`, `deviceCount`, `devices` (`PreCallAudioDevice[]`),
  `labelsAccessible` — device enumeration results. `devices` gives the
  full list (`label`, `deviceId`, `kind: 'audioinput'`) so you can show
  the user all microphones; `undefined` when enumeration is unavailable.
  Labels are only accessible after permission is granted.
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
  `recordingDurationMs` — recording results (only when `record: true`
  and capture succeeded). `recordingDataUrl` is a base64-encoded
  `audio/webm` data URL.
- `playbackPerformed` — whether the recording was played back
  automatically (only when `record: true`).
- `reasons` — reason inputs (namespaced `microphone_*`).

> `recordingDataUrl` contains recorded audio. See
> [Privacy and safe report sharing](#privacy-and-safe-report-sharing).

### Call identifier

`report.callId` is the diagnostic call's internal ID, populated **only**
by `runPreCall()` (full mode, top level) and by `runNetworkCheck()`
(per-entry, `serverTests[].callId`). Omitted by `runMicrophoneCheck()`
(no call is made). Use it to correlate the diagnostic with downstream
call reports.

### Raw troubleshooting data

`report.raw` holds advanced troubleshooting evidence:

- `samples` — the collected WebRTC stats samples over the diagnostic
  duration. Populated **only** by `runPreCall()` (full mode) and only
  when the call established and at least one stats sample was collected;
  `undefined` otherwise.
- `stats` — declared on the `raw` shape but **never populated** by any
  public method in the current implementation. Do not rely on it.

`raw` is **not** produced by `runNetworkCheck()` or
`runMicrophoneCheck()`. `runNetworkCheck()` per-server results
(`serverTests[]`) do not carry a `raw` field either — per-call stats
samples are discarded after the short three-second window and only the
structured `ice`/`network`/`timings` sub-reports are retained.

`raw` is **browser-dependent** troubleshooting evidence, not a stable
application interface. Browser stats schemas vary across Chrome/Firefox/
Safari and across versions; do not build product logic on `raw` fields.
`raw.samples` may be large and may not serialize meaningfully with plain
JSON — do not present it as a stable or routinely persisted payload.

## Handling common outcomes

```js
const report = await client.runPreCall();

// Permission denied — the user blocked the microphone, OR a capture
// failure (no device / not supported / unknown) occurred. Distinguish
// them: a capture failure should not be treated as a re-promptable
// permission denial.
if (report.verdict === 'permission_denied') {
  const captureError = report.microphone?.captureError;
  if (captureError && captureError !== 'permission_denied') {
    showError(`Microphone unavailable: ${captureError}`, report.reasons);
  } else {
    showMicPermissionPrompt();
  }
  return;
}

// Blocked — cannot place a call right now.
if (report.verdict === 'blocked') {
  const blockedReasons = (report.reasons ?? []).filter(
    (r) =>
      r.code === 'ice_no_selected_pair' ||
      r.code === 'network_no_audio_flow' ||
      r.code === 'network_poor_quality' ||
      r.code === 'microphone_no_device' ||
      r.code === 'diagnostic_run_error'
  );
  showError('Cannot place a call right now.', blockedReasons);
  return;
}

// Degraded — call is possible but quality may be reduced.
if (report.verdict === 'degraded') {
  showWarning('Call quality may be reduced.', report.reasons);
}

// Inconclusive — not enough data. The most actionable sub-case is a
// call-setup timeout, which is usually transient and worth retrying.
if (report.verdict === 'inconclusive') {
  const hasSetupTimeout = (report.reasons ?? []).some(
    (r) => r.code === 'call_setup_timeout'
  );
  if (hasSetupTimeout) {
    showRetryOption('The diagnostic call did not connect in time. Retrying...');
  } else {
    showRetryOption(report.reasons);
  }
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

For `runNetworkCheck()`, branch on the top-level verdict for the overall
"can I place a call?" decision, and iterate `serverTests` to show the
user which ICE servers are healthy:

```js
const report = await client.runNetworkCheck();

if (report.verdict === 'blocked') {
  showError(
    'None of your ICE servers produced a usable connection.',
    report.reasons
  );
  return;
}

const failing = (report.serverTests ?? []).filter((t) => !t.established);
if (failing.length > 0) {
  showWarning(
    `${failing.length} ICE server(s) failed; using the remaining servers.`,
    report.reasons
  );
}
```

## Privacy and safe report sharing

Diagnostic reports can contain **sensitive** data. Before exporting,
logging, or sharing a report, redact or omit the following:

| Field                                                                                                                            | Sensitivity | What it contains                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `serverTests[].server.username`/`credential` (or any `iceServers` entry)                                                         | **High**    | TURN `username` and `credential` values from configured ICE servers.                                                                                                                       |
| `ice.serverCandidateComparison[].urls` / `serverTests[].server.urls`                                                             | Medium      | TURN server URLs (may include host + port).                                                                                                                                                |
| `ice.candidates[].address` / `selectedPair.localCandidate.address` / `selectedPair.remoteCandidate.address` (and their `.port`s) | Medium      | Local/remote IP addresses and ports of the selected ICE candidate pair.                                                                                                                    |
| `ice.candidates[].url`                                                                                                           | Medium      | TURN server URLs.                                                                                                                                                                          |
| `microphone.recordingDataUrl`                                                                                                    | **High**    | Base64-encoded recorded audio (only when `record: true`).                                                                                                                                  |
| `microphone.devices[].label` / `deviceId`                                                                                        | Medium      | Device labels and IDs (labels imply granted permission).                                                                                                                                   |
| `callId` / `serverTests[].callId`                                                                                                | Medium      | Internal call identifiers — useful for correlation but should not be exposed to end users.                                                                                                 |
| `raw.samples`                                                                                                                    | Medium      | Raw browser WebRTC stats (full mode only), including candidate addresses and detailed counters. Browser-dependent; may not serialize cleanly. `raw.stats` is declared but never populated. |

Guidance:

- **Do not export the full report verbatim.** Build a redacted view that
  omits `raw`, `recordingDataUrl`, TURN credentials, and device IDs
  unless the recipient needs them for support.
- **Recording requires consent.** Obtain the user's consent before
  setting `record: true` on `runMicrophoneCheck()`, and surface
  `MICROPHONE_RECORDING_NOTICE` before capture (use the `warnOnRecording`
  callback). `warnOnRecording` is a notice/acknowledgment hook, not a
  consent enforcement mechanism — your application is responsible for
  obtaining and recording consent. Successful recordings are played back
  automatically; tell the user this will happen.
- **Do not persist `raw.samples`.** It may be large and is not a stable
  serialization format. Use the structured report fields for any
  persisted telemetry.
- **Do not log TURN credentials.** `iceServers[].username`/`credential`
  are credentials; treat them like any other secret.
- **Do not expose `callId` in user-facing UI.** It is for correlating
  with backend call reports, not for display.

## Relationship to the legacy `PreCallDiagnosis` API

The SDK has **two** pre-call APIs with easily confused names. They are
distinct and neither replaces the other without a separate
compatibility decision.

|                          | `PreCallDiagnostic` (new)                                                                                   | `PreCallDiagnosis` (legacy)                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Entry point              | `client.runPreCall()` / `runNetworkCheck()` / `runMicrophoneCheck()`                                        | `PreCallDiagnosis.run(options)` (static)                                          |
| Requires existing client | Yes (for `runPreCall()` and `runNetworkCheck()`); no for `runMicrophoneCheck()`                             | No — creates its own `TelnyxRTC` from `credentials`                               |
| Modes                    | full / network-only / microphone-only                                                                       | single full diagnostic                                                            |
| Report                   | `PreCallDiagnosticReport` (verdict, reasons, warnings, ICE/network/microphone, `serverTests`, timings, raw) | `Report` (ICE candidate stats, selected pair, summary MOS/quality, session stats) |
| Microphone check         | ✅ (permission, devices, capture level, optional recording + playback)                                      | ❌                                                                                |
| Network-only check       | ✅ (per-ICE-URL isolated diagnostic calls)                                                                  | ❌                                                                                |
| Verdict + reason codes   | ✅ (stable machine-readable codes)                                                                          | ❌ (numeric MOS + quality string)                                                 |
| Status                   | **Unreleased** (see [VSDK-412](https://github.com/team-telnyx/webrtc/pull/733))                             | Available in published packages                                                   |

### Which should you use?

- For **new integrations** that can target the unreleased contract, prefer
  the `PreCallDiagnostic` family (`client.runPreCall()` etc.) for its
  structured verdicts, per-server ICE testing, and microphone checks.
- For **existing integrations** on a released package, continue using
  `PreCallDiagnosis.run()` until the new API is released. The legacy API
  is not removed by this work.
- **Do not mix the names.** `PreCallDiagnostic` (the new class/report)
  and `PreCallDiagnosis` (the legacy class) are different exports. Note
  also that the ticket title's spelling "PreCalDiagnostic" is a typo and
  does not match any exported symbol — use the exact names above.

Migration from `PreCallDiagnosis` to `PreCallDiagnostic` is not provided
as a drop-in mapping in this guide because the two report shapes are not
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

// Pre-call diagnostic class (exported, but prefer the client-level methods)
import { PreCallDiagnostic } from '@telnyx/webrtc';

// Recording notice constant (for runMicrophoneCheck consent UI)
import { MICROPHONE_RECORDING_NOTICE } from '@telnyx/webrtc';

// Reason-code constants (grouped by module) — use these instead of
// string literals so your code stays stable if a code value is renamed.
import {
  IceReasonCode,
  NetworkReasonCode,
  MicrophoneReasonCode,
} from '@telnyx/webrtc';
```

> There is **no `MediaReasonCode`** export. Audio-flow findings use
> `NetworkReasonCode` codes (`network_no_audio_flow`,
> `network_one_way_audio`).

### Type-only imports (report and related types)

These are types, not runtime values — import them with `import type`:

```ts
import type {
  PreCallDiagnosticReport,
  PreCallDiagnosticReason,
  PreCallTimingsReport,
  PreCallEstablishmentTimings,
  PreCallEstablishmentStep,
  PreCallIceReport,
  PreCallIceCandidateCounts,
  PreCallIceCandidateInfo,
  PreCallIceSelectedPairReport,
  PreCallNetworkReport,
  PreCallMicrophoneReport,
  PreCallMicrophoneOptions,
  PreCallServerTestReport,
  NetworkMinMaxAverage,
  NetworkPacketCounters,
  NetworkByteCounters,
  NetworkBitrate,
  NetworkAudioDirection,
  MicrophonePermissionState,
} from '@telnyx/webrtc';
```

> `PreCallDiagnosticWarning` is structurally identical to
> `PreCallDiagnosticReason` (it is a type alias) but is **not** re-exported
> from the package root. Use `PreCallDiagnosticReason` for both reasons and
> warnings when typing consumer code.

### Types that are NOT package-root exports

The following types appear in the report shape (as the types of fields
on `PreCallDiagnosticReport` and its sub-reports) or in the public method
signatures, but are **not** re-exported from the package root. You can
read and use the fields (e.g. `report.serverTests`, `report.warnings`,
`report.microphone.devices`, `report.microphone.audioLevelStats`) — you
just cannot name these types in an `import type` statement. Use
structural typing / inline types or `import type` from the deep path
**only if** you accept the stability risk of a non-public path:

- `RunPreCallOptions`, `RunNetworkCheckOptions`, `RunMicrophoneCheckOptions`
  (the option interfaces for the three public methods — defined in
  `TelnyxRTC.ts` but not re-exported from the package root; pass options
  inline as shown in the examples above)
- `NominatedPair` (the type of `ice.selectedPair`, extending
  `RTCIceCandidatePairStats`)
- `PreCallDiagnosticWarning`, `PreCallIceServerComparisonEntry`,
  `PreCallAudioDevice`, `PreCallMicrophoneAudioLevelStats`,
  `PreCallIceServerComparison`
  (field types on `PreCallDiagnosticReport` sub-reports — present in the
  generated declarations but not re-exported from the package root. The
  package root does re-export `PreCallIceOptions`, `PreCallNetworkOptions`,
  `PreCallMicrophoneOptions`, and several other nested types, so the lists
  above and below are not exhaustive — always check the generated
  declarations for the authoritative export set.)

> `RunNetworkCheckOptions` is `Pick<RunPreCallOptions, 'iceServers'>`
> (only `iceServers`).
>
> The `PreCallDiagnostic` class itself is exported, and its constructor
> option type `PreCallDiagnosticOptions` **is** re-exported from the
> package root (via `PreCallDiagnostic/index.ts`). That wider option
> surface is intentionally **not** the supported customer entry point;
> prefer the client-level methods (`runPreCall` / `runNetworkCheck` /
> `runMicrophoneCheck`). Only construct `PreCallDiagnostic` directly if
> you have a confirmed need that the public methods do not cover.
