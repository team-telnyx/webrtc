Timing measurements for call establishment phases.
All durations are in milliseconds from the call start point.
Undefined if the phase didn't occur (e.g., inbound calls won't have createOffer).

Outbound start: newCall() called
Inbound start: invite message arrived (VertoHandler)

## Table of contents

### Properties

- [steps](#steps)

## Properties

### steps

• **steps**: \{ `delta`: `number` ; `fromStart`: `number` ; `label`: `string` }[]

Ordered steps with label, absolute time from start, and delta from previous
