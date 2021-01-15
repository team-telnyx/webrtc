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
    // IDEA Allow caller to defer connect
    telnyxClientRef.current?.connect();

    return () => {
      telnyxClientRef.current?.disconnect();
    };
  }, []);

  return telnyxClientRef.current;
}

export default useTelnyxRTC;
