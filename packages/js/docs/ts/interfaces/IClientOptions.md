IClientOptions
 IClientOptions

## Table of contents

### Properties

- [login](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#login)
- [login\_token](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#login_token)
- [password](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#password)
- [ringbackFile](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#ringbackfile)
- [ringtoneFile](/docs/voice/webrtc/js-sdk/interfaces/IClientOptions.md#ringtonefile)

## Properties

### login

• `Optional` **login**: `string`

The `username` to authenticate with your SIP Connection.
`login` and `password` will take precedence over
`login_token` for authentication.

___

### login\_token

• `Optional` **login\_token**: `string`

The JSON Web Token (JWT) to authenticate with your SIP Connection.
This is the recommended authentication strategy. [See how to create one](https://developers.telnyx.com/docs/v2/webrtc/quickstart).

___

### password

• `Optional` **password**: `string`

The `password` to authenticate with your SIP Connection.

___

### ringbackFile

• `Optional` **ringbackFile**: `string`

A URL to a wav/mp3 ringback file that will be used when you disable
"Generate Ringback Tone" in your SIP Connection.

___

### ringtoneFile

• `Optional` **ringtoneFile**: `string`

A URL to a wav/mp3 ringtone file.
