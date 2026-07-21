Result of testing a single ICE server independently.

When `runNetworkCheck()` tests each ICE server one at a time (one
RTCPeerConnection per server), each result captures the full picture
for that server: which candidates it produced, gathering duration,
and whether any candidates were gathered at all.

## Table of contents

### Properties

- [candidateCounts](#candidatecounts)
- [candidateTypes](#candidatetypes)
- [candidates](#candidates)
- [error](#error)
- [firstCandidateMs](#firstcandidatems)
- [gatheredAny](#gatheredany)
- [gatheringComplete](#gatheringcomplete)
- [gatheringMs](#gatheringms)
- [hasRelayCandidate](#hasrelaycandidate)
- [server](#server)

## Properties

### candidateCounts

• **candidateCounts**: [`PreCallIceCandidateCounts`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallIceCandidateCounts.md)

Candidate counts from this server.

---

### candidateTypes

• **candidateTypes**: `string`[]

Unique candidate types from this server, sorted.

---

### candidates

• **candidates**: [`PreCallIceCandidateInfo`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallIceCandidateInfo.md)[]

Candidates gathered from this server.

---

### error

• `Optional` **error**: `string`

Error message if gathering from this server failed.

---

### firstCandidateMs

• `Optional` **firstCandidateMs**: `number`

Time in ms from gathering start to the first candidate.

---

### gatheredAny

• **gatheredAny**: `boolean`

Whether this server produced at least one candidate.

---

### gatheringComplete

• **gatheringComplete**: `boolean`

Whether gathering completed (iceGatheringState === 'complete').

---

### gatheringMs

• `Optional` **gatheringMs**: `number`

Time in ms from gathering start to gathering complete.

---

### hasRelayCandidate

• **hasRelayCandidate**: `boolean`

Whether at least one relay candidate was gathered.

---

### server

• **server**: `RTCIceServer`

The ICE server configuration that was tested.
