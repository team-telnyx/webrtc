[@telnyx/webrtc - v2.5.2](../README.md) › [MessageEvents](messageevents.md)

# Interface: MessageEvents

## Hierarchy

* **MessageEvents**

## Index

### Properties

* [callUpdate](messageevents.md#callupdate)
* [error](messageevents.md#error)
* [ready](messageevents.md#ready)
* [registered](messageevents.md#registered)
* [socket.close](messageevents.md#socket.close)
* [socket.connect](messageevents.md#socket.connect)
* [socket.error](messageevents.md#socket.error)
* [unregistered](messageevents.md#unregistered)

## Properties

###  callUpdate

• **callUpdate**: *function*

*Defined in [src/utils/interfaces.ts:73](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L73)*

#### Type declaration:

▸ (`call`: [ICall](icall.md)): *void*

**Parameters:**

Name | Type |
------ | ------ |
`call` | [ICall](icall.md) |

___

###  error

• **error**: *function*

*Defined in [src/utils/interfaces.ts:72](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L72)*

#### Type declaration:

▸ (): *void*

___

###  ready

• **ready**: *function*

*Defined in [src/utils/interfaces.ts:69](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L69)*

#### Type declaration:

▸ (): *void*

___

###  registered

• **registered**: *function*

*Defined in [src/utils/interfaces.ts:70](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L70)*

#### Type declaration:

▸ (): *void*

___

###  socket.close

• **socket.close**: *function*

*Defined in [src/utils/interfaces.ts:76](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L76)*

#### Type declaration:

▸ (`error?`: Error): *void*

**Parameters:**

Name | Type |
------ | ------ |
`error?` | Error |

___

###  socket.connect

• **socket.connect**: *function*

*Defined in [src/utils/interfaces.ts:75](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L75)*

#### Type declaration:

▸ (): *void*

___

###  socket.error

• **socket.error**: *function*

*Defined in [src/utils/interfaces.ts:74](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L74)*

#### Type declaration:

▸ (`error`: Error): *void*

**Parameters:**

Name | Type |
------ | ------ |
`error` | Error |

___

###  unregistered

• **unregistered**: *function*

*Defined in [src/utils/interfaces.ts:71](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/utils/interfaces.ts#L71)*

#### Type declaration:

▸ (): *void*
