Report from the media diagnostic module — T5 (folded into VSDK-301).

Describes whether audio RTP is flowing in both directions during the
diagnostic call, derived from the shared stats sample timeline
(`context.statsSamples`). The module reads only `context.statsSamples`;
it does not poll the peer connection or own timers.

## Table of contents

### Properties

- [audioFlowing](#audioflowing)
- [inboundAudioFlowing](#inboundaudioflowing)
- [outboundAudioFlowing](#outboundaudioflowing)
- [reasons](#reasons)
- [rtp](#rtp)
- [sampleCount](#samplecount)

## Properties

### audioFlowing

• `Optional` **audioFlowing**: `boolean`

Whether audio is flowing in both directions (derived from inbound + outbound).

---

### inboundAudioFlowing

• `Optional` **inboundAudioFlowing**: `boolean`

Whether inbound audio RTP packets/bytes are increasing.

---

### outboundAudioFlowing

• `Optional` **outboundAudioFlowing**: `boolean`

Whether outbound audio RTP packets/bytes are increasing.

---

### reasons

• `Optional` **reasons**: [`PreCallDiagnosticReason`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallDiagnosticReason.md)[]

Reason inputs for the verdict module (namespaced with `media_*`).

---

### rtp

• `Optional` **rtp**: [`MediaRtpDetails`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/MediaRtpDetails.md)

Per-direction RTP packet/byte counters and deltas.

---

### sampleCount

• `Optional` **sampleCount**: `number`

Number of stats samples the report was built from.
