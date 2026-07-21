A single entry in the ICE server comparison.

## Table of contents

### Properties

- [candidateCount](#candidatecount)
- [candidateTypes](#candidatetypes)
- [hasCandidates](#hascandidates)
- [protocols](#protocols)
- [urls](#urls)

## Properties

### candidateCount

• **candidateCount**: `number`

Number of candidates gathered from this server.

---

### candidateTypes

• **candidateTypes**: `string`[]

Candidate types gathered from this server (e.g. ['host', 'srflx', 'relay']).

---

### hasCandidates

• **hasCandidates**: `boolean`

Whether this server produced at least one candidate.

---

### protocols

• **protocols**: `string`[]

Transport protocols observed in gathered candidates from this server.

---

### urls

• **urls**: `string` \| `string`[]

The ICE server URL(s) from the configuration.
