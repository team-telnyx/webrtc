A codec to prefer for a call. Entries of `RTCRtpReceiver.getCapabilities('audio').codecs`
have this shape and can be passed as they are, whether your TypeScript DOM library
types them as `RTCRtpCodecCapability` or as `RTCRtpCodec`.

## Table of contents

### Properties

- [channels](#channels)
- [clockRate](#clockrate)
- [mimeType](#mimetype)
- [sdpFmtpLine](#sdpfmtpline)

## Properties

### channels

• `Optional` **channels**: `number`

The number of audio channels, when the codec reports one.

---

### clockRate

• **clockRate**: `number`

The codec's clock rate in hertz.

---

### mimeType

• **mimeType**: `string`

The codec's MIME type, for example `audio/opus` or `audio/PCMA`.

---

### sdpFmtpLine

• `Optional` **sdpFmtpLine**: `string`

The codec's SDP `a=fmtp` parameters, when it has any.
