import { useState } from 'react';
import useEvents from './useEvents';

/**
 * Subcribe to notifications from the Telnyx client
 *
 * ## Examples
 * ```jsx
 * import { useNotification } from '@telnyx/react-client';
 *
 * function Phone() {
 *   const notification = useNotification();
 *   const activeCall = notification && notification.call;
 *
 *   return (
 *     <div>
 *       {activeCall &&
 *         activeCall.state === 'ringing' &&
 *         'You have an incoming call.'}
 *     </div>
 *   );
 * }
 * ```
 *
 * @returns
 */
function useNotification() {
  const [notification, setNotification] = useState<any | null>();

  useEvents({
    onNotification: setNotification,
  });

  return notification;
}

export default useNotification;
