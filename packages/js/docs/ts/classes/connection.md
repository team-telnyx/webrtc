[@telnyx/webrtc - v2.2.3](../README.md) › [Connection](connection.md)

# Class: Connection

## Hierarchy

* **Connection**

## Index

### Constructors

* [constructor](connection.md#constructor)

### Properties

* [downDur](connection.md#downdur)
* [session](connection.md#session)
* [upDur](connection.md#updur)

### Accessors

* [closed](connection.md#closed)
* [closing](connection.md#closing)
* [connected](connection.md#connected)
* [connecting](connection.md#connecting)
* [isAlive](connection.md#isalive)
* [isDead](connection.md#isdead)

### Methods

* [close](connection.md#close)
* [connect](connection.md#connect)
* [send](connection.md#send)
* [sendRawText](connection.md#sendrawtext)

## Constructors

###  constructor

\+ **new Connection**(`session`: [BaseSession](basesession.md)): *[Connection](connection.md)*

*Defined in [src/Modules/Verto/services/Connection.ts:31](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/services/Connection.ts#L31)*

**Parameters:**

Name | Type |
------ | ------ |
`session` | [BaseSession](basesession.md) |

**Returns:** *[Connection](connection.md)*

## Properties

###  downDur

• **downDur**: *number* =  null

*Defined in [src/Modules/Verto/services/Connection.ts:31](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/services/Connection.ts#L31)*

___

###  session

• **session**: *[BaseSession](basesession.md)*

*Defined in [src/Modules/Verto/services/Connection.ts:33](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/services/Connection.ts#L33)*

___

###  upDur

• **upDur**: *number* =  null

*Defined in [src/Modules/Verto/services/Connection.ts:30](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/services/Connection.ts#L30)*

## Accessors

###  closed

• **get closed**(): *boolean*

*Defined in [src/Modules/Verto/services/Connection.ts:57](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/services/Connection.ts#L57)*

**Returns:** *boolean*

___

###  closing

• **get closing**(): *boolean*

*Defined in [src/Modules/Verto/services/Connection.ts:53](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/services/Connection.ts#L53)*

**Returns:** *boolean*

___

###  connected

• **get connected**(): *boolean*

*Defined in [src/Modules/Verto/services/Connection.ts:45](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/services/Connection.ts#L45)*

**Returns:** *boolean*

___

###  connecting

• **get connecting**(): *boolean*

*Defined in [src/Modules/Verto/services/Connection.ts:49](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/services/Connection.ts#L49)*

**Returns:** *boolean*

___

###  isAlive

• **get isAlive**(): *boolean*

*Defined in [src/Modules/Verto/services/Connection.ts:61](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/services/Connection.ts#L61)*

**Returns:** *boolean*

___

###  isDead

• **get isDead**(): *boolean*

*Defined in [src/Modules/Verto/services/Connection.ts:65](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/services/Connection.ts#L65)*

**Returns:** *boolean*

## Methods

###  close

▸ **close**(): *void*

*Defined in [src/Modules/Verto/services/Connection.ts:114](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/services/Connection.ts#L114)*

**Returns:** *void*

___

###  connect

▸ **connect**(): *void*

*Defined in [src/Modules/Verto/services/Connection.ts:69](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/services/Connection.ts#L69)*

**Returns:** *void*

___

###  send

▸ **send**(`bladeObj`: any): *Promise‹any›*

*Defined in [src/Modules/Verto/services/Connection.ts:96](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/services/Connection.ts#L96)*

**Parameters:**

Name | Type |
------ | ------ |
`bladeObj` | any |

**Returns:** *Promise‹any›*

___

###  sendRawText

▸ **sendRawText**(`request`: string): *void*

*Defined in [src/Modules/Verto/services/Connection.ts:92](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/services/Connection.ts#L92)*

**Parameters:**

Name | Type |
------ | ------ |
`request` | string |

**Returns:** *void*
