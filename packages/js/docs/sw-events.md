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
    - [Diagnostics \& Telemetry](#diagnostics--telemetry)
      - [`telnyx.stats.frame`](#telnyxstatsframe)
      - [`telnyx.stats.report`](#telnyxstatsreport)
  - [Sample Subscription Patterns](#sample-subscription-patterns)

## Introduction

`SwEvent` is an enum exported by the SDK. Each constant mirrors a string literal such as `telnyx.ready` or `telnyx.stats.report`. Listening to the events described below lets your application react to connection changes, gateway readiness, stats collection, and blade-broadcasted data.

## SwEvent Overview

| **EVENT**             | **CATEGORY**      | **DESCRIPTION**                                                     | **PAYLOAD SHAPE**                   | **TYPICAL USE**                                                   |
| --------------------- | ----------------- | ------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| `telnyx.ready`        | Session readiness | SDK is authenticated and the gateway reports `REGED`                | `{ type: 'vertoClientReady', ... }` | Enable dial-pad/UI, resolve “client ready” promises               |
| `telnyx.notification` | Session readiness | Generic call/session updates (e.g., `callUpdate`, `userMediaError`) | `params` from Verto RPC             | Drive call state machines, show call errors, react to chat events |
| `telnyx.stats.frame`  | Diagnostics       | One-second slices of WebRTC stats captured by the debug reporter    | `{ jitter, rtt, mos, ... }`         | Plot live charts or compute health scores                         |
| `telnyx.stats.report` | Diagnostics       | Entire timeline returned when stats capture stops                   | `Array<WebRTCStatsTimelineEntry>`   | Persist logs, attach diagnostics to support cases                 |

## Event Details

### Session Readiness & Notifications

#### `telnyx.ready`

Emitted after the server reports `REGISTER` or `REGED` gateway states (see `VertoHandler`). Treat this as the canonical signal that the user can place or receive calls. Reset reconnection timers here and hide any “connecting” banners.

#### `telnyx.notification`

A catch-all event that delivers call updates, hangup reasons, DTMF indications, chat payloads, and other Verto `event`/`info` messages when they are not routed directly to a specific call. Clients should branch on `notification.type` (e.g., `callUpdate`, `userMediaError`, `vertoClientReady`) to keep UI and state synchronized.

**Notification Types:**

| `type`                       | Description                           | Payload                       |
| ---------------------------- | ------------------------------------- | ----------------------------- |
| `callUpdate`                 | A call has changed state              | `{ call }`                    |
| `userMediaError`             | Browser cannot access media devices   | `{ error }`                   |
| `vertoClientReady`           | Client is ready to make/receive calls | `{}`                          |
| `peerConnectionFailureError` | Peer connection failed                | `{ error }`                   |
| `signalingStateClosed`       | Peer signaling state closed           | `{ previousConnectionState }` |

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
