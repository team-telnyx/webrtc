# @telnyx/webrtc-telemetry

> Call Report V2 telemetry for the Telnyx WebRTC JS SDK (beta)

[`@telnyx/webrtc`](../js) bundles this package: apps install only the SDK and turn telemetry on, off or to local capture with the SDK's `telemetry` client option. Install this package directly only to build an SDK integration of your own.

## What it sends

- Its own WebSocket to the telemetry VSP (`wss://rtc-telemetry.telnyx.com` by default), independent of the signaling socket. It opens as soon as `new TelnyxRTC(...)` returns and logs in with the credentials given to it (`telnyx_rtc.telemetry_login`). Each client has its own socket. `connect()`, `disconnect()` and signaling reconnects never open or close it; if it drops itself, it reconnects and logs in again. It closes on pagehide, or once the client has had nothing to send for 5 minutes (log lines don't count), so a client the app dropped closes its socket by itself; the client's next event opens it again.
- Rejected credentials (-32001): the app gets `telnyx.warning` 34002 `TELEMETRY_CREDENTIALS_REJECTED`, the socket stays open, and new credentials (`client.login({ creds })`) log in again on it. -32003 (telemetry unavailable) retries from 30 s up to 5 min.
- One `telnyx_rtc.telemetry` JSON-RPC notification per event, sent when it happens; never batched, acknowledged or resent. `sequence` goes up by one on every record of an SDK instance, so a gap shows a lost record.
- SDK-wide events (creation, network, app state, devices, socket, login, gateway, signaling messages, logs, errors) and per-call events (call_started, call_state, ICE candidates, media changes, metrics every second, warnings, timings, call_ended).
- Credentials never: passwords, tokens and `a=ice-pwd` are removed. Everything else goes out whole, log lines and JSON-RPC frames included.

[`src/contract.ts`](src/contract.ts) is the wire contract (schema 2.1). Typed fields are the ones every Telnyx SDK sends; anything else this SDK knows goes, untyped, under each payload's `extra`.

While the telemetry socket is not logged in, events wait in memory (1,000 at most, oldest dropped). Above 64 KB of socket backlog an event is dropped. The VSP can switch telemetry off with `telnyx_rtc.telemetry_control`.

## In the SDK

```js
const client = new TelnyxRTC({
  login_token,
  // Default (no option): send to the telemetry socket and print each frame to
  // the console after "[CR2 telemetry]". With env: 'development' the socket is
  // wss://rtc-telemetrydev.telnyx.com.
  // telemetry: { enabled: false } turns it off.
  // telemetry: { url } sends to another telemetry socket.
  // telemetry: { capture: true } sends nothing and only captures locally.
});

client.telemetry?.capturedFrames(); // the frames printed so far
```

## API

The SDK reaches the package through hooks:

| Export                                         | Use                                                                          |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `SessionTelemetry.create(session, config)`     | One SDK instance: emits `sdk_creation_started`; `null` when telemetry is off |
| `CallTelemetry.create(call, sessionTelemetry)` | One call's events and 1 s metrics                                            |
| `forwardSdkLog(method, args)`                  | The SDK logger's sink: every log line becomes a `logs` event                 |
| `TelemetryClient`                              | The sender: socket, login, sequence, pending queue, capture                  |
| Contract types (`ClientEvent`, payloads)       | The wire format                                                              |

## Development

```bash
yarn workspace @telnyx/webrtc-telemetry build      # lib/: CommonJS, ES module, declarations
yarn workspace @telnyx/webrtc-telemetry test
yarn workspace @telnyx/webrtc-telemetry lint
yarn workspace @telnyx/webrtc-telemetry typecheck
```

The SDK's `build` and `test` scripts build this package first and bundle `lib/index.mjs` into `@telnyx/webrtc`.

## Release

Like `@telnyx/react-client`: run the **Draft release** workflow with package `telemetry`, merge its release PR, then publish the draft GitHub release (tag `telemetry/v<version>`); **Publish release** puts it on npm.
