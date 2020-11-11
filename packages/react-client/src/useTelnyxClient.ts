import { useState, useRef, useEffect } from 'react';
import { TelnyxRTC } from '@telnyx/webrtc';

enum ClientState {
  READY = 'ready',
  ERROR = 'error',
  DISCONNECTED = 'disconnected',
}

interface IPartialCall {
  state: string; // TODO typings for call state
  direction: 'inbound' | 'outbound';
  options: {
    remoteCallerName: string;
    remoteCallerNumber: string;
    destinationNumber: string;
    telnyxCallControlId: string;
  };
  answer: Function;
  hangup: Function;
  remoteStream?: MediaStream;
  muteAudio: Function;
  unmuteAudio: Function;
}

type TokenCredentialOptions = {
  login_token: string;
};

type UsernameCredentialOptions = {
  login: string;
  password: string;
};

type CredentialOptions = TokenCredentialOptions | UsernameCredentialOptions;

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
 * @param {CredentialOptions} credentialParam
 * @param {*} [clientOptions]
 * @returns
 */
function useTelnyxClient(
  credentialParam: CredentialOptions,
  clientOptions?: any /* TODO Get type from @telnyx/webrtc package */
): {
  client: TelnyxRTC;
  call: IPartialCall | null;
  clientState: ClientState | null;
} {
  // Check if component is mounted before updating state
  // in the Telnyx WebRTC client callbacks
  let isMountedRef = useRef<boolean>(false);

  // Save the Telnyx WebRTC client as a ref as to persist
  // the client object through component updates
  let telnyxClientRef = useRef<any>();
  let [clientState, setClientState] = useState<ClientState | null>(null);
  let [call, setCall] = useState<IPartialCall | null>(null);

  const updateWebRTCState = (state: ClientState) => {
    if (isMountedRef.current) {
      setClientState(state);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    if (!credentialParam) {
      return;
    }

    const telnyxClient = new TelnyxRTC({
      ...credentialParam,
      ...clientOptions,
    });

    telnyxClient.on('telnyx.ready', () => {
      updateWebRTCState(ClientState.READY);
    });

    telnyxClient.on('telnyx.error', () => {
      telnyxClient.disconnect();

      updateWebRTCState(ClientState.ERROR);
    });

    telnyxClient.on('telnyx.socket.error', () => {
      telnyxClient.disconnect();

      updateWebRTCState(ClientState.ERROR);
    });

    telnyxClient.on('telnyx.socket.close', () => {
      updateWebRTCState(ClientState.DISCONNECTED);
    });

    telnyxClient.on('telnyx.notification', (notification: any) => {
      if (notification.call) {
        const {
          state,
          direction,
          options,
          answer,
          hangup,
          muteAudio,
          unmuteAudio,
          remoteStream,
        } = notification.call;

        if (state === 'hangup' || state === 'destroy') {
          setCall(null);
        } else {
          setCall({
            state,
            direction,
            options,
            remoteStream,
            answer: answer.bind(notification.call),
            hangup: hangup.bind(notification.call),
            muteAudio: muteAudio.bind(notification.call),
            unmuteAudio: unmuteAudio.bind(notification.call),
          });
        }
      }
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

  return { client: telnyxClientRef.current, call, clientState };
}

export default useTelnyxClient;
