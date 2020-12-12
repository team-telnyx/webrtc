**[@telnyx/webrtc](../README.md)**

> [Globals](../README.md) / CantinaAuth

# Class: CantinaAuth

## Hierarchy

* **CantinaAuth**

## Index

### Constructors

* [constructor](cantinaauth.md#constructor)

### Properties

* [baseUrl](cantinaauth.md#baseurl)
* [hostname](cantinaauth.md#hostname)

### Methods

* [checkInviteToken](cantinaauth.md#checkinvitetoken)
* [guestLogin](cantinaauth.md#guestlogin)
* [refresh](cantinaauth.md#refresh)
* [userLogin](cantinaauth.md#userlogin)

## Constructors

### constructor

\+ **new CantinaAuth**(`params?`: [ICantinaAuthParams](../interfaces/icantinaauthparams.md)): [CantinaAuth](cantinaauth.md)

*Defined in [packages/js/src/Modules/Verto/webrtc/CantinaAuth.ts:21](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/CantinaAuth.ts#L21)*

#### Parameters:

Name | Type | Default value |
------ | ------ | ------ |
`params` | [ICantinaAuthParams](../interfaces/icantinaauthparams.md) | {} |

**Returns:** [CantinaAuth](cantinaauth.md)

## Properties

### baseUrl

•  **baseUrl**: string = "https://telnyx.com"

*Defined in [packages/js/src/Modules/Verto/webrtc/CantinaAuth.ts:20](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/CantinaAuth.ts#L20)*

___

### hostname

•  **hostname**: string

*Defined in [packages/js/src/Modules/Verto/webrtc/CantinaAuth.ts:21](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/CantinaAuth.ts#L21)*

## Methods

### checkInviteToken

▸ **checkInviteToken**(`token`: string): Promise<[CheckInviteTokenResponse](../README.md#checkinvitetokenresponse)\>

*Defined in [packages/js/src/Modules/Verto/webrtc/CantinaAuth.ts:75](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/CantinaAuth.ts#L75)*

#### Parameters:

Name | Type |
------ | ------ |
`token` | string |

**Returns:** Promise<[CheckInviteTokenResponse](../README.md#checkinvitetokenresponse)\>

___

### guestLogin

▸ **guestLogin**(`name`: string, `email`: string, `token`: string): Promise<[ICantinaUser](../interfaces/icantinauser.md)\>

*Defined in [packages/js/src/Modules/Verto/webrtc/CantinaAuth.ts:52](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/CantinaAuth.ts#L52)*

#### Parameters:

Name | Type |
------ | ------ |
`name` | string |
`email` | string |
`token` | string |

**Returns:** Promise<[ICantinaUser](../interfaces/icantinauser.md)\>

___

### refresh

▸ **refresh**(): Promise<[RefreshResponse](../README.md#refreshresponse)\>

*Defined in [packages/js/src/Modules/Verto/webrtc/CantinaAuth.ts:65](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/CantinaAuth.ts#L65)*

**Returns:** Promise<[RefreshResponse](../README.md#refreshresponse)\>

___

### userLogin

▸ **userLogin**(`username`: string, `password`: string): Promise<[ICantinaUser](../interfaces/icantinauser.md)\>

*Defined in [packages/js/src/Modules/Verto/webrtc/CantinaAuth.ts:43](https://github.com/team-telnyx/webrtc/blob/main/packages/js/src/Modules/Verto/webrtc/CantinaAuth.ts#L43)*

#### Parameters:

Name | Type |
------ | ------ |
`username` | string |
`password` | string |

**Returns:** Promise<[ICantinaUser](../interfaces/icantinauser.md)\>
