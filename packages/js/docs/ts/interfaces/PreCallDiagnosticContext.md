The context object passed to each module builder during a diagnostic run.

This is the primary extension point for future modules: each module
builder receives this context and can read from it to produce its
section of the report.

## Table of contents

### Properties

- [call](#call)
- [error](#error)
- [options](#options)
- [statsSamples](#statssamples)

## Properties

### call

• `Optional` **call**: [`Call`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/classes/Call.md)

The temporary diagnostic call, if one was established.

---

### error

• `Optional` **error**: `Error`

Any error that occurred during the diagnostic run.

---

### options

• **options**: `PreCallDiagnosticOptions`

The options used for this diagnostic run.

---

### statsSamples

• **statsSamples**: `RTCStatsReport`[]

Collected stats samples from the diagnostic call.
