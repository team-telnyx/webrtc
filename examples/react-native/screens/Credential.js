import React, {Component} from 'react';
import {View, Image, KeyboardAvoidingView, ScrollView} from 'react-native';
import {Input, Button} from 'react-native-elements';
import Colors from '../Colors';

export default class CredentialScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: '',
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
    const {username, password} = this.state;
    return (
      <ScrollView
        style={{
          flex: 1,
          backgroundColor: Colors.telnyxDark,
        }}
        contentContainerStyle={{
          justifyContent: 'center',
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
        <KeyboardAvoidingView
          elevation={5}
          style={{
            flex: 2,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            backgroundColor: Colors.white,
            marginHorizontal: 30,
            marginVertical: 50,
            paddingVertical: 50,
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

          <Button
            disabled={!username || !password}
            title="Connect"
            onPress={this.handleRegister}
          />
        </KeyboardAvoidingView>
      </ScrollView>
    );
  }
}
