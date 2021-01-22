/* eslint-disable no-unused-expressions  */
// See: https://github.com/eslint/eslint/issues/12822 for eslint-disable no-unused-expressions reason
import { useEffect, useRef } from 'react';
import { TelnyxRTC, IClientOptions } from '@telnyx/webrtc';

type TokenCredential = {
  login_token: string;
};

type UsernameCredential = {
  login: string;
  password: string;
};

export type CredentialOptions = TokenCredential | UsernameCredential;

/**
 * Constructs a Telnyx client, connects the client, and handles
 * disconnecting the client during cleanup.
 *
 * ## Examples
 * ```jsx
 * import { useTelnyxRTC } from '@telnyx/react-client'
 *
 * // Login using On-Demand Credentials token
 * const client = useTelnyxRTC({ login_token })
 *
 * // Or, login using your SIP Connection username and password
 * // const client = useTelnyxRTC({ login, password })
 *
 * client.on('telnyx.notification', ({ call }) => {
 *   console.log(call)
 * })
 * ```
 */
function useTelnyxRTC(
  credentialParam: CredentialOptions,
  clientOptions?: Partial<IClientOptions>
): TelnyxRTC | undefined {
  const telnyxClientRef = useRef<TelnyxRTC>();

  if (process.env.NODE_ENV === 'development' && telnyxClientRef.current) {
    console.warn(
      'Instance of Telnyx Client already exists. Did you mean to create multiple instances of Telnyx Client?'
    );
  }

  telnyxClientRef.current = new TelnyxRTC({
    // eslint-disable-next-line @typescript-eslint/camelcase
    login_token: '',
    ...credentialParam,
    ...clientOptions,
  });

  telnyxClientRef.current.on('telnyx.error', () => {
    telnyxClientRef.current?.disconnect();
  });

  telnyxClientRef.current.on('telnyx.socket.error', () => {
    telnyxClientRef.current?.disconnect();
  });

  useEffect(() => {
    if (telnyxClientRef.current?.connected) {
      // Create new client when credentials change,
      // e.g. when refreshing token
      // TODO reconnect without re-instantiating client
      telnyxClientRef.current?.disconnect();

      telnyxClientRef.current = new TelnyxRTC({
        // eslint-disable-next-line @typescript-eslint/camelcase
        login_token: '',
        ...credentialParam,
        ...clientOptions,
      });
    }

    // IDEA Allow caller to defer connect
    telnyxClientRef.current?.connect();

    return () => {
      telnyxClientRef.current?.disconnect();
    };
  }, [credentialParam]);

  return telnyxClientRef.current;
}

export default useTelnyxRTC;
