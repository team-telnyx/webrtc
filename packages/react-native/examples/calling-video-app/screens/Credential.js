import React, {Component} from 'react';
import {View, Image, KeyboardAvoidingView, ScrollView} from 'react-native';
import {Input, Button, CheckBox} from 'react-native-elements';
import Colors from '../Colors';
import Icon from 'react-native-vector-icons/FontAwesome';

export default class CredentialScreen extends Component {
  constructor(props) {
    Icon.loadFont();
    super(props);
    this.state = {
      username: '',
      password: '',
      production: true,
      showPassword: false,
    };
  }

  handleRegister = () => {
    const {navigation} = this.props;
    return navigation.navigate('dialer', {
      username: this.state.username,
      password: this.state.password,
      production: this.state.production,
    });
  };

  handleEyes = () => {
    this.setState(prev => {
      return {
        showPassword: !prev.showPassword,
      };
    });
  };

  handlePassword = password => {
    return this.setState({password: password});
  };

  handleUserName = username => {
    return this.setState({username: username});
  };

  handleEnvironment = () => {
    return this.setState({production: !this.state.production});
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
            borderRadius: 4,
            backgroundColor: Colors.white,
            marginHorizontal: 30,
            marginVertical: 50,
            paddingVertical: 50,
          }}>
          <Input
            leftIcon={{type: 'font-awesome', name: 'user', color: 'gray'}}
            placeholder="Username"
            value={this.state.username}
            onChangeText={this.handleUserName}
          />
          <Input
            leftIcon={{type: 'font-awesome', name: 'lock', color: 'gray'}}
            rightIcon={{
              Component: () => (
                <Icon
                  type="font-awesome"
                  name={this.state.showPassword ? 'eye-slash' : 'eye'}
                  size={25}
                  color={'gray'}
                  onPress={this.handleEyes}
                />
              ),
            }}
            placeholder="Password"
            secureTextEntry={!this.state.showPassword}
            value={this.state.password}
            onChangeText={this.handlePassword}
          />
          <CheckBox
            style={{alignSelf: 'center'}}
            title="Production"
            checked={this.state.production}
            onPress={this.handleEnvironment}
          />
          <View style={{alignSelf: 'center', marginTop: 10}}>
            <Button
              disabled={!username || !password}
              title="Connect"
              style={{alignSelf: 'center'}}
              onPress={this.handleRegister}
            />
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    );
  }
}
