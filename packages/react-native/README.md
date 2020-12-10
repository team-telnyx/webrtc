# Telnyx React Native

The Telnyx SDK for React Native enables developers to connect and use Telnyx APIs within their own React Native apps. Our TelnyxRTC SDK allows developers to build or add robust and innovative communication services to their applications.

## Requirements

You'll need node v11.15.0 or later.

You'll also need a Telnyx account in order to authenticate your application. Follow our [quick start guide](https://developers.telnyx.com/docs/v2/sip-trunking/quickstarts/portal-setup) to create a **Connection** with **Credentials Authentication** -- it's simple and quick to get set up with secure credentials that are automatically generated for you.

---

## Getting Started

Install the package with:

```
npm install @telnyx/react-native --save
```

```js
import { TelnyxRTC } from '@telnyx/react-native';
```

## Usage

To initialize the JavaScript SDK, you'll need to authenticate using a Telnyx Connection. You can access the Connection credentials in the [Telnyx Portal](https://portal.telnyx.com/#/app/connections).

```js
// Initialize the client
const client = new TelnyxRTC({
  // Required credentials
  login: username,
  password: password,
});

// Create a variable to track the current call
let activeCall;

// Attach event listeners
client
  .on('telnyx.socket.open', () => console.log('socket open'))
  .on('telnyx.socket.close', () => {
    console.log('socket closed');
    client.disconnect();
  })
  .on('telnyx.socket.error', (error) => {
    console.log('telnyx.socket.error', error);
    client.disconnect();
  })
  .on('telnyx.ready', () => console.log('ready to call'))
  .on('telnyx.error', () => console.log('error'))
  // Event fired on call updates, e.g. when there's an incoming call
  .on('telnyx.notification', (notification) => {
    activeCall = notification.call;

    switch (notification.type) {
      case 'callUpdate':
        // Call is over and can be removed
        if (
          notification.call.state === 'hangup' ||
          notification.call.state === 'destroy'
        ) {
          activeCall = null;
        }
        // An established and active call
        if (notification.call.state === 'active') {
          return;
        }
        // New calls that haven't started connecting yet
        if (notification.call.state === 'new') {
          return;
        }
        // Receiving an inbound call
        if (notification.call.state === 'ringing') {
          return;
        }
        // Call is active but on hold
        if (notification.call.state === 'held') {
          return;
        }
        break;
    }
  });

// Connect and login
client.connect();

// You can disconnect when you're done
// client.disconnect();
```

Important: You should treat Connection credentials as sensitive data and should not hardcode credentials into your frontend web application. Check out the [examples](https://github.com/team-telnyx/webrtc/tree/main/packages/react-native/examples) for sample React code that handles username and password by prompting the user.

### React Native

Setting your video stream in RTCView to show video call

```Js
      let streamURL = null;
      const {
        options: {remoteStream = null, localStream = null},
      } = activeCall;
      if (remoteStream) {
        streamURL = remoteStream.toURL();
      }
      return (
        <View style={styles.wrapperMiddle}>
          {streamURL && (
            <RTCView
              mirror={false}
              objectFit="contain"
              streamURL={streamURL}
              style={{width: '100%', height: '100%'}}
              zOrder={1}
            />
          )}
        </View>
      );
```

Making a call

```Js
 client.newCall({
      destinationNumber: '9999999999999', // Or you can use SIP address
      video: {facingMode: 'user'},
    });
```

---

## Run our example.

### React Native

We've included a few [examples in React Native](https://github.com/team-telnyx/webrtc/tree/main/packages/react-native/examples) to help you get started.\
You can access the documentation [here](https://www.npmjs.com/package/@telnyx/react-native) about `@telnyx/react-native` to have more information.

```
1. Navigate into the `examples/calling-video-app`
2. Run `npm install` to install dependencies.
3. Connect a real mobile device in your computer. This is necessary because it needs to access real camera and microphone.
4. Run `npm run android` or `npm run ios`
```

Screenshot:
![Video call app](https://raw.githubusercontent.com/team-telnyx/webrtc/master/packages/react-native/examples/calling-video-app/app-screenshot.png)

---

## Third-party libraries dependencies

1. react-native-elements
2. react-native-vector-icons
3. react-native-webrtc
4. @react-navigation
5. @react-native-community

## Troubleshooting

If you have any trouble building the App follow the steps for each native library to double check all frameworks have been linked properly:

#### iOS

- Instructions for [react-native-webrtc](https://github.com/react-native-webrtc/react-native-webrtc/blob/master/Documentation/iOSInstallation.md#ios-installation)
- Instructions for [react-native-incall-manager](https://github.com/react-native-webrtc/react-native-incall-manager#ios)
- Instructions for [async-storage](https://github.com/react-native-community/async-storage/blob/LEGACY/docs/Linking.md#ios)

#### Android

- Instructions for [react-native-webrtc](https://github.com/react-native-webrtc/react-native-webrtc/blob/master/Documentation/AndroidInstallation.md)
- Instructions for [react-native-incall-manager](https://github.com/react-native-webrtc/react-native-incall-manager#android)
- Instructions for [async-storage](https://github.com/react-native-community/async-storage/blob/LEGACY/docs/Linking.md#android)

---

## WebRTC Engine

It's possible that an error will occur during the linking process of the native libraries. If your app does not compile, follow these steps to troubleshoot:

- [iOS](https://github.com/react-native-webrtc/react-native-webrtc/blob/master/Documentation/iOSInstallation.md)
- [Android](https://github.com/react-native-webrtc/react-native-webrtc/blob/master/Documentation/AndroidInstallation.md)

> Make sure to check the app permissions in `AndroidManifest.xml` and `Info.plist` to access the device camera and microphone!

---

## Developers

The React Native SDK is a package inside the [@telnyx/webrtc](https://github.com/team-telnyx/webrtc) _monorepo_. To setup the dev environment follow these steps:

1. [Download the installer](https://nodejs.org/) for the LTS version of Node.js. This is the best way to also [install npm](https://blog.npmjs.org/post/85484771375/how-to-install-npm#_=_).
2. Fork the [@telnyx/webrtc](https://github.com/team-telnyx/webrtc) repository and clone it.
3. Create a new branch from `master` for your change.
4. Run `npm install` to install global dependencies.
5. Run `npm run build` to prepare the React Native package.
6. Navigate into the react-native directory with `cd src/ReactNative`.
7. Make changes!

## Versioning

TelnyxRTC SDK for React Native follows Semantic Versioning 2.0 as defined at <http://semver.org>.

## License

The TelnyxRTC SDK for React Native is copyright © 2020
[Telnyx](http://telnyx.com). It is free software, and may be redistributed under the terms specified in the [MIT-LICENSE](https://github.com/team-telnyx/webrtc/blob/main/LICENSE) file.
