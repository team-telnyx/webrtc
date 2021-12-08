/* eslint-disable no-unused-expressions  */
// See: https://github.com/eslint/eslint/issues/12822 for eslint-disable no-unused-expressions reason
import { useEffect, useMemo } from 'react';
//@ts-ignore
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
  const telnyxClient = useMemo(() => {
    if (telnyxClient?.connected) {
      if (process.env.NODE_ENV === 'development' && telnyxClient) {
        console.warn(
          'Instance of Telnyx Client already exists and will be disconnected.'
        );
      }

      // Create new client when credentials change,
      // e.g. when refreshing token
      // TODO reconnect without re-instantiating client
      telnyxClient?.disconnect();
    }

    const session = new TelnyxRTC({
      // eslint-disable-next-line @typescript-eslint/camelcase
      login_token: '',
      ...credentialParam,
      ...clientOptions,
    });

    session.on('telnyx.error', () => {
      session?.disconnect();
    });

    session.on('telnyx.socket.error', () => {
      session?.disconnect();
    });

    // IDEA Allow caller to defer connect
    session?.connect();

    return session;
  }, [credentialParam]);

  useEffect(() => {
    return () => {
      telnyxClient?.disconnect();
    };
  }, [telnyxClient]);

  return telnyxClient;
}

export default useTelnyxRTC;
