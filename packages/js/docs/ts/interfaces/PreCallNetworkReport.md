Report from the network diagnostic module.

Produces normalized network quality metrics from raw WebRTC stats,
with quality classification and reason inputs for verdict logic.

## Table of contents

### Properties

- [bitrate](#bitrate)
- [bytes](#bytes)
- [jitter](#jitter)
- [packets](#packets)
- [quality](#quality)
- [reasons](#reasons)
- [rtt](#rtt)

## Properties

### bitrate

• `Optional` **bitrate**: [`NetworkBitrate`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/NetworkBitrate.md)

Estimated audio bitrate in bps (computed from byte deltas between samples).

---

### bytes

• `Optional` **bytes**: [`NetworkByteCounters`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/NetworkByteCounters.md)

Byte transfer counters.

---

### jitter

• `Optional` **jitter**: [`NetworkMinMaxAverage`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/NetworkMinMaxAverage.md)

Jitter statistics in milliseconds.

---

### packets

• `Optional` **packets**: [`NetworkPacketCounters`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/NetworkPacketCounters.md)

Packet loss and counter statistics.

---

### quality

• `Optional` **quality**: `"unknown"` \| `"good"` \| `"fair"` \| `"poor"`

Overall network quality assessment based on RTT, jitter, and packet loss.

---

### reasons

• `Optional` **reasons**: [`PreCallDiagnosticReason`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallDiagnosticReason.md)[]

Reason inputs for the verdict module.
Each entry describes a specific network degradation detected.

---

### rtt

• `Optional` **rtt**: [`NetworkMinMaxAverage`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/NetworkMinMaxAverage.md)

Round-trip time statistics in milliseconds.
