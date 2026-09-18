# Registration timing logs

The SDK records the flow from `new TelnyxRTC(options)` to the first
`telnyx.ready` event (`vertoClientReady`). It emits one structured **info** log
named `Registration timing`, with `context.event: "registration_timing"`.
No additional option is required.

The endpoint is captured immediately before dispatch to the application. The
summary is logged asynchronously after dispatch, so application ready-handler
execution and summary logging are excluded from the measured duration.

For live milestones while troubleshooting a slow or stalled registration,
enable the existing debug option:

```js
const client = new TelnyxRTC({
  login_token: token,
  debug: true,
});
client.connect();
```

These milestones appear as `Registration timing step` debug logs. There is no
automatic console table. The info summary includes the structured `steps` array
regardless of debug mode.

## Reading the summary

| Field                                 | Meaning                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| `schemaVersion`                       | Payload format version, currently `1`.                                              |
| `scope`                               | `initial_registration`; only the first app-ready event for this client.             |
| `clientId`, `sessionId`, `sdkVersion` | Correlation identifiers and SDK version.                                            |
| `startedAt`                           | UTC timestamp for the start of the trace.                                           |
| `totalMs`                             | Constructor entry through app-ready dispatch.                                       |
| `constructorMs`                       | Synchronous client construction.                                                    |
| `appWaitBeforeConnectMs`              | Time between construction completing and the first `connect()` call.                |
| `connectToReadyMs`                    | Time from the first `connect()` call through app readiness, including retries.      |
| `socketAttempts`                      | Number of WebSocket connection attempts before readiness.                           |
| `longestInterval`                     | The longest gap, with `from`, `to`, and `durationMs`.                               |
| `steps`                               | Chronological milestones, each with `deltaMs`, `elapsedMs`, and optional `details`. |
| `droppedSteps`, `droppedRequests`     | Entries evicted when diagnostic buffers reach their limits.                         |
| `clock`, `clockAdjusted`              | Clock source and whether a backwards/invalid clock reading was clamped.             |

Steps cover construction, connection setup, WebSocket opening, login preparation
and response processing, server `clientReady`, gateway state checks, and retry
timers. Both credential/token login and anonymous login are supported.

`deltaMs` is the interval from the preceding milestone; `elapsedMs` is cumulative.
Response details include `requestMs`, measured from the matching request even if
other milestones occur in between. These request durations overlap timeline
intervals: do not add them to the `deltaMs` values. Retry scheduling records the
intended `delayMs`; compare this with the interval until the corresponding timer
fires to identify delayed timers.

## Call reports and VSP

The completed summary is retained by the owning client. When call reporting is
enabled, it is included as an info entry in the **first available report segment
of each call**, using the existing `/call_report` upload path. The log retains its
original registration-completion timestamp. It survives normal call-log buffer
eviction and is deduplicated across subsequent segments of that call.

This also works if a call is created inside a ready handler or before registration
completes: the report retrieves the summary when its segment is built. Concurrent
clients use their own registration summaries. Existing call-report log-level
filtering applies; a minimum level of `warn` or `error` excludes the info entry.
Setting `enableCallReports: false` disables this upload along with other call
reporting, while local SDK logging remains available.

There is no separate registration upload or new WebSocket signaling message.
If no call report is generated, the timing summary remains local. A report segment
that cannot upload follows the existing call-report retry policy.

## Scope and limits

- Timing ends at the first app-ready event. Reconnection attempts before that
  event are included; later re-registrations do not replace the initial summary.
- A registration that never reaches ready has no completion summary. With debug
  enabled, the milestones recorded so far remain in the SDK logs.
- Buffers retain the latest 128 milestones and at most 32 pending registration
  requests. Total time and the longest interval still cover the entire trace if
  older entries are dropped. The first retained row can reference a dropped
  predecessor.
- Elapsed times use `performance.now()` where available. A `Date.now()` fallback
  stays in the same clock domain for the full trace; invalid or backwards
  readings are clamped and identified by `clockAdjusted`.
- Network intervals include network/server work and browser scheduling. They do
  not separate server internals or WebSocket DNS/TCP/TLS phases.
- Diagnostic fields include fixed milestone labels, IDs, known gateway states,
  retry information, and timings. Credentials, tokens, arbitrary error objects,
  and signaling payloads are not copied into the timing report.
- Logging and diagnostic-provider failures are contained. They do not trigger
  registration retries or change readiness. Collection performs no I/O in the
  default mode; enabling debug logs adds normal logging overhead.
