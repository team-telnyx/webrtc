Audio-level statistics from the microphone capture sample window.

Provides peak, average, and samples-count so callers can show the
user whether their microphone is producing sufficient audio level.

## Table of contents

### Properties

- [average](#average)
- [peak](#peak)
- [samples](#samples)

## Properties

### average

• **average**: `number`

Average RMS audio level across all samples in the window (0–1).

---

### peak

• **peak**: `number`

Peak RMS audio level observed during the sample window (0–1).

---

### samples

• **samples**: `number`

Number of audio-level samples taken during the window.
