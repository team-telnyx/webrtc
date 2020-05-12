import React, {Component} from 'react';
import {View, Text} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import {Input, Button} from 'react-native-elements';

export default class CredentialScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      destinationNumber: 'sip:zoiperother@sipdev.telnyx.com',
      username: 'deividzoiper',
      password: 'zoiper2019',
    };
  }

  render() {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
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
        <Button title="Register" />
      </View>
    );
  }
}
