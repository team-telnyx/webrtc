[@telnyx/webrtc - v2.2.2](../README.md) › [Peer](peer.md)

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

*Defined in [src/Modules/Verto/webrtc/Peer.ts:28](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/Peer.ts#L28)*

**Parameters:**

Name | Type |
------ | ------ |
`type` | [PeerType](../enums/peertype.md) |
`options` | [CallOptions](../interfaces/calloptions.md) |

**Returns:** *[Peer](peer.md)*

## Properties

###  instance

• **instance**: *RTCPeerConnection*

*Defined in [src/Modules/Verto/webrtc/Peer.ts:22](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/Peer.ts#L22)*

___

###  onSdpReadyTwice

• **onSdpReadyTwice**: *Function* =  null

*Defined in [src/Modules/Verto/webrtc/Peer.ts:23](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/Peer.ts#L23)*

___

###  type

• **type**: *[PeerType](../enums/peertype.md)*

*Defined in [src/Modules/Verto/webrtc/Peer.ts:30](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/Peer.ts#L30)*

## Methods

###  startNegotiation

▸ **startNegotiation**(): *void*

*Defined in [src/Modules/Verto/webrtc/Peer.ts:41](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/Peer.ts#L41)*

**Returns:** *void*
