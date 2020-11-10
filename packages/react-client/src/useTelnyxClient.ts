import { useRef, useEffect } from 'react';
import { TelnyxRTC } from '@telnyx/webrtc';

type TokenCredential = {
  login_token: string;
};

type UsernameCredential = {
  login: string;
  password: string;
};

export type CredentialOptions = TokenCredential | UsernameCredential;

/**
 * Constructs a Telnyx client, connects the client and subscribes
 * to events, e.g. an event for an incoming call.
 *
 * ## Examples
 *
 * import { useTelnyxClient } from '@telnyx/react-client'
 *
 * // Login using On-Demand Credentials token
 * const { client, call, clientState } = useTelnyxClient({ login_token })
 *
 * // Or, login using your SIP Connection username and password
 * // const { client, clientState } = useTelnyxClient({ login, password })
 *
 * client.on('telnyx.notification', ({ call }) => {
 *   console.log(call)
 * })
 *
 * @param {CredentialOptions} credentialParam
 * @param {*} [clientOptions]
 * @returns
 */
function useTelnyxClient(
  credentialParam: CredentialOptions,
  clientOptions?: any /* TODO Get type from @telnyx/webrtc package */
): TelnyxRTC {
  // Check if component is mounted before updating state
  // in the Telnyx WebRTC client callbacks
  let isMountedRef = useRef<boolean>(false);

  // Save the Telnyx WebRTC client as a ref as to persist
  // the client object through component updates
  let telnyxClientRef = useRef<any>();

  useEffect(() => {
    isMountedRef.current = true;

    if (!credentialParam) {
      return;
    }

    const telnyxClient = new TelnyxRTC({
      ...credentialParam,
      ...clientOptions,
    });

    telnyxClient.on('telnyx.error', () => {
      telnyxClient.disconnect();
    });

    telnyxClient.on('telnyx.socket.error', () => {
      telnyxClient.disconnect();
    });

    telnyxClientRef.current = telnyxClient;

    // IDEA Allow caller to defer connect
    telnyxClientRef.current.connect();

    return () => {
      isMountedRef.current = false;

      telnyxClientRef.current?.disconnect();
      telnyxClientRef.current = undefined;
    };
  }, [credentialParam]);

  return telnyxClientRef.current;
}

export default useTelnyxClient;
