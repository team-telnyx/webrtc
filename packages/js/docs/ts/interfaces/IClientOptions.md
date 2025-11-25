IClientOptions
 IClientOptions

## Table of contents

### Properties

- [anonymous\_login](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#anonymous_login)
- [debug](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#debug)
- [debugOutput](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#debugoutput)
- [forceRelayCandidate](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#forcerelaycandidate)
- [keepConnectionAliveOnSocketClose](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#keepconnectionaliveonsocketclose)
- [login](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#login)
- [login\_token](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#login_token)
- [password](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#password)
- [prefetchIceCandidates](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#prefetchicecandidates)
- [region](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#region)
- [ringbackFile](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#ringbackfile)
- [ringtoneFile](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#ringtonefile)
- [rtcIp](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#rtcip)
- [rtcPort](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#rtcport)
- [trickleIce](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#trickleice)
- [useCanaryRtcServer](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#usecanaryrtcserver)

## Properties

### anonymous\_login

• `Optional` **anonymous\_login**: `Object`

anonymous_login login options

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `target_id` | `string` | The target ID to use for the anonymous login. this is typically the ID of the AI assistant you want to connect to. |
| `target_type` | `string` | A string indicating the target type, for now only `ai_assistant` is supported. |
| `target_version_id?` | `string` | The target version ID to use for the anonymous login. This is optional and can be used to specify a particular version of the AI assistant. |

___

### debug

• `Optional` **debug**: `boolean`

Enable debug mode for this client.
This will gather WebRTC debugging information.

___

### debugOutput

• `Optional` **debugOutput**: ``"file"`` \| ``"socket"``

Debug output option

___

### forceRelayCandidate

• `Optional` **forceRelayCandidate**: `boolean`

Force the use of a relay ICE candidate.

___

### keepConnectionAliveOnSocketClose

• `Optional` **keepConnectionAliveOnSocketClose**: `boolean`

Keep the connection alive on socket connection close, i.e., do not hang up the call when `attach` message is received.

___

### login

• `Optional` **login**: `string`

The `username` to authenticate with your SIP Connection.
`login` and `password` will take precedence over
`login_token` for authentication.

___

### login\_token

• `Optional` **login\_token**: `string`

The JSON Web Token (JWT) to authenticate with your SIP Connection.
This is the recommended authentication strategy. [See how to create one](https://developers.telnyx.com/docs/v2/webrtc/quickstart).

___

### password

• `Optional` **password**: `string`

The `password` to authenticate with your SIP Connection.

___

### prefetchIceCandidates

• `Optional` **prefetchIceCandidates**: `boolean`

Enable or disable prefetching ICE candidates.

___

### region

• `Optional` **region**: `string`

Region to use for the connection.

___

### ringbackFile

• `Optional` **ringbackFile**: `string`

A URL to a wav/mp3 ringback file that will be used when you disable
"Generate Ringback Tone" in your SIP Connection.

___

### ringtoneFile

• `Optional` **ringtoneFile**: `string`

A URL to a wav/mp3 ringtone file.

___

### rtcIp

• `Optional` **rtcIp**: `string`

RTC connection IP address to use instead of the default one.
Useful when using a custom signaling server.

___

### rtcPort

• `Optional` **rtcPort**: `number`

RTC connection port to use instead of the default one.
Useful when using a custom signaling server.

___

### trickleIce

• `Optional` **trickleIce**: `boolean`

Enable or disable Trickle ICE.

___

### useCanaryRtcServer

• `Optional` **useCanaryRtcServer**: `boolean`

Use Telnyx's Canary RTC server
