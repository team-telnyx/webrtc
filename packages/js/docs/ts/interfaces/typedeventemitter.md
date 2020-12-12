**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / TypedEventEmitter

# Interface: TypedEventEmitter<Events\>

Type-safe event emitter.

Use it like this:

interface MyEvents {
  error: (error: Error) => void
  message: (from: string, content: string) => void
}

const myEmitter = new EventEmitter() as TypedEmitter<MyEvents>

myEmitter.on("message", (from, content) => {
  // ...
})

myEmitter.emit("error", "x")  // <- Will catch this type error

## Type parameters

Name |
------ |
`Events` |

## Hierarchy

* **TypedEventEmitter**

## Index

### Methods

* [addListener](typedeventemitter.md#addlistener)
* [emit](typedeventemitter.md#emit)
* [eventNames](typedeventemitter.md#eventnames)
* [getMaxListeners](typedeventemitter.md#getmaxlisteners)
* [listenerCount](typedeventemitter.md#listenercount)
* [listeners](typedeventemitter.md#listeners)
* [on](typedeventemitter.md#on)
* [once](typedeventemitter.md#once)
* [prependListener](typedeventemitter.md#prependlistener)
* [prependOnceListener](typedeventemitter.md#prependoncelistener)
* [removeAllListeners](typedeventemitter.md#removealllisteners)
* [removeListener](typedeventemitter.md#removelistener)
* [setMaxListeners](typedeventemitter.md#setmaxlisteners)

## Methods

### addListener

▸ **addListener**<E\>(`event`: E, `listener`: Events[E]): this

*Defined in [packages/js/src/TypedEmitter.ts:31](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/TypedEmitter.ts#L31)*

#### Type parameters:

Name | Type |
------ | ------ |
`E` | keyof Events |

#### Parameters:

Name | Type |
------ | ------ |
`event` | E |
`listener` | Events[E] |

**Returns:** this

___

### emit

▸ **emit**<E\>(`event`: E, ...`args`: [Arguments](../README.md#arguments)<Events[E]\>): boolean

*Defined in [packages/js/src/TypedEmitter.ts:43](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/TypedEmitter.ts#L43)*

#### Type parameters:

Name | Type |
------ | ------ |
`E` | keyof Events |

#### Parameters:

Name | Type |
------ | ------ |
`event` | E |
`...args` | [Arguments](../README.md#arguments)<Events[E]\> |

**Returns:** boolean

___

### eventNames

▸ **eventNames**(): keyof Events[]

*Defined in [packages/js/src/TypedEmitter.ts:47](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/TypedEmitter.ts#L47)*

**Returns:** keyof Events[]

___

### getMaxListeners

▸ **getMaxListeners**(): number

*Defined in [packages/js/src/TypedEmitter.ts:51](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/TypedEmitter.ts#L51)*

**Returns:** number

___

### listenerCount

▸ **listenerCount**<E\>(`event`: E): number

*Defined in [packages/js/src/TypedEmitter.ts:49](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/TypedEmitter.ts#L49)*

#### Type parameters:

Name | Type |
------ | ------ |
`E` | keyof Events |

#### Parameters:

Name | Type |
------ | ------ |
`event` | E |

**Returns:** number

___

### listeners

▸ **listeners**<E\>(`event`: E): Function[]

*Defined in [packages/js/src/TypedEmitter.ts:48](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/TypedEmitter.ts#L48)*

#### Type parameters:

Name | Type |
------ | ------ |
`E` | keyof Events |

#### Parameters:

Name | Type |
------ | ------ |
`event` | E |

**Returns:** Function[]

___

### on

▸ **on**<E\>(`event`: E, `listener`: Events[E]): this

*Defined in [packages/js/src/TypedEmitter.ts:32](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/TypedEmitter.ts#L32)*

#### Type parameters:

Name | Type |
------ | ------ |
`E` | keyof Events |

#### Parameters:

Name | Type |
------ | ------ |
`event` | E |
`listener` | Events[E] |

**Returns:** this

___

### once

▸ **once**<E\>(`event`: E, `listener`: Events[E]): this

*Defined in [packages/js/src/TypedEmitter.ts:33](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/TypedEmitter.ts#L33)*

#### Type parameters:

Name | Type |
------ | ------ |
`E` | keyof Events |

#### Parameters:

Name | Type |
------ | ------ |
`event` | E |
`listener` | Events[E] |

**Returns:** this

___

### prependListener

▸ **prependListener**<E\>(`event`: E, `listener`: Events[E]): this

*Defined in [packages/js/src/TypedEmitter.ts:34](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/TypedEmitter.ts#L34)*

#### Type parameters:

Name | Type |
------ | ------ |
`E` | keyof Events |

#### Parameters:

Name | Type |
------ | ------ |
`event` | E |
`listener` | Events[E] |

**Returns:** this

___

### prependOnceListener

▸ **prependOnceListener**<E\>(`event`: E, `listener`: Events[E]): this

*Defined in [packages/js/src/TypedEmitter.ts:35](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/TypedEmitter.ts#L35)*

#### Type parameters:

Name | Type |
------ | ------ |
`E` | keyof Events |

#### Parameters:

Name | Type |
------ | ------ |
`event` | E |
`listener` | Events[E] |

**Returns:** this

___

### removeAllListeners

▸ **removeAllListeners**<E\>(`event?`: E): this

*Defined in [packages/js/src/TypedEmitter.ts:40](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/TypedEmitter.ts#L40)*

#### Type parameters:

Name | Type |
------ | ------ |
`E` | keyof Events |

#### Parameters:

Name | Type |
------ | ------ |
`event?` | E |

**Returns:** this

___

### removeListener

▸ **removeListener**<E\>(`event`: E, `listener`: Events[E]): this

*Defined in [packages/js/src/TypedEmitter.ts:41](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/TypedEmitter.ts#L41)*

#### Type parameters:

Name | Type |
------ | ------ |
`E` | keyof Events |

#### Parameters:

Name | Type |
------ | ------ |
`event` | E |
`listener` | Events[E] |

**Returns:** this

___

### setMaxListeners

▸ **setMaxListeners**(`maxListeners`: number): this

*Defined in [packages/js/src/TypedEmitter.ts:52](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/TypedEmitter.ts#L52)*

#### Parameters:

Name | Type |
------ | ------ |
`maxListeners` | number |

**Returns:** this
