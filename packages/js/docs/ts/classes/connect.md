**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / Connect

# Class: Connect

## Hierarchy

* [BaseMessage](basemessage.md)

  ↳ **Connect**

## Index

### Constructors

* [constructor](connect.md#constructor)

### Properties

* [method](connect.md#method)
* [request](connect.md#request)
* [response](connect.md#response)
* [targetNodeId](connect.md#targetnodeid)

### Methods

* [buildRequest](connect.md#buildrequest)

## Constructors

### constructor

\+ **new Connect**(`authentication`: IBladeConnectRequest[\"params\"][\"authentication\"], `sessionid?`: string): [Connect](connect.md)

*Defined in [packages/js/src/Modules/Verto/messages/blade/Connect.ts:14](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/messages/blade/Connect.ts#L14)*

#### Parameters:

Name | Type |
------ | ------ |
`authentication` | IBladeConnectRequest[\"params\"][\"authentication\"] |
`sessionid?` | string |

**Returns:** [Connect](connect.md)

## Properties

### method

•  **method**: string = "blade.connect"

*Overrides void*

*Defined in [packages/js/src/Modules/Verto/messages/blade/Connect.ts:14](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/messages/blade/Connect.ts#L14)*

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
