Report about the selected ICE candidate pair.

## Table of contents

### Properties

- [currentRoundTripTime](#currentroundtriptime)
- [id](#id)
- [local](#local)
- [localCandidateId](#localcandidateid)
- [nominated](#nominated)
- [remote](#remote)
- [remoteCandidateId](#remotecandidateid)
- [state](#state)
- [writable](#writable)

## Properties

### currentRoundTripTime

• `Optional` **currentRoundTripTime**: `number`

Current round-trip time in seconds (as reported by the browser).

---

### id

• `Optional` **id**: `string`

Stats report ID for this candidate pair.

---

### local

• `Optional` **local**: [`PreCallIceCandidateInfo`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallIceCandidateInfo.md)

Metadata about the local candidate in this pair.

---

### localCandidateId

• `Optional` **localCandidateId**: `string`

Stats report ID of the local candidate in this pair.

---

### nominated

• `Optional` **nominated**: `boolean`

Whether this pair was nominated by the ICE agent.

---

### remote

• `Optional` **remote**: [`PreCallIceCandidateInfo`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallIceCandidateInfo.md)

Metadata about the remote candidate in this pair.

---

### remoteCandidateId

• `Optional` **remoteCandidateId**: `string`

Stats report ID of the remote candidate in this pair.

---

### state

• `Optional` **state**: `string`

Candidate-pair state: frozen, waiting, in-progress, failed, succeeded.

---

### writable

• `Optional` **writable**: `boolean`

Whether this pair is writable.
