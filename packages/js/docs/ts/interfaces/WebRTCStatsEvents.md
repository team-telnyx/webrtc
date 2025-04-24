# WebRTCStatsEvents

This interface defines the events emitted by the WebRTCStats class.

## Events

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

### stats

The `stats` event is fired periodically with the latest WebRTC statistics.

```typescript
{
  event: 'stats',
  tag: 'stats',
  peerId: string,
  timestamp: string,
  data: object,
  timeTaken: number,
  rawStats?: RTCStatsReport,
  statsObject?: object,
  filteredStats?: object
}
```

### addConnection

Fired when a new connection is added for monitoring.

```typescript
{
  event: 'addConnection',
  tag: 'peer',
  peerId: string,
  timestamp: string,
  data: {
    options: {
      peerId: string
    },
    peerConfiguration: RTCConfiguration
  }
}
```

### onIceCandidate

Fired when ICE candidates are gathered.

```typescript
{
  event: 'onicecandidate',
  tag: 'connection',
  peerId: string,
  timestamp: string,
  data: {
    candidate: RTCIceCandidate
  }
}
```

### onTrack

Fired when media tracks are added or removed.

```typescript
{
  event: 'ontrack',
  tag: 'track',
  peerId: string,
  timestamp: string,
  data: {
    track: MediaStreamTrack,
    stream: MediaStream,
    title: string
  }
}
```

### onSignalingStateChange

Fired when the signaling state changes.

```typescript
{
  event: 'onsignalingstatechange',
  tag: 'connection',
  peerId: string,
  timestamp: string,
  data: {
    state: RTCSignalingState
  }
}
```

### onIceConnectionStateChange

Fired when the ICE connection state changes.

```typescript
{
  event: 'oniceconnectionstatechange',
  tag: 'connection',
  peerId: string,
  timestamp: string,
  data: {
    state: RTCIceConnectionState
  }
}
```

### onIceGatheringStateChange

Fired when the ICE gathering state changes.

```typescript
{
  event: 'onicegatheringstatechange',
  tag: 'connection',
  peerId: string,
  timestamp: string,
  data: {
    state: RTCIceGatheringState
  }
}
```

### onNegotiationNeeded

Fired when renegotiation is needed.

```typescript
{
  event: 'onnegotiationneeded',
  tag: 'connection',
  peerId: string,
  timestamp: string,
  data: {}
}
```