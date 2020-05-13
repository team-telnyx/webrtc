import React, {Component} from 'react';
import {View, Image} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import {Input, Button, Text} from 'react-native-elements';

export default class CredentialScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      username: 'deividzoiper',
      password: 'deivid2020',
    };
  }

  handleRegister = () => {
    const {navigation} = this.props;
    return navigation.navigate('dialer', {
      username: this.state.username,
      password: this.state.password,
    });
  };

  render() {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          backgroundColor: '#1D2241',
        }}>
        <View
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            textAlign: 'center',
            marginTop: 50,
          }}>
          <Image
            style={{width: '100%', height: 50, aspectRatio: 300 / 50}}
            source={require('../assets/images/telnyx-logo-white.png')}
          />
        </View>
        <View
          elevation={5}
          style={{
            flex: 2,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            backgroundColor: '#fff',
            marginHorizontal: 30,
            marginVertical: 50,
            shadowColor: 'red',
            shadowOpacity: 0.8,
            shadowOffset: {
              height: 1,
              width: 1,
            },
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
