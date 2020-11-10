import React, { useState, useEffect } from 'react';
import { useNotification } from '@telnyx/react-client';

function CallLog() {
  const notification = useNotification();
  let [clientStateLog, setClientStateLog] = useState<
    { type: string; timestamp: number }[]
  >([]);

  useEffect(() => {
    if (!notification) return;

    setClientStateLog((prevState) => [
      ...prevState,
      {
        type: notification.type,
        timestamp: Date.now(),
      },
    ]);
  }, [notification]);

  return (
    <ol>
      {clientStateLog.map((loggedState) => (
        <li key={loggedState.timestamp}>{loggedState.type}</li>
      ))}
    </ol>
  );
}

export default CallLog;
