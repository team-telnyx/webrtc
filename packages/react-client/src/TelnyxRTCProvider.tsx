import React, { ReactNode, Fragment } from 'react';
import TelnyxRTCContext from './TelnyxRTCContext';
import useTelnyxRTC, { CredentialOptions } from './useTelnyxRTC';

interface IProps {
  children: ReactNode;
  credential: CredentialOptions;
  options?: any;
}

function TelnyxRTCProvider({
  children,
  credential,
  options,
}: IProps): ReactNode {
  const telnyxClient = useTelnyxRTC(credential, options);

  return (
    <TelnyxRTCContext.Provider value={telnyxClient || null}>
      <Fragment>{children}</Fragment>
    </TelnyxRTCContext.Provider>
  );
}

export default TelnyxRTCProvider;
