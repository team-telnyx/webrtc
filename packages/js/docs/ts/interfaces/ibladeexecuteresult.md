**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / IBladeExecuteResult

# Interface: IBladeExecuteResult

## Hierarchy

* [IMessageBase](imessagebase.md)

  ↳ **IBladeExecuteResult**

## Index

### Properties

* [id](ibladeexecuteresult.md#id)
* [jsonrpc](ibladeexecuteresult.md#jsonrpc)
* [result](ibladeexecuteresult.md#result)

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

### result

•  **result**: { protocol: string ; requester_nodeid: string ; responder_nodeid: string ; result: any  }

*Defined in [packages/js/src/Modules/Verto/util/interfaces.ts:49](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/util/interfaces.ts#L49)*

#### Type declaration:

Name | Type |
------ | ------ |
`protocol` | string |
`requester_nodeid` | string |
`responder_nodeid` | string |
`result` | any |
