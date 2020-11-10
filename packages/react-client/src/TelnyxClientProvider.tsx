import React, { ReactNode } from 'react';
import TelnyxClientContext from './TelnyxClientContext';
import useTelnyxClient, { CredentialOptions } from './useTelnyxClient';

interface IProps {
  children: ReactNode;
  credential: CredentialOptions;
  options?: any;
}

function TelnyxClientProvider({ children, credential, options }: IProps) {
  const telnyxClient = useTelnyxClient(credential, options);

  return (
    <TelnyxClientContext.Provider value={telnyxClient}>
      {React.Children.only(children)}
    </TelnyxClientContext.Provider>
  );
}

export default TelnyxClientProvider;
