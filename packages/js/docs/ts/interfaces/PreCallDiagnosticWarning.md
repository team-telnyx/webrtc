A non-fatal warning entry in the diagnostic report.

Warnings describe degraded-but-functional signals (e.g. high jitter while
the call still works, only-host ICE candidates while connectivity
succeeded) that should be surfaced to the caller WITHOUT flipping the
overall verdict. They are separate from `reasons[]` (which drive the
verdict) and never cause the verdict to degrade to `'poor'` or
`'failed'` on their own.

## Table of contents

### Properties

- [code](#code)
- [message](#message)
- [source](#source)

## Properties

### code

• **code**: `string`

Machine-readable warning code (e.g., 'ice_only_host_candidates', 'network_high_jitter').

---

### message

• **message**: `string`

Human-readable description of the warning.

---

### source

• **source**: `string`

Which module produced this warning (e.g., 'ice', 'network', 'media', 'microphone').
