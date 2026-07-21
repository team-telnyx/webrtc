Per-direction audio flow details from the media diagnostic module.

Describes whether audio RTP packets/bytes are observed increasing in one
direction during the diagnostic call, plus the raw counters and the
delta between the first and last samples.

## Table of contents

### Properties

- [bytes](#bytes)
- [bytesDelta](#bytesdelta)
- [flowing](#flowing)
- [packets](#packets)
- [packetsDelta](#packetsdelta)

## Properties

### bytes

• `Optional` **bytes**: `number`

Cumulative byte count from the last sample.

---

### bytesDelta

• `Optional` **bytesDelta**: `number`

Delta in byte count between first and last sample.

---

### flowing

• **flowing**: `boolean`

Whether audio packets or bytes increased across samples.

---

### packets

• `Optional` **packets**: `number`

Cumulative RTP packet count from the last sample.

---

### packetsDelta

• `Optional` **packetsDelta**: `number`

Delta in packet count between first and last sample.
