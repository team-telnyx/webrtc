import React, { useEffect, useRef } from 'react';

interface IProps {
  remoteStream?: MediaStream; // TODO Get type from @telnyx/webrtc
}

function Audio({ remoteStream, ...props }: IProps) {
  const audioRef = useRef<HTMLAudioElement>();

  useEffect(() => {
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return <audio {...props} />;
}

Audio.defaultProps = {
  autoPlay: 'autoplay',
  controls: false,
};

export default Audio;
