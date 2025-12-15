Interface representing the statistics of an RTC ICE candidate.

**`Inline`**

## Table of contents

### Properties

- [address](/development/webrtc/js-sdk/interfaces/RTCIceCandidateStats.md#address)
- [candidateType](/development/webrtc/js-sdk/interfaces/RTCIceCandidateStats.md#candidatetype)
- [deleted](/development/webrtc/js-sdk/interfaces/RTCIceCandidateStats.md#deleted)
- [id](/development/webrtc/js-sdk/interfaces/RTCIceCandidateStats.md#id)
- [port](/development/webrtc/js-sdk/interfaces/RTCIceCandidateStats.md#port)
- [priority](/development/webrtc/js-sdk/interfaces/RTCIceCandidateStats.md#priority)
- [protocol](/development/webrtc/js-sdk/interfaces/RTCIceCandidateStats.md#protocol)
- [relayProtocol](/development/webrtc/js-sdk/interfaces/RTCIceCandidateStats.md#relayprotocol)
- [timestamp](/development/webrtc/js-sdk/interfaces/RTCIceCandidateStats.md#timestamp)
- [transportId](/development/webrtc/js-sdk/interfaces/RTCIceCandidateStats.md#transportid)
- [type](/development/webrtc/js-sdk/interfaces/RTCIceCandidateStats.md#type)
- [url](/development/webrtc/js-sdk/interfaces/RTCIceCandidateStats.md#url)

## Properties

### address

• **address**: `string`

The address of the ICE candidate.

___

### candidateType

• **candidateType**: `RTCIceCandidateType`

The type of the ICE candidate.

___

### deleted

• **deleted**: `boolean`

Indicates whether the ICE candidate has been deleted.

___

### id

• **id**: `string`

The unique identifier for the ICE candidate.

___

### port

• **port**: `number`

The port number of the ICE candidate.

___

### priority

• **priority**: `number`

The priority of the ICE candidate.

___

### protocol

• **protocol**: `RTCIceProtocol`

The protocol used by the ICE candidate.

___

### relayProtocol

• `Optional` **relayProtocol**: ``"tcp"`` \| ``"udp"`` \| ``"tls"``

The relay protocol used by the ICE candidate, if applicable.

___

### timestamp

• **timestamp**: `number`

The timestamp when the ICE candidate was generated.

___

### transportId

• **transportId**: `string`

The transport identifier for the ICE candidate.

___

### type

• **type**: `string`

The type of the ICE candidate, either local or remote.

___

### url

• **url**: `string`

The URL of the ICE candidate.
