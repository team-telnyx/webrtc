import React, {Component} from 'react';
import {View, Image} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import {Input, Button, Text} from 'react-native-elements';

export default class CredentialScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      destinationNumber: 'sip:zoiperother@sipdev.telnyx.com',
      username: 'deividzoiper',
      password: 'zoiper2019',
    };
  }

  handleRegister = () => {
    const {navigation} = this.props;
    console.log('PROPS', this.props);
    return navigation.navigate('dialer');
  };

  render() {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          borderColor: 'blue',
          borderStyle: 'solid',
          borderWidth: 10,
        }}>
        <View
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            textAlign: 'center',
            marginTop: 50,
            borderColor: 'green',
            borderStyle: 'solid',
            borderWidth: 10,
          }}>
          <Image
            style={{width: '100%', height: 50, objectFit: 'contain'}}
            source={require('../assets/images/telnyx-logo.png')}
          />
          {/* <Image
            style={{width: 100, height: 50}}
            source={require('../assets/images/webrtc_logo.png')}
          /> */}
        </View>
        <View
          style={{
            flex: 2,
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: 'red',
            borderStyle: 'solid',
            borderWidth: 10,
          }}>
          <Input
            leftIcon={{type: 'font-awesome', name: 'user'}}
            placeholder="Username"
            value={this.state.username}
            onChangeText={username => this.setState({username: username})}
          />
          <Input
            leftIcon={{type: 'font-awesome', name: 'lock'}}
            placeholder="Password"
            secureTextEntry={true}
            value={this.state.password}
            onChangeText={password => this.setState({password: password})}
          />
          <Button title="Register" onPress={this.handleRegister} />
        </View>
      </View>
    );
  }
}
