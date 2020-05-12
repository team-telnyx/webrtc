import * as React from 'react';

import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import CredentialScreen from './screens/Credential';
import DialerScreen from './screens/Dialer';

const Stack = createStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}>
        <Stack.Screen name="credentials" component={CredentialScreen} />
        <Stack.Screen name="dialer" component={DialerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
