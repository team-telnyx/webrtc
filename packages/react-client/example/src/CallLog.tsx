import React, { useState, useEffect } from 'react';
import { useNotification } from '@telnyx/react-client';

function CallLog() {
  const notification = useNotification();
  let [clientStateLog, setClientStateLog] = useState<
    { type: string; state?: string; timestamp: number }[]
  >([]);

  useEffect(() => {
    if (notification?.type !== 'callUpdate') return;

    setClientStateLog((prevState) => [
      ...prevState,
      {
        type: notification.type,
        timestamp: Date.now(),
        state: notification.call?.state,
      },
    ]);
  }, [notification]);

  return (
    <ol>
      {clientStateLog.map((loggedState) => (
        <li key={loggedState.timestamp}>
          {loggedState.type}
          {loggedState.state && (
            <span>
              {' '}
              <strong>{loggedState.state}</strong>
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

export default CallLog;
