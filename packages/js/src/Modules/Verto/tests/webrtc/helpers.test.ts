import { findElementByType } from '../../util/helpers';
import {
  sdpStereoHack,
  sdpMediaOrderHack,
  sdpBitrateHack,
  getDevices,
  assureDeviceId,
  getBrowserInfo,
  getWebRTCInfo,
} from '../../webrtc/helpers';

describe('Helpers browser functions', () => {
  describe('findElementByType', () => {
    it('should return null if there is no document global object', () => {
      document = null;
      expect(findElementByType('fakeElement')).toEqual(null);
    });

    it('should select the DOM element by ID', () => {
      const fake = document.createElement('div');
      fake.id = 'fakeElement';
      document.getElementById = jest.fn().mockReturnValue(fake);
      expect(findElementByType('fakeElement')).toEqual(fake);
    });

    it('should return null if the DOM element does not exists', () => {
      const fake = document.createElement('div');
      fake.id = 'fakeElement';
      // @ts-ignore
      document.getElementById.mockRestore();
      expect(findElementByType('fake-Element')).toEqual(null);
    });

    it('should select the DOM element by a Function', () => {
      const fake = document.createElement('div');
      fake.id = 'fakeElement';
      expect(findElementByType(jest.fn().mockReturnValue(fake))).toEqual(fake);
    });
  });

  describe('sdpStereoHack', () => {
    const SDP_OPUS_STEREO =
      'v=0\r\no=- 135160591336882782 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE audio video\r\na=msid-semantic: WMS 381b9efc-7cf5-45bb-8f39-c06558b288de\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 110 112 113 126\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:Y5Zy\r\na=ice-pwd:yQLVrXgG+irP0tgLLr4ZjQb5\r\na=ice-options:trickle\r\na=fingerprint:sha-256 45:ED:86:FB:EB:FE:21:20:62:C4:07:81:AA:B8:BC:87:60:CC:2B:54:CE:D5:F0:16:93:C4:61:23:28:59:DF:8B\r\na=setup:actpass\r\na=mid:audio\r\na=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\na=sendrecv\r\na=rtcp-mux\r\na=rtpmap:111 opus/48000/2\r\na=rtcp-fb:111 transport-cc\r\na=fmtp:111 minptime=10;useinbandfec=1; stereo=1; sprop-stereo=1\r\na=rtpmap:103 ISAC/16000\r\na=rtpmap:104 ISAC/32000\r\na=rtpmap:9 G722/8000\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:8 PCMA/8000\r\na=rtpmap:106 CN/32000\r\na=rtpmap:105 CN/16000\r\na=rtpmap:13 CN/8000\r\na=rtpmap:110 telephone-event/48000\r\na=rtpmap:112 telephone-event/32000\r\na=rtpmap:113 telephone-event/16000\r\na=rtpmap:126 telephone-event/8000\r\na=ssrc:3652058873 cname:kufSZ8JnlRUuQVc2\r\na=ssrc:3652058873 msid:381b9efc-7cf5-45bb-8f39-c06558b288de 8841cbb1-90ba-4655-8784-60a185846706\r\na=ssrc:3652058873 mslabel:381b9efc-7cf5-45bb-8f39-c06558b288de\r\na=ssrc:3652058873 label:8841cbb1-90ba-4655-8784-60a185846706\r\nm=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 102 122 127 121 125 107 108 109 124 120 123 119 114\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:Y5Zy\r\na=ice-pwd:yQLVrXgG+irP0tgLLr4ZjQb5\r\na=ice-options:trickle\r\na=fingerprint:sha-256 45:ED:86:FB:EB:FE:21:20:62:C4:07:81:AA:B8:BC:87:60:CC:2B:54:CE:D5:F0:16:93:C4:61:23:28:59:DF:8B\r\na=setup:actpass\r\na=mid:video\r\na=extmap:2 urn:ietf:params:rtp-hdrext:toffset\r\na=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=extmap:4 urn:3gpp:video-orientation\r\na=extmap:5 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\r\na=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay\r\na=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type\r\na=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/video-timing\r\na=extmap:10 http://tools.ietf.org/html/draft-ietf-avtext-framemarking-07\r\na=sendrecv\r\na=rtcp-mux\r\na=rtcp-rsize\r\na=rtpmap:96 VP8/90000\r\na=rtcp-fb:96 goog-remb\r\na=rtcp-fb:96 transport-cc\r\na=rtcp-fb:96 ccm fir\r\na=rtcp-fb:96 nack\r\na=rtcp-fb:96 nack pli\r\na=rtpmap:97 rtx/90000\r\na=fmtp:97 apt=96\r\na=rtpmap:98 VP9/90000\r\na=rtcp-fb:98 goog-remb\r\na=rtcp-fb:98 transport-cc\r\na=rtcp-fb:98 ccm fir\r\na=rtcp-fb:98 nack\r\na=rtcp-fb:98 nack pli\r\na=fmtp:98 profile-id=0\r\na=rtpmap:99 rtx/90000\r\na=fmtp:99 apt=98\r\na=rtpmap:100 H264/90000\r\na=rtcp-fb:100 goog-remb\r\na=rtcp-fb:100 transport-cc\r\na=rtcp-fb:100 ccm fir\r\na=rtcp-fb:100 nack\r\na=rtcp-fb:100 nack pli\r\na=fmtp:100 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f\r\na=rtpmap:101 rtx/90000\r\na=fmtp:101 apt=100\r\na=rtpmap:102 H264/90000\r\na=rtcp-fb:102 goog-remb\r\na=rtcp-fb:102 transport-cc\r\na=rtcp-fb:102 ccm fir\r\na=rtcp-fb:102 nack\r\na=rtcp-fb:102 nack pli\r\na=fmtp:102 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42001f\r\na=rtpmap:122 rtx/90000\r\na=fmtp:122 apt=102\r\na=rtpmap:127 H264/90000\r\na=rtcp-fb:127 goog-remb\r\na=rtcp-fb:127 transport-cc\r\na=rtcp-fb:127 ccm fir\r\na=rtcp-fb:127 nack\r\na=rtcp-fb:127 nack pli\r\na=fmtp:127 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f\r\na=rtpmap:121 rtx/90000\r\na=fmtp:121 apt=127\r\na=rtpmap:125 H264/90000\r\na=rtcp-fb:125 goog-remb\r\na=rtcp-fb:125 transport-cc\r\na=rtcp-fb:125 ccm fir\r\na=rtcp-fb:125 nack\r\na=rtcp-fb:125 nack pli\r\na=fmtp:125 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f\r\na=rtpmap:107 rtx/90000\r\na=fmtp:107 apt=125\r\na=rtpmap:108 H264/90000\r\na=rtcp-fb:108 goog-remb\r\na=rtcp-fb:108 transport-cc\r\na=rtcp-fb:108 ccm fir\r\na=rtcp-fb:108 nack\r\na=rtcp-fb:108 nack pli\r\na=fmtp:108 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=4d0032\r\na=rtpmap:109 rtx/90000\r\na=fmtp:109 apt=108\r\na=rtpmap:124 H264/90000\r\na=rtcp-fb:124 goog-remb\r\na=rtcp-fb:124 transport-cc\r\na=rtcp-fb:124 ccm fir\r\na=rtcp-fb:124 nack\r\na=rtcp-fb:124 nack pli\r\na=fmtp:124 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=640032\r\na=rtpmap:120 rtx/90000\r\na=fmtp:120 apt=124\r\na=rtpmap:123 red/90000\r\na=rtpmap:119 rtx/90000\r\na=fmtp:119 apt=123\r\na=rtpmap:114 ulpfec/90000\r\na=ssrc-group:FID 1714381393 967654061\r\na=ssrc:1714381393 cname:kufSZ8JnlRUuQVc2\r\na=ssrc:1714381393 msid:381b9efc-7cf5-45bb-8f39-c06558b288de 99d2faa8-950d-40f7-ad80-16789c9b4faa\r\na=ssrc:1714381393 mslabel:381b9efc-7cf5-45bb-8f39-c06558b288de\r\na=ssrc:1714381393 label:99d2faa8-950d-40f7-ad80-16789c9b4faa\r\na=ssrc:967654061 cname:kufSZ8JnlRUuQVc2\r\na=ssrc:967654061 msid:381b9efc-7cf5-45bb-8f39-c06558b288de 99d2faa8-950d-40f7-ad80-16789c9b4faa\r\na=ssrc:967654061 mslabel:381b9efc-7cf5-45bb-8f39-c06558b288de\r\na=ssrc:967654061 label:99d2faa8-950d-40f7-ad80-16789c9b4faa\r\n';
    const SDP_OPUS_NO_STEREO =
      'v=0\r\no=- 135160591336882782 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE audio video\r\na=msid-semantic: WMS 381b9efc-7cf5-45bb-8f39-c06558b288de\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 110 112 113 126\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:Y5Zy\r\na=ice-pwd:yQLVrXgG+irP0tgLLr4ZjQb5\r\na=ice-options:trickle\r\na=fingerprint:sha-256 45:ED:86:FB:EB:FE:21:20:62:C4:07:81:AA:B8:BC:87:60:CC:2B:54:CE:D5:F0:16:93:C4:61:23:28:59:DF:8B\r\na=setup:actpass\r\na=mid:audio\r\na=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\na=sendrecv\r\na=rtcp-mux\r\na=rtpmap:111 opus/48000/2\r\na=rtcp-fb:111 transport-cc\r\na=fmtp:111 minptime=10;useinbandfec=1\r\na=rtpmap:103 ISAC/16000\r\na=rtpmap:104 ISAC/32000\r\na=rtpmap:9 G722/8000\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:8 PCMA/8000\r\na=rtpmap:106 CN/32000\r\na=rtpmap:105 CN/16000\r\na=rtpmap:13 CN/8000\r\na=rtpmap:110 telephone-event/48000\r\na=rtpmap:112 telephone-event/32000\r\na=rtpmap:113 telephone-event/16000\r\na=rtpmap:126 telephone-event/8000\r\na=ssrc:3652058873 cname:kufSZ8JnlRUuQVc2\r\na=ssrc:3652058873 msid:381b9efc-7cf5-45bb-8f39-c06558b288de 8841cbb1-90ba-4655-8784-60a185846706\r\na=ssrc:3652058873 mslabel:381b9efc-7cf5-45bb-8f39-c06558b288de\r\na=ssrc:3652058873 label:8841cbb1-90ba-4655-8784-60a185846706\r\nm=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 102 122 127 121 125 107 108 109 124 120 123 119 114\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:Y5Zy\r\na=ice-pwd:yQLVrXgG+irP0tgLLr4ZjQb5\r\na=ice-options:trickle\r\na=fingerprint:sha-256 45:ED:86:FB:EB:FE:21:20:62:C4:07:81:AA:B8:BC:87:60:CC:2B:54:CE:D5:F0:16:93:C4:61:23:28:59:DF:8B\r\na=setup:actpass\r\na=mid:video\r\na=extmap:2 urn:ietf:params:rtp-hdrext:toffset\r\na=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=extmap:4 urn:3gpp:video-orientation\r\na=extmap:5 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\r\na=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay\r\na=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type\r\na=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/video-timing\r\na=extmap:10 http://tools.ietf.org/html/draft-ietf-avtext-framemarking-07\r\na=sendrecv\r\na=rtcp-mux\r\na=rtcp-rsize\r\na=rtpmap:96 VP8/90000\r\na=rtcp-fb:96 goog-remb\r\na=rtcp-fb:96 transport-cc\r\na=rtcp-fb:96 ccm fir\r\na=rtcp-fb:96 nack\r\na=rtcp-fb:96 nack pli\r\na=rtpmap:97 rtx/90000\r\na=fmtp:97 apt=96\r\na=rtpmap:98 VP9/90000\r\na=rtcp-fb:98 goog-remb\r\na=rtcp-fb:98 transport-cc\r\na=rtcp-fb:98 ccm fir\r\na=rtcp-fb:98 nack\r\na=rtcp-fb:98 nack pli\r\na=fmtp:98 profile-id=0\r\na=rtpmap:99 rtx/90000\r\na=fmtp:99 apt=98\r\na=rtpmap:100 H264/90000\r\na=rtcp-fb:100 goog-remb\r\na=rtcp-fb:100 transport-cc\r\na=rtcp-fb:100 ccm fir\r\na=rtcp-fb:100 nack\r\na=rtcp-fb:100 nack pli\r\na=fmtp:100 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f\r\na=rtpmap:101 rtx/90000\r\na=fmtp:101 apt=100\r\na=rtpmap:102 H264/90000\r\na=rtcp-fb:102 goog-remb\r\na=rtcp-fb:102 transport-cc\r\na=rtcp-fb:102 ccm fir\r\na=rtcp-fb:102 nack\r\na=rtcp-fb:102 nack pli\r\na=fmtp:102 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42001f\r\na=rtpmap:122 rtx/90000\r\na=fmtp:122 apt=102\r\na=rtpmap:127 H264/90000\r\na=rtcp-fb:127 goog-remb\r\na=rtcp-fb:127 transport-cc\r\na=rtcp-fb:127 ccm fir\r\na=rtcp-fb:127 nack\r\na=rtcp-fb:127 nack pli\r\na=fmtp:127 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f\r\na=rtpmap:121 rtx/90000\r\na=fmtp:121 apt=127\r\na=rtpmap:125 H264/90000\r\na=rtcp-fb:125 goog-remb\r\na=rtcp-fb:125 transport-cc\r\na=rtcp-fb:125 ccm fir\r\na=rtcp-fb:125 nack\r\na=rtcp-fb:125 nack pli\r\na=fmtp:125 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f\r\na=rtpmap:107 rtx/90000\r\na=fmtp:107 apt=125\r\na=rtpmap:108 H264/90000\r\na=rtcp-fb:108 goog-remb\r\na=rtcp-fb:108 transport-cc\r\na=rtcp-fb:108 ccm fir\r\na=rtcp-fb:108 nack\r\na=rtcp-fb:108 nack pli\r\na=fmtp:108 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=4d0032\r\na=rtpmap:109 rtx/90000\r\na=fmtp:109 apt=108\r\na=rtpmap:124 H264/90000\r\na=rtcp-fb:124 goog-remb\r\na=rtcp-fb:124 transport-cc\r\na=rtcp-fb:124 ccm fir\r\na=rtcp-fb:124 nack\r\na=rtcp-fb:124 nack pli\r\na=fmtp:124 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=640032\r\na=rtpmap:120 rtx/90000\r\na=fmtp:120 apt=124\r\na=rtpmap:123 red/90000\r\na=rtpmap:119 rtx/90000\r\na=fmtp:119 apt=123\r\na=rtpmap:114 ulpfec/90000\r\na=ssrc-group:FID 1714381393 967654061\r\na=ssrc:1714381393 cname:kufSZ8JnlRUuQVc2\r\na=ssrc:1714381393 msid:381b9efc-7cf5-45bb-8f39-c06558b288de 99d2faa8-950d-40f7-ad80-16789c9b4faa\r\na=ssrc:1714381393 mslabel:381b9efc-7cf5-45bb-8f39-c06558b288de\r\na=ssrc:1714381393 label:99d2faa8-950d-40f7-ad80-16789c9b4faa\r\na=ssrc:967654061 cname:kufSZ8JnlRUuQVc2\r\na=ssrc:967654061 msid:381b9efc-7cf5-45bb-8f39-c06558b288de 99d2faa8-950d-40f7-ad80-16789c9b4faa\r\na=ssrc:967654061 mslabel:381b9efc-7cf5-45bb-8f39-c06558b288de\r\na=ssrc:967654061 label:99d2faa8-950d-40f7-ad80-16789c9b4faa\r\n';
    const SDP_NO_OPUS_NO_STEREO =
      'v=0\r\no=- 135160591336882782 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE audio video\r\na=msid-semantic: WMS 381b9efc-7cf5-45bb-8f39-c06558b288de\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 110 112 113 126\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:Y5Zy\r\na=ice-pwd:yQLVrXgG+irP0tgLLr4ZjQb5\r\na=ice-options:trickle\r\na=fingerprint:sha-256 45:ED:86:FB:EB:FE:21:20:62:C4:07:81:AA:B8:BC:87:60:CC:2B:54:CE:D5:F0:16:93:C4:61:23:28:59:DF:8B\r\na=setup:actpass\r\na=mid:audio\r\na=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\na=sendrecv\r\na=rtcp-mux\r\na=rtpmap:111 opus/48000/2\r\na=rtcp-fb:111 transport-cc\r\na=rtpmap:103 ISAC/16000\r\na=rtpmap:104 ISAC/32000\r\na=rtpmap:9 G722/8000\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:8 PCMA/8000\r\na=rtpmap:106 CN/32000\r\na=rtpmap:105 CN/16000\r\na=rtpmap:13 CN/8000\r\na=rtpmap:110 telephone-event/48000\r\na=rtpmap:112 telephone-event/32000\r\na=rtpmap:113 telephone-event/16000\r\na=rtpmap:126 telephone-event/8000\r\na=ssrc:3652058873 cname:kufSZ8JnlRUuQVc2\r\na=ssrc:3652058873 msid:381b9efc-7cf5-45bb-8f39-c06558b288de 8841cbb1-90ba-4655-8784-60a185846706\r\na=ssrc:3652058873 mslabel:381b9efc-7cf5-45bb-8f39-c06558b288de\r\na=ssrc:3652058873 label:8841cbb1-90ba-4655-8784-60a185846706\r\nm=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 102 122 127 121 125 107 108 109 124 120 123 119 114\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:Y5Zy\r\na=ice-pwd:yQLVrXgG+irP0tgLLr4ZjQb5\r\na=ice-options:trickle\r\na=fingerprint:sha-256 45:ED:86:FB:EB:FE:21:20:62:C4:07:81:AA:B8:BC:87:60:CC:2B:54:CE:D5:F0:16:93:C4:61:23:28:59:DF:8B\r\na=setup:actpass\r\na=mid:video\r\na=extmap:2 urn:ietf:params:rtp-hdrext:toffset\r\na=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=extmap:4 urn:3gpp:video-orientation\r\na=extmap:5 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\r\na=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay\r\na=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type\r\na=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/video-timing\r\na=extmap:10 http://tools.ietf.org/html/draft-ietf-avtext-framemarking-07\r\na=sendrecv\r\na=rtcp-mux\r\na=rtcp-rsize\r\na=rtpmap:96 VP8/90000\r\na=rtcp-fb:96 goog-remb\r\na=rtcp-fb:96 transport-cc\r\na=rtcp-fb:96 ccm fir\r\na=rtcp-fb:96 nack\r\na=rtcp-fb:96 nack pli\r\na=rtpmap:97 rtx/90000\r\na=fmtp:97 apt=96\r\na=rtpmap:98 VP9/90000\r\na=rtcp-fb:98 goog-remb\r\na=rtcp-fb:98 transport-cc\r\na=rtcp-fb:98 ccm fir\r\na=rtcp-fb:98 nack\r\na=rtcp-fb:98 nack pli\r\na=fmtp:98 profile-id=0\r\na=rtpmap:99 rtx/90000\r\na=fmtp:99 apt=98\r\na=rtpmap:100 H264/90000\r\na=rtcp-fb:100 goog-remb\r\na=rtcp-fb:100 transport-cc\r\na=rtcp-fb:100 ccm fir\r\na=rtcp-fb:100 nack\r\na=rtcp-fb:100 nack pli\r\na=fmtp:100 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f\r\na=rtpmap:101 rtx/90000\r\na=fmtp:101 apt=100\r\na=rtpmap:102 H264/90000\r\na=rtcp-fb:102 goog-remb\r\na=rtcp-fb:102 transport-cc\r\na=rtcp-fb:102 ccm fir\r\na=rtcp-fb:102 nack\r\na=rtcp-fb:102 nack pli\r\na=fmtp:102 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42001f\r\na=rtpmap:122 rtx/90000\r\na=fmtp:122 apt=102\r\na=rtpmap:127 H264/90000\r\na=rtcp-fb:127 goog-remb\r\na=rtcp-fb:127 transport-cc\r\na=rtcp-fb:127 ccm fir\r\na=rtcp-fb:127 nack\r\na=rtcp-fb:127 nack pli\r\na=fmtp:127 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f\r\na=rtpmap:121 rtx/90000\r\na=fmtp:121 apt=127\r\na=rtpmap:125 H264/90000\r\na=rtcp-fb:125 goog-remb\r\na=rtcp-fb:125 transport-cc\r\na=rtcp-fb:125 ccm fir\r\na=rtcp-fb:125 nack\r\na=rtcp-fb:125 nack pli\r\na=fmtp:125 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f\r\na=rtpmap:107 rtx/90000\r\na=fmtp:107 apt=125\r\na=rtpmap:108 H264/90000\r\na=rtcp-fb:108 goog-remb\r\na=rtcp-fb:108 transport-cc\r\na=rtcp-fb:108 ccm fir\r\na=rtcp-fb:108 nack\r\na=rtcp-fb:108 nack pli\r\na=fmtp:108 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=4d0032\r\na=rtpmap:109 rtx/90000\r\na=fmtp:109 apt=108\r\na=rtpmap:124 H264/90000\r\na=rtcp-fb:124 goog-remb\r\na=rtcp-fb:124 transport-cc\r\na=rtcp-fb:124 ccm fir\r\na=rtcp-fb:124 nack\r\na=rtcp-fb:124 nack pli\r\na=fmtp:124 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=640032\r\na=rtpmap:120 rtx/90000\r\na=fmtp:120 apt=124\r\na=rtpmap:123 red/90000\r\na=rtpmap:119 rtx/90000\r\na=fmtp:119 apt=123\r\na=rtpmap:114 ulpfec/90000\r\na=ssrc-group:FID 1714381393 967654061\r\na=ssrc:1714381393 cname:kufSZ8JnlRUuQVc2\r\na=ssrc:1714381393 msid:381b9efc-7cf5-45bb-8f39-c06558b288de 99d2faa8-950d-40f7-ad80-16789c9b4faa\r\na=ssrc:1714381393 mslabel:381b9efc-7cf5-45bb-8f39-c06558b288de\r\na=ssrc:1714381393 label:99d2faa8-950d-40f7-ad80-16789c9b4faa\r\na=ssrc:967654061 cname:kufSZ8JnlRUuQVc2\r\na=ssrc:967654061 msid:381b9efc-7cf5-45bb-8f39-c06558b288de 99d2faa8-950d-40f7-ad80-16789c9b4faa\r\na=ssrc:967654061 mslabel:381b9efc-7cf5-45bb-8f39-c06558b288de\r\na=ssrc:967654061 label:99d2faa8-950d-40f7-ad80-16789c9b4faa\r\n';
    const SDP_NO_OPUS_STEREO =
      'v=0\r\no=- 135160591336882782 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE audio video\r\na=msid-semantic: WMS 381b9efc-7cf5-45bb-8f39-c06558b288de\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 110 112 113 126\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:Y5Zy\r\na=ice-pwd:yQLVrXgG+irP0tgLLr4ZjQb5\r\na=ice-options:trickle\r\na=fingerprint:sha-256 45:ED:86:FB:EB:FE:21:20:62:C4:07:81:AA:B8:BC:87:60:CC:2B:54:CE:D5:F0:16:93:C4:61:23:28:59:DF:8B\r\na=setup:actpass\r\na=mid:audio\r\na=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\na=sendrecv\r\na=rtcp-mux\r\na=rtpmap:111 opus/48000/2\r\na=fmtp:111 stereo=1; sprop-stereo=1\r\na=rtcp-fb:111 transport-cc\r\na=rtpmap:103 ISAC/16000\r\na=rtpmap:104 ISAC/32000\r\na=rtpmap:9 G722/8000\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:8 PCMA/8000\r\na=rtpmap:106 CN/32000\r\na=rtpmap:105 CN/16000\r\na=rtpmap:13 CN/8000\r\na=rtpmap:110 telephone-event/48000\r\na=rtpmap:112 telephone-event/32000\r\na=rtpmap:113 telephone-event/16000\r\na=rtpmap:126 telephone-event/8000\r\na=ssrc:3652058873 cname:kufSZ8JnlRUuQVc2\r\na=ssrc:3652058873 msid:381b9efc-7cf5-45bb-8f39-c06558b288de 8841cbb1-90ba-4655-8784-60a185846706\r\na=ssrc:3652058873 mslabel:381b9efc-7cf5-45bb-8f39-c06558b288de\r\na=ssrc:3652058873 label:8841cbb1-90ba-4655-8784-60a185846706\r\nm=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 102 122 127 121 125 107 108 109 124 120 123 119 114\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:Y5Zy\r\na=ice-pwd:yQLVrXgG+irP0tgLLr4ZjQb5\r\na=ice-options:trickle\r\na=fingerprint:sha-256 45:ED:86:FB:EB:FE:21:20:62:C4:07:81:AA:B8:BC:87:60:CC:2B:54:CE:D5:F0:16:93:C4:61:23:28:59:DF:8B\r\na=setup:actpass\r\na=mid:video\r\na=extmap:2 urn:ietf:params:rtp-hdrext:toffset\r\na=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=extmap:4 urn:3gpp:video-orientation\r\na=extmap:5 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\r\na=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay\r\na=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type\r\na=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/video-timing\r\na=extmap:10 http://tools.ietf.org/html/draft-ietf-avtext-framemarking-07\r\na=sendrecv\r\na=rtcp-mux\r\na=rtcp-rsize\r\na=rtpmap:96 VP8/90000\r\na=rtcp-fb:96 goog-remb\r\na=rtcp-fb:96 transport-cc\r\na=rtcp-fb:96 ccm fir\r\na=rtcp-fb:96 nack\r\na=rtcp-fb:96 nack pli\r\na=rtpmap:97 rtx/90000\r\na=fmtp:97 apt=96\r\na=rtpmap:98 VP9/90000\r\na=rtcp-fb:98 goog-remb\r\na=rtcp-fb:98 transport-cc\r\na=rtcp-fb:98 ccm fir\r\na=rtcp-fb:98 nack\r\na=rtcp-fb:98 nack pli\r\na=fmtp:98 profile-id=0\r\na=rtpmap:99 rtx/90000\r\na=fmtp:99 apt=98\r\na=rtpmap:100 H264/90000\r\na=rtcp-fb:100 goog-remb\r\na=rtcp-fb:100 transport-cc\r\na=rtcp-fb:100 ccm fir\r\na=rtcp-fb:100 nack\r\na=rtcp-fb:100 nack pli\r\na=fmtp:100 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f\r\na=rtpmap:101 rtx/90000\r\na=fmtp:101 apt=100\r\na=rtpmap:102 H264/90000\r\na=rtcp-fb:102 goog-remb\r\na=rtcp-fb:102 transport-cc\r\na=rtcp-fb:102 ccm fir\r\na=rtcp-fb:102 nack\r\na=rtcp-fb:102 nack pli\r\na=fmtp:102 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42001f\r\na=rtpmap:122 rtx/90000\r\na=fmtp:122 apt=102\r\na=rtpmap:127 H264/90000\r\na=rtcp-fb:127 goog-remb\r\na=rtcp-fb:127 transport-cc\r\na=rtcp-fb:127 ccm fir\r\na=rtcp-fb:127 nack\r\na=rtcp-fb:127 nack pli\r\na=fmtp:127 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f\r\na=rtpmap:121 rtx/90000\r\na=fmtp:121 apt=127\r\na=rtpmap:125 H264/90000\r\na=rtcp-fb:125 goog-remb\r\na=rtcp-fb:125 transport-cc\r\na=rtcp-fb:125 ccm fir\r\na=rtcp-fb:125 nack\r\na=rtcp-fb:125 nack pli\r\na=fmtp:125 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f\r\na=rtpmap:107 rtx/90000\r\na=fmtp:107 apt=125\r\na=rtpmap:108 H264/90000\r\na=rtcp-fb:108 goog-remb\r\na=rtcp-fb:108 transport-cc\r\na=rtcp-fb:108 ccm fir\r\na=rtcp-fb:108 nack\r\na=rtcp-fb:108 nack pli\r\na=fmtp:108 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=4d0032\r\na=rtpmap:109 rtx/90000\r\na=fmtp:109 apt=108\r\na=rtpmap:124 H264/90000\r\na=rtcp-fb:124 goog-remb\r\na=rtcp-fb:124 transport-cc\r\na=rtcp-fb:124 ccm fir\r\na=rtcp-fb:124 nack\r\na=rtcp-fb:124 nack pli\r\na=fmtp:124 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=640032\r\na=rtpmap:120 rtx/90000\r\na=fmtp:120 apt=124\r\na=rtpmap:123 red/90000\r\na=rtpmap:119 rtx/90000\r\na=fmtp:119 apt=123\r\na=rtpmap:114 ulpfec/90000\r\na=ssrc-group:FID 1714381393 967654061\r\na=ssrc:1714381393 cname:kufSZ8JnlRUuQVc2\r\na=ssrc:1714381393 msid:381b9efc-7cf5-45bb-8f39-c06558b288de 99d2faa8-950d-40f7-ad80-16789c9b4faa\r\na=ssrc:1714381393 mslabel:381b9efc-7cf5-45bb-8f39-c06558b288de\r\na=ssrc:1714381393 label:99d2faa8-950d-40f7-ad80-16789c9b4faa\r\na=ssrc:967654061 cname:kufSZ8JnlRUuQVc2\r\na=ssrc:967654061 msid:381b9efc-7cf5-45bb-8f39-c06558b288de 99d2faa8-950d-40f7-ad80-16789c9b4faa\r\na=ssrc:967654061 mslabel:381b9efc-7cf5-45bb-8f39-c06558b288de\r\na=ssrc:967654061 label:99d2faa8-950d-40f7-ad80-16789c9b4faa\r\n';
    it('set stereo=1 if a=fmtp is present', () => {
      expect(sdpStereoHack(SDP_OPUS_NO_STEREO)).toEqual(SDP_OPUS_STEREO);
    });

    it('set stereo=1 if a=fmtp is NOT present', () => {
      expect(sdpStereoHack(SDP_NO_OPUS_NO_STEREO)).toEqual(SDP_NO_OPUS_STEREO);
    });
  });

  describe('sdpMediaOrderHack', () => {
    const OFFER_OK =
      'v=0\r\no=mozilla...THIS_IS_SDPARTA-65.0 4664580510618001282 0 IN IP4 0.0.0.0\r\ns=-\r\nt=0 0\r\na=sendrecv\r\na=fingerprint:sha-256 37:18:D1:6A:F4:B6:DB:00:A0:48:4B:EC:CC:F3:E1:AF:DC:DB:DA:2C:E2:C0:6B:36:92:02:84:04:60:B5:EB:70\r\na=group:BUNDLE 0 1\r\na=ice-options:trickle\r\na=msid-semantic:WMS *\r\nm=audio 60578 UDP/TLS/RTP/SAVPF 109 9 0 8 101\r\nc=IN IP4 192.168.1.4\r\na=candidate:0 1 UDP 2122252543 192.168.1.4 60578 typ host\r\na=candidate:1 1 TCP 2105524479 192.168.1.4 9 typ host tcptype active\r\na=candidate:0 2 UDP 2122252542 192.168.1.4 56425 typ host\r\na=candidate:1 2 TCP 2105524478 192.168.1.4 9 typ host tcptype active\r\na=sendrecv\r\na=end-of-candidates\r\na=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\na=extmap:2/recvonly urn:ietf:params:rtp-hdrext:csrc-audio-level\r\na=extmap:3 urn:ietf:params:rtp-hdrext:sdes:mid\r\na=fmtp:109 maxplaybackrate=48000;stereo=1;useinbandfec=1\r\na=fmtp:101 0-15\r\na=ice-pwd:37573269874225f2b9ee22d8fc483281\r\na=ice-ufrag:e762c9de\r\na=mid:0\r\na=msid:{8de043d7-7ff5-5c46-8822-e0d9ffd96e73} {d3bf3e75-0c87-f849-a967-6ec743afd59b}\r\na=rtcp:56425 IN IP4 192.168.1.4\r\na=rtcp-mux\r\na=rtpmap:109 opus/48000/2\r\na=rtpmap:9 G722/8000/1\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:8 PCMA/8000\r\na=rtpmap:101 telephone-event/8000\r\na=setup:actpass\r\na=ssrc:3703202793 cname:{05f7b618-2088-4048-9d8a-37e95f7fd8b6}\r\nm=video 55993 UDP/TLS/RTP/SAVPF 120 121 126 97\r\nc=IN IP4 192.168.1.4\r\na=candidate:0 1 UDP 2122252543 192.168.1.4 55993 typ host\r\na=candidate:1 1 TCP 2105524479 192.168.1.4 9 typ host tcptype active\r\na=candidate:0 2 UDP 2122252542 192.168.1.4 54949 typ host\r\na=candidate:1 2 TCP 2105524478 192.168.1.4 9 typ host tcptype active\r\na=sendrecv\r\na=end-of-candidates\r\na=extmap:3 urn:ietf:params:rtp-hdrext:sdes:mid\r\na=extmap:4 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=extmap:5 urn:ietf:params:rtp-hdrext:toffset\r\na=fmtp:126 profile-level-id=42e01f;level-asymmetry-allowed=1;packetization-mode=1\r\na=fmtp:97 profile-level-id=42e01f;level-asymmetry-allowed=1\r\na=fmtp:120 max-fs=12288;max-fr=60\r\na=fmtp:121 max-fs=12288;max-fr=60\r\na=ice-pwd:37573269874225f2b9ee22d8fc483281\r\na=ice-ufrag:e762c9de\r\na=mid:1\r\na=msid:{8de043d7-7ff5-5c46-8822-e0d9ffd96e73} {77747bff-84dd-124b-8f35-3d84e89cd9fe}\r\na=rtcp:54949 IN IP4 192.168.1.4\r\na=rtcp-fb:120 nack\r\na=rtcp-fb:120 nack pli\r\na=rtcp-fb:120 ccm fir\r\na=rtcp-fb:120 goog-remb\r\na=rtcp-fb:121 nack\r\na=rtcp-fb:121 nack pli\r\na=rtcp-fb:121 ccm fir\r\na=rtcp-fb:121 goog-remb\r\na=rtcp-fb:126 nack\r\na=rtcp-fb:126 nack pli\r\na=rtcp-fb:126 ccm fir\r\na=rtcp-fb:126 goog-remb\r\na=rtcp-fb:97 nack\r\na=rtcp-fb:97 nack pli\r\na=rtcp-fb:97 ccm fir\r\na=rtcp-fb:97 goog-remb\r\na=rtcp-mux\r\na=rtpmap:120 VP8/90000\r\na=rtpmap:121 VP9/90000\r\na=rtpmap:126 H264/90000\r\na=rtpmap:97 H264/90000\r\na=setup:actpass\r\na=ssrc:3672465901 cname:{05f7b618-2088-4048-9d8a-37e95f7fd8b6}\r\n';
    const OFFER_KO =
      'v=0\r\no=mozilla...THIS_IS_SDPARTA-65.0 4664580510618001282 0 IN IP4 0.0.0.0\r\ns=-\r\nt=0 0\r\na=sendrecv\r\na=fingerprint:sha-256 37:18:D1:6A:F4:B6:DB:00:A0:48:4B:EC:CC:F3:E1:AF:DC:DB:DA:2C:E2:C0:6B:36:92:02:84:04:60:B5:EB:70\r\na=group:BUNDLE 0 1\r\na=ice-options:trickle\r\na=msid-semantic:WMS *\r\nm=video 55993 UDP/TLS/RTP/SAVPF 120 121 126 97\r\nc=IN IP4 192.168.1.4\r\na=candidate:0 1 UDP 2122252543 192.168.1.4 55993 typ host\r\na=candidate:1 1 TCP 2105524479 192.168.1.4 9 typ host tcptype active\r\na=candidate:0 2 UDP 2122252542 192.168.1.4 54949 typ host\r\na=candidate:1 2 TCP 2105524478 192.168.1.4 9 typ host tcptype active\r\na=sendrecv\r\na=end-of-candidates\r\na=extmap:3 urn:ietf:params:rtp-hdrext:sdes:mid\r\na=extmap:4 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=extmap:5 urn:ietf:params:rtp-hdrext:toffset\r\na=fmtp:126 profile-level-id=42e01f;level-asymmetry-allowed=1;packetization-mode=1\r\na=fmtp:97 profile-level-id=42e01f;level-asymmetry-allowed=1\r\na=fmtp:120 max-fs=12288;max-fr=60\r\na=fmtp:121 max-fs=12288;max-fr=60\r\na=ice-pwd:37573269874225f2b9ee22d8fc483281\r\na=ice-ufrag:e762c9de\r\na=mid:1\r\na=msid:{8de043d7-7ff5-5c46-8822-e0d9ffd96e73} {77747bff-84dd-124b-8f35-3d84e89cd9fe}\r\na=rtcp:54949 IN IP4 192.168.1.4\r\na=rtcp-fb:120 nack\r\na=rtcp-fb:120 nack pli\r\na=rtcp-fb:120 ccm fir\r\na=rtcp-fb:120 goog-remb\r\na=rtcp-fb:121 nack\r\na=rtcp-fb:121 nack pli\r\na=rtcp-fb:121 ccm fir\r\na=rtcp-fb:121 goog-remb\r\na=rtcp-fb:126 nack\r\na=rtcp-fb:126 nack pli\r\na=rtcp-fb:126 ccm fir\r\na=rtcp-fb:126 goog-remb\r\na=rtcp-fb:97 nack\r\na=rtcp-fb:97 nack pli\r\na=rtcp-fb:97 ccm fir\r\na=rtcp-fb:97 goog-remb\r\na=rtcp-mux\r\na=rtpmap:120 VP8/90000\r\na=rtpmap:121 VP9/90000\r\na=rtpmap:126 H264/90000\r\na=rtpmap:97 H264/90000\r\na=setup:actpass\r\na=ssrc:3672465901 cname:{05f7b618-2088-4048-9d8a-37e95f7fd8b6}\r\nm=audio 60578 UDP/TLS/RTP/SAVPF 109 9 0 8 101\r\nc=IN IP4 192.168.1.4\r\na=candidate:0 1 UDP 2122252543 192.168.1.4 60578 typ host\r\na=candidate:1 1 TCP 2105524479 192.168.1.4 9 typ host tcptype active\r\na=candidate:0 2 UDP 2122252542 192.168.1.4 56425 typ host\r\na=candidate:1 2 TCP 2105524478 192.168.1.4 9 typ host tcptype active\r\na=sendrecv\r\na=end-of-candidates\r\na=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\na=extmap:2/recvonly urn:ietf:params:rtp-hdrext:csrc-audio-level\r\na=extmap:3 urn:ietf:params:rtp-hdrext:sdes:mid\r\na=fmtp:109 maxplaybackrate=48000;stereo=1;useinbandfec=1\r\na=fmtp:101 0-15\r\na=ice-pwd:37573269874225f2b9ee22d8fc483281\r\na=ice-ufrag:e762c9de\r\na=mid:0\r\na=msid:{8de043d7-7ff5-5c46-8822-e0d9ffd96e73} {d3bf3e75-0c87-f849-a967-6ec743afd59b}\r\na=rtcp:56425 IN IP4 192.168.1.4\r\na=rtcp-mux\r\na=rtpmap:109 opus/48000/2\r\na=rtpmap:9 G722/8000/1\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:8 PCMA/8000\r\na=rtpmap:101 telephone-event/8000\r\na=setup:actpass\r\na=ssrc:3703202793 cname:{05f7b618-2088-4048-9d8a-37e95f7fd8b6}\r\n';
    const ANSWER =
      'v=0\r\no=FreeSWITCH 1548927489 1548927490 IN IP4 190.102.98.65\r\ns=FreeSWITCH\r\nc=IN IP4 190.102.98.65\r\nt=0 0\r\na=msid-semantic: WMS 2OlCk4kjBnIzrzS1reSby6Zc0RIbdof6\r\nm=audio 21632 UDP/TLS/RTP/SAVPF 109 101\r\na=rtpmap:109 opus/48000/2\r\na=fmtp:109 useinbandfec=0; stereo=1\r\na=rtpmap:101 telephone-event/8000\r\na=silenceSupp:off - - - -\r\na=ptime:20\r\na=sendrecv\r\na=fingerprint:sha-256 2D:89:4F:82:44:AC:3C:CB:B3:63:AC:17:11:49:4E:11:1A:7D:70:2D:18:51:00:76:03:E1:82:72:92:3F:20:5B\r\na=setup:active\r\na=rtcp-mux\r\na=rtcp:21632 IN IP4 190.102.98.65\r\na=ice-ufrag:1NDpJtrAbZCfeHb7\r\na=ice-pwd:Zzab7nPT9SXkERNvvhK5B2wC\r\na=candidate:7330097990 1 udp 659136 190.102.98.65 21632 typ host generation 0\r\na=end-of-candidates\r\na=ssrc:3361527577 cname:3rydmInNWVddlW4C\r\na=ssrc:3361527577 msid:2OlCk4kjBnIzrzS1reSby6Zc0RIbdof6 a0\r\na=ssrc:3361527577 mslabel:2OlCk4kjBnIzrzS1reSby6Zc0RIbdof6\r\na=ssrc:3361527577 label:2OlCk4kjBnIzrzS1reSby6Zc0RIbdof6a0\r\nm=video 32174 UDP/TLS/RTP/SAVPF 120\r\nb=AS:5120\r\na=rtpmap:120 VP8/90000\r\na=fmtp:120 max-fs=12288;max-fr=60\r\na=sendrecv\r\na=fingerprint:sha-256 2D:89:4F:82:44:AC:3C:CB:B3:63:AC:17:11:49:4E:11:1A:7D:70:2D:18:51:00:76:03:E1:82:72:92:3F:20:5B\r\na=setup:active\r\na=rtcp-mux\r\na=rtcp:32174 IN IP4 190.102.98.65\r\na=rtcp-fb:120 ccm fir\r\na=rtcp-fb:120 nack\r\na=rtcp-fb:120 nack pli\r\na=ssrc:2587074312 cname:3rydmInNWVddlW4C\r\na=ssrc:2587074312 msid:2OlCk4kjBnIzrzS1reSby6Zc0RIbdof6 v0\r\na=ssrc:2587074312 mslabel:2OlCk4kjBnIzrzS1reSby6Zc0RIbdof6\r\na=ssrc:2587074312 label:2OlCk4kjBnIzrzS1reSby6Zc0RIbdof6v0\r\na=ice-ufrag:a18QY1pFCOxw1p3M\r\na=ice-pwd:jbKGpwsMOR8bsqKsiI96zoB2\r\na=candidate:4637747447 1 udp 659136 190.102.98.65 32174 typ host generation 0\r\na=end-of-candidates\r\n';
    const ANSWER_REVERTED =
      'v=0\r\no=FreeSWITCH 1548927489 1548927490 IN IP4 190.102.98.65\r\ns=FreeSWITCH\r\nc=IN IP4 190.102.98.65\r\nt=0 0\r\na=msid-semantic: WMS 2OlCk4kjBnIzrzS1reSby6Zc0RIbdof6\r\nm=video 32174 UDP/TLS/RTP/SAVPF 120\r\nb=AS:5120\r\na=rtpmap:120 VP8/90000\r\na=fmtp:120 max-fs=12288;max-fr=60\r\na=sendrecv\r\na=fingerprint:sha-256 2D:89:4F:82:44:AC:3C:CB:B3:63:AC:17:11:49:4E:11:1A:7D:70:2D:18:51:00:76:03:E1:82:72:92:3F:20:5B\r\na=setup:active\r\na=rtcp-mux\r\na=rtcp:32174 IN IP4 190.102.98.65\r\na=rtcp-fb:120 ccm fir\r\na=rtcp-fb:120 nack\r\na=rtcp-fb:120 nack pli\r\na=ssrc:2587074312 cname:3rydmInNWVddlW4C\r\na=ssrc:2587074312 msid:2OlCk4kjBnIzrzS1reSby6Zc0RIbdof6 v0\r\na=ssrc:2587074312 mslabel:2OlCk4kjBnIzrzS1reSby6Zc0RIbdof6\r\na=ssrc:2587074312 label:2OlCk4kjBnIzrzS1reSby6Zc0RIbdof6v0\r\na=ice-ufrag:a18QY1pFCOxw1p3M\r\na=ice-pwd:jbKGpwsMOR8bsqKsiI96zoB2\r\na=candidate:4637747447 1 udp 659136 190.102.98.65 32174 typ host generation 0\r\na=end-of-candidates\r\nm=audio 21632 UDP/TLS/RTP/SAVPF 109 101\r\na=rtpmap:109 opus/48000/2\r\na=fmtp:109 useinbandfec=0; stereo=1\r\na=rtpmap:101 telephone-event/8000\r\na=silenceSupp:off - - - -\r\na=ptime:20\r\na=sendrecv\r\na=fingerprint:sha-256 2D:89:4F:82:44:AC:3C:CB:B3:63:AC:17:11:49:4E:11:1A:7D:70:2D:18:51:00:76:03:E1:82:72:92:3F:20:5B\r\na=setup:active\r\na=rtcp-mux\r\na=rtcp:21632 IN IP4 190.102.98.65\r\na=ice-ufrag:1NDpJtrAbZCfeHb7\r\na=ice-pwd:Zzab7nPT9SXkERNvvhK5B2wC\r\na=candidate:7330097990 1 udp 659136 190.102.98.65 21632 typ host generation 0\r\na=end-of-candidates\r\na=ssrc:3361527577 cname:3rydmInNWVddlW4C\r\na=ssrc:3361527577 msid:2OlCk4kjBnIzrzS1reSby6Zc0RIbdof6 a0\r\na=ssrc:3361527577 mslabel:2OlCk4kjBnIzrzS1reSby6Zc0RIbdof6\r\na=ssrc:3361527577 label:2OlCk4kjBnIzrzS1reSby6Zc0RIbdof6a0\r\n';
    it('reorder sdp media lines for audio to come first', () => {
      expect(sdpMediaOrderHack(ANSWER, OFFER_KO)).toEqual(ANSWER_REVERTED);
    });

    it('if audio already comes first, do nothing', () => {
      expect(sdpMediaOrderHack(ANSWER, OFFER_OK)).toEqual(ANSWER);
    });
  });

  describe('sdpBitrateHack', () => {
    it('change the SDP properly with default values', () => {
      const SDP =
        'v=0\r\no=- 135160591336882782 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE audio video\r\na=msid-semantic: WMS 381b9efc-7cf5-45bb-8f39-c06558b288de\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 110 112 113 126\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:Y5Zy\r\na=ice-pwd:yQLVrXgG+irP0tgLLr4ZjQb5\r\na=ice-options:trickle\r\na=fingerprint:sha-256 45:ED:86:FB:EB:FE:21:20:62:C4:07:81:AA:B8:BC:87:60:CC:2B:54:CE:D5:F0:16:93:C4:61:23:28:59:DF:8B\r\na=setup:actpass\r\na=mid:audio\r\na=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\na=sendrecv\r\na=rtcp-mux\r\na=rtpmap:111 opus/48000/2\r\na=rtcp-fb:111 transport-cc\r\na=fmtp:111 minptime=10;useinbandfec=1\r\na=rtpmap:103 ISAC/16000\r\na=rtpmap:104 ISAC/32000\r\na=rtpmap:9 G722/8000\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:8 PCMA/8000\r\na=rtpmap:106 CN/32000\r\na=rtpmap:105 CN/16000\r\na=rtpmap:13 CN/8000\r\na=rtpmap:110 telephone-event/48000\r\na=rtpmap:112 telephone-event/32000\r\na=rtpmap:113 telephone-event/16000\r\na=rtpmap:126 telephone-event/8000\r\na=ssrc:3652058873 cname:kufSZ8JnlRUuQVc2\r\na=ssrc:3652058873 msid:381b9efc-7cf5-45bb-8f39-c06558b288de 8841cbb1-90ba-4655-8784-60a185846706\r\na=ssrc:3652058873 mslabel:381b9efc-7cf5-45bb-8f39-c06558b288de\r\na=ssrc:3652058873 label:8841cbb1-90ba-4655-8784-60a185846706\r\nm=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 102 122 127 121 125 107 108 109 124 120 123 119 114\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:Y5Zy\r\na=ice-pwd:yQLVrXgG+irP0tgLLr4ZjQb5\r\na=ice-options:trickle\r\na=fingerprint:sha-256 45:ED:86:FB:EB:FE:21:20:62:C4:07:81:AA:B8:BC:87:60:CC:2B:54:CE:D5:F0:16:93:C4:61:23:28:59:DF:8B\r\na=setup:actpass\r\na=mid:video\r\na=extmap:2 urn:ietf:params:rtp-hdrext:toffset\r\na=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=extmap:4 urn:3gpp:video-orientation\r\na=extmap:5 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\r\na=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay\r\na=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type\r\na=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/video-timing\r\na=extmap:10 http://tools.ietf.org/html/draft-ietf-avtext-framemarking-07\r\na=sendrecv\r\na=rtcp-mux\r\na=rtcp-rsize\r\na=rtpmap:96 VP8/90000\r\na=rtcp-fb:96 goog-remb\r\na=rtcp-fb:96 transport-cc\r\na=rtcp-fb:96 ccm fir\r\na=rtcp-fb:96 nack\r\na=rtcp-fb:96 nack pli\r\na=rtpmap:97 rtx/90000\r\na=fmtp:97 apt=96\r\na=rtpmap:98 VP9/90000\r\na=rtcp-fb:98 goog-remb\r\na=rtcp-fb:98 transport-cc\r\na=rtcp-fb:98 ccm fir\r\na=rtcp-fb:98 nack\r\na=rtcp-fb:98 nack pli\r\na=fmtp:98 profile-id=0\r\na=rtpmap:99 rtx/90000\r\na=fmtp:99 apt=98\r\na=rtpmap:100 H264/90000\r\na=rtcp-fb:100 goog-remb\r\na=rtcp-fb:100 transport-cc\r\na=rtcp-fb:100 ccm fir\r\na=rtcp-fb:100 nack\r\na=rtcp-fb:100 nack pli\r\na=fmtp:100 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f\r\na=rtpmap:101 rtx/90000\r\na=fmtp:101 apt=100\r\na=rtpmap:102 H264/90000\r\na=rtcp-fb:102 goog-remb\r\na=rtcp-fb:102 transport-cc\r\na=rtcp-fb:102 ccm fir\r\na=rtcp-fb:102 nack\r\na=rtcp-fb:102 nack pli\r\na=fmtp:102 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42001f\r\na=rtpmap:122 rtx/90000\r\na=fmtp:122 apt=102\r\na=rtpmap:127 H264/90000\r\na=rtcp-fb:127 goog-remb\r\na=rtcp-fb:127 transport-cc\r\na=rtcp-fb:127 ccm fir\r\na=rtcp-fb:127 nack\r\na=rtcp-fb:127 nack pli\r\na=fmtp:127 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f\r\na=rtpmap:121 rtx/90000\r\na=fmtp:121 apt=127\r\na=rtpmap:125 H264/90000\r\na=rtcp-fb:125 goog-remb\r\na=rtcp-fb:125 transport-cc\r\na=rtcp-fb:125 ccm fir\r\na=rtcp-fb:125 nack\r\na=rtcp-fb:125 nack pli\r\na=fmtp:125 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f\r\na=rtpmap:107 rtx/90000\r\na=fmtp:107 apt=125\r\na=rtpmap:108 H264/90000\r\na=rtcp-fb:108 goog-remb\r\na=rtcp-fb:108 transport-cc\r\na=rtcp-fb:108 ccm fir\r\na=rtcp-fb:108 nack\r\na=rtcp-fb:108 nack pli\r\na=fmtp:108 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=4d0032\r\na=rtpmap:109 rtx/90000\r\na=fmtp:109 apt=108\r\na=rtpmap:124 H264/90000\r\na=rtcp-fb:124 goog-remb\r\na=rtcp-fb:124 transport-cc\r\na=rtcp-fb:124 ccm fir\r\na=rtcp-fb:124 nack\r\na=rtcp-fb:124 nack pli\r\na=fmtp:124 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=640032\r\na=rtpmap:120 rtx/90000\r\na=fmtp:120 apt=124\r\na=rtpmap:123 red/90000\r\na=rtpmap:119 rtx/90000\r\na=fmtp:119 apt=123\r\na=rtpmap:114 ulpfec/90000\r\na=ssrc-group:FID 1714381393 967654061\r\na=ssrc:1714381393 cname:kufSZ8JnlRUuQVc2\r\na=ssrc:1714381393 msid:381b9efc-7cf5-45bb-8f39-c06558b288de 99d2faa8-950d-40f7-ad80-16789c9b4faa\r\na=ssrc:1714381393 mslabel:381b9efc-7cf5-45bb-8f39-c06558b288de\r\na=ssrc:1714381393 label:99d2faa8-950d-40f7-ad80-16789c9b4faa\r\na=ssrc:967654061 cname:kufSZ8JnlRUuQVc2\r\na=ssrc:967654061 msid:381b9efc-7cf5-45bb-8f39-c06558b288de 99d2faa8-950d-40f7-ad80-16789c9b4faa\r\na=ssrc:967654061 mslabel:381b9efc-7cf5-45bb-8f39-c06558b288de\r\na=ssrc:967654061 label:99d2faa8-950d-40f7-ad80-16789c9b4faa\r\n';
      const SDP_CHANGED =
        'v=0\r\no=- 135160591336882782 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE audio video\r\na=msid-semantic: WMS 381b9efc-7cf5-45bb-8f39-c06558b288de\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 110 112 113 126\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:Y5Zy\r\na=ice-pwd:yQLVrXgG+irP0tgLLr4ZjQb5\r\na=ice-options:trickle\r\na=fingerprint:sha-256 45:ED:86:FB:EB:FE:21:20:62:C4:07:81:AA:B8:BC:87:60:CC:2B:54:CE:D5:F0:16:93:C4:61:23:28:59:DF:8B\r\na=setup:actpass\r\na=mid:audio\r\na=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\na=sendrecv\r\na=rtcp-mux\r\na=rtpmap:111 opus/48000/2\r\na=rtcp-fb:111 transport-cc\r\na=fmtp:111 minptime=10;useinbandfec=1;x-google-max-bitrate=2048;x-google-min-bitrate=0;x-google-start-bitrate=1024\r\na=rtpmap:103 ISAC/16000\r\na=rtpmap:104 ISAC/32000\r\na=rtpmap:9 G722/8000\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:8 PCMA/8000\r\na=rtpmap:106 CN/32000\r\na=rtpmap:105 CN/16000\r\na=rtpmap:13 CN/8000\r\na=rtpmap:110 telephone-event/48000\r\na=rtpmap:112 telephone-event/32000\r\na=rtpmap:113 telephone-event/16000\r\na=rtpmap:126 telephone-event/8000\r\na=ssrc:3652058873 cname:kufSZ8JnlRUuQVc2\r\na=ssrc:3652058873 msid:381b9efc-7cf5-45bb-8f39-c06558b288de 8841cbb1-90ba-4655-8784-60a185846706\r\na=ssrc:3652058873 mslabel:381b9efc-7cf5-45bb-8f39-c06558b288de\r\na=ssrc:3652058873 label:8841cbb1-90ba-4655-8784-60a185846706\r\nm=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 102 122 127 121 125 107 108 109 124 120 123 119 114\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:Y5Zy\r\na=ice-pwd:yQLVrXgG+irP0tgLLr4ZjQb5\r\na=ice-options:trickle\r\na=fingerprint:sha-256 45:ED:86:FB:EB:FE:21:20:62:C4:07:81:AA:B8:BC:87:60:CC:2B:54:CE:D5:F0:16:93:C4:61:23:28:59:DF:8B\r\na=setup:actpass\r\na=mid:video\r\nb=AS:2048\r\na=extmap:2 urn:ietf:params:rtp-hdrext:toffset\r\na=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=extmap:4 urn:3gpp:video-orientation\r\na=extmap:5 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\r\na=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay\r\na=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type\r\na=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/video-timing\r\na=extmap:10 http://tools.ietf.org/html/draft-ietf-avtext-framemarking-07\r\na=sendrecv\r\na=rtcp-mux\r\na=rtcp-rsize\r\na=rtpmap:96 VP8/90000\r\na=rtcp-fb:96 goog-remb\r\na=rtcp-fb:96 transport-cc\r\na=rtcp-fb:96 ccm fir\r\na=rtcp-fb:96 nack\r\na=rtcp-fb:96 nack pli\r\na=rtpmap:97 rtx/90000\r\na=fmtp:97 apt=96;x-google-max-bitrate=2048;x-google-min-bitrate=0;x-google-start-bitrate=1024\r\na=rtpmap:98 VP9/90000\r\na=rtcp-fb:98 goog-remb\r\na=rtcp-fb:98 transport-cc\r\na=rtcp-fb:98 ccm fir\r\na=rtcp-fb:98 nack\r\na=rtcp-fb:98 nack pli\r\na=fmtp:98 profile-id=0;x-google-max-bitrate=2048;x-google-min-bitrate=0;x-google-start-bitrate=1024\r\na=rtpmap:99 rtx/90000\r\na=fmtp:99 apt=98;x-google-max-bitrate=2048;x-google-min-bitrate=0;x-google-start-bitrate=1024\r\na=rtpmap:100 H264/90000\r\na=rtcp-fb:100 goog-remb\r\na=rtcp-fb:100 transport-cc\r\na=rtcp-fb:100 ccm fir\r\na=rtcp-fb:100 nack\r\na=rtcp-fb:100 nack pli\r\na=fmtp:100 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f;x-google-max-bitrate=2048;x-google-min-bitrate=0;x-google-start-bitrate=1024\r\na=rtpmap:101 rtx/90000\r\na=fmtp:101 apt=100;x-google-max-bitrate=2048;x-google-min-bitrate=0;x-google-start-bitrate=1024\r\na=rtpmap:102 H264/90000\r\na=rtcp-fb:102 goog-remb\r\na=rtcp-fb:102 transport-cc\r\na=rtcp-fb:102 ccm fir\r\na=rtcp-fb:102 nack\r\na=rtcp-fb:102 nack pli\r\na=fmtp:102 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42001f;x-google-max-bitrate=2048;x-google-min-bitrate=0;x-google-start-bitrate=1024\r\na=rtpmap:122 rtx/90000\r\na=fmtp:122 apt=102;x-google-max-bitrate=2048;x-google-min-bitrate=0;x-google-start-bitrate=1024\r\na=rtpmap:127 H264/90000\r\na=rtcp-fb:127 goog-remb\r\na=rtcp-fb:127 transport-cc\r\na=rtcp-fb:127 ccm fir\r\na=rtcp-fb:127 nack\r\na=rtcp-fb:127 nack pli\r\na=fmtp:127 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f;x-google-max-bitrate=2048;x-google-min-bitrate=0;x-google-start-bitrate=1024\r\na=rtpmap:121 rtx/90000\r\na=fmtp:121 apt=127;x-google-max-bitrate=2048;x-google-min-bitrate=0;x-google-start-bitrate=1024\r\na=rtpmap:125 H264/90000\r\na=rtcp-fb:125 goog-remb\r\na=rtcp-fb:125 transport-cc\r\na=rtcp-fb:125 ccm fir\r\na=rtcp-fb:125 nack\r\na=rtcp-fb:125 nack pli\r\na=fmtp:125 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f;x-google-max-bitrate=2048;x-google-min-bitrate=0;x-google-start-bitrate=1024\r\na=rtpmap:107 rtx/90000\r\na=fmtp:107 apt=125;x-google-max-bitrate=2048;x-google-min-bitrate=0;x-google-start-bitrate=1024\r\na=rtpmap:108 H264/90000\r\na=rtcp-fb:108 goog-remb\r\na=rtcp-fb:108 transport-cc\r\na=rtcp-fb:108 ccm fir\r\na=rtcp-fb:108 nack\r\na=rtcp-fb:108 nack pli\r\na=fmtp:108 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=4d0032;x-google-max-bitrate=2048;x-google-min-bitrate=0;x-google-start-bitrate=1024\r\na=rtpmap:109 rtx/90000\r\na=fmtp:109 apt=108;x-google-max-bitrate=2048;x-google-min-bitrate=0;x-google-start-bitrate=1024\r\na=rtpmap:124 H264/90000\r\na=rtcp-fb:124 goog-remb\r\na=rtcp-fb:124 transport-cc\r\na=rtcp-fb:124 ccm fir\r\na=rtcp-fb:124 nack\r\na=rtcp-fb:124 nack pli\r\na=fmtp:124 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=640032;x-google-max-bitrate=2048;x-google-min-bitrate=0;x-google-start-bitrate=1024\r\na=rtpmap:120 rtx/90000\r\na=fmtp:120 apt=124;x-google-max-bitrate=2048;x-google-min-bitrate=0;x-google-start-bitrate=1024\r\na=rtpmap:123 red/90000\r\na=rtpmap:119 rtx/90000\r\na=fmtp:119 apt=123;x-google-max-bitrate=2048;x-google-min-bitrate=0;x-google-start-bitrate=1024\r\na=rtpmap:114 ulpfec/90000\r\na=ssrc-group:FID 1714381393 967654061\r\na=ssrc:1714381393 cname:kufSZ8JnlRUuQVc2\r\na=ssrc:1714381393 msid:381b9efc-7cf5-45bb-8f39-c06558b288de 99d2faa8-950d-40f7-ad80-16789c9b4faa\r\na=ssrc:1714381393 mslabel:381b9efc-7cf5-45bb-8f39-c06558b288de\r\na=ssrc:1714381393 label:99d2faa8-950d-40f7-ad80-16789c9b4faa\r\na=ssrc:967654061 cname:kufSZ8JnlRUuQVc2\r\na=ssrc:967654061 msid:381b9efc-7cf5-45bb-8f39-c06558b288de 99d2faa8-950d-40f7-ad80-16789c9b4faa\r\na=ssrc:967654061 mslabel:381b9efc-7cf5-45bb-8f39-c06558b288de\r\na=ssrc:967654061 label:99d2faa8-950d-40f7-ad80-16789c9b4faa\r\n';
      expect(sdpBitrateHack(SDP, 2048, 0, 1024)).toEqual(SDP_CHANGED);
    });

    it('change the SDP properly with other values', () => {
      const SDP =
        'v=0\r\no=- 135160591336882782 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE audio video\r\na=msid-semantic: WMS 381b9efc-7cf5-45bb-8f39-c06558b288de\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 110 112 113 126\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:Y5Zy\r\na=ice-pwd:yQLVrXgG+irP0tgLLr4ZjQb5\r\na=ice-options:trickle\r\na=fingerprint:sha-256 45:ED:86:FB:EB:FE:21:20:62:C4:07:81:AA:B8:BC:87:60:CC:2B:54:CE:D5:F0:16:93:C4:61:23:28:59:DF:8B\r\na=setup:actpass\r\na=mid:audio\r\na=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\na=sendrecv\r\na=rtcp-mux\r\na=rtpmap:111 opus/48000/2\r\na=rtcp-fb:111 transport-cc\r\na=fmtp:111 minptime=10;useinbandfec=1\r\na=rtpmap:103 ISAC/16000\r\na=rtpmap:104 ISAC/32000\r\na=rtpmap:9 G722/8000\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:8 PCMA/8000\r\na=rtpmap:106 CN/32000\r\na=rtpmap:105 CN/16000\r\na=rtpmap:13 CN/8000\r\na=rtpmap:110 telephone-event/48000\r\na=rtpmap:112 telephone-event/32000\r\na=rtpmap:113 telephone-event/16000\r\na=rtpmap:126 telephone-event/8000\r\na=ssrc:3652058873 cname:kufSZ8JnlRUuQVc2\r\na=ssrc:3652058873 msid:381b9efc-7cf5-45bb-8f39-c06558b288de 8841cbb1-90ba-4655-8784-60a185846706\r\na=ssrc:3652058873 mslabel:381b9efc-7cf5-45bb-8f39-c06558b288de\r\na=ssrc:3652058873 label:8841cbb1-90ba-4655-8784-60a185846706\r\nm=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 102 122 127 121 125 107 108 109 124 120 123 119 114\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:Y5Zy\r\na=ice-pwd:yQLVrXgG+irP0tgLLr4ZjQb5\r\na=ice-options:trickle\r\na=fingerprint:sha-256 45:ED:86:FB:EB:FE:21:20:62:C4:07:81:AA:B8:BC:87:60:CC:2B:54:CE:D5:F0:16:93:C4:61:23:28:59:DF:8B\r\na=setup:actpass\r\na=mid:video\r\na=extmap:2 urn:ietf:params:rtp-hdrext:toffset\r\na=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=extmap:4 urn:3gpp:video-orientation\r\na=extmap:5 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\r\na=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay\r\na=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type\r\na=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/video-timing\r\na=extmap:10 http://tools.ietf.org/html/draft-ietf-avtext-framemarking-07\r\na=sendrecv\r\na=rtcp-mux\r\na=rtcp-rsize\r\na=rtpmap:96 VP8/90000\r\na=rtcp-fb:96 goog-remb\r\na=rtcp-fb:96 transport-cc\r\na=rtcp-fb:96 ccm fir\r\na=rtcp-fb:96 nack\r\na=rtcp-fb:96 nack pli\r\na=rtpmap:97 rtx/90000\r\na=fmtp:97 apt=96\r\na=rtpmap:98 VP9/90000\r\na=rtcp-fb:98 goog-remb\r\na=rtcp-fb:98 transport-cc\r\na=rtcp-fb:98 ccm fir\r\na=rtcp-fb:98 nack\r\na=rtcp-fb:98 nack pli\r\na=fmtp:98 profile-id=0\r\na=rtpmap:99 rtx/90000\r\na=fmtp:99 apt=98\r\na=rtpmap:100 H264/90000\r\na=rtcp-fb:100 goog-remb\r\na=rtcp-fb:100 transport-cc\r\na=rtcp-fb:100 ccm fir\r\na=rtcp-fb:100 nack\r\na=rtcp-fb:100 nack pli\r\na=fmtp:100 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f\r\na=rtpmap:101 rtx/90000\r\na=fmtp:101 apt=100\r\na=rtpmap:102 H264/90000\r\na=rtcp-fb:102 goog-remb\r\na=rtcp-fb:102 transport-cc\r\na=rtcp-fb:102 ccm fir\r\na=rtcp-fb:102 nack\r\na=rtcp-fb:102 nack pli\r\na=fmtp:102 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42001f\r\na=rtpmap:122 rtx/90000\r\na=fmtp:122 apt=102\r\na=rtpmap:127 H264/90000\r\na=rtcp-fb:127 goog-remb\r\na=rtcp-fb:127 transport-cc\r\na=rtcp-fb:127 ccm fir\r\na=rtcp-fb:127 nack\r\na=rtcp-fb:127 nack pli\r\na=fmtp:127 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f\r\na=rtpmap:121 rtx/90000\r\na=fmtp:121 apt=127\r\na=rtpmap:125 H264/90000\r\na=rtcp-fb:125 goog-remb\r\na=rtcp-fb:125 transport-cc\r\na=rtcp-fb:125 ccm fir\r\na=rtcp-fb:125 nack\r\na=rtcp-fb:125 nack pli\r\na=fmtp:125 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f\r\na=rtpmap:107 rtx/90000\r\na=fmtp:107 apt=125\r\na=rtpmap:108 H264/90000\r\na=rtcp-fb:108 goog-remb\r\na=rtcp-fb:108 transport-cc\r\na=rtcp-fb:108 ccm fir\r\na=rtcp-fb:108 nack\r\na=rtcp-fb:108 nack pli\r\na=fmtp:108 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=4d0032\r\na=rtpmap:109 rtx/90000\r\na=fmtp:109 apt=108\r\na=rtpmap:124 H264/90000\r\na=rtcp-fb:124 goog-remb\r\na=rtcp-fb:124 transport-cc\r\na=rtcp-fb:124 ccm fir\r\na=rtcp-fb:124 nack\r\na=rtcp-fb:124 nack pli\r\na=fmtp:124 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=640032\r\na=rtpmap:120 rtx/90000\r\na=fmtp:120 apt=124\r\na=rtpmap:123 red/90000\r\na=rtpmap:119 rtx/90000\r\na=fmtp:119 apt=123\r\na=rtpmap:114 ulpfec/90000\r\na=ssrc-group:FID 1714381393 967654061\r\na=ssrc:1714381393 cname:kufSZ8JnlRUuQVc2\r\na=ssrc:1714381393 msid:381b9efc-7cf5-45bb-8f39-c06558b288de 99d2faa8-950d-40f7-ad80-16789c9b4faa\r\na=ssrc:1714381393 mslabel:381b9efc-7cf5-45bb-8f39-c06558b288de\r\na=ssrc:1714381393 label:99d2faa8-950d-40f7-ad80-16789c9b4faa\r\na=ssrc:967654061 cname:kufSZ8JnlRUuQVc2\r\na=ssrc:967654061 msid:381b9efc-7cf5-45bb-8f39-c06558b288de 99d2faa8-950d-40f7-ad80-16789c9b4faa\r\na=ssrc:967654061 mslabel:381b9efc-7cf5-45bb-8f39-c06558b288de\r\na=ssrc:967654061 label:99d2faa8-950d-40f7-ad80-16789c9b4faa\r\n';
      const SDP_CHANGED =
        'v=0\r\no=- 135160591336882782 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE audio video\r\na=msid-semantic: WMS 381b9efc-7cf5-45bb-8f39-c06558b288de\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 110 112 113 126\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:Y5Zy\r\na=ice-pwd:yQLVrXgG+irP0tgLLr4ZjQb5\r\na=ice-options:trickle\r\na=fingerprint:sha-256 45:ED:86:FB:EB:FE:21:20:62:C4:07:81:AA:B8:BC:87:60:CC:2B:54:CE:D5:F0:16:93:C4:61:23:28:59:DF:8B\r\na=setup:actpass\r\na=mid:audio\r\na=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\na=sendrecv\r\na=rtcp-mux\r\na=rtpmap:111 opus/48000/2\r\na=rtcp-fb:111 transport-cc\r\na=fmtp:111 minptime=10;useinbandfec=1;x-google-max-bitrate=3072;x-google-min-bitrate=384;x-google-start-bitrate=1536\r\na=rtpmap:103 ISAC/16000\r\na=rtpmap:104 ISAC/32000\r\na=rtpmap:9 G722/8000\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:8 PCMA/8000\r\na=rtpmap:106 CN/32000\r\na=rtpmap:105 CN/16000\r\na=rtpmap:13 CN/8000\r\na=rtpmap:110 telephone-event/48000\r\na=rtpmap:112 telephone-event/32000\r\na=rtpmap:113 telephone-event/16000\r\na=rtpmap:126 telephone-event/8000\r\na=ssrc:3652058873 cname:kufSZ8JnlRUuQVc2\r\na=ssrc:3652058873 msid:381b9efc-7cf5-45bb-8f39-c06558b288de 8841cbb1-90ba-4655-8784-60a185846706\r\na=ssrc:3652058873 mslabel:381b9efc-7cf5-45bb-8f39-c06558b288de\r\na=ssrc:3652058873 label:8841cbb1-90ba-4655-8784-60a185846706\r\nm=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 102 122 127 121 125 107 108 109 124 120 123 119 114\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:Y5Zy\r\na=ice-pwd:yQLVrXgG+irP0tgLLr4ZjQb5\r\na=ice-options:trickle\r\na=fingerprint:sha-256 45:ED:86:FB:EB:FE:21:20:62:C4:07:81:AA:B8:BC:87:60:CC:2B:54:CE:D5:F0:16:93:C4:61:23:28:59:DF:8B\r\na=setup:actpass\r\na=mid:video\r\nb=AS:3072\r\na=extmap:2 urn:ietf:params:rtp-hdrext:toffset\r\na=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=extmap:4 urn:3gpp:video-orientation\r\na=extmap:5 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\r\na=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay\r\na=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type\r\na=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/video-timing\r\na=extmap:10 http://tools.ietf.org/html/draft-ietf-avtext-framemarking-07\r\na=sendrecv\r\na=rtcp-mux\r\na=rtcp-rsize\r\na=rtpmap:96 VP8/90000\r\na=rtcp-fb:96 goog-remb\r\na=rtcp-fb:96 transport-cc\r\na=rtcp-fb:96 ccm fir\r\na=rtcp-fb:96 nack\r\na=rtcp-fb:96 nack pli\r\na=rtpmap:97 rtx/90000\r\na=fmtp:97 apt=96;x-google-max-bitrate=3072;x-google-min-bitrate=384;x-google-start-bitrate=1536\r\na=rtpmap:98 VP9/90000\r\na=rtcp-fb:98 goog-remb\r\na=rtcp-fb:98 transport-cc\r\na=rtcp-fb:98 ccm fir\r\na=rtcp-fb:98 nack\r\na=rtcp-fb:98 nack pli\r\na=fmtp:98 profile-id=0;x-google-max-bitrate=3072;x-google-min-bitrate=384;x-google-start-bitrate=1536\r\na=rtpmap:99 rtx/90000\r\na=fmtp:99 apt=98;x-google-max-bitrate=3072;x-google-min-bitrate=384;x-google-start-bitrate=1536\r\na=rtpmap:100 H264/90000\r\na=rtcp-fb:100 goog-remb\r\na=rtcp-fb:100 transport-cc\r\na=rtcp-fb:100 ccm fir\r\na=rtcp-fb:100 nack\r\na=rtcp-fb:100 nack pli\r\na=fmtp:100 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f;x-google-max-bitrate=3072;x-google-min-bitrate=384;x-google-start-bitrate=1536\r\na=rtpmap:101 rtx/90000\r\na=fmtp:101 apt=100;x-google-max-bitrate=3072;x-google-min-bitrate=384;x-google-start-bitrate=1536\r\na=rtpmap:102 H264/90000\r\na=rtcp-fb:102 goog-remb\r\na=rtcp-fb:102 transport-cc\r\na=rtcp-fb:102 ccm fir\r\na=rtcp-fb:102 nack\r\na=rtcp-fb:102 nack pli\r\na=fmtp:102 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42001f;x-google-max-bitrate=3072;x-google-min-bitrate=384;x-google-start-bitrate=1536\r\na=rtpmap:122 rtx/90000\r\na=fmtp:122 apt=102;x-google-max-bitrate=3072;x-google-min-bitrate=384;x-google-start-bitrate=1536\r\na=rtpmap:127 H264/90000\r\na=rtcp-fb:127 goog-remb\r\na=rtcp-fb:127 transport-cc\r\na=rtcp-fb:127 ccm fir\r\na=rtcp-fb:127 nack\r\na=rtcp-fb:127 nack pli\r\na=fmtp:127 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f;x-google-max-bitrate=3072;x-google-min-bitrate=384;x-google-start-bitrate=1536\r\na=rtpmap:121 rtx/90000\r\na=fmtp:121 apt=127;x-google-max-bitrate=3072;x-google-min-bitrate=384;x-google-start-bitrate=1536\r\na=rtpmap:125 H264/90000\r\na=rtcp-fb:125 goog-remb\r\na=rtcp-fb:125 transport-cc\r\na=rtcp-fb:125 ccm fir\r\na=rtcp-fb:125 nack\r\na=rtcp-fb:125 nack pli\r\na=fmtp:125 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f;x-google-max-bitrate=3072;x-google-min-bitrate=384;x-google-start-bitrate=1536\r\na=rtpmap:107 rtx/90000\r\na=fmtp:107 apt=125;x-google-max-bitrate=3072;x-google-min-bitrate=384;x-google-start-bitrate=1536\r\na=rtpmap:108 H264/90000\r\na=rtcp-fb:108 goog-remb\r\na=rtcp-fb:108 transport-cc\r\na=rtcp-fb:108 ccm fir\r\na=rtcp-fb:108 nack\r\na=rtcp-fb:108 nack pli\r\na=fmtp:108 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=4d0032;x-google-max-bitrate=3072;x-google-min-bitrate=384;x-google-start-bitrate=1536\r\na=rtpmap:109 rtx/90000\r\na=fmtp:109 apt=108;x-google-max-bitrate=3072;x-google-min-bitrate=384;x-google-start-bitrate=1536\r\na=rtpmap:124 H264/90000\r\na=rtcp-fb:124 goog-remb\r\na=rtcp-fb:124 transport-cc\r\na=rtcp-fb:124 ccm fir\r\na=rtcp-fb:124 nack\r\na=rtcp-fb:124 nack pli\r\na=fmtp:124 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=640032;x-google-max-bitrate=3072;x-google-min-bitrate=384;x-google-start-bitrate=1536\r\na=rtpmap:120 rtx/90000\r\na=fmtp:120 apt=124;x-google-max-bitrate=3072;x-google-min-bitrate=384;x-google-start-bitrate=1536\r\na=rtpmap:123 red/90000\r\na=rtpmap:119 rtx/90000\r\na=fmtp:119 apt=123;x-google-max-bitrate=3072;x-google-min-bitrate=384;x-google-start-bitrate=1536\r\na=rtpmap:114 ulpfec/90000\r\na=ssrc-group:FID 1714381393 967654061\r\na=ssrc:1714381393 cname:kufSZ8JnlRUuQVc2\r\na=ssrc:1714381393 msid:381b9efc-7cf5-45bb-8f39-c06558b288de 99d2faa8-950d-40f7-ad80-16789c9b4faa\r\na=ssrc:1714381393 mslabel:381b9efc-7cf5-45bb-8f39-c06558b288de\r\na=ssrc:1714381393 label:99d2faa8-950d-40f7-ad80-16789c9b4faa\r\na=ssrc:967654061 cname:kufSZ8JnlRUuQVc2\r\na=ssrc:967654061 msid:381b9efc-7cf5-45bb-8f39-c06558b288de 99d2faa8-950d-40f7-ad80-16789c9b4faa\r\na=ssrc:967654061 mslabel:381b9efc-7cf5-45bb-8f39-c06558b288de\r\na=ssrc:967654061 label:99d2faa8-950d-40f7-ad80-16789c9b4faa\r\n';
      expect(sdpBitrateHack(SDP, 3072, 384, 1536)).toEqual(SDP_CHANGED);
    });
  });

  describe('getDevices', () => {
    beforeEach(() => {
      // @ts-ignore
      navigator.mediaDevices.getUserMedia.mockClear();
    });

    it('should return the device list removing the duplicates', async (done) => {
      const devices = await getDevices();
      expect(devices).toHaveLength(5);
      done();
    });

    it('should return the full device list', async (done) => {
      const devices = await getDevices(null, true);
      expect(devices).toHaveLength(7);
      done();
    });

    it('should return the audioIn device list with kind audioinput', async (done) => {
      const devices = await getDevices('audioinput');
      expect(devices).toHaveLength(2);
      expect(devices[0].deviceId).toEqual('default');
      done();
    });

    it('should return the video device list with kind videoinput', async (done) => {
      const devices = await getDevices('videoinput');
      expect(devices).toHaveLength(2);
      expect(devices[0].deviceId).toEqual(
        '2060bf50ab9c29c12598bf4eafeafa71d4837c667c7c172bb4407ec6c5150206'
      );
      done();
    });

    it('should return the audioOut device list with kind audiooutput', async (done) => {
      const devices = await getDevices('audiooutput');
      expect(devices).toHaveLength(1);
      expect(devices[0].deviceId).toEqual('default');
      done();
    });

    describe('without camera permissions', () => {
      const DEVICES_CAMERA_NO_LABELS = [
        {
          deviceId: 'uuid',
          kind: 'audioinput',
          label: 'mic1',
          groupId:
            '83ef347b97d14abd837e8c6dbb819c5be84cfe0756dd41455b375cfd4c0ddb4f',
        },
        {
          deviceId: 'uuid',
          kind: 'audioinput',
          label: 'mic2',
          groupId:
            '83ef347b97d14abd837e8c6dbb819c5be84cfe0756dd41455b375cfd4c0ddb4f',
        },
        {
          deviceId: 'uuid',
          kind: 'audioinput',
          label: 'mic3',
          groupId:
            '67a612f4ac80c6c9854b50d664348e69b5a11421a0ba8d68e2c00f3539992b4c',
        },

        {
          deviceId: 'uuid',
          kind: 'videoinput',
          label: '',
          groupId:
            '72e8ab9444144c3f8e04276a5801e520e83fc801702a6ef68e9e344083f6f6ce',
        },
        {
          deviceId: 'uuid',
          kind: 'videoinput',
          label: '',
          groupId:
            '67a612f4ac80c6c9854b50d664348e69b5a11421a0ba8d68e2c00f3539992b4c',
        },

        {
          deviceId: 'uuid',
          kind: 'audiooutput',
          label: 'speaker1',
          groupId:
            '83ef347b97d14abd837e8c6dbb819c5be84cfe0756dd41455b375cfd4c0ddb4f',
        },
        {
          deviceId: 'uuid',
          kind: 'audiooutput',
          label: 'speaker2',
          groupId:
            '83ef347b97d14abd837e8c6dbb819c5be84cfe0756dd41455b375cfd4c0ddb4f',
        },
      ];
      it('should invoke getUserMedia to request camera permissions and return device list removing duplicates', async (done) => {
        // @ts-ignore
        navigator.mediaDevices.enumerateDevices.mockResolvedValueOnce(
          DEVICES_CAMERA_NO_LABELS
        );
        const devices = await getDevices();
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
          audio: true,
          video: true,
        });
        expect(devices).toHaveLength(5);
        expect(devices[0].label).toEqual(
          'Default - External Microphone (Built-in)'
        );
        expect(
          devices.every((d: MediaDeviceInfo) => d.deviceId && d.label)
        ).toBe(true);
        done();
      });
    });

    describe('without microphone permissions', () => {
      const DEVICES_MICROPHONE_NO_LABELS = [
        {
          deviceId: 'uuid',
          kind: 'audioinput',
          label: '',
          groupId:
            '83ef347b97d14abd837e8c6dbb819c5be84cfe0756dd41455b375cfd4c0ddb4f',
        },
        {
          deviceId: 'uuid',
          kind: 'audioinput',
          label: '',
          groupId:
            '83ef347b97d14abd837e8c6dbb819c5be84cfe0756dd41455b375cfd4c0ddb4f',
        },
        {
          deviceId: 'uuid',
          kind: 'audioinput',
          label: '',
          groupId:
            '67a612f4ac80c6c9854b50d664348e69b5a11421a0ba8d68e2c00f3539992b4c',
        },

        {
          deviceId: 'uuid',
          kind: 'videoinput',
          label: 'camera1',
          groupId:
            '72e8ab9444144c3f8e04276a5801e520e83fc801702a6ef68e9e344083f6f6ce',
        },
        {
          deviceId: 'uuid',
          kind: 'videoinput',
          label: 'camera2',
          groupId:
            '67a612f4ac80c6c9854b50d664348e69b5a11421a0ba8d68e2c00f3539992b4c',
        },

        {
          deviceId: 'uuid',
          kind: 'audiooutput',
          label: 'speaker1',
          groupId:
            '83ef347b97d14abd837e8c6dbb819c5be84cfe0756dd41455b375cfd4c0ddb4f',
        },
        {
          deviceId: 'uuid',
          kind: 'audiooutput',
          label: 'speaker2',
          groupId:
            '83ef347b97d14abd837e8c6dbb819c5be84cfe0756dd41455b375cfd4c0ddb4f',
        },
      ];
      it('should invoke getUserMedia to request microphone permissions and return device list removing duplicates', async (done) => {
        // @ts-ignore
        navigator.mediaDevices.enumerateDevices.mockResolvedValueOnce(
          DEVICES_MICROPHONE_NO_LABELS
        );
        const devices = await getDevices();
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
          audio: true,
          video: true,
        });
        expect(devices).toHaveLength(5);
        expect(devices[0].label).toEqual(
          'Default - External Microphone (Built-in)'
        );
        expect(
          devices.every((d: MediaDeviceInfo) => d.deviceId && d.label)
        ).toBe(true);
        done();
      });
    });
  });

  describe('assureDeviceId', () => {
    beforeEach(() => {
      // @ts-ignore
      navigator.mediaDevices.enumerateDevices.mockClear();
    });

    it('should return the deviceId if the device is available', async (done) => {
      // See setup/browser.ts for these values.
      const deviceId = await assureDeviceId(
        '2060bf50ab9c29c12598bf4eafeafa71d4837c667c7c172bb4407ec6c5150206',
        'FaceTime HD Camera',
        'videoinput'
      );
      expect(deviceId).toEqual(
        '2060bf50ab9c29c12598bf4eafeafa71d4837c667c7c172bb4407ec6c5150206'
      );
      expect(navigator.mediaDevices.enumerateDevices).toHaveBeenCalledTimes(1);
      done();
    });

    it('should return null if the device is no longer available', async (done) => {
      const NEW_DEVICE_LIST = [
        {
          deviceId: 'uuid',
          kind: 'videoinput',
          label: 'camera1',
          groupId:
            '72e8ab9444144c3f8e04276a5801e520e83fc801702a6ef68e9e344083f6f6ce',
        },
        {
          deviceId: 'uuid',
          kind: 'videoinput',
          label: 'camera2',
          groupId:
            '67a612f4ac80c6c9854b50d664348e69b5a11421a0ba8d68e2c00f3539992b4c',
        },
      ];
      // @ts-ignore
      navigator.mediaDevices.enumerateDevices.mockResolvedValueOnce(
        NEW_DEVICE_LIST
      );
      const deviceId = await assureDeviceId(
        '2060bf50ab9c29c12598bf4eafeafa71d4837c667c7c172bb4407ec6c5150206',
        'FaceTime HD Camera',
        'videoinput'
      );
      expect(deviceId).toBeNull();
      expect(navigator.mediaDevices.enumerateDevices).toHaveBeenCalledTimes(1);
      done();
    });

    it('should recognize the device by its label', async (done) => {
      const NEW_DEVICE_LIST = [
        {
          deviceId: 'uuid',
          kind: 'videoinput',
          label: 'camera1',
          groupId:
            '72e8ab9444144c3f8e04276a5801e520e83fc801702a6ef68e9e344083f6f6ce',
        },
        {
          deviceId: 'new-uuid',
          kind: 'videoinput',
          label: 'FaceTime HD Camera',
          groupId:
            '67a612f4ac80c6c9854b50d664348e69b5a11421a0ba8d68e2c00f3539992b4c',
        },
      ];
      // @ts-ignore
      navigator.mediaDevices.enumerateDevices.mockResolvedValueOnce(
        NEW_DEVICE_LIST
      );
      const deviceId = await assureDeviceId(
        '2060bf50ab9c29c12598bf4eafeafa71d4837c667c7c172bb4407ec6c5150206',
        'FaceTime HD Camera',
        'videoinput'
      );
      expect(deviceId).toEqual('new-uuid');
      expect(navigator.mediaDevices.enumerateDevices).toHaveBeenCalledTimes(1);
      done();
    });
  });

  describe('getBrowserInfo', () => {
    it('should return error when code runs without a web browser', async (done) => {
      Object.defineProperty(global, 'navigator', {
        value: null,
        writable: true,
      });

      expect(() => getBrowserInfo()).toThrow(
        'You should use @telnyx/webrtc in a web browser such as Chrome|Firefox|Safari'
      );
      done();
    });

    it('should return error when code runs in not supported browser', async (done) => {
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: "I'm a not supported browser" },
        writable: true,
      });
      expect(() => getBrowserInfo()).toThrow(
        'This browser does not support @telnyx/webrtc. \nPlease, use Chrome|Firefox|Safari.'
      );
      done();
    });

    it('should return error when code runs in not supported browser', async (done) => {
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: "I'm a not supported browser" },
        writable: true,
      });
      expect(() => getBrowserInfo()).toThrow(
        'This browser does not support @telnyx/webrtc. \nPlease, use Chrome|Firefox|Safari.'
      );
      done();
    });

    it('should return error when code runs in Opera browser', async (done) => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36 OPR/72.0.3815.400',
        },
        writable: true,
      });
      expect(() => getBrowserInfo()).toThrow(
        'This browser does not support @telnyx/webrtc. \nPlease, use Chrome|Firefox|Safari.'
      );
      done();
    });

    it('should return supported configuration for WebRTC when the browser is Chrome', async (done) => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36',
        },
        writable: true,
      });
      const result = getBrowserInfo();
      expect(result).not.toBeNull();
      expect(result.name).toEqual('Chrome');
      expect(result.version).toEqual(87);
      expect(result.supportAudio).toBeTruthy();
      expect(result.supportVideo).toBeTruthy();
      done();
    });

    it('should return supported configuration for WebRTC when the browser is Firefox', async (done) => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:84.0) Gecko/20100101 Firefox/84.0',
        },
        writable: true,
      });
      const result = getBrowserInfo();
      expect(result).not.toBeNull();
      expect(result.name).toEqual('Firefox');
      expect(result.version).toEqual(84);
      expect(result.supportAudio).toBeTruthy();
      expect(result.supportVideo).toBeFalsy();
      done();
    });

    it('should return supported configuration for WebRTC when the browser is Safari', async (done) => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.1 Safari/605.1.15',
        },
        writable: true,
      });
      const result = getBrowserInfo();
      expect(result).not.toBeNull();
      expect(result.name).toEqual('Safari');
      expect(result.version).toEqual(14);
      expect(result.supportAudio).toBeTruthy();
      expect(result.supportVideo).toBeTruthy();
      done();
    });

    it('should return supported configuration for WebRTC when the browser is Edge', async (done) => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36 Edg/87.0.664.75',
        },
        writable: true,
      });
      const result = getBrowserInfo();
      expect(result).not.toBeNull();
      expect(result.name).toEqual('Edg');
      expect(result.version).toEqual(87);
      expect(result.supportAudio).toBeTruthy();
      expect(result.supportVideo).toBeTruthy();
      done();
    });
  });

  describe('getWebRTCInfo', () => {
    it('should return error when code runs without a web browser', async (done) => {
      Object.defineProperty(global, 'navigator', {
        value: null,
        writable: true,
      });

      const result = getWebRTCInfo();
      expect(result).toEqual(
        'You should use @telnyx/webrtc in a web browser such as Chrome|Firefox|Safari'
      );
      done();
    });

    it('should return webRTC info about supported features on current browser', async (done) => {
      const chromeUserAgent =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36';
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: chromeUserAgent },
        writable: true,
      });

      const mockFn = jest.fn().mockImplementation(() => {
        return {
          global: {
            RTCPeerConnection: jest.fn(),
          },
        };
      });

      const result = getWebRTCInfo();
      expect(result).not.toBeNull();
      expect(result.browserInfo).toEqual(chromeUserAgent);
      expect(result.browserName).toEqual('Chrome');
      expect(result.browserVersion).toEqual(87);
      expect(result.supportRTCPeerConnection).toBeTruthy();
      done();
    });

    it('should return supportWebRTC equal false when browser does not support RTC', async (done) => {
      jest.clearAllMocks();
      
      const chromeUserAgent =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36';
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: chromeUserAgent },
        writable: true,
      });

      const result = getWebRTCInfo();
      expect(result).not.toBeNull();
      expect(result.browserInfo).toEqual(chromeUserAgent);
      expect(result.browserName).toEqual('Chrome');
      expect(result.browserVersion).toEqual(87);
      expect(result.supportWebRTC).toBeFalsy();
      done();
    });
  });
});
