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

type TokenCredentialParam = {
  token: string;
};

type TokenCredentialOptions = {
  login_token: string;
};

type UsernameCredentialParam = {
  username: string;
  password: string;
};

type UsernameCredentialOptions = {
  login: string;
  password: string;
};

type CredentialParam = TokenCredentialParam | UsernameCredentialParam;
type CredentialOptions = TokenCredentialOptions | UsernameCredentialOptions;

function makeCredentialOptions(
  credentialParam: CredentialParam
): CredentialOptions {
  let credentialOpts: CredentialOptions;

  if ('token' in credentialParam) {
    credentialOpts = {
      login_token: credentialParam.token,
    };
  } else {
    credentialOpts = {
      login: credentialParam.username,
      password: credentialParam.password,
    };
  }

  return credentialOpts;
}

/**
 * Constructs a Telnyx client, connects the client and subscribes
 * to events, e.g. an event for an incoming call.
 *
 * ## Examples
 *
 * import { useTelnyxClient } from '@telnyx/react-client'
 *
 * // Login using On-Demand Credentials token
 * const { client, call, clientState } = useTelnyxClient({ token })
 *
 * // Or, login using your SIP Connection username and password
 * // const { client, call, clientState } = useTelnyxClient({ username, password })
 *
 * @param {CredentialParam} credentialParam
 * @param {*} [clientOptions]
 * @returns
 */
function useTelnyxClient(
  credentialParam: CredentialParam,
  clientOptions?: any /* TODO Get type from @telnyx/webrtc package */
) {
  // Check if component is mounted before updating state
  // in the Telnyx WebRTC client callbacks
  let isMountedRef = useRef<boolean>(false);

  // Save the Telnyx WebRTC client as a ref as to persist
  // the client object through component updates
  let telnyxClientRef = useRef<any>();
  let [clientState, setClientState] = useState<ClientState | null>();
  let [call, setCall] = useState<IPartialCall | null>();

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

    let credentialOpts = makeCredentialOptions(credentialParam);

    const telnyxClient = new TelnyxRTC({
      ...credentialOpts,
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
