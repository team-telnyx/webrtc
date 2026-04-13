# Voice SDK Network Connectivity Requirements

This document outlines the network connectivity requirements for Telnyx's Voice SDK (`@telnyx/webrtc`). It lists the servers' ports and IP addresses that the SDK must be able to reach, and the bandwidth required for quality audio.

## Connectivity checklist

1. Allow [Signaling servers](#signaling-connectivity) (WebSocket TLS)
2. Allow [STUN/TURN servers](#stunturn-connectivity) (UDP and TCP/TLS)
3. Allow [Media servers](#media-server-connectivity) (UDP — B2BUA-RTC)
4. Ensure you meet the [bandwidth requirements](#network-bandwidth-requirements)
5. Review the [recommendations and best practices](#recommendations-and-best-practices)

## Connectivity overview

Applications using Telnyx's Voice SDK require two types of connections:

```
┌──────────┐     WSS (TLS)      ┌───────────────────┐     SIP      ┌────────────┐
│  Browser  │◄──────────────────►│  voice-sdk-proxy   │◄───────────►│  B2BUA-RTC  │
│  (SDK)    │                    │  (Signaling)       │             │  (Media)    │
│           │     SRTP (UDP)     │                    │             │             │
│           │◄──────────────────────────────────────────────────────►│             │
└──────────┘                    └───────────────────┘             └────────────┘
                                        │
                                  STUN/TURN (UDP/TCP)
                                        │
                                ┌───────────────┐
                                │  TURN Server   │
                                └───────────────┘
```

- **Signaling**: A secure WebSocket (WSS) connection to `rtc.telnyx.com` used for call setup, teardown, and control messages (SDP offer/answer, ICE candidates).
- **Media**: A secure SRTP connection (DTLS-SRTP) carrying audio directly between the browser and the B2BUA-RTC media server.
- **STUN/TURN**: Used for NAT traversal. STUN discovers the client's public IP; TURN relays media when direct connectivity is not possible.

## Signaling connectivity

The SDK connects to Telnyx signaling infrastructure via secure WebSocket (WSS) over TLS.

| Protocol | Source IP | Source Port | Destination | Destination Port |
|----------|-----------|-------------|-------------|------------------|
| WSS (TLS) | ANY | ANY (ephemeral) | `rtc.telnyx.com` | **443** |

### Signaling server IP addresses

`rtc.telnyx.com` is an anycast address — DNS resolves to the nearest datacenter based on the client's location. The following IP addresses may be returned:

| Region | Site | IP Address |
|--------|------|------------|
| US Central | CH1 (Chicago) | `64.16.248.254` |
| US East | NJ1 (New Jersey) | `64.16.248.57` |
| US East | AT1 (Atlanta) | `64.16.248.56` |
| US West | LV1 (Las Vegas) | `192.76.120.59` |
| US West | DA1 (Dallas) | `192.76.120.58` |
| Canada | TR1 (Toronto) | `64.16.248.49` |
| Canada | MT1 (Montreal) | `50.114.136.5` |
| EU | AMS3 (Amsterdam) | `185.246.41.166` |
| EU | FR5 (Frankfurt) | `185.246.41.136` |
| EU | LD6 (London) | `185.246.41.135` |
| APAC | CN1 (Chennai) | `36.255.198.250` |

### Regional signaling endpoints

For customers who need to pin their signaling to a specific region:

| Region | Endpoint |
|--------|----------|
| US | `rtc.telnyx.com` |
| Europe | `rtc.telnyx.eu` *(coming soon)* |

> **Tip:** By default, the SDK uses anycast DNS to route to the nearest signaling server. If your firewall is restrictive, allowlisting all signaling IPs above ensures connectivity regardless of DNS resolution.

## STUN/TURN connectivity

The SDK uses STUN for NAT traversal (discovering the client's public-facing IP) and TURN for relaying media when direct UDP connectivity is not possible (e.g., symmetric NAT, restrictive firewalls).

| Protocol | Source IP | Source Port | Destination | Destination Port |
|----------|-----------|-------------|-------------|------------------|
| STUN (UDP) | ANY | ANY | `stun.telnyx.com` | **3478** |
| TURN (UDP) | ANY | ANY | TURN server IPs | **3478** |
| TURN (TCP) | ANY | ANY | TURN server IPs | **3478** |
| TURN relay (UDP) | ANY | ANY | TURN server IPs | **49152–65535** |

### TURN server IP addresses

| Region | Site | Primary | Secondary |
|--------|------|---------|-----------|
| US East | AT1 (Atlanta) | `64.16.248.194` | `64.16.248.195` |
| US East | NJ1 (New Jersey) | `64.16.248.198` | `64.16.248.199` |
| US West | LV1 (Las Vegas) | `64.16.248.202` | `64.16.248.203` |
| EU | AMS3 / FR5 / LD6 | `185.246.41.138` | `185.246.41.139` |
| APAC | CN1 / SG1 / SY1 | `103.115.244.147` | `103.115.244.148` |

> **Note:** TURN credentials are provisioned automatically by the SDK via the signaling connection. No manual TURN credential management is required.

## Media server connectivity

Audio media (SRTP) flows directly between the browser and the B2BUA-RTC media server. Your firewall must allow outbound UDP to these IP ranges.

| Protocol | Source IP | Source Port | Destination IP Ranges | Destination Port Range |
|----------|-----------|-------------|----------------------|----------------------|
| UDP (DTLS/SRTP) | ANY | ANY (ephemeral) | See subnets below | **16384–32768** |

### Media IP subnets

The following subnets contain all B2BUA-RTC media server IP addresses. Allowlisting these subnets covers all current and future media servers:

```
36.255.198.128/25       # APAC (Hong Kong)
50.114.136.128/25       # Canada (Montreal)
50.114.143.0/24         # US
50.114.144.0/21         # US (Las Vegas, New Jersey, Atlanta, Dallas, etc.)
50.114.148.0/22         # US
50.114.149.0/24         # US
50.114.150.0/24         # EU (Germany)
50.114.151.0/24         # US (Dallas)
64.16.226.0/24          # US (Chicago)
64.16.227.0/24          # US
64.16.228.0/24          # US
64.16.229.0/24          # Canada (Toronto)
64.16.230.0/24          # US
64.16.248.0/24          # US
64.16.249.0/24          # US
103.115.244.128/25      # APAC (Sydney, Singapore)
185.246.41.128/25       # EU (Amsterdam, Frankfurt, London)
185.246.43.128/25       # EU
```

## Network bandwidth requirements

| Metric | Requirement |
|--------|-------------|
| **Bandwidth (Opus)** | 40 kbps uplink / 40 kbps downlink |
| **Bandwidth (PCMU)** | 100 kbps uplink / 100 kbps downlink |
| **Latency (RTT)** | < 200 ms |
| **Jitter** | < 30 ms |
| **Packet Loss** | < 3% |

Opus is the recommended codec for WebRTC calls — it provides better audio quality at lower bandwidth than PCMU/PCMA.

## Firewall configuration

In a typical organization network, a firewall protects internal hosts from the Internet. To use the Telnyx Voice SDK, your firewall must:

1. **Allow outgoing TCP** to `rtc.telnyx.com:443` (signaling WebSocket)
2. **Allow outgoing UDP** to STUN/TURN servers on port `3478`
3. **Allow outgoing UDP** to media server subnets on ports `16384–32768`
4. **Allow return traffic** for all of the above (stateful firewall)

Telnyx **never initiates** a connection to the SDK. All connections are outbound from the client.

### Restrictive firewall configuration

If your network blocks all UDP traffic:

1. Enable TURN over TCP/TLS by setting `forceRelayCandidate: true` in the SDK:
   ```js
   new TelnyxRTC({
     login: 'username',
     password: 'password',
     forceRelayCandidate: true,
   })
   ```
2. Ensure TCP port **3478** (TURN TCP) is open to the TURN server IPs listed above.

> **Warning:** Forcing relay candidates adds latency since all media is relayed through the TURN server. Use this only when direct UDP is not possible.
>
> **Note:** TURNS (TURN over TLS on port 443) is not currently supported.

## Recommendations and best practices

### Use Opus codec

Opus provides better audio quality at lower bandwidth (40 kbps vs 100 kbps for PCMU). The SDK negotiates Opus by default when the remote side supports it.

### Enable trickle ICE

Trickle ICE sends ICE candidates as they are discovered, reducing call setup time:

```js
new TelnyxRTC({
  login: 'username',
  password: 'password',
  trickleIce: true,
})
```

### Multi-NIC environments

If your client machines have multiple network interfaces (e.g., Ethernet + Wi-Fi, VPN + physical), the browser may gather ICE candidates from all interfaces. This can cause media path mismatches.

Use the `singleInterfaceIce` option to restrict ICE candidates to a single network interface:

```js
new TelnyxRTC({
  login: 'username',
  password: 'password',
  trickleIce: true,
  singleInterfaceIce: true,
})
```

### IPv6 considerations

- Telnyx STUN/TURN servers currently only support IPv4 (`stun.telnyx.com` has no AAAA record)
- If your network has IPv6 ULA addresses (`fc00::/7`) or link-local (`fe80::/10`), the browser may prioritize these for ICE and fail STUN/TURN lookups
- The SDK handles this gracefully by falling back to IPv4 candidates, but initial ICE gathering may log errors (error 701) — these are informational and do not affect call quality

### Enterprise VPN considerations

- VPN tunnels may change the client's network path, causing DNS to resolve `rtc.telnyx.com` to a distant datacenter
- Split-tunnel VPN is recommended: route Telnyx signaling and media IPs outside the VPN tunnel for optimal latency
- If using full-tunnel VPN, ensure the VPN gateway is geographically close to a Telnyx datacenter

### DNS and region routing

`rtc.telnyx.com` uses anycast DNS routing to direct clients to the nearest signaling server. The DNS authoritative server (`rtc-dns-server`) receives the query and returns the voice-sdk-proxy IP for its local datacenter.

**How region selection works:**

1. Client resolves `rtc.telnyx.com` → CNAME → `rtc.lb.telnyx.tech`
2. DNS query routes via anycast to the nearest `rtc-dns-server` instance
3. `rtc-dns-server` returns the local datacenter's voice-sdk-proxy IP
4. Client connects via WebSocket to that IP for the entire session

**Known limitation:** Anycast routing is based on BGP path selection, not geographic proximity. In some cases, a client's DNS resolver may route to a non-optimal datacenter due to transit peering paths. For example, a client in India may receive a European signaling IP if their ISP's DNS resolver reaches a European PoP first. If this happens, use a [regional signaling endpoint](#region-selection) to pin connections to the correct region.

### Region selection

The SDK supports regional signaling endpoints for customers who need to pin connections to a specific region. Regional subdomains are available via DNS:

| Regional Endpoint | Region | Datacenters |
|-------------------|--------|-------------|
| `us-east.rtc.telnyx.com` | US East | AT1 (Atlanta), NJ1 (New Jersey) |
| `us-central.rtc.telnyx.com` | US Central | CH1 (Chicago) |
| `us-west.rtc.telnyx.com` | US West | LV1 (Las Vegas) |
| `ca-central.rtc.telnyx.com` | Canada | MT1 (Montreal), TR1 (Toronto) |
| `eu.rtc.telnyx.com` | Europe | AMS3 (Amsterdam), FR5 (Frankfurt), LD6 (London) |
| `apac.rtc.telnyx.com` | Asia-Pacific | CN1 (Chennai), SY1 (Sydney) |

Use regional endpoints when:
- Your users are concentrated in a known region
- Anycast DNS routing is directing clients to a suboptimal datacenter (e.g., India clients landing at a European datacenter)
- You need to guarantee low-latency signaling paths for specific regions

```js
// Default: anycast DNS selects nearest datacenter
new TelnyxRTC({
  login: 'username',
  password: 'password',
})

// Pin to APAC for India/Southeast Asia users
new TelnyxRTC({
  login: 'username',
  password: 'password',
  host: 'apac.rtc.telnyx.com',
})
```

> **Note:** Regional endpoints return multiple A records for all datacenters in that region. The client will connect to the first reachable IP. Media (B2BUA-RTC) selection happens within the signaling proxy, which prefers local-datacenter media servers for lowest latency.

## Additional network information

- **ASN:** 63440 (Telnyx LLC)
- **PeeringDB:** [https://www.peeringdb.com/asn/63440](https://www.peeringdb.com/asn/63440)
- **SIP connectivity guide:** [https://sip.telnyx.ca](https://sip.telnyx.ca)

### Points of presence

| Region | Sites |
|--------|-------|
| United States | CH1 (Chicago), AT1 (Atlanta), NJ1 (New Jersey), LV1 (Las Vegas), DA1 (Dallas) |
| Canada | TR1 (Toronto), MT1 (Montreal) |
| Europe | AMS3 (Amsterdam), FR5 (Frankfurt), LD6 (London) |
| Asia-Pacific | CN1 (Chennai), SY1 (Sydney) |

Customers can request a direct connection to the Telnyx network via Megaport or direct peering.
