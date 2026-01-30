IClientOptions
IClientOptions

## Table of contents

### Properties

- [anonymous_login](#anonymous_login)
- [callReportInterval](#callreportinterval)
- [debug](#debug)
- [debugOutput](#debugoutput)
- [enableCallReports](#enablecallreports)
- [env](#env)
- [forceRelayCandidate](#forcerelaycandidate)
- [iceServers](#iceservers)
- [keepConnectionAliveOnSocketClose](#keepconnectionaliveonsocketclose)
- [login](#login)
- [login_token](#login_token)
- [mutedMicOnStart](#mutedmiconstart)
- [password](#password)
- [prefetchIceCandidates](#prefetchicecandidates)
- [region](#region)
- [ringbackFile](#ringbackfile)
- [ringtoneFile](#ringtonefile)
- [rtcIp](#rtcip)
- [rtcPort](#rtcport)
- [trickleIce](#trickleice)
- [useCanaryRtcServer](#usecanaryrtcserver)

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

### callReportInterval

• `Optional` **callReportInterval**: `number`

Interval in milliseconds for collecting call statistics.
Stats are aggregated over each interval and stored locally until call end.

**`Default`**

```ts
5000 (5 seconds)
```

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

### enableCallReports

• `Optional` **enableCallReports**: `boolean`

Enable automatic call quality reporting to voice-sdk-proxy.
When enabled, WebRTC stats are collected periodically during calls
and posted to the voice-sdk-proxy /call_report endpoint when the call ends.

**`Default`**

```ts
true;
```

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

**Optimistic** flag to attempt keeping the call alive when the WebSocket connection closes.

When enabled, the SDK will attempt to preserve the active call during brief network interruptions
(e.g., network offline, switching networks, device sleep/wake cycles) by re-attaching to the existing peer connection
instead of hanging up when an `attach` message is received.

**Important**: This is an _optimistic_ setting, not a deterministic guarantee. Recovery depends on
the state of the underlying WebRTC peer connection:

- **Recovery succeeds** when:
  - The peer connection's `signalingState` is NOT `closed`
  - The peer connection instance still exists
  - ICE restart was not triggered due to connection failure

- **Recovery fails** (call will be hung up and recreated) when:
  - The peer connection's `connectionState` transitions to `failed`
  - The peer connection's `signalingState` transitions to `closed` (e.g., after device sleep)
  - The peer connection instance was destroyed

**Fallback Behavior**: When recovery is not possible, the SDK automatically falls back to recreating
the call. The fallback process depends on the failure scenario:

1. **If ICE restart was attempted** (connectionState went to `failed`):
   - The SDK hangs up the existing call and sends a BYE message
   - A new call instance is created with a **new call ID**
   - The SDK sends a new INVITE to re-establish the call as the active leg

2. **For all other unrecoverable states** (signalingState `closed`, peer destroyed):
   - The SDK hangs up the existing call (no BYE sent since connection is dead)
   - A new call instance is created with the **same call ID**
   - The SDK answers the incoming ATTACH to re-establish the call

**Monitoring Connection Health**: Subscribe to these events to detect connection issues:

- `telnyx.rtc.peerConnectionFailureError` - **Primary event**. Fires when `connectionState` goes to `failed`.
  This indicates the ICE/DTLS transport failed and recovery will be attempted via ICE restart.

- `telnyx.rtc.peerConnectionSignalingStateClosed` - Fires when `signalingState` transitions to `closed`.
  Check `call.signalingStateClosed` to verify recoverability.

In both cases, if `autoRecoverCalls` is enabled (default: `true`), the fallback is automatic
and seamless. The call's state transitions through the normal flow and a `callUpdate` notification
is dispatched so your UI can update accordingly.

**`See`**

[Error Handling Documentation](https://developers.telnyx.com/docs/voice/webrtc/js-sdk/error-handling)

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
