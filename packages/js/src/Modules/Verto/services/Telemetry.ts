import BrowserSession from '../BrowserSession';
import BaseCall from '../webrtc/BaseCall';
import pkg from '../../../../package.json';

/**
 * - call_id + 
- Timestamp - timestamp will be added when sending the telemetry
- sdk_version +
- region +
- network_type ? 
- os/device(client) + 
- sip_call_id + 
- telnyx_call_id + 
- telnyx_leg_id + 
- iceGatheringState +
- iceConnectionState + 
- connectionState + 
- DTLS State - To think how to obtain it
- codec + 
- outbound RTP:
    - Packet sent
    - byteSent
    - Total audio energy
- Inbound RTP
    - Packet received 
    - Byte received
    - Jitter
    - PacketLost
    - Audio Level
- Candidate Pair
    - currentRoundTripTime
    - Nominated
- Mime type in use
- Microphone access error(getUserMedia/permissions/capture)
- Microphone speaker device change
- Track state change
- Speaker Output
- Track permission problem
 */

/**
 * I am sure that we need to use WebRTCStats always for gathering all telemetry data.
 */

export class Telemetry {
  private _callId: string;
  private _sipCallId: string;
  private _telnyxCallId: string;
  private _telnyxLegId: string;
  private _sdkVersion = pkg.version;
  private _region: string;
  private _userAgent = navigator.userAgent;

  private _iceGatheringState: string | null = null;
  private _iceConnectionState: string | null = null;
  private _connectionState: string | null = null;
  private _dtlsState: string | null = null;
  private _codec: string | null = null;

  //   TODO: Work on network type detection
  //   private _networkType = window.navigator.connection;

  constructor(private _call: BaseCall, private _session: BrowserSession) {
    const { telnyxLegId, telnyxCallControlId } = this._call.telnyxIDs;
    const { region } = this._session.options;

    // Initialize IDs
    this._callId = this._call.id;
    this._sipCallId = this._call.sipCallId;
    this._telnyxCallId = telnyxCallControlId;
    this._telnyxLegId = telnyxLegId;

    this._region = region;

    console.log('Telemetry initialized', {
      callId: this._callId,
      sipCallId: this._sipCallId,
      telnyxCallId: this._telnyxCallId,
      telnyxLegId: this._telnyxLegId,
      sdkVersion: this._sdkVersion,
      region: this._region,
      userAgent: this._userAgent,
    });
  }

  onConnectionStateChange(state: RTCPeerConnectionState) {
    this._connectionState = state;
    console.log('Telemetry Connection State changed:', state);
  }

  onIceConnectionStateChange(state: RTCIceConnectionState) {
    this._iceConnectionState = state;
    console.log('Telemetry Ice Connection State changed:', state);
  }

  onIceGatheringStateChange(state: RTCIceGatheringState) {
    this._iceGatheringState = state;
    console.log('Telemetry Ice Gathering State changed:', state);
  }

  setCodec(codec: string) {
    this._codec = codec;
    console.log('Telemetry Codec set:', codec);
  }
}
