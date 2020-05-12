import * as React from 'react';

import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import CredentialScreen from './screens/Credential';
import DialerScreen from './screens/Dialer';

const Stack = createStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Welcome to Telnyx" component={CredentialScreen} />
        <Stack.Screen name="Telnyx 2" component={DialerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
