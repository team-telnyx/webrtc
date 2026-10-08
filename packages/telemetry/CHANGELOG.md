## Unreleased

### First release features :tada:

- Call Report V2 telemetry (schema 2.1) on its own WebSocket, opened when the SDK instance is created and kept through every signaling reconnect
- `telnyx.warning` 34002 `TELEMETRY_CREDENTIALS_REJECTED` when the telemetry service rejects the credentials
- One `telnyx_rtc.telemetry` notification per event; one `sequence` per record
- SDK-wide, call and 1 s metrics events; every SDK log line, credentials removed
- Local capture mode: frames printed to the console, kept in memory or saved as `.jsonl`
