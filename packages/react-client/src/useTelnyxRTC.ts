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
  const telnyxClientRef = useRef<TelnyxRTC | undefined>(undefined);

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
    return session?.connect().then(() => {
      console.log('after connected===>', session.connected);

      return session;
    });
  };

  useEffect(() => {
    if (telnyxClientRef.current?.connection?.isAlive) {
      if (process.env.NODE_ENV === 'development' && telnyxClientRef.current) {
        console.warn(
          'Instance of Telnyx Client already exists and will be disconnected.'
        );
      }

      // Create new client when credentials change,
      // e.g. when refreshing token
      // TODO reconnect without re-instantiating client

      telnyxClientRef.current.disconnect().then(() => {
        initTelnyxRTC({
          credentialParam,
          clientOptions,
        }).then((session) => {
          telnyxClientRef.current = session;
        });
      });
    } else {
      initTelnyxRTC({
        credentialParam,
        clientOptions,
      }).then((session) => {
        telnyxClientRef.current = session;
      });
    }
  }, [credentialParam]);

  return telnyxClientRef.current;
}

export default useTelnyxRTC;
