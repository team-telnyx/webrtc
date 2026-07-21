The complete diagnostic report returned by PreCallDiagnostic.run().

## Table of contents

### Properties

- [callId](#callid)
- [ice](#ice)
- [media](#media)
- [microphone](#microphone)
- [network](#network)
- [raw](#raw)
- [reasons](#reasons)
- [timings](#timings)
- [verdict](#verdict)
- [version](#version)
- [warnings](#warnings)

## Properties

### callId

• `Optional` **callId**: `string`

The diagnostic call's internal ID, when a call was placed (`'full'`
mode). Omitted for `'network-only'` and `'microphone-only'` modes
(no call is made). Useful for correlating the diagnostic with
downstream call reports.

---

### ice

• `Optional` **ice**: [`PreCallIceReport`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallIceReport.md)

ICE diagnostic results.

---

### media

• `Optional` **media**: [`PreCallMediaReport`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallMediaReport.md)

Media diagnostic results.

---

### microphone

• `Optional` **microphone**: [`PreCallMicrophoneReport`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallMicrophoneReport.md)

Microphone diagnostic results.

---

### network

• `Optional` **network**: [`PreCallNetworkReport`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallNetworkReport.md)

Network diagnostic results.

---

### raw

• `Optional` **raw**: `Object`

Raw data for advanced analysis.

#### Type declaration

| Name       | Type        | Description                                           |
| :--------- | :---------- | :---------------------------------------------------- |
| `samples?` | `unknown`[] | Collected stats samples over the diagnostic duration. |
| `stats?`   | `unknown`   | Raw RTC stats report, if available.                   |

---

### reasons

• `Optional` **reasons**: [`PreCallDiagnosticReason`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallDiagnosticReason.md)[]

List of reasons contributing to the verdict.

---

### timings

• `Optional` **timings**: [`PreCallTimingsReport`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallTimingsReport.md)

Timing measurements.

---

### verdict

• `Optional` **verdict**: `"blocked"` \| `"permission_denied"` \| `"ready"` \| `"degraded"` \| `"inconclusive"`

Overall verdict of the diagnostic run.

---

### version

• **version**: `1`

Report schema version. Always 1.

---

### warnings

• `Optional` **warnings**: [`PreCallDiagnosticWarning`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallDiagnosticWarning.md)[]

Non-fatal warnings — degraded-but-functional signals that do NOT
flip the verdict. Separate from `reasons[]` (which drive the verdict).
Surfaced so callers can present advisory information without the
verdict degrading to `'blocked'`/`'degraded'` for conditions that
still allow a call to succeed.
