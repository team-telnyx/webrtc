**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / IBladeConnectRequest

# Interface: IBladeConnectRequest

## Hierarchy

* [IMessageBase](imessagebase.md)

  ↳ **IBladeConnectRequest**

## Index

### Properties

* [id](ibladeconnectrequest.md#id)
* [jsonrpc](ibladeconnectrequest.md#jsonrpc)
* [method](ibladeconnectrequest.md#method)
* [params](ibladeconnectrequest.md#params)

## Properties

### id

•  **id**: string

*Inherited from [IMessageBase](imessagebase.md).[id](imessagebase.md#id)*

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:3](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L3)*

___

### jsonrpc

•  **jsonrpc**: string

*Inherited from [IMessageBase](imessagebase.md).[jsonrpc](imessagebase.md#jsonrpc)*

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:2](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L2)*

___

### method

•  **method**: string

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:19](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L19)*

___

### params

•  **params**: { agent?: string ; authentication: { jwt_token?: string ; project: string ; token?: string  } ; sessionid?: string ; version: [TBladeVersion](../README.md#tbladeversion)  }

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:20](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L20)*

#### Type declaration:

Name | Type |
------ | ------ |
`agent?` | string |
`authentication` | { jwt_token?: string ; project: string ; token?: string  } |
`sessionid?` | string |
`version` | [TBladeVersion](../README.md#tbladeversion) |
