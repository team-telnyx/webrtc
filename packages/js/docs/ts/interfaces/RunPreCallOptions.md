Options for the `TelnyxRTC.runPreCall()` public method.

`runPreCall` maps these into the internal `PreCallDiagnosticOptions`
internally, reusing the client's existing configuration where
appropriate (e.g. caller name/number, audio constraints, ICE servers).

`destinationNumber` is optional — when omitted, the diagnostic call
dials a sensible default (`'+1-872-231-5806'`). This mirrors the
zero-arg shape of Twilio's `Device.runPreflight(token, options?)`.

## Table of contents

### Properties

- [destinationNumber](#destinationnumber)
- [durationMs](#durationms)
- [iceServers](#iceservers)

## Properties

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
