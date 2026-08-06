# Telnyx SwEvent Reference

This document catalogs the remaining `SwEvent` constants exposed by the WebRTC JS SDK for event handling.

## Table of Contents

- [Telnyx SwEvent Reference](#telnyx-swevent-reference)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [SwEvent Overview](#swevent-overview)
  - [Event Details](#event-details)
    - [Session Readiness \& Notifications](#session-readiness--notifications)
      - [`telnyx.ready`](#telnyxready)
      - [`telnyx.notification`](#telnyxnotification)
    - [AI Conversation](#ai-conversation)
      - [`telnyx.ai.conversation`](#telnyxaiconversation)
    - [Diagnostics \& Telemetry](#diagnostics--telemetry)
      - [`telnyx.stats.frame`](#telnyxstatsframe)
      - [`telnyx.stats.report`](#telnyxstatsreport)
  - [Sample Subscription Patterns](#sample-subscription-patterns)

## Introduction

`SwEvent` is an enum exported by the SDK. Each constant mirrors a string literal such as `telnyx.ready` or `telnyx.stats.report`. Listening to the events described below lets your application react to connection changes, gateway readiness, stats collection, and blade-broadcasted data.

## SwEvent Overview

| **EVENT**             | **CATEGORY**      | **DESCRIPTION**                                                     | **PAYLOAD SHAPE**                   | **TYPICAL USE**                                                   |
| --------------------- | ----------------- | ------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| `telnyx.ready`        | Session readiness | SDK is authenticated and the gateway reports `REGED`                | `{ type: 'vertoClientReady', ... }` | Enable dial-pad/UI, resolve "client ready" promises               |
| `telnyx.notification` | Session readiness | Generic call/session updates (e.g., `callUpdate`, `userMediaError`) | `params` from Verto RPC             | Drive call state machines, show call errors, react to chat events |
| `telnyx.ai.conversation` | AI Conversation | Inbound `ai_conversation` message with client-side tool `function_call` | `IAIConversationMessageEvent` | Execute client-side tools and respond via `call.sendAIConversationMessage()` |
| `telnyx.stats.frame`  | Diagnostics       | One-second slices of WebRTC stats captured by the debug reporter    | `{ jitter, rtt, mos, ... }`         | Plot live charts or compute health scores                         |
| `telnyx.stats.report` | Diagnostics       | Entire timeline returned when stats capture stops                   | `Array<WebRTCStatsTimelineEntry>`   | Persist logs, attach diagnostics to support cases                 |

## Event Details

### Session Readiness & Notifications

#### `telnyx.ready`

Emitted after the server reports `REGISTER` or `REGED` gateway states (see `VertoHandler`). Treat this as the canonical signal that the user can place or receive calls. Reset reconnection timers here and hide any "connecting" banners.

The signaling connection is established to a specific voice-sdk-proxy instance in one of Telnyx's datacenters (see [Network Connectivity Requirements](../../../docs/network-connectivity-requirements.md) for the full list of regions and IPs). The datacenter is selected via anycast DNS when connecting to `rtc.telnyx.com`, or can be pinned to a specific region using a regional endpoint (e.g., `apac.rtc.telnyx.com`). Once connected, all signaling and media for that session routes through the selected datacenter's infrastructure.

After `telnyx.ready` fires, the connected datacenter and region are available on the client instance:

```ts
client.on('telnyx.ready', () => {
  console.log('Region:', client.region); // e.g. "apac", "eu", "us-east"
  console.log('DC:', client.dc); // e.g. "cn1", "fr5", "at1"
});
```

| Property        | Type             | Description                                                                                                              |
| --------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `client.region` | `string \| null` | The region the client is connected to (e.g., `"apac"`, `"eu"`, `"us-east"`, `"us-west"`, `"us-central"`, `"ca-central"`, `"south-asia"`) |
| `client.dc`     | `string \| null` | The specific datacenter code (e.g., `"cn1"`, `"fr5"`, `"ch1"`, `"at1"`, `"lv1"`)                                         |

Both values are set from the gateway `REGED` response. They are `null` until the client is fully registered.

#### `telnyx.notification`

A catch-all event that delivers call updates, hangup reasons, DTMF indications, chat payloads, and other Verto `event`/`info` messages when they are not routed directly to a specific call. Clients should branch on `notification.type` to keep UI and state synchronized.

Only `callUpdate` is the recommended notification type for application use. The other types are still emitted for backward compatibility but are deprecated — use the dedicated `telnyx.error`, `telnyx.warning`, and `telnyx.ready` events instead.

**Notification Types:**

| `type`                       | Description                           | Payload                       | Status |
| ---------------------------- | ------------------------------------- | ----------------------------- | ------ |
| `callUpdate`                 | A call has changed state              | `{ call }`                    | Active |
| `userMediaError`             | Browser cannot access media devices   | `{ error }`                   | Deprecated |
| `vertoClientReady`           | Client is ready to make/receive calls | `{}`                          | Deprecated — use `telnyx.ready` |
| `peerConnectionFailureError` | Peer connection failed                | `{ error }`                   | Deprecated — use `telnyx.warning` |
| `signalingStateClosed`       | Peer signaling state closed           | `{ previousConnectionState }` | Deprecated |

### AI Conversation

#### `telnyx.ai.conversation`

Emitted when an `ai_conversation` JSON-RPC message is received from the backend. This event powers the client-side tool wire protocol: the AI backend sends a `function_call` item requesting the application to execute a client-side tool, and the application responds with a `function_call_output` via `call.sendAIConversationMessage()`.

```ts
client.on('telnyx.ai.conversation', (event) => {
  // event.params.type === 'conversation.item.created'
  // event.params.item?.type === 'function_call'
  const { call_id, name, arguments: argsJson } = event.params.item;

  // Execute the tool, then send the result back
  const result = executeTool(name, JSON.parse(argsJson));
  call.sendAIConversationMessage({
    type: 'function_call_output',
    call_id,
    output: JSON.stringify(result),
  });
});
```

The event payload is an `IAIConversationMessageEvent` with `method: 'ai_conversation'`, `params: AIConversationParams`, and an optional `voice_sdk_id`. Use the `isFunctionCallParams()` type guard to check whether the inbound message contains a `function_call` item.

### Diagnostics & Telemetry

#### `telnyx.stats.frame`

Generated once per second while a `WebRTCStatsReporter` is running. The payload includes jitter, RTT, MOS, and inbound/outbound audio stats already normalized for charting. Subscribe when you need live graphs or to flag quality degradations in real time.

#### `telnyx.stats.report`

Published when `WebRTCStatsReporter.stop()` is invoked. You receive the entire timeline array, which can be saved to disk, attached to tickets, or uploaded to your telemetry backend for later inspection.

## Sample Subscription Patterns

```ts
import { SwEvent, TelnyxRTC } from '@telnyx/webrtc';

const client = new TelnyxRTC(options);

client
  .on(SwEvent.SocketOpen, () => updateConnectionStatus('connected'))
  .on(SwEvent.Ready, () => enableDialPad(true))
  .on(SwEvent.Notification, handleTelnyxNotification)
  .on(SwEvent.StatsFrame, (metrics) => renderLiveMetrics(metrics))
  .on(SwEvent.StatsReport, (timeline) => persistStatsReport(timeline));
```

Listening to these events alongside the error-focused ones documented in error handling docs ensures your application has complete visibility into the Telnyx RTC session lifecycle.
