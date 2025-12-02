IClientOptions
IClientOptions

## Table of contents

### Properties

- [anonymous_login](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#anonymous_login)
- [debug](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#debug)
- [debugOutput](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#debugoutput)
- [env](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#env)
- [forceRelayCandidate](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#forcerelaycandidate)
- [iceServers](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#iceservers)
- [keepConnectionAliveOnSocketClose](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#keepconnectionaliveonsocketclose)
- [login](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#login)
- [login_token](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#login_token)
- [mutedMicOnStart](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#mutedmiconstart)
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

### anonymous_login

• `Optional` **anonymous_login**: `Object`

anonymous_login login options

#### Type declaration

| Name                 | Type     | Description                                                                                                                                 |
| :------------------- | :------- | :------------------------------------------------------------------------------------------------------------------------------------------ |
| `target_id`          | `string` | The target ID to use for the anonymous login. this is typically the ID of the AI assistant you want to connect to.                          |
| `target_type`        | `string` | A string indicating the target type, for now only `ai_assistant` is supported.                                                              |
| `target_version_id?` | `string` | The target version ID to use for the anonymous login. This is optional and can be used to specify a particular version of the AI assistant. |

---

### debug

• `Optional` **debug**: `boolean`

Enable debug mode for this client.
This will gather WebRTC debugging information.

---

### debugOutput

• `Optional` **debugOutput**: `"file"` \| `"socket"`

Debug output option

---

### env

• `Optional` **env**: `Environment`

Environment to use for the connection.
So far this property is only for internal purposes.

---

### forceRelayCandidate

• `Optional` **forceRelayCandidate**: `boolean`

Force the use of a relay ICE candidate.

---

### iceServers

• `Optional` **iceServers**: `RTCIceServer`[]

ICE Servers to use for all calls within the client connection. Overrides the default ones.

---

### keepConnectionAliveOnSocketClose

• `Optional` **keepConnectionAliveOnSocketClose**: `boolean`

Keep the connection alive on socket connection close, i.e., do not hang up the call when `attach` message is received.

---

### login

• `Optional` **login**: `string`

The `username` to authenticate with your SIP Connection.
`login` and `password` will take precedence over
`login_token` for authentication.

---

### login_token

• `Optional` **login_token**: `string`

The JSON Web Token (JWT) to authenticate with your SIP Connection.
This is the recommended authentication strategy. [See how to create one](https://developers.telnyx.com/docs/v2/webrtc/quickstart).

---

### mutedMicOnStart

• `Optional` **mutedMicOnStart**: `boolean`

Disabled microphone by default when the call starts or adding a new audio source.

---

### password

• `Optional` **password**: `string`

The `password` to authenticate with your SIP Connection.

---

### prefetchIceCandidates

• `Optional` **prefetchIceCandidates**: `boolean`

Enable or disable prefetching ICE candidates.

---

### region

• `Optional` **region**: `string`

Region to use for the connection.

---

### ringbackFile

• `Optional` **ringbackFile**: `string`

A URL to a wav/mp3 ringback file that will be used when you disable
"Generate Ringback Tone" in your SIP Connection.

---

### ringtoneFile

• `Optional` **ringtoneFile**: `string`

A URL to a wav/mp3 ringtone file.

---

### rtcIp

• `Optional` **rtcIp**: `string`

RTC connection IP address to use instead of the default one.
Useful when using a custom signaling server.

---

### rtcPort

• `Optional` **rtcPort**: `number`

RTC connection port to use instead of the default one.
Useful when using a custom signaling server.

---

### trickleIce

• `Optional` **trickleIce**: `boolean`

Enable or disable Trickle ICE.

---

### useCanaryRtcServer

• `Optional` **useCanaryRtcServer**: `boolean`

Use Telnyx's Canary RTC server
