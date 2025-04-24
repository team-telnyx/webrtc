# WebRTCStats

The WebRTCStats class provides comprehensive monitoring and reporting of WebRTC connection quality and performance metrics. It extends EventEmitter and offers various events to track the state and quality of WebRTC connections.

## Overview

WebRTCStats is a utility that helps with everything related to getting and parsing statistics for WebRTC PeerConnections. It collects, processes, and reports various metrics about the connection quality, media streams, and network conditions.

## Installation

```bash
npm install @peermetrics/webrtc-stats
```

## Usage

```javascript
import { WebRTCStats } from '@peermetrics/webrtc-stats';

// Initialize WebRTCStats
const webrtcStats = new WebRTCStats({
  getStatsInterval: 5000,
  rawStats: false,
  statsObject: true,
  filteredStats: false,
  remote: true,
  wrapGetUserMedia: true,
  debug: false,
  logLevel: 'warn'
});

// Add a connection to monitor
webrtcStats.addConnection({
  pc: peerConnection,
  peerId: 'unique-peer-id',
  connectionId: 'optional-connection-id',
  remote: false // optional, override the global remote flag
});

// Listen for stats events
webrtcStats.on('stats', (event) => {
  console.log('Stats received:', event);
});

// Listen for call quality changes
webrtcStats.on('onCallQualityChanged', (event) => {
  console.log('Call quality changed:', event);
});
```

## Events

WebRTCStats emits various events that you can listen to using the standard EventEmitter pattern:

### onCallQualityChanged

The `onCallQualityChanged` event is fired when there is a significant change in the call quality metrics. This event provides detailed information about the current quality of the call, allowing applications to react to quality changes in real-time.

#### Event Data Structure

```typescript
{
  event: 'onCallQualityChanged',
  tag: 'quality',
  peerId: string,
  timestamp: string,
  data: {
    qualityScore: number,       // Overall quality score (0-5, where 5 is excellent)
    audioQuality: {
      jitter: number,           // Audio jitter in milliseconds
      packetsLost: number,      // Number of audio packets lost
      roundTripTime: number,    // Round trip time in milliseconds
      mos: number               // Mean Opinion Score (1-5)
    },
    networkQuality: {
      rtt: number,              // Round trip time in milliseconds
      packetLoss: number,       // Packet loss percentage
      jitterBufferDelay: number // Jitter buffer delay in milliseconds
    },
    previousQuality: number,    // Previous quality score
    qualityChange: string       // Direction of quality change: 'improved', 'degraded', or 'stable'
  }
}
```

#### Quality Score Interpretation

The `qualityScore` value ranges from 0 to 5, with the following interpretations:

- **5**: Excellent - Perfect call quality with no issues
- **4**: Good - Minor issues that don't affect the call experience
- **3**: Fair - Noticeable issues but call is usable
- **2**: Poor - Significant issues affecting call usability
- **1**: Very Poor - Major issues making the call difficult to use
- **0**: Failed - Call cannot continue due to quality issues

#### Example Usage

```javascript
webrtcStats.on('onCallQualityChanged', (event) => {
  const { qualityScore, qualityChange } = event.data;
  
  // Update UI based on quality score
  if (qualityScore >= 4) {
    showGoodQualityIndicator();
  } else if (qualityScore >= 2) {
    showFairQualityIndicator();
  } else {
    showPoorQualityIndicator();
  }
  
  // Notify user about significant quality changes
  if (qualityChange === 'degraded' && qualityScore < 2) {
    notifyUser('Call quality has degraded. Please check your network connection.');
  } else if (qualityChange === 'improved' && qualityScore >= 4) {
    notifyUser('Call quality has improved.');
  }
});
```

#### Handling Quality Issues

When receiving a low quality score, applications can take various actions:

1. **Notify the user** about potential issues with their connection
2. **Suggest troubleshooting steps** like checking network connection or moving closer to the WiFi router
3. **Adjust application behavior** by reducing video quality or disabling video to preserve audio quality
4. **Log quality issues** for later analysis and troubleshooting

## Other Events

In addition to `onCallQualityChanged`, WebRTCStats emits several other events:

- **stats**: Fired periodically with raw WebRTC statistics
- **addConnection**: When a new connection is added for monitoring
- **onIceCandidate**: When ICE candidates are gathered
- **onTrack**: When media tracks are added or removed
- **onSignalingStateChange**: When the signaling state changes
- **onIceConnectionStateChange**: When the ICE connection state changes
- **onIceGatheringStateChange**: When the ICE gathering state changes
- **onNegotiationNeeded**: When renegotiation is needed

## API Reference

### Methods

#### addConnection(options)

Adds a connection to the watch list.

```javascript
webrtcStats.addConnection({
  pc: peerConnection,
  peerId: 'unique-id',
  connectionId: 'optional-id'
});
```

#### removeConnection(options)

Removes a connection from the watch list.

```javascript
webrtcStats.removeConnection({
  peerId: 'unique-id',
  connectionId: 'connection-id'
});
```

#### removePeer(peerId)

Removes all connections for a specific peer.

```javascript
webrtcStats.removePeer('unique-id');
```

#### removeAllPeers()

Removes all peers and connections.

```javascript
webrtcStats.removeAllPeers();
```

#### getTimeline([filter])

Returns the array of events from the timeline.

```javascript
const allEvents = webrtcStats.getTimeline();
const qualityEvents = webrtcStats.getTimeline('quality');
```

#### destroy()

Stops all monitoring and cleans up resources.

```javascript
webrtcStats.destroy();
```

## Configuration Options

When initializing WebRTCStats, you can provide various configuration options:

```javascript
const webrtcStats = new WebRTCStats({
  // How often to collect stats (in milliseconds)
  getStatsInterval: 5000, // Default: 1000
  
  // Include raw RTCStatsReport in events
  rawStats: false, // Default: false
  
  // Include stats object in events
  statsObject: true, // Default: false
  
  // Filter out some stats types
  filteredStats: false, // Default: false
  
  // Include remote stats
  remote: true, // Default: true
  
  // Wrap getUserMedia calls
  wrapGetUserMedia: true, // Default: false
  
  // Enable debug logging
  debug: false, // Default: false
  
  // Log level (none, error, warn, info, debug)
  logLevel: 'warn' // Default: 'none'
});
```