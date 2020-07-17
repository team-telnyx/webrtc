/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {Component} from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Text,
  View,
  TextInput,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import {Input} from 'react-native-elements';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {TelnyxRTC} from '@telnyx/react-native';
import {RTCView} from 'react-native-webrtc';
import Colors from '../Colors';

type Props = {};
export default class Dialer extends Component<Props> {
  constructor(props) {
    super(props);
    Icon.loadFont();
    this.makeCall = this.makeCall.bind(this);
    this.hangup = this.hangup.bind(this);
    this.toggleMic = this.toggleMic.bind(this);
    this.toggleCam = this.toggleCam.bind(this);
    this.toggleDeaf = this.toggleDeaf.bind(this);
    this.switchCamera = this.switchCamera.bind(this);
    this.toggleSpeaker = this.toggleSpeaker.bind(this);

    this.state = {
      connected: false,
      call: null,
      extension: '',
      btnMicActive: true,
      btnDeafActive: true,
      btnCamActive: true,
      btnSpeakerActive: true,
      status: '',
      cause: '',
    };
    this.client = null;
    const {username, password, production} = props.route.params;
    if (username && password) {
      this.client = new TelnyxRTC({
        env: production ? 'production' : 'development',
        login: username,
        password: password,
      });
      this.client.enableMicrophone();
      this.client.enableWebcam();
      this.client.on('telnyx.ready', () => {
        this.setState({connected: true, status: 'connected'});
      });

      this.client.on('telnyx.error', (error) => {
        console.log('error', error);
      });

      this.client.on('telnyx.notification', (notification) => {
        switch (notification.type) {
          case 'callUpdate':
            return this._handleCallUpdate(notification.call);
        }
      });

      this.client.on('telnyx.socket.open', () => {
        console.log('Socket Open');
      });
      this.client.on('telnyx.socket.close', (event) => {
        console.log('Socket Close', event);
      });
      this.client.on('telnyx.socket.error', (error) => {
        console.log('error', error);

        console.log('Socket Error');
      });

      this.client.connect();
    }
  }

  makeCall() {
    this.client.newCall({
      destinationNumber: this.state.extension,
      video: {facingMode: 'user'},
    });
  }

  hangup() {
    this.state.call.hangup();
  }

  toggleMic() {
    this.setState({btnMicActive: !this.state.btnMicActive});
    this.state.call.toggleAudioMute();
  }

  toggleCam() {
    this.setState({btnCamActive: !this.state.btnCamActive});
    this.state.call.toggleVideoMute();
  }

  toggleDeaf() {
    this.setState({btnDeafActive: !this.state.btnDeafActive});
    this.state.call.toggleDeaf();
  }

  switchCamera() {
    this.state.call.switchCamera();
  }

  toggleSpeaker() {
    this.setState({btnSpeakerActive: !this.state.btnSpeakerActive}, () => {
      this.state.call.setSpeakerPhone(this.state.btnSpeakerActive);
    });
  }

  handleDestination = (extension) => {
    return this.setState({extension});
  };

  _handleCallUpdate(call) {
    this.setState({status: call.state, cause: call.cause});

    switch (call.state) {
      case 'ringing': {
        const {remoteCallerName, remoteCallerNumber} = call.options;
        const caller = remoteCallerName || remoteCallerNumber;
        Alert.alert(
          'Inbound Call',
          `Call from ${caller}`,
          [
            {
              text: 'Reject',
              onPress: () => call.hangup(),
              style: 'cancel',
            },
            {
              text: 'Answer',
              onPress: () => call.answer(),
            },
          ],
          {cancelable: false},
        );
        break;
      }
      case 'active':
        this.setState({call, status: call.state, cause: call.cause});
        break;
      case 'destroy':
        this.setState({call: null, status: call.state, cause: call.cause});
        break;
    }
  }

  _status() {
    return this.state.connected ? 'Connected' : 'Disconnected';
  }

  _middle() {
    if (this.state.call) {
      let streamURL = null;
      const {
        options: {remoteStream = null, localStream = null},
      } = this.state.call;
      console.log('localStream', localStream, localStream.toURL());
      if (remoteStream) {
        console.log('remoteStream', remoteStream, remoteStream.toURL());
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
    } else {
      return (
        <View style={styles.wrapperMiddle}>
          <Input
            label="Destination:"
            placeholder="Enter SIP or Number to Dial"
            onChangeText={this.handleDestination}
            value={this.state.extension}
          />
          <Text style={styles.statusCall}>{`${this.state.status} ${
            this.state.cause ? `(${this.state.cause})` : ''
          }`}</Text>
        </View>
      );
    }
  }

  _bottom() {
    if (this.state.call) {
      return (
        <View style={styles.wrapperBottom}>
          <View style={styles.wrapperBottomRow}>
            <TouchableOpacity style={styles.button} onPress={this.toggleMic}>
              <Icon
                name="microphone"
                size={25}
                color={this.state.btnMicActive ? '#fff' : 'gray'}
              />
              <Text style={styles.buttonText}>Mute</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={this.toggleDeaf}>
              <Icon
                name="volume-mute"
                size={25}
                color={this.state.btnDeafActive ? '#fff' : 'gray'}
              />
              <Text style={styles.buttonText}>Deaf</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={this.toggleCam}>
              <Icon
                name="camera"
                size={25}
                color={this.state.btnCamActive ? '#fff' : 'gray'}
              />
              <Text style={styles.buttonText}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={this.switchCamera}>
              <Icon name="camera-retake" size={25} color="#fff" />
              <Text style={styles.buttonText}>Flip Cam</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={this.toggleSpeaker}>
              <Icon
                name="volume-high"
                size={25}
                color={this.state.btnSpeakerActive ? '#fff' : 'gray'}
              />
              <Text style={styles.buttonText}>Speaker</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.wrapperBottomRow}>
            <TouchableOpacity
              style={[styles.button, {backgroundColor: Colors.red}]}
              onPress={this.hangup}>
              <Icon name="phone-hangup" size={25} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      );
    } else {
      const {username, password} = this.props.route.params;
      const {extension, connected} = this.state;
      const disableCall = !username || !password || !extension || !connected;
      return (
        <View style={styles.wrapperBottom}>
          <View style={styles.wrapperBottomRow}>
            <TouchableOpacity
              disabled={disableCall}
              style={[
                styles.button,
                {backgroundColor: disableCall ? Colors.grey : Colors.green},
              ]}
              onPress={this.makeCall}>
              <Icon name="phone" size={25} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }
  }

  render() {
    return (
      <KeyboardAvoidingView style={styles.container}>
        <View style={styles.wrapperTop}>
          <Text style={styles.welcome}>Welcome to Telnyx!</Text>
          <Text style={styles.instructions}>Status: {this._status()}</Text>
        </View>
        {this._middle()}
        {this._bottom()}
      </KeyboardAvoidingView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  wrapperTop: {
    flex: 0.5,
    justifyContent: 'center',
    backgroundColor: Colors.telnyxDark,
    color: Colors.white,
  },
  wrapperMiddle: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#000',
    borderTopWidth: 1,
  },
  wrapperBottom: {
    flex: 0.5,
    borderColor: '#000',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    backgroundColor: Colors.telnyxDark,
    color: Colors.white,
  },
  wrapperBottomRow: {
    flex: 0.5,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  textInput: {
    height: 40,
    width: '80%',
    borderColor: 'gray',
    borderWidth: 1,
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
    color: Colors.white,
  },
  instructions: {
    textAlign: 'center',
    marginBottom: 5,
    color: Colors.white,
  },
  statusCall: {
    textAlign: 'center',
    color: '#333333',
    marginTop: 10,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    height: 40,
    width: '20%',
  },
  buttonText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#ccc',
  },
});
