**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / IBladeSubscriptionRequest

# Interface: IBladeSubscriptionRequest

## Hierarchy

* [IMessageBase](imessagebase.md)

  ↳ **IBladeSubscriptionRequest**

## Index

### Properties

* [id](ibladesubscriptionrequest.md#id)
* [jsonrpc](ibladesubscriptionrequest.md#jsonrpc)
* [method](ibladesubscriptionrequest.md#method)
* [params](ibladesubscriptionrequest.md#params)

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

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:58](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L58)*

___

### params

•  **params**: { auto_create?: boolean ; channels: string[] ; command: string ; downstream?: boolean ; protocol: string  }

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:59](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L59)*

#### Type declaration:

Name | Type |
------ | ------ |
`auto_create?` | boolean |
`channels` | string[] |
`command` | string |
`downstream?` | boolean |
`protocol` | string |
