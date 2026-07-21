Options for the `TelnyxRTC.runPreCall()` public method.

Per the VSDK-412 spec, the public surface is intentionally narrow: only
the four call-setup fields that a caller legitimately needs to tune are
exposed. All four diagnostic modules (ICE, network, media, microphone)
always run inside `runPreCall()` — callers cannot opt out of individual
modules from the public API. Module-specific configuration lives on the
dedicated `runNetworkCheck()` / `runMicrophoneCheck()` methods instead.

`runPreCall` maps these into the internal `PreCallDiagnosticOptions`
internally, reusing the client's existing configuration where
appropriate (e.g. caller name/number, audio constraints, ICE servers).

`destinationNumber` is optional — when omitted, the diagnostic call
dials a sensible default (`'+1-872-231-5806'`). This mirrors the
zero-arg shape of Twilio's `Device.runPreflight(token, options?)`.

Timer semantics: the total budget is `callSetupTimeoutMs + durationMs`.
`callSetupTimeoutMs` is the hard upper bound for the call to reach
ICE + DTLS + media ready. `durationMs` is the post-establishment
sampling window — its timer starts **only** after establishment
completes, so call setup time does not eat into the diagnostic
sampling budget.

## Hierarchy

- **`RunPreCallOptions`**

  ↳ [`RunMicrophoneCheckOptions`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/RunMicrophoneCheckOptions.md)

## Table of contents

### Properties

- [callSetupTimeoutMs](#callsetuptimeoutms)
- [destinationNumber](#destinationnumber)
- [durationMs](#durationms)
- [iceServers](#iceservers)

## Properties

### callSetupTimeoutMs

• `Optional` **callSetupTimeoutMs**: `number`

Hard upper bound in ms for the call to reach ICE + DTLS + media ready.
On expiry: hangup, return report with `verdict: 'inconclusive'` +
`reasons: [{code: 'call_setup_timeout'}]`, omit module sections.
Default: ~30000.

---

### destinationNumber

• `Optional` **destinationNumber**: `string`

The destination number to dial for the diagnostic call.
Optional; defaults to `'+1-872-231-5806'` when omitted.

---

### durationMs

• `Optional` **durationMs**: `number`

Post-establishment sampling window in ms. The timer starts **only**
after the call reaches the established state. If establishment
never completes, this timer is never started. Default: ~5000.

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
