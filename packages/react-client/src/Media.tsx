import React, { useContext, useRef, HTMLAttributes, useEffect } from 'react';
import TelnyxRTCContext from './TelnyxRTCContext';

interface IProps extends HTMLAttributes<HTMLMediaElement> {
  type: 'audio' | 'video';
  id?: string;
  stream?: MediaStream;
  isRemote?: boolean;
  autoPlay?: boolean;
  controls?: boolean;
}

function Media({ type, id, stream, isRemote, ...props }: IProps) {
  const mediaRef = useRef<HTMLMediaElement>();
  const client = useContext(TelnyxRTCContext);

  useEffect(() => {
    if (!id) return;

    if (client) {
      if (isRemote) {
        client.remoteElement = id;
      } else {
        client.localElement = id;
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `Could not find Telnyx client. Did you wrap your component with \`TelnyxRTCProvider\`?`
        );
      }
    }
  }, []);

  useEffect(() => {
    if (mediaRef.current && stream) {
      mediaRef.current.srcObject = stream;
    }
  }, [stream]);

  return React.createElement(type, {
    ref: mediaRef,
    ...props,
  });
}

export function Audio(props: any) {
  return React.createElement(Media, {
    type: 'audio',
    ...props,
  });
}

export function Video(props: any) {
  return React.createElement(Media, {
    type: 'video',
    playsInline: true, // prevents mobile browsers from opening video in fullscreen
    ...props,
  });
}

export default Media;
