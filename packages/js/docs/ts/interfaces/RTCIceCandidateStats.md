Interface representing the statistics of an RTC ICE candidate.

**`Inline`**

## Table of contents

### Properties

- [address](/development/webrtc/js-sdk/interfaces/rtcicecandidatestats#address)
- [candidateType](/development/webrtc/js-sdk/interfaces/rtcicecandidatestats#candidatetype)
- [deleted](/development/webrtc/js-sdk/interfaces/rtcicecandidatestats#deleted)
- [id](/development/webrtc/js-sdk/interfaces/rtcicecandidatestats#id)
- [port](/development/webrtc/js-sdk/interfaces/rtcicecandidatestats#port)
- [priority](/development/webrtc/js-sdk/interfaces/rtcicecandidatestats#priority)
- [protocol](/development/webrtc/js-sdk/interfaces/rtcicecandidatestats#protocol)
- [relayProtocol](/development/webrtc/js-sdk/interfaces/rtcicecandidatestats#relayprotocol)
- [timestamp](/development/webrtc/js-sdk/interfaces/rtcicecandidatestats#timestamp)
- [transportId](/development/webrtc/js-sdk/interfaces/rtcicecandidatestats#transportid)
- [type](/development/webrtc/js-sdk/interfaces/rtcicecandidatestats#type)
- [url](/development/webrtc/js-sdk/interfaces/rtcicecandidatestats#url)

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
