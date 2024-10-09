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

### <a id="login" name="login"></a> login

• `Optional` **login**: `string`

The `username` to authenticate with your SIP Connection.
`login` and `password` will take precedence over
`login_token` for authentication.

___

### <a id="login_token" name="login_token"></a> login\_token

• `Optional` **login\_token**: `string`

The JSON Web Token (JWT) to authenticate with your SIP Connection.
This is the recommended authentication strategy. [See how to create one](https://developers.telnyx.com/docs/v2/webrtc/quickstart).

___

### <a id="password" name="password"></a> password

• `Optional` **password**: `string`

The `password` to authenticate with your SIP Connection.

___

### <a id="ringbackfile" name="ringbackfile"></a> ringbackFile

• `Optional` **ringbackFile**: `string`

A URL to a wav/mp3 ringback file that will be used when you disable
"Generate Ringback Tone" in your SIP Connection.

___

### <a id="ringtonefile" name="ringtonefile"></a> ringtoneFile

• `Optional` **ringtoneFile**: `string`

A URL to a wav/mp3 ringtone file.
