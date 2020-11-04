[@telnyx/webrtc - v2.2.1](../README.md) › [Peer](peer.md)

# Class: Peer

## Hierarchy

* **Peer**

## Index

### Constructors

* [constructor](peer.md#constructor)

### Properties

* [instance](peer.md#instance)
* [onSdpReadyTwice](peer.md#onsdpreadytwice)
* [type](peer.md#type)

### Methods

* [startNegotiation](peer.md#startnegotiation)

## Constructors

###  constructor

\+ **new Peer**(`type`: [PeerType](../enums/peertype.md), `options`: [CallOptions](../interfaces/calloptions.md)): *[Peer](peer.md)*

*Defined in [src/Modules/Verto/webrtc/Peer.ts:14](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/webrtc/Peer.ts#L14)*

**Parameters:**

Name | Type |
------ | ------ |
`type` | [PeerType](../enums/peertype.md) |
`options` | [CallOptions](../interfaces/calloptions.md) |

**Returns:** *[Peer](peer.md)*

## Properties

###  instance

• **instance**: *RTCPeerConnection*

*Defined in [src/Modules/Verto/webrtc/Peer.ts:11](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/webrtc/Peer.ts#L11)*

___

###  onSdpReadyTwice

• **onSdpReadyTwice**: *Function* =  null

*Defined in [src/Modules/Verto/webrtc/Peer.ts:12](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/webrtc/Peer.ts#L12)*

___

###  type

• **type**: *[PeerType](../enums/peertype.md)*

*Defined in [src/Modules/Verto/webrtc/Peer.ts:16](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/webrtc/Peer.ts#L16)*

## Methods

###  startNegotiation

▸ **startNegotiation**(): *void*

*Defined in [src/Modules/Verto/webrtc/Peer.ts:24](https://github.com/team-telnyx/webrtc/blob/8cdca06/packages/js/src/Modules/Verto/webrtc/Peer.ts#L24)*

**Returns:** *void*
