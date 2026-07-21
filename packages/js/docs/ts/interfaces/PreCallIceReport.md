Report from the ICE diagnostic module.

Combines candidate-gathering counts/flags (T2) and selected-pair
connectivity diagnostics (T3) into a single report section.

## Table of contents

### Properties

- [candidateCounts](#candidatecounts)
- [candidateGatheringCompleted](#candidategatheringcompleted)
- [candidateTypes](#candidatetypes)
- [candidates](#candidates)
- [gatheringComplete](#gatheringcomplete)
- [hasMultipleNetworkInterfaces](#hasmultiplenetworkinterfaces)
- [hasRelayCandidate](#hasrelaycandidate)
- [hasSelectedPair](#hasselectedpair)
- [iceConnectionState](#iceconnectionstate)
- [iceGatheringState](#icegatheringstate)
- [isTurnRequired](#isturnrequired)
- [onlyHostCandidates](#onlyhostcandidates)
- [perServerResults](#perserverresults)
- [selectedPair](#selectedpair)
- [selectedPairFailed](#selectedpairfailed)
- [serverCandidateComparison](#servercandidatecomparison)
- [vpnDetected](#vpndetected)

## Properties

### candidateCounts

• **candidateCounts**: [`PreCallIceCandidateCounts`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallIceCandidateCounts.md)

Counts of local ICE candidates by type.

---

### candidateGatheringCompleted

• `Optional` **candidateGatheringCompleted**: `boolean`

Whether ICE candidate gathering has completed.

This is the canonical field per the VSDK-412 spec (Section "ICE Module").
`gatheringComplete` is kept as a documented alias for callers that
prefer that name; both are populated with the same boolean.

---

### candidateTypes

• **candidateTypes**: `string`[]

Unique local candidate types, sorted alphabetically.

---

### candidates

• **candidates**: [`PreCallIceCandidateInfo`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallIceCandidateInfo.md)[]

Full information for every gathered local candidate, in the order
reported by the browser. Empty array when no local candidates were
gathered. Provided so callers can inspect the host's network topology
(interface count, private/public addresses, VPN tunnel adapters).

---

### gatheringComplete

• `Optional` **gatheringComplete**: `boolean`

Alias for `candidateGatheringCompleted`. Both fields are always
populated with the same boolean. Kept for naming compatibility.

---

### hasMultipleNetworkInterfaces

• `Optional` **hasMultipleNetworkInterfaces**: `boolean`

Whether the host appears to have multiple enabled network interfaces.
Detected by counting distinct host-candidate addresses (private IPs).
True only when two or more distinct host candidate addresses are
observed. Undefined when host candidate addresses are unavailable.

---

### hasRelayCandidate

• **hasRelayCandidate**: `boolean`

Whether at least one relay candidate was gathered.

---

### hasSelectedPair

• **hasSelectedPair**: `boolean`

Whether a selected ICE candidate pair was found.

---

### iceConnectionState

• `Optional` **iceConnectionState**: `string`

ICE connection state from the RTCPeerConnection.

---

### iceGatheringState

• `Optional` **iceGatheringState**: `string`

ICE gathering state from the RTCPeerConnection.

---

### isTurnRequired

• `Optional` **isTurnRequired**: `boolean`

Whether the selected candidate pair required a TURN relay.

Derived from the selected pair: true when either the local or remote
candidate of the selected pair has `candidateType === 'relay'`.
False when the selected pair is known and neither side is a relay.
Undefined when there is no selected pair.

---

### onlyHostCandidates

• **onlyHostCandidates**: `boolean`

Whether no server-derived (srflx/relay) candidates were gathered.

---

### perServerResults

• `Optional` **perServerResults**: [`PreCallIceServerResult`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallIceServerResult.md)[]

Per-ICE-server gathering results, when `runNetworkCheck()` tests each
ICE server independently. Each entry shows which server it was, the
candidates it produced, how long gathering took, and whether it
gathered anything at all.

Only populated in `'network-only'` mode (per-server testing). Omitted
for `'full'` mode (the call uses all servers at once).

---

### selectedPair

• `Optional` **selectedPair**: [`PreCallIceSelectedPairReport`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallIceSelectedPairReport.md)

Details about the selected candidate pair, if found.

---

### selectedPairFailed

• `Optional` **selectedPairFailed**: `boolean`

Whether the selected (or fallback) candidate pair is in a failed state.

---

### serverCandidateComparison

• `Optional` **serverCandidateComparison**: [`PreCallIceServerComparison`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallIceServerComparison.md)

Comparison of configured ICE servers against the gathered candidates.

Identifies which configured ICE servers produced candidates and which
did not return any, along with warnings for strict networks (e.g.
configured STUN+TURN UDP+TCP but only TURN TCP candidates gathered).

---

### vpnDetected

• `Optional` **vpnDetected**: `boolean`

Whether a VPN appears to be active on the host.
Detected via browser-reported `networkType === 'vpn'` (Chromium).
False when no candidate reports vpn networkType. Undefined when no
candidates were gathered.
