A single captured RTP packet in the ring buffer.

## Table of contents

### Properties

- [capturedAt](#capturedat)
- [payloadBytes](#payloadbytes)
- [rtpSeq](#rtpseq)
- [rtpSsrc](#rtpssrc)
- [rtpTs](#rtpts)

## Properties

### capturedAt

• **capturedAt**: `string`

ISO-8601 timestamp of frame capture.

---

### payloadBytes

• **payloadBytes**: `Uint8Array`

Raw Float32 PCM bytes (Float32Array.buffer).

---

### rtpSeq

• **rtpSeq**: `number`

Per-track incrementing RTP sequence number.

---

### rtpSsrc

• **rtpSsrc**: `number`

Per-track fixed random SSRC captured at start().

---

### rtpTs

• **rtpTs**: `number`

Per-track RTP timestamp (increments by frame size in samples).
