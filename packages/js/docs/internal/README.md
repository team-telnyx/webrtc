# Internal API Reference

This directory documents the internal implementation details of the `@telnyx/webrtc` SDK. These docs are **not** published to the public documentation site (developers.telnyx.com) or the GitHub Pages reference — they live only in the repository for engineers contributing to the SDK.

## Purpose

When someone new joins the project, these docs help them understand:
- Internal classes that handle recording, call reporting, and stats collection
- Internal interfaces for data flowing between subsystems
- Key architectural decisions and the reasoning behind them

## Structure

### Classes

- [CallRecorder](./classes/CallRecorder.md) — captures raw audio PCM from WebRTC tracks, synthesizes RTP packets, buffers them with a bounded ring buffer, and POSTs flushes. Mirrors `CallReportCollector`'s POST/retry/keepalive shape.

### Interfaces

#### Recording

- [ICallRecordingOptions](./interfaces/ICallRecordingOptions.md) — options for the CallRecorder, derived from `IClientOptions`
- [ICallRecordingContext](./interfaces/ICallRecordingContext.md) — per-call context passed to the CallRecorder constructor
- [ICallRecordingEnvelope](./interfaces/ICallRecordingEnvelope.md) — wire envelope posted to `/call_recording`
- [IRecordingPacket](./interfaces/IRecordingPacket.md) — single captured RTP packet in the ring buffer

#### Call Report Stats

- [IICECandidatePair](./interfaces/IICECandidatePair.md) — ICE candidate pair snapshot for a stats interval
- [ILocalAudioSourceStats](./interfaces/ILocalAudioSourceStats.md) — local audio media-source stats backing the outbound RTP stream
- [ILocalAudioTrackSnapshot](./interfaces/ILocalAudioTrackSnapshot.md) — local audio track metadata captured from the RTCRtpSender track
- [ITransportStats](./interfaces/ITransportStats.md) — transport-level stats snapshot for a stats interval

## Architecture Notes

### Call Recording Pipeline

The `CallRecorder` is constructed by `BaseCall._init()` — before the server has assigned `session.callReportId` (it arrives on the verto invite/answer response). The recorder uses a bounded in-memory ring buffer and flushes periodically via POST to `/call_recording`, which voice-sdk-proxy forwards to voice-sdk-debug for Wireshark-based audio-quality diagnosis.

**Browser support:** Requires `MediaStreamTrackProcessor` (Chrome 94+, Edge 94+). Firefox and Safari are not supported — the recorder logs a `RECORDING_UNAVAILABLE` warning and no-ops.

### Call Report Collection

`CallReportCollector` (in `src/Modules/Verto/webrtc/CallReportCollector.ts`) collects WebRTC stats periodically during calls and POSTs them to the voice-sdk-proxy `/call_report` endpoint. The stats interfaces above (`IICECandidatePair`, `ILocalAudioSourceStats`, `ILocalAudioTrackSnapshot`, `ITransportStats`) are the snapshot types used in each stats interval.

### Signaling Health Monitor

`SignalingHealthMonitor` (in `src/Modules/Verto/services/SignalingHealthMonitor.ts`) watches the signaling WebSocket for missed ping/response cycles. When recovery is needed, it emits warnings `36003` (SIGNALING_RECOVERY_REQUIRED) and `36004` (MEDIA_RECOVERY_REQUIRED). If reconnection fails and `autoReconnect` is disabled, it emits `36005` (RECONNECTION_FAILED_WITH_NO_AUTO_RECONNECT).

### Class Hierarchy

```
TelnyxRTC (src/TelnyxRTC.ts)
  └── extends Verto (src/Modules/Verto/index.ts)
        └── extends BrowserSession (src/Modules/Verto/BrowserSession.ts)
              └── extends BaseSession (src/Modules/Verto/BaseSession.ts)

Call (src/Modules/Verto/webrtc/Call.ts)
  └── extends BaseCall (src/Modules/Verto/webrtc/BaseCall.ts)

CallRecorder (src/Modules/Verto/webrtc/CallRecorder.ts) — standalone
CallReportCollector (src/Modules/Verto/webrtc/CallReportCollector.ts) — standalone
PreCallDiagnosis (src/PreCallDiagnosis.ts) — standalone
```

### Public vs Internal Boundary

Files in `docs/ts/` are the **public** API reference — they are fetched as snippets and embedded in the public Mintlify documentation site. Only types that are part of the public API surface belong there.

Files in `docs/internal/` are the **internal** API reference — they document implementation details useful to SDK contributors but not exposed to end users.
