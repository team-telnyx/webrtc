[@telnyx/webrtc - v2.2.3](../README.md) › [BaseSession](basesession.md)

# Class: BaseSession

## Hierarchy

* **BaseSession**

  ↳ [BrowserSession](browsersession.md)

## Index

### Constructors

* [constructor](basesession.md#constructor)

### Properties

* [contexts](basesession.md#contexts)
* [master_nodeid](basesession.md#master_nodeid)
* [nodeid](basesession.md#nodeid)
* [options](basesession.md#options)
* [relayProtocol](basesession.md#relayprotocol)
* [sessionid](basesession.md#sessionid)
* [signature](basesession.md#signature)
* [subscriptions](basesession.md#subscriptions)
* [timeoutErrorCode](basesession.md#timeouterrorcode)
* [uuid](basesession.md#uuid)

### Accessors

* [__logger](basesession.md#__logger)
* [connected](basesession.md#connected)
* [reconnectDelay](basesession.md#reconnectdelay)

### Methods

* [_existsSubscription](basesession.md#_existssubscription)
* [broadcast](basesession.md#broadcast)
* [connect](basesession.md#connect)
* [disconnect](basesession.md#disconnect)
* [execute](basesession.md#execute)
* [executeRaw](basesession.md#executeraw)
* [off](basesession.md#off)
* [on](basesession.md#on)
* [subscribe](basesession.md#subscribe)
* [unsubscribe](basesession.md#unsubscribe)
* [validateOptions](basesession.md#validateoptions)
* [off](basesession.md#static-off)
* [on](basesession.md#static-on)
* [uuid](basesession.md#static-uuid)

## Constructors

###  constructor

\+ **new BaseSession**(`options`: [ITelnyxRTCOptions](../interfaces/itelnyxrtcoptions.md)): *[BaseSession](basesession.md)*

*Defined in [src/Modules/Verto/BaseSession.ts:44](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L44)*

**Parameters:**

Name | Type |
------ | ------ |
`options` | [ITelnyxRTCOptions](../interfaces/itelnyxrtcoptions.md) |

**Returns:** *[BaseSession](basesession.md)*

## Properties

###  contexts

• **contexts**: *string[]* =  []

*Defined in [src/Modules/Verto/BaseSession.ts:32](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L32)*

___

###  master_nodeid

• **master_nodeid**: *string*

*Defined in [src/Modules/Verto/BaseSession.ts:29](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L29)*

___

###  nodeid

• **nodeid**: *string*

*Defined in [src/Modules/Verto/BaseSession.ts:28](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L28)*

___

###  options

• **options**: *[ITelnyxRTCOptions](../interfaces/itelnyxrtcoptions.md)*

*Defined in [src/Modules/Verto/BaseSession.ts:46](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L46)*

___

###  relayProtocol

• **relayProtocol**: *string* =  null

*Defined in [src/Modules/Verto/BaseSession.ts:31](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L31)*

___

###  sessionid

• **sessionid**: *string* = ""

*Defined in [src/Modules/Verto/BaseSession.ts:26](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L26)*

___

###  signature

• **signature**: *string* =  null

*Defined in [src/Modules/Verto/BaseSession.ts:30](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L30)*

___

###  subscriptions

• **subscriptions**: *object*

*Defined in [src/Modules/Verto/BaseSession.ts:27](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L27)*

#### Type declaration:

* \[ **channel**: *string*\]: any

___

###  timeoutErrorCode

• **timeoutErrorCode**: *number* =  -32000

*Defined in [src/Modules/Verto/BaseSession.ts:33](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L33)*

___

###  uuid

• **uuid**: *string* =  uuidv4()

*Defined in [src/Modules/Verto/BaseSession.ts:25](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L25)*

## Accessors

###  __logger

• **get __logger**(): *Logger*

*Defined in [src/Modules/Verto/BaseSession.ts:59](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L59)*

**Returns:** *Logger*

___

###  connected

• **get connected**(): *boolean | null*

*Defined in [src/Modules/Verto/BaseSession.ts:76](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L76)*

`true` if the client is connected to the Telnyx RTC server

**`example`** 

```js
const client = new TelnyxRTC(options);
console.log(client.connected); // => false
```

**`readonly`** 

**`type`** {boolean | null}

**Returns:** *boolean | null*

___

###  reconnectDelay

• **get reconnectDelay**(): *number*

*Defined in [src/Modules/Verto/BaseSession.ts:80](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L80)*

**Returns:** *number*

## Methods

###  _existsSubscription

▸ **_existsSubscription**(`protocol`: string, `channel?`: string): *boolean*

*Defined in [src/Modules/Verto/BaseSession.ts:363](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L363)*

Check if a subscription for this protocol-channel already exists

**Parameters:**

Name | Type |
------ | ------ |
`protocol` | string |
`channel?` | string |

**Returns:** *boolean*

boolean

___

###  broadcast

▸ **broadcast**(`params`: [BroadcastParams](../interfaces/broadcastparams.md)): *void*

*Defined in [src/Modules/Verto/BaseSession.ts:135](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L135)*

Broadcast a message in a protocol - channel

**`todo`** Implement it

**Parameters:**

Name | Type |
------ | ------ |
`params` | [BroadcastParams](../interfaces/broadcastparams.md) |

**Returns:** *void*

void

___

###  connect

▸ **connect**(): *Promise‹void›*

*Defined in [src/Modules/Verto/BaseSession.ts:267](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L267)*

Define the method to connect the session

**`abstract`** 

**`async`** 

**Returns:** *Promise‹void›*

void

___

###  disconnect

▸ **disconnect**(): *Promise‹void›*

*Defined in [src/Modules/Verto/BaseSession.ts:179](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L179)*

Remove subscriptions and calls, close WS connection and remove all session listeners.

**Returns:** *Promise‹void›*

void

___

###  execute

▸ **execute**(`msg`: BaseMessage): *any*

*Defined in [src/Modules/Verto/BaseSession.ts:88](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L88)*

Send a JSON object to the server.

**Parameters:**

Name | Type |
------ | ------ |
`msg` | BaseMessage |

**Returns:** *any*

Promise that will resolve/reject depending on the server response

___

###  executeRaw

▸ **executeRaw**(`text`: string): *void*

*Defined in [src/Modules/Verto/BaseSession.ts:112](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L112)*

Send raw text to the server.

**Parameters:**

Name | Type |
------ | ------ |
`text` | string |

**Returns:** *void*

void

___

###  off

▸ **off**(`eventName`: string, `callback?`: Function): *this*

*Defined in [src/Modules/Verto/BaseSession.ts:256](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L256)*

Removes an event handler that were attached with .on().
If no handler parameter is passed, all listeners for that event will be removed.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`eventName` | string | Event name. |
`callback?` | Function | Function handler to be removed.  |

**Returns:** *this*

The client object itself.

Note: a handler will be removed from the stack by reference
so make sure to use the same reference in both `.on()` and `.off()` methods.

## Examples

Subscribe to the `telnyx.error` and then, remove the event handler.

```js
const errorHandler = (error) => {
 // Log the error..
}

const client = new TelnyxRTC(options);

client.on('telnyx.error', errorHandler)

 // .. later
client.off('telnyx.error', errorHandler)
```

___

###  on

▸ **on**(`eventName`: string, `callback`: Function): *this*

*Defined in [src/Modules/Verto/BaseSession.ts:222](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L222)*

Attaches an event handler for a specific type of event.

## Events
|   |   |
|---|---|
| `telnyx.ready` | The client is authenticated and available to use |
| `telnyx.error` | An error occurred at the session level |
| `telnyx.notification` | An update to the call or session |
| `telnyx.socket.open` | The WebSocket connection has been made |
| `telnyx.socket.close` | The WebSocket connection is set to close |
| `telnyx.socket.error` | An error occurred at the WebSocket level |
| `telnyx.socket.message` | The client has received a message through WebSockets |

**`examples`** 

Subscribe to the `telnyx.ready` and `telnyx.error` events.

```js
const client = new TelnyxRTC(options);

client.on('telnyx.ready', (client) => {
  // Your client is ready!
}).on('telnyx.error', (error) => {
  // Got an error...
})
```

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`eventName` | string | Event name. |
`callback` | Function | Function to call when the event comes. |

**Returns:** *this*

The client object itself.

___

###  subscribe

▸ **subscribe**(`__namedParameters`: object): *Promise‹any›*

*Defined in [src/Modules/Verto/BaseSession.ts:142](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L142)*

Subscribe to Blade protocol channels

**`async`** 

**Parameters:**

Name | Type |
------ | ------ |
`__namedParameters` | object |

**Returns:** *Promise‹any›*

Result of the ADD subscription

___

###  unsubscribe

▸ **unsubscribe**(`__namedParameters`: object): *Promise‹any›*

*Defined in [src/Modules/Verto/BaseSession.ts:166](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L166)*

Unsubscribe from Blade protocol channels

**`async`** 

**Parameters:**

Name | Type |
------ | ------ |
`__namedParameters` | object |

**Returns:** *Promise‹any›*

Result of the REMOVE subscription

___

###  validateOptions

▸ **validateOptions**(): *boolean*

*Defined in [src/Modules/Verto/BaseSession.ts:126](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L126)*

Validates the options passed in.
TelnyxRTC requires (login and password) OR login_token
Verto requires host, login, passwd OR password

**Returns:** *boolean*

boolean

___

### `Static` off

▸ **off**(`eventName`: string): *void*

*Defined in [src/Modules/Verto/BaseSession.ts:445](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L445)*

**Parameters:**

Name | Type |
------ | ------ |
`eventName` | string |

**Returns:** *void*

___

### `Static` on

▸ **on**(`eventName`: string, `callback`: any): *void*

*Defined in [src/Modules/Verto/BaseSession.ts:441](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L441)*

**Parameters:**

Name | Type |
------ | ------ |
`eventName` | string |
`callback` | any |

**Returns:** *void*

___

### `Static` uuid

▸ **uuid**(): *string*

*Defined in [src/Modules/Verto/BaseSession.ts:449](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/BaseSession.ts#L449)*

**Returns:** *string*
