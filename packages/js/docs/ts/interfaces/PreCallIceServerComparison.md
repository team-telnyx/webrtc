Comparison of configured ICE servers against gathered candidates.

Maps each configured ICE server URL to the candidates it produced (when
testable) and flags servers that returned no candidates, as well as
network-type warnings (e.g. strict network where only TURN TCP works).

## Table of contents

### Properties

- [appearsStrictNetwork](#appearsstrictnetwork)
- [hasServerWithNoCandidates](#hasserverwithnocandidates)
- [servers](#servers)

## Properties

### appearsStrictNetwork

• **appearsStrictNetwork**: `boolean`

Whether the network appears to restrict UDP (strict network).
True when the ICE servers include STUN/TURN UDP servers but only
TURN TCP candidates were gathered — indicating UDP is blocked and
only TCP relay works.

---

### hasServerWithNoCandidates

• **hasServerWithNoCandidates**: `boolean`

Whether any configured ICE server returned zero candidates.
A server returning no candidates is a warning (the server may be
unreachable, blocked, or misconfigured).

---

### servers

• **servers**: [`PreCallIceServerComparisonEntry`](https://github.com/team-telnyx/webrtc/tree/main/packages/js/docs/ts/interfaces/PreCallIceServerComparisonEntry.md)[]

Per-server entries. Each maps a configured ICE server URL to its
outcome: candidates produced (and their types/protocols), or none.
