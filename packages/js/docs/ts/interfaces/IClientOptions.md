IClientOptions
IClientOptions

## Table of contents

### Properties

- [anonymous_login](/development/webrtc/js-sdk/interfaces/iclientoptions#anonymous_login)
- [debug](/development/webrtc/js-sdk/interfaces/iclientoptions#debug)
- [debugOutput](/development/webrtc/js-sdk/interfaces/iclientoptions#debugoutput)
- [env](/development/webrtc/js-sdk/interfaces/iclientoptions#env)
- [forceRelayCandidate](/development/webrtc/js-sdk/interfaces/iclientoptions#forcerelaycandidate)
- [iceServers](/development/webrtc/js-sdk/interfaces/iclientoptions#iceservers)
- [keepConnectionAliveOnSocketClose](/development/webrtc/js-sdk/interfaces/iclientoptions#keepconnectionaliveonsocketclose)
- [login](/development/webrtc/js-sdk/interfaces/iclientoptions#login)
- [login_token](/development/webrtc/js-sdk/interfaces/iclientoptions#login_token)
- [mutedMicOnStart](/development/webrtc/js-sdk/interfaces/iclientoptions#mutedmiconstart)
- [password](/development/webrtc/js-sdk/interfaces/iclientoptions#password)
- [prefetchIceCandidates](/development/webrtc/js-sdk/interfaces/iclientoptions#prefetchicecandidates)
- [region](/development/webrtc/js-sdk/interfaces/iclientoptions#region)
- [ringbackFile](/development/webrtc/js-sdk/interfaces/iclientoptions#ringbackfile)
- [ringtoneFile](/development/webrtc/js-sdk/interfaces/iclientoptions#ringtonefile)
- [rtcIp](/development/webrtc/js-sdk/interfaces/iclientoptions#rtcip)
- [rtcPort](/development/webrtc/js-sdk/interfaces/iclientoptions#rtcport)
- [trickleIce](/development/webrtc/js-sdk/interfaces/iclientoptions#trickleice)
- [useCanaryRtcServer](/development/webrtc/js-sdk/interfaces/iclientoptions#usecanaryrtcserver)

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
