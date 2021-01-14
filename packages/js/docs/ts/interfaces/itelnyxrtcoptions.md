# Interface: ITelnyxRTCOptions

## Hierarchy

* **ITelnyxRTCOptions**

## Index

### Properties

* [login](itelnyxrtcoptions.md#login)
* [login\_token](itelnyxrtcoptions.md#login_token)
* [password](itelnyxrtcoptions.md#password)
* [ringbackFile](itelnyxrtcoptions.md#ringbackfile)

## Properties

### login

• `Optional` **login**: string

The `username` to authenticate with your SIP Connection.
`login` and `password` will take precedence over
`login_token` for authentication.

___

### login\_token

• `Optional` **login\_token**: string

The JSON Web Token (JWT) to authenticate with your SIP Connection.
This is the recommended authentication strategy. [See how to create one](https://developers.telnyx.com/docs/v2/webrtc/quickstart).

___

### password

• `Optional` **password**: string

The `password` to authenticate with your SIP Connection.

___

### ringbackFile

• `Optional` **ringbackFile**: string

A URL to a wav/mp3 ringback file that will be used when you disable
"Generate Ringback Tone" in you SIP Connection.
