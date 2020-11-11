import React, { ReactNode, Fragment } from 'react';
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
    <TelnyxClientContext.Provider value={telnyxClient || null}>
      <Fragment>{children}</Fragment>
    </TelnyxClientContext.Provider>
  );
}

export default TelnyxClientProvider;
