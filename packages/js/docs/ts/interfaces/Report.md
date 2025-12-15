Interface representing the pre-call diagnosis report.

**`Inline`**

## Table of contents

### Properties

- [iceCandidatePairStats](/development/webrtc/js-sdk/interfaces/Report.md#icecandidatepairstats)
- [iceCandidateStats](/development/webrtc/js-sdk/interfaces/Report.md#icecandidatestats)
- [sessionStats](/development/webrtc/js-sdk/interfaces/Report.md#sessionstats)
- [summaryStats](/development/webrtc/js-sdk/interfaces/Report.md#summarystats)

## Properties

### iceCandidatePairStats

• **iceCandidatePairStats**: `RTCIceCandidatePairStats`

The statistics of the selected ICE candidate pair.

___

### iceCandidateStats

• **iceCandidateStats**: [`RTCIceCandidateStats`](/development/webrtc/js-sdk/interfaces/RTCIceCandidateStats.md)[]

The statistics of the ICE candidates.
[RTCIceCandidateStats](/development/webrtc/js-sdk/interfaces/RTCIceCandidateStats.md)

___

### sessionStats

• **sessionStats**: `Object`

The session statistics of the pre-call diagnosis.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `bytesReceived` | `number` | The number of bytes received. |
| `bytesSent` | `number` | The number of bytes sent. |
| `packetsLost` | `number` | The number of packets lost. |
| `packetsReceived` | `number` | The number of packets received. |
| `packetsSent` | `number` | The number of packets sent. |

___

### summaryStats

• **summaryStats**: `Object`

The summary statistics of the pre-call diagnosis.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `jitter` | [`MinMaxAverage`](/development/webrtc/js-sdk/interfaces/MinMaxAverage.md) | The jitter in milliseconds. |
| `mos` | `number` | The mean opinion score (MOS) of the call quality. |
| `quality` | `Quality` | The quality of the call. |
| `rtt` | [`MinMaxAverage`](/development/webrtc/js-sdk/interfaces/MinMaxAverage.md) | The round-trip time (RTT) in milliseconds. |
