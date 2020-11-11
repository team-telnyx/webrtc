import React, {
  useCallback,
  useContext,
  useRef,
  HTMLAttributes,
  useEffect,
} from 'react';
import TelnyxRTCContext from './TelnyxRTCContext';

interface IProps extends HTMLAttributes<HTMLMediaElement> {
  type: 'audio' | 'video';
  stream?: MediaStream;
  isRemote?: boolean;
  autoPlay?: boolean;
  controls?: boolean;
}

function Media({ type, stream, isRemote, ...props }: IProps) {
  const mediaRef = useRef<HTMLMediaElement>();
  const client = useContext(TelnyxRTCContext);

  const mediaMountRef = useCallback((node: HTMLMediaElement) => {
    mediaRef.current = node;

    if (client) {
      if (isRemote) {
        client.remoteElement = node;
      } else {
        client.localElement = node;
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
    ref: mediaMountRef,
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
