**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / Execute

# Class: Execute

## Hierarchy

* [BaseMessage](basemessage.md)

  ↳ **Execute**

## Index

### Constructors

* [constructor](execute.md#constructor)

### Properties

* [method](execute.md#method)
* [request](execute.md#request)
* [response](execute.md#response)
* [targetNodeId](execute.md#targetnodeid)

### Methods

* [buildRequest](execute.md#buildrequest)

## Constructors

### constructor

\+ **new Execute**(`params`: any, `id?`: string): [Execute](execute.md)

*Defined in [packages/js/src/Modules/Verto/messages/blade/Execute.ts:8](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/messages/blade/Execute.ts#L8)*

#### Parameters:

Name | Type | Default value |
------ | ------ | ------ |
`params` | any | - |
`id` | string | "" |

**Returns:** [Execute](execute.md)

## Properties

### method

•  **method**: string = "blade.execute"

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/messages/blade/Execute.ts:8](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/messages/blade/Execute.ts#L8)*

___

### request

•  **request**: any

*Inherited from [BaseMessage](basemessage.md).[request](basemessage.md#request)*

*Defined in [packages/js/src/Modules/Verto/messages/BaseMessage.ts:5](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/messages/BaseMessage.ts#L5)*

___

### response

•  **response**: any

*Inherited from [BaseMessage](basemessage.md).[response](basemessage.md#response)*

*Defined in [packages/js/src/Modules/Verto/messages/BaseMessage.ts:6](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/messages/BaseMessage.ts#L6)*

___

### targetNodeId

•  **targetNodeId**: string

*Inherited from [BaseMessage](basemessage.md).[targetNodeId](basemessage.md#targetnodeid)*

*Defined in [packages/js/src/Modules/Verto/messages/BaseMessage.ts:7](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/messages/BaseMessage.ts#L7)*

## Methods

### buildRequest

▸ **buildRequest**(`params`: any): void

*Inherited from [BaseMessage](basemessage.md).[buildRequest](basemessage.md#buildrequest)*

*Defined in [packages/js/src/Modules/Verto/messages/BaseMessage.ts:9](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/messages/BaseMessage.ts#L9)*

#### Parameters:

Name | Type |
------ | ------ |
`params` | any |

**Returns:** void
