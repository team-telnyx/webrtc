Metadata about a single ICE candidate, extracted from RTCStatsReport.

Each gathered local candidate is reported with full information so the
diagnostic can explain the host's network topology (interface count,
private/public addresses, VPN tunnel adapters, relay usage).

## Table of contents

### Properties

- [address](#address)
- [candidateType](#candidatetype)
- [id](#id)
- [networkType](#networktype)
- [port](#port)
- [protocol](#protocol)
- [relayProtocol](#relayprotocol)
- [url](#url)

## Properties

### address

• `Optional` **address**: `string`

Candidate address as reported by the browser.
Chromium exposes this as `address`, Firefox as `ip`; the module
normalizes both into this field. May be omitted by the browser.

---

### candidateType

• `Optional` **candidateType**: `string`

Candidate type: host, srflx, prflx, relay, or a custom string.

---

### id

• `Optional` **id**: `string`

Stats report ID for this candidate.

---

### networkType

• `Optional` **networkType**: `string`

Network type as reported by the browser (e.g., 'wifi', 'cellular',
'ethernet', 'vpn', 'unknown'). `vpn` is reported by Chromium when a VPN
is active. May be absent in some browsers (notably Firefox).

---

### port

• `Optional` **port**: `number`

Candidate port.

---

### protocol

• `Optional` **protocol**: `string`

Transport protocol (e.g., 'udp', 'tcp').

---

### relayProtocol

• `Optional` **relayProtocol**: `string`

Relay protocol when candidateType is 'relay' (e.g., 'turn', 'turns').

---

### url

• `Optional` **url**: `string`

TURN server URL associated with this relay candidate.
