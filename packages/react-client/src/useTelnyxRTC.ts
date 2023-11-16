import { useEffect, useRef } from 'react';
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

const initTelnyxRTC = ({
  credentialParam,
  clientOptions,
}: {
  credentialParam: CredentialOptions;
  clientOptions?: Partial<IClientOptions>;
}) => {
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
};

function useTelnyxRTC(
  credentialParam: CredentialOptions,
  clientOptions?: Partial<IClientOptions>
): TelnyxRTC | undefined {
  const telnyxClientRef = useRef<TelnyxRTC | undefined>(undefined);

  useEffect(() => {
    if (telnyxClientRef.current?.connected) {
      if (process.env.NODE_ENV === 'development' && telnyxClientRef.current) {
        console.warn(
          'Instance of Telnyx Client already exists and will be disconnected.'
        );
      }

      // Create new client when credentials change,
      // e.g. when refreshing token
      // TODO reconnect without re-instantiating client
      telnyxClientRef.current?.disconnect();

      telnyxClientRef.current = initTelnyxRTC({
        credentialParam,
        clientOptions,
      });
    } else {
      telnyxClientRef.current = initTelnyxRTC({
        credentialParam,
        clientOptions,
      });
    }
  }, [credentialParam]);

  return telnyxClientRef.current;
}

export default useTelnyxRTC;
