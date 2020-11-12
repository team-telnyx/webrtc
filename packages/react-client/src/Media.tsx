import React, { useRef, HTMLAttributes, useEffect } from 'react';

interface IProps extends HTMLAttributes<HTMLMediaElement> {
  type: 'audio' | 'video';
  stream?: MediaStream;
  autoPlay?: boolean;
  controls?: boolean;
}

function Media({ type, stream, ...props }: IProps) {
  const mediaRef = useRef<HTMLMediaElement>();

  useEffect(() => {
    if (mediaRef.current && stream) {
      mediaRef.current.srcObject = stream;
    }
  }, [stream]);

  return React.createElement(type, {
    ref: mediaRef,
    autoPlay: true,
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
