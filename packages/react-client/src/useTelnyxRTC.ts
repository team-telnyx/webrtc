import { useEffect, useState } from 'react';
import { TelnyxRTC, IClientOptions } from '@telnyx/webrtc';

type TokenCredential = {
  login_token: string;
  debug?: boolean;
};

type UsernameCredential = {
  login: string;
  password: string;
  debug?: boolean;
};

export type CredentialOptions = TokenCredential | UsernameCredential;

/**
 * Creates and connects a client after mount. Initially returns undefined.
 * Credential values replace the client; other options are captured at mount.
 * Unmounting disconnects the client, including any active calls.
 *
 * Subscribe in an effect, not during render:
 * ```jsx
 * const client = useTelnyxRTC({ login_token });
 * useEffect(() => {
 *   if (!client) return;
 *   const onReady = () => console.log('client ready');
 *   client.on('telnyx.ready', onReady);
 *   return () => { client.off('telnyx.ready', onReady); };
 * }, [client]);
 * ```
 */
function useTelnyxRTC(
  credentialParam: CredentialOptions,
  clientOptions?: Partial<IClientOptions>
): TelnyxRTC | undefined {
  const [owned, setOwned] = useState<{
    client: TelnyxRTC;
    disposed: boolean;
  }>();
  const [initialOptions] = useState(() => ({
    debug: credentialParam.debug,
    ...clientOptions,
  }));
  const login_token =
    'login_token' in credentialParam ? credentialParam.login_token : undefined;
  const login = 'login' in credentialParam ? credentialParam.login : undefined;
  const password =
    'password' in credentialParam ? credentialParam.password : undefined;

  useEffect(() => {
    // Never construct/connect in render: aborted renders and StrictMode must
    // not leak sessions. Each effect owns and disposes its own SDK instance.
    const session = new TelnyxRTC({
      ...initialOptions,
      login_token,
      login,
      password,
    });
    const owner = { client: session, disposed: false };
    setOwned(owner);

    // The SDK owns error recovery. Calling disconnect on errors disables its
    // reconnect logic and hangs up active calls, so only lifecycle cleanup does it.
    return () => {
      owner.disposed = true;
      // Disconnect is asynchronous; never reuse this instance while it drains.
      void session.disconnect();
    };
  }, [login_token, login, password, initialOptions]);

  useEffect(() => {
    if (!owned || owned.disposed) return;
    // Publish first, then let provider children and direct-hook callers attach
    // their effect subscriptions before connect can emit synchronous errors.
    const task = setTimeout(() => {
      if (!owned.disposed) void owned.client.connect();
    }, 0);
    return () => clearTimeout(task);
  }, [owned]);

  return owned?.client;
}

export default useTelnyxRTC;
