import { useState } from 'react';
import useEvents from './useEvents';

function useNotification() {
  const [notification, setNotification] = useState<any | null>();

  useEvents({
    onNotification: setNotification,
  });

  return notification;
}

export default useNotification;
