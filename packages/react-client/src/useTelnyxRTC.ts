import { useMemo } from 'react';
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
  const telnyxClient = useMemo(() => {
    let client: TelnyxRTC | undefined;

    if (client?.connected) {
      if (process.env.NODE_ENV === 'development' && client) {
        console.warn(
          'Instance of Telnyx Client already exists and will be disconnected.'
        );
      }

      // Create new client when credentials change,
      // e.g. when refreshing token
      // TODO reconnect without re-instantiating client
      client?.disconnect().then(() => {
        client?.off('telnyx.ready');
        client?.off('telnyx.error');
        client?.off('telnyx.notification');
        client?.off('telnyx.socket.close');
        client?.off('telnyx.socket.error');
        client = undefined;

        console.log('disconnected...');

        client = initTelnyxRTC({
          credentialParam,
          clientOptions,
        });
      });
    } else {
      client = initTelnyxRTC({
        credentialParam,
        clientOptions,
      });
    }

    return client;
  }, [
    //@ts-expect-error
    credentialParam.login_token,
    //@ts-expect-error
    credentialParam.login,
    //@ts-expect-error
    credentialParam.password,
  ]);

  return telnyxClient;
}

export default useTelnyxRTC;
