Interface representing the statistics of an RTC ICE candidate.

**`Inline`**

## Table of contents

### Properties

- [address](#address)
- [candidateType](#candidatetype)
- [deleted](#deleted)
- [id](#id)
- [port](#port)
- [priority](#priority)
- [protocol](#protocol)
- [relayProtocol](#relayprotocol)
- [timestamp](#timestamp)
- [transportId](#transportid)
- [type](#type)
- [url](#url)

## Properties

### address

• **address**: `string`

The address of the ICE candidate.

---

### candidateType

• **candidateType**: `RTCIceCandidateType`

The type of the ICE candidate.

---

### deleted

• **deleted**: `boolean`

Indicates whether the ICE candidate has been deleted.

---

### id

• **id**: `string`

The unique identifier for the ICE candidate.

---

### port

• **port**: `number`

The port number of the ICE candidate.

---

### priority

• **priority**: `number`

The priority of the ICE candidate.

---

### protocol

• **protocol**: `RTCIceProtocol`

The protocol used by the ICE candidate.

---

### relayProtocol

• `Optional` **relayProtocol**: `"tcp"` \| `"udp"` \| `"tls"`

The relay protocol used by the ICE candidate, if applicable.

---

### timestamp

• **timestamp**: `number`

The timestamp when the ICE candidate was generated.

---

### transportId

• **transportId**: `string`

The transport identifier for the ICE candidate.

---

### type

• **type**: `string`

The type of the ICE candidate, either local or remote.

---

### url

• **url**: `string`

The URL of the ICE candidate.
